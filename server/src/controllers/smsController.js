const { all, get } = require('../config/db');
const { initiateOtp, verifyOtp, sendPaymentReminder, sendSms, retrySms } = require('../services/smsService');
const { logAudit } = require('../services/auditService');

async function handleInitiateOtp(req, res) {
  try {
    const { mobileNumber, purpose = 'PAYMENT_CONFIRMATION', referenceId } = req.body;

    if (!mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    const result = await initiateOtp({
      mobileNumber: mobileNumber.trim(),
      purpose,
      referenceId
    });

    return res.json({
      message: 'OTP sent successfully to registered mobile number.',
      verificationId: result.verificationId,
      expiresAt: result.expiresAt,
      mockOtp: result.mockOtp
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

function handleVerifyOtp(req, res) {
  try {
    const { verificationId, otpEntered } = req.body;

    if (!verificationId || !otpEntered) {
      return res.status(400).json({ error: 'Verification ID and OTP code are required.' });
    }

    const result = verifyOtp({
      verificationId,
      otpEntered: otpEntered.toString()
    });

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'OTP_VERIFIED',
      entityType: 'OTP',
      entityId: verificationId,
      ipAddress: req.ip
    });

    return res.json({ message: 'OTP verified successfully.', verified: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function handleSendReminder(req, res) {
  try {
    const { customerId, loanId, installmentNumber, dueDate, amountDue, isOverdue } = req.body;

    if (!customerId || !loanId || !installmentNumber || !dueDate || !amountDue) {
      return res.status(400).json({ error: 'Missing required installment details to send reminder.' });
    }

    const result = await sendPaymentReminder({
      customerId,
      loanId,
      installmentNumber,
      dueDate,
      amountDue,
      isOverdue: Boolean(isOverdue)
    });

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'SMS_REMINDER_SENT',
      entityType: 'SMS',
      entityId: loanId,
      details: { customerId, installmentNumber, dueDate, amountDue, isOverdue },
      ipAddress: req.ip
    });

    return res.json({
      message: 'Payment reminder sent successfully.',
      result
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

function getRemindersQueue(req, res) {
  const today = new Date().toISOString().split('T')[0];

  // Up to next 3 days
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const maxDueDate = futureDate.toISOString().split('T')[0];

  const queue = all(`
    SELECT 
      ls.id as schedule_id, ls.installment_number, ls.due_date, ls.scheduled_amount, 
      ls.remaining_balance, ls.status as installment_status,
      l.id as loan_id,
      c.id as customer_id, c.full_name as customer_name, c.mobile_number as customer_mobile,
      (
        SELECT COUNT(*) FROM sms_logs sl 
        WHERE sl.loan_id = l.id AND date(sl.sent_at) = ?
      ) as reminders_sent_today,
      CASE 
        WHEN ls.due_date < ? THEN 1 
        ELSE 0 
      END as is_overdue
    FROM loan_schedules ls
    JOIN loans l ON ls.loan_id = l.id
    JOIN customers c ON l.customer_id = c.id
    WHERE ls.remaining_balance > 0 
      AND ls.due_date <= ? 
      AND l.status IN ('ACTIVE', 'OVERDUE')
    ORDER BY is_overdue DESC, ls.due_date ASC
  `, today, today, maxDueDate);

  return res.json({ queue });
}

function getSmsLogs(req, res) {
  const { type, search } = req.query;
  let sql = `
    SELECT sl.*, c.full_name as customer_name
    FROM sms_logs sl
    LEFT JOIN customers c ON sl.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (type && type !== 'ALL') {
    sql += ' AND sl.sms_type = ?';
    params.push(type);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (sl.recipient_mobile LIKE ? OR c.full_name LIKE ? OR sl.message_body LIKE ?)';
    params.push(term, term, term);
  }

  sql += ' ORDER BY sl.sent_at DESC LIMIT 100';
  const logs = all(sql, ...params);

  return res.json({ logs });
}

async function handleRetrySms(req, res) {
  try {
    const { logId } = req.params;
    const result = await retrySms(logId);
    return res.json({ message: 'SMS re-sent successfully.', result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

async function handleSendTestSms(req, res) {
  try {
    const { mobileNumber, message } = req.body;
    if (!mobileNumber) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }
    const testMsg = message || `Test SMS from Vishva Finance gateway at ${new Date().toLocaleTimeString('en-IN')}.`;
    const result = await sendSms({
      toMobile: mobileNumber,
      message: testMsg,
      smsType: 'TEST'
    });
    return res.json({ message: 'Test SMS dispatched.', result });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

module.exports = {
  handleInitiateOtp,
  handleVerifyOtp,
  handleSendReminder,
  getRemindersQueue,
  getSmsLogs,
  handleRetrySms,
  handleSendTestSms
};
