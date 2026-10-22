import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';

let firebaseApp = null;
let firebaseAuth = null;

export async function initFirebase(customConfig = null) {
  if (getApps().length > 0) {
    firebaseApp = getApp();
    firebaseAuth = getAuth(firebaseApp);
    return { app: firebaseApp, auth: firebaseAuth };
  }

  // 1. Try provided config
  let config = customConfig;

  // 2. Fall back to environment variables
  if (!config || !config.apiKey) {
    if (import.meta.env.VITE_FIREBASE_API_KEY) {
      config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
      };
    }
  }

  // 3. Fall back to server endpoint if still empty
  if (!config || !config.apiKey) {
    try {
      const res = await fetch('/api/settings/firebase-config');
      if (res.ok) {
        const data = await res.json();
        if (data.firebaseConfig && data.firebaseConfig.apiKey) {
          config = data.firebaseConfig;
        }
      }
    } catch (e) {
      // server config fetch failed
    }
  }

  if (!config || !config.apiKey) {
    return { 
      app: null, 
      auth: null, 
      isConfigured: false, 
      error: 'Firebase Phone Authentication is not configured. Please enter your Firebase Web App credentials in System Settings.' 
    };
  }

  try {
    firebaseApp = initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);
    // Set language
    firebaseAuth.useDeviceLanguage();
    return { app: firebaseApp, auth: firebaseAuth, isConfigured: true };
  } catch (err) {
    console.error('Failed to initialize Firebase App:', err);
    return { app: null, auth: null, isConfigured: false, error: err.message };
  }
}

/**
 * Initialize or clear RecaptchaVerifier
 */
export function createRecaptchaVerifier(containerId = 'recaptcha-container', authInstance = null) {
  const auth = authInstance || firebaseAuth;
  if (!auth) throw new Error('Firebase Auth is not initialized yet.');

  // Clear existing if any
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch (e) {
      // ignore
    }
    window.recaptchaVerifier = null;
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      console.warn('reCAPTCHA expired. Resetting verifier.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.render();
      }
    }
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send Phone OTP via Firebase
 * @param {string} rawMobile (10 digits)
 * @param {RecaptchaVerifier} verifier
 */
export async function sendFirebaseOtp(rawMobile, verifier, authInstance = null) {
  const auth = authInstance || firebaseAuth;
  if (!auth) throw new Error('Firebase Auth is not initialized.');

  const cleanDigits = rawMobile.replace(/[^0-9]/g, '');
  const last10 = cleanDigits.slice(-10);
  const formattedPhone = `+91${last10}`;

  return await signInWithPhoneNumber(auth, formattedPhone, verifier);
}
