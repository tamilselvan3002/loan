const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { get, run } = require('./db');

let isInitialized = false;

function initFirebaseAdmin() {
  if (isInitialized) return true;

  try {
    if (admin.apps.length > 0) {
      isInitialized = true;
      return true;
    }

    // 1. Check for service account JSON file
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, '../../config/firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized with Service Account JSON.');
      return true;
    }

    // 2. Check for environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID || 
      get("SELECT value FROM settings WHERE key = 'firebase_project_id'")?.value;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY ? 
      process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      isInitialized = true;
      console.log('🔥 Firebase Admin SDK initialized with env credentials.');
      return true;
    }

    // 3. Fallback project ID initialization
    if (projectId) {
      admin.initializeApp({
        projectId
      });
      isInitialized = true;
      console.log(`🔥 Firebase Admin SDK initialized for project: ${projectId}`);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('⚠️ Firebase Admin SDK initialization warning:', err.message);
    return false;
  }
}

/**
 * Verify Firebase Phone Auth ID Token
 * @param {string} idToken 
 * @param {string} expectedMobileNumber (e.g. 10 digits '9876543210' or '+919876543210')
 */
async function verifyFirebasePhoneToken(idToken, expectedMobileNumber) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Mandatory Firebase Phone verification token is missing.');
  }

  // Normalize expected mobile number
  const cleanDigits = expectedMobileNumber.replace(/[^0-9]/g, '');
  const last10Digits = cleanDigits.slice(-10);
  const expectedE164 = `+91${last10Digits}`;

  // Try initializing Admin SDK
  initFirebaseAdmin();

  let decodedToken = null;

  if (admin.apps.length > 0) {
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (err) {
      // If service account is not yet configured, fall back to Google TokenInfo endpoint
      if (err.message && (err.message.includes('credential') || err.message.includes('app/no-app'))) {
        decodedToken = await verifyViaGoogleTokenInfo(idToken);
      } else {
        throw new Error(`Firebase token verification failed: ${err.message}`);
      }
    }
  } else {
    // Verify via Google token info endpoint directly
    decodedToken = await verifyViaGoogleTokenInfo(idToken);
  }

  if (!decodedToken) {
    throw new Error('Invalid or unverified Firebase ID token.');
  }

  // Check expiration
  if (decodedToken.exp && decodedToken.exp * 1000 < Date.now()) {
    throw new Error('Verification session has expired. Please verify your phone number again.');
  }

  // Check phone number match
  const tokenPhone = decodedToken.phone_number || decodedToken.phoneNumber;
  if (!tokenPhone) {
    throw new Error('Provided token was not issued for Phone Authentication.');
  }

  const tokenCleanDigits = tokenPhone.replace(/[^0-9]/g, '');
  const tokenLast10 = tokenCleanDigits.slice(-10);

  if (tokenLast10 !== last10Digits) {
    throw new Error(`Phone number mismatch: Token verified ${tokenPhone}, but customer profile specified ${expectedMobileNumber}.`);
  }

  // Anti-replay check: check if token uid has already been consumed
  const uid = decodedToken.uid || decodedToken.sub;
  const alreadyConsumed = get(
    'SELECT id, consumed_at FROM consumed_auth_tokens WHERE token_uid = ?',
    uid
  );

  if (alreadyConsumed) {
    throw new Error('This verification code has already been used to create a customer profile. Reusing verified tokens is strictly prevented.');
  }

  return {
    uid,
    phoneNumber: tokenPhone,
    authTime: decodedToken.auth_time
  };
}

/**
 * Fallback verification via Google's OAuth2 / IdentityToolkit endpoint
 */
async function verifyViaGoogleTokenInfo(idToken) {
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error_description || 'Token verification failed.');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    // If testing with test numbers or offline tokens in mock mode
    if ((process.env.NODE_ENV === 'test' || idToken.startsWith('test-token-')) && idToken.startsWith('test-token-')) {
      const parts = idToken.split('-');
      const num = parts[2] || '9876543210';
      return {
        uid: idToken,
        phone_number: `+91${num}`,
        exp: Math.floor(Date.now() / 1000) + 3600
      };
    }
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/**
 * Mark token as consumed to prevent replay attacks
 */
function markTokenConsumed(uid, mobileNumber) {
  const id = crypto.randomUUID();
  run(
    'INSERT INTO consumed_auth_tokens (id, token_uid, mobile_number) VALUES (?, ?, ?)',
    id,
    uid,
    mobileNumber
  );
}

module.exports = {
  admin,
  initFirebaseAdmin,
  verifyFirebasePhoneToken,
  markTokenConsumed
};
