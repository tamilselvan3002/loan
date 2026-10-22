const crypto = require('crypto');
const { get, run, all } = require('../config/db');

function hashOtp(otp) {
  return crypto.createHash('sha256').update(otp.trim()).digest('hex');
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send an SMS message using FAST2SMS, MSG91, TWILIO, or MOCK
 */
async function sendSms({ toMobile, message, smsType, customerId = null, loanId = null }) {
  const providerSetting = get("SELECT value FROM settings WHERE key = 'sms_provider'")?.value || 'MOCK';
  const apiKey = get("SELECT value FROM settings WHERE key = 'sms_api_key'")?.value || '';
  const senderId = get("SELECT value FROM settings WHERE key = 'sms_sender_id'")?.value || 'VISHVA';
  const cleanMobile = toMobile.replace(/[^0-9]/g, '').slice(-10);

  let status = 'SIMULATED';
  let providerResponse = 'Mock delivery successful';

  if (providerSetting === 'FAST2SMS' && apiKey) {
    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanMobile
        })
      });
      const data = await res.json();
      providerResponse = JSON.stringify(data);
      status = (res.ok && data.return === true) ? 'SENT' : 'FAILED';
    } catch (err) {
      status = 'FAILED';
      providerResponse = err.message;
    }
  } else if (providerSetting === 'MSG91' && apiKey) {
    try {
      const templateId = get("SELECT value FROM settings WHERE key = 'sms_dlt_reminder_template'")?.value;
      const payload = {
        template_id: templateId || undefined,
        sender: senderId,
        short_url: '0',
        mobiles: '91' + cleanMobile,
        message: message
      };

      const res = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'authkey': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      providerResponse = JSON.stringify(data);
      status = res.ok ? 'SENT' : 'FAILED';
    } catch (err) {
      status = 'FAILED';
      providerResponse = err.message;
    }
  } else if (providerSetting === 'TWILIO' && apiKey) {
    try {
      const accountSid = get("SELECT value FROM settings WHERE key = 'sms_account_sid'")?.value || '';
      const twilioPhone = get("SELECT value FROM settings WHERE key = 'sms_from_phone'")?.value || senderId;
      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${apiKey}`).toString('base64');

      const body = new URLSearchParams();
      body.append('To', '+91' + cleanMobile);
      body.append('From', twilioPhone);
      body.append('Body', message);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      const data = await res.json();
      providerResponse = JSON.stringify(data);
      status = res.ok ? 'SENT' : 'FAILED';
    } catch (err) {
      status = 'FAILED';
      providerResponse = err.message;
    }
  } else {
    // Development / Mock mode
    console.log(`\n📱 [MOCK SMS ${smsType}] To: +91 ${cleanMobile} | Provider: ${providerSetting} | Sender: ${senderId}`);
    console.log(`   Message: ${message}`);
    console.log(`   Timestamp: ${new Date().toISOString()}\n`);
    status = 'SIMULATED';
    providerResponse = 'Simulated delivery in mock test mode';
  }

  // Record in sms_logs
  const logInsert = run(
    `INSERT INTO sms_logs (recipient_mobile, customer_id, loan_id, sms_type, message_body, provider, provider_response, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    toMobile,
    customerId,
    loanId,
    smsType,
    message,
    providerSetting,
    providerResponse,
    status
  );

  return { 
    id: logInsert?.lastInsertRowid,
    success: status !== 'FAILED', 
    status, 
    providerResponse 
  };
}

/**
 * Create and send OTP for verification
 */
async function initiateOtp({ mobileNumber, purpose = 'PAYMENT_CONFIRMATION', referenceId = null, customMessage = null }) {
  const cleanMobile = mobileNumber.replace(/[^0-9]/g, '').slice(-10);

  // Check rate limit / resend cooldown (60 seconds)
  const recentOtp = get(
    `SELECT created_at FROM otp_verifications 
     WHERE mobile_number = ? AND purpose = ? 
     ORDER BY created_at DESC LIMIT 1`,
    cleanMobile,
    purpose
  );

  if (recentOtp) {
    const elapsedSeconds = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitTime = Math.ceil(60 - elapsedSeconds);
      throw new Error(`Please wait ${waitTime} seconds before requesting a new OTP`);
    }
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes validity
  const verificationId = crypto.randomUUID();

  run(
    `INSERT INTO otp_verifications (id, mobile_number, otp_hash, purpose, reference_id, attempts, is_verified, expires_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, ?)`,
    verificationId,
    cleanMobile,
    otpHash,
    purpose,
    referenceId,
    expiresAt
  );

  const message = customMessage 
    ? customMessage.replace(/\{OTP\}|%OTP%/g, otp)
    : `Your Vishva Finance payment confirmation OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
  await sendSms({
    toMobile: cleanMobile,
    message,
    smsType: 'OTP',
    loanId: referenceId
  });

  const provider = get("SELECT value FROM settings WHERE key = 'sms_provider'")?.value || 'MOCK';
  return {
    verificationId,
    expiresAt,
    mobileMasked: `+91 ******${cleanMobile.slice(-4)}`,
    mockOtp: provider === 'MOCK' ? otp : undefined
  };
}

/**
 * Verify OTP
 */
function verifyOtp({ verificationId, otpEntered }) {
  const record = get(
    `SELECT * FROM otp_verifications WHERE id = ?`,
    verificationId
  );

  if (!record) {
    throw new Error('Invalid or expired verification session.');
  }

  if (record.is_verified) {
    throw new Error('This OTP has already been used and cannot be reused.');
  }

  if (new Date() > new Date(record.expires_at)) {
    throw new Error('OTP has expired (validity is 5 minutes). Please request a new OTP.');
  }

  if (record.attempts >= 3) {
    throw new Error('Maximum verification attempts (3) exceeded. This OTP is locked. Please request a new OTP.');
  }

  const enteredHash = hashOtp(otpEntered.toString().trim());
  if (enteredHash !== record.otp_hash) {
    run(`UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = ?`, verificationId);
    const remaining = 2 - record.attempts;
    throw new Error(`Invalid OTP. ${Math.max(0, remaining)} attempt(s) remaining.`);
  }

  // Mark verified (consumed)
  run(`UPDATE otp_verifications SET is_verified = 1 WHERE id = ?`, verificationId);
  return { verified: true, mobileNumber: record.mobile_number, referenceId: record.reference_id };
}

/**
 * Send Customer Payment Receipt SMS
 */
async function sendPaymentReceiptSms({
  customerId,
  loanId,
  paymentAmount,
  paymentMethod,
  paymentDate,
  totalPaid,
  outstandingBalance,
  nextInstallment = null,
  isSettlement = false
}) {
  const customer = get(`SELECT id, full_name, mobile_number FROM customers WHERE id = ?`, customerId);
  if (!customer) throw new Error('Customer not found for SMS receipt');

  const cleanMobile = customer.mobile_number.replace(/[^0-9]/g, '').slice(-10);

  const methodNames = {
    'GPAY_UPI': 'GPay/UPI',
    'UPI': 'UPI',
    'CASH': 'Cash',
    'BANK_TRANSFER': 'Bank Transfer',
    'OTHER': 'Other'
  };
  const methodName = methodNames[paymentMethod] || paymentMethod;

  let message = '';
  if (isSettlement || Number(outstandingBalance) <= 0) {
    message = `Dear ${customer.full_name} (${customer.id}), your Loan ${loanId} is FULLY SETTLED with payment of Rs.${Number(paymentAmount).toLocaleString('en-IN')} via ${methodName} on ${paymentDate}. Total Paid: Rs.${Number(totalPaid).toLocaleString('en-IN')}. Outstanding: Rs.0. Status: CLOSED. Thank you! - Vishva Finance`;
  } else {
    let nextMsg = '';
    if (nextInstallment && nextInstallment.due_date) {
      nextMsg = ` Next EMI #${nextInstallment.installment_number}: Rs.${Number(nextInstallment.scheduled_amount).toLocaleString('en-IN')} due on ${nextInstallment.due_date}.`;
    }
    message = `Dear ${customer.full_name} (${customer.id}), received payment of Rs.${Number(paymentAmount).toLocaleString('en-IN')} via ${methodName} on ${paymentDate}. Total Paid: Rs.${Number(totalPaid).toLocaleString('en-IN')}. Remaining Balance: Rs.${Number(outstandingBalance).toLocaleString('en-IN')}.${nextMsg} - Vishva Finance`;
  }

  return await sendSms({
    toMobile: cleanMobile,
    message,
    smsType: isSettlement ? 'RECEIPT_SETTLEMENT' : 'RECEIPT_PAYMENT',
    customerId: customer.id,
    loanId: loanId
  });
}

/**
 * Retry failed SMS log safely
 */
async function retrySms(logId) {
  const log = get(`SELECT * FROM sms_logs WHERE id = ?`, logId);
  if (!log) throw new Error('SMS log record not found');

  return await sendSms({
    toMobile: log.recipient_mobile,
    message: log.message_body,
    smsType: log.sms_type,
    customerId: log.customer_id,
    loanId: log.loan_id
  });
}

module.exports = {
  sendSms,
  initiateOtp,
  verifyOtp,
  sendPaymentReceiptSms,
  retrySms
};
