const crypto = require('crypto');
const { get, all, run, transaction } = require('../config/db');
const { logAudit } = require('../services/auditService');
const { initiateOtp, verifyOtp, sendPaymentReceiptSms } = require('../services/smsService');

function generateReceiptNumber() {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const lastTx = get(`SELECT receipt_number FROM payment_transactions WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1`, `RCP-${today}-%`);
  
  if (lastTx && lastTx.receipt_number) {
    const parts = lastTx.receipt_number.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 16);
      if (!isNaN(seq)) {
        const nextSeq = (seq + 1).toString(16).toUpperCase().padStart(4, '0');
        return `RCP-${today}-${nextSeq}`;
      }
    }
  }

  return `RCP-${today}-${randomSuffix}`;
}

/**
 * 1. Step 1: Initiate Payment Confirmation OTP
 */
async function initiatePaymentOtp(req, res) {
  try {
    const { loan_id, payment_method, is_settlement = false } = req.body;
    const rawAmount = req.body.amount_paid !== undefined ? req.body.amount_paid : req.body.amount;

    if (!loan_id) {
      return res.status(400).json({ error: 'Loan ID is required.' });
    }

    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number.' });
    }

    const validMethods = ['GPAY_UPI', 'CASH', 'BANK_TRANSFER', 'OTHER', 'UPI', 'CHEQUE'];
    if (payment_method && !validMethods.includes(payment_method)) {
      return res.status(400).json({ error: `Payment method must be one of: ${validMethods.join(', ')}` });
    }

    const loan = get('SELECT * FROM loans WHERE id = ?', loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    if (loan.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot record payment for a cancelled loan.' });
    }

    if (loan.outstanding_balance <= 0) {
      return res.status(400).json({ error: 'This loan has already been fully repaid.' });
    }

    if (amount > loan.outstanding_balance + 0.05) {
      return res.status(400).json({
        error: `Payment amount (₹${amount}) exceeds remaining outstanding balance (₹${loan.outstanding_balance}).`
      });
    }

    // Check duplicate payment in last 60 seconds
    const recentDuplicate = get(
      `SELECT id, receipt_number, created_at 
       FROM payment_transactions 
       WHERE loan_id = ? AND amount_paid = ? AND is_reversed = 0
         AND (strftime('%s', 'now') - strftime('%s', created_at)) < 60`,
      loan_id,
      amount
    );

    if (recentDuplicate) {
      return res.status(409).json({
        error: `A matching payment of ₹${amount} was recorded moments ago (${recentDuplicate.receipt_number}). Please verify before proceeding.`
      });
    }

    // Fetch customer details
    const customer = get('SELECT id, full_name, mobile_number FROM customers WHERE id = ?', loan.customer_id);
    if (!customer || !customer.mobile_number) {
      return res.status(400).json({ error: 'Customer registered mobile number not found.' });
    }

    const purposeMsg = is_settlement 
      ? `Your OTP for confirming FULL SETTLEMENT of Loan ${loan_id} (Rs.${amount.toLocaleString('en-IN')}) is {OTP}. Valid 5 mins. - Vishva Finance`
      : `Your OTP for confirming payment of Rs.${amount.toLocaleString('en-IN')} towards Loan ${loan_id} is {OTP}. Valid 5 mins. - Vishva Finance`;

    const otpSession = await initiateOtp({
      mobileNumber: customer.mobile_number,
      purpose: 'PAYMENT_CONFIRMATION',
      referenceId: loan_id,
      customMessage: purposeMsg.replace('{OTP}', '%OTP%') // handled in initiateOtp
    });

    return res.json({
      message: `Payment confirmation OTP sent to customer mobile number ${otpSession.mobileMasked}`,
      verificationId: otpSession.verificationId,
      verification_id: otpSession.verificationId,
      expiresAt: otpSession.expiresAt,
      expires_at: otpSession.expiresAt,
      mobileMasked: otpSession.mobileMasked,
      mobile_masked: otpSession.mobileMasked,
      mockOtp: otpSession.mockOtp,
      mock_otp: otpSession.mockOtp
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * 2. Get Settlement Quote for "Pay Remaining Loan Amount"
 */
function getSettlementQuote(req, res) {
  try {
    const { loanId } = req.params;
    const loan = get('SELECT * FROM loans WHERE id = ?', loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    if (loan.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Loan is cancelled.' });
    }

    if (loan.outstanding_balance <= 0) {
      return res.status(400).json({ error: 'Loan is already fully repaid.' });
    }

    const customer = get('SELECT id, full_name, mobile_number FROM customers WHERE id = ?', loan.customer_id);

    // Remaining unpaid installments
    const remainingInstallments = all(
      `SELECT installment_number, due_date, scheduled_amount, amount_paid, remaining_balance, status 
       FROM loan_schedules 
       WHERE loan_id = ? AND remaining_balance > 0 
       ORDER BY installment_number ASC`,
      loanId
    );

    return res.json({
      loan: {
        id: loan.id,
        customer_id: loan.customer_id,
        customer_name: customer ? customer.full_name : 'Customer',
        customer_mobile: customer ? customer.mobile_number : '',
        principal_amount: loan.principal_amount,
        expected_total_repayment: loan.expected_total_repayment,
        total_paid_amount: loan.total_paid_amount,
        outstanding_balance: loan.outstanding_balance,
        total_duration_weeks: loan.total_duration_weeks
      },
      settlement_amount: loan.outstanding_balance,
      total_payable: loan.expected_total_repayment,
      total_paid: loan.total_paid_amount,
      outstanding_balance: loan.outstanding_balance,
      remaining_installments: remainingInstallments.length,
      remaining_installments_list: remainingInstallments,
      remaining_count: remainingInstallments.length
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

/**
 * 3. Step 2: Record Payment or Full Settlement with Verified OTP
 */
async function recordPayment(req, res) {
  try {
    const rawAmount = req.body.amount_paid !== undefined ? req.body.amount_paid : req.body.amount;
    const loan_id = req.body.loan_id;
    const payment_date = req.body.payment_date;
    const payment_method = req.body.payment_method || 'CASH';
    const transaction_reference = req.body.transaction_reference || req.body.reference_number || '';
    const notes = req.body.notes || '';
    const verificationId = req.body.verificationId || req.body.otp_verification_id;
    const otpEntered = req.body.otpEntered || req.body.otp_code;
    const is_settlement = Boolean(req.body.is_settlement);

    const amount = Number(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number.' });
    }

    if (!loan_id) {
      return res.status(400).json({ error: 'Loan ID is required.' });
    }

    const validMethods = ['GPAY_UPI', 'CASH', 'BANK_TRANSFER', 'OTHER', 'UPI', 'CHEQUE'];
    if (!validMethods.includes(payment_method)) {
      return res.status(400).json({ error: `Payment method must be one of: ${validMethods.join(', ')}` });
    }

    const payDate = payment_date || new Date().toISOString().split('T')[0];

    // Fetch loan
    const loan = get('SELECT * FROM loans WHERE id = ?', loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found.' });
    }

    if (loan.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot record payment for a cancelled loan.' });
    }

    if (loan.outstanding_balance <= 0) {
      return res.status(400).json({ error: 'This loan has already been fully repaid.' });
    }

    if (amount > loan.outstanding_balance + 0.05) {
      return res.status(400).json({
        error: `Payment amount (₹${amount}) exceeds the total remaining outstanding balance (₹${loan.outstanding_balance}).`
      });
    }

    // Duplicate check: same loan, amount, and date in last 60 seconds
    const recentDuplicate = get(
      `SELECT id, receipt_number 
       FROM payment_transactions 
       WHERE loan_id = ? AND amount_paid = ? AND is_reversed = 0
         AND (strftime('%s', 'now') - strftime('%s', created_at)) < 60`,
      loan_id,
      amount
    );

    if (recentDuplicate) {
      return res.status(409).json({
        error: `A matching payment of ₹${amount} was recorded moments ago (${recentDuplicate.receipt_number}). Duplicate prevented.`
      });
    }

    // Verify OTP only if verification details were submitted (Direct entry allowed for authorized staff)
    if (verificationId && otpEntered) {
      verifyOtp({
        verificationId,
        otpEntered
      });
    }

    const transactionId = crypto.randomUUID();
    const receiptNumber = generateReceiptNumber();
    const isFullPayoff = is_settlement || Math.abs(amount - loan.outstanding_balance) < 0.05;

    let transactionResult = null;

    transactionResult = transaction(() => {
      // 1. Record payment transaction header first to satisfy foreign key constraints
      run(
        `INSERT INTO payment_transactions (
           id, receipt_number, loan_id, customer_id, amount_paid, 
           payment_date, payment_method, transaction_reference, notes, recorded_by_admin_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        transactionId,
        receiptNumber,
        loan_id,
        loan.customer_id,
        amount,
        payDate,
        payment_method,
        transaction_reference ? transaction_reference.trim() : null,
        isFullPayoff ? (notes ? notes + ' [FULL SETTLEMENT]' : '[FULL SETTLEMENT]') : (notes ? notes.trim() : null),
        req.admin.id
      );

      const unpaidSchedules = all(
        `SELECT * FROM loan_schedules 
         WHERE loan_id = ? AND remaining_balance > 0 
         ORDER BY installment_number ASC`,
        loan_id
      );

      let remainingPayment = amount;
      const allocatedInstallments = [];

      if (isFullPayoff) {
        // Mark all remaining unpaid installments as PAID with 0 balance
        for (const inst of unpaidSchedules) {
          const allocAmount = inst.remaining_balance;
          run(
            `UPDATE loan_schedules 
             SET amount_paid = scheduled_amount, remaining_balance = 0, status = 'PAID', last_payment_date = ?
             WHERE id = ?`,
            payDate,
            inst.id
          );

          run(
            `INSERT INTO payment_allocations (transaction_id, schedule_id, amount_allocated)
             VALUES (?, ?, ?)`,
            transactionId,
            inst.id,
            allocAmount
          );

          allocatedInstallments.push({
            installment_number: inst.installment_number,
            allocated: allocAmount
          });
        }
      } else {
        // Regular full or partial payment: allocate sequentially
        for (const inst of unpaidSchedules) {
          if (remainingPayment <= 0) break;

          const dueInInst = inst.remaining_balance;
          let allocated = 0;
          let newStatus = inst.status;

          if (remainingPayment >= dueInInst) {
            allocated = dueInInst;
            remainingPayment = Math.round((remainingPayment - allocated) * 100) / 100;
            newStatus = 'PAID';
          } else {
            allocated = remainingPayment;
            remainingPayment = 0;
            newStatus = 'PARTIALLY_PAID';
          }

          const newPaid = Math.round((inst.amount_paid + allocated) * 100) / 100;
          const newRemaining = Math.max(0, Math.round((inst.remaining_balance - allocated) * 100) / 100);

          run(
            `UPDATE loan_schedules 
             SET amount_paid = ?, remaining_balance = ?, status = ?, last_payment_date = ?
             WHERE id = ?`,
            newPaid,
            newRemaining,
            newStatus,
            payDate,
            inst.id
          );

          run(
            `INSERT INTO payment_allocations (transaction_id, schedule_id, amount_allocated)
             VALUES (?, ?, ?)`,
            transactionId,
            inst.id,
            allocated
          );

          allocatedInstallments.push({
            installment_number: inst.installment_number,
            allocated
          });
        }
      }

      // Update loan balances and status
      const newTotalPaid = isFullPayoff 
        ? loan.expected_total_repayment 
        : Math.round((loan.total_paid_amount + amount) * 100) / 100;

      const newOutstanding = isFullPayoff 
        ? 0 
        : Math.max(0, Math.round((loan.expected_total_repayment - newTotalPaid) * 100) / 100);
      
      let newLoanStatus = 'ACTIVE';
      if (newOutstanding <= 0 || isFullPayoff) {
        newLoanStatus = 'COMPLETED'; // Closed
      } else {
        const hasOverdue = get(
          `SELECT id FROM loan_schedules WHERE loan_id = ? AND status = 'OVERDUE' LIMIT 1`,
          loan_id
        );
        newLoanStatus = hasOverdue ? 'OVERDUE' : 'ACTIVE';
      }

      run(
        `UPDATE loans 
         SET total_paid_amount = ?, outstanding_balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        newTotalPaid,
        newOutstanding,
        newLoanStatus,
        loan_id
      );

      logAudit({
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        action: isFullPayoff ? 'LOAN_SETTLED' : 'PAYMENT_RECORDED',
        entityType: 'LOAN',
        entityId: loan_id,
        details: {
          receiptNumber,
          amountPaid: amount,
          paymentMethod: payment_method,
          newOutstanding,
          isSettlement: isFullPayoff
        },
        ipAddress: req.ip
      });

      return {
        transactionId,
        receiptNumber,
        newOutstanding,
        newTotalPaid,
        newLoanStatus,
        allocatedInstallments,
        isFullPayoff
      };
    });

    // 2. Automated Customer SMS Receipt
    let smsResult = null;
    try {
      // Find next upcoming installment if loan is still active
      const nextInstallment = get(
        `SELECT installment_number, due_date, scheduled_amount 
         FROM loan_schedules 
         WHERE loan_id = ? AND remaining_balance > 0 
         ORDER BY installment_number ASC LIMIT 1`,
        loan_id
      );

      smsResult = await sendPaymentReceiptSms({
        customerId: loan.customer_id,
        loanId: loan_id,
        paymentAmount: amount,
        paymentMethod: payment_method,
        paymentDate: payDate,
        totalPaid: transactionResult.newTotalPaid,
        outstandingBalance: transactionResult.newOutstanding,
        nextInstallment,
        isSettlement: transactionResult.isFullPayoff
      });
    } catch (smsErr) {
      console.warn('SMS receipt delivery warning:', smsErr.message);
      smsResult = { success: false, error: smsErr.message };
    }

    const txPayload = {
      id: transactionResult.transactionId,
      receipt_number: transactionResult.receiptNumber,
      loan_id,
      amount_paid: amount,
      payment_date: payDate,
      payment_method,
      outstanding_balance: transactionResult.newOutstanding,
      loan_status: transactionResult.newLoanStatus,
      is_settled: transactionResult.isFullPayoff
    };

    return res.status(201).json({
      message: transactionResult.isFullPayoff 
        ? `Loan ${loan_id} successfully settled and marked Closed! SMS receipt sent to customer.`
        : `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully! SMS receipt sent to customer.`,
      payment: txPayload,
      transaction: txPayload,
      receipt_sms_sent: smsResult?.success ?? false,
      allocated_installments: transactionResult.allocatedInstallments,
      sms: smsResult
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

/**
 * 4. Payment Reversal
 */
function reversePayment(req, res) {
  try {
    const { id } = req.params;
    const { reversal_reason } = req.body;

    if (!reversal_reason || !reversal_reason.trim()) {
      return res.status(400).json({ error: 'Reversal reason is mandatory.' });
    }

    const tx = get('SELECT * FROM payment_transactions WHERE id = ?', id);
    if (!tx) {
      return res.status(404).json({ error: 'Payment transaction not found.' });
    }

    if (tx.is_reversed) {
      return res.status(400).json({ error: 'This payment transaction has already been reversed.' });
    }

    const loan = get('SELECT * FROM loans WHERE id = ?', tx.loan_id);
    if (!loan) {
      return res.status(404).json({ error: 'Associated loan record not found.' });
    }

    transaction(() => {
      const allocations = all(
        'SELECT * FROM payment_allocations WHERE transaction_id = ?',
        tx.id
      );

      for (const alloc of allocations) {
        const inst = get('SELECT * FROM loan_schedules WHERE id = ?', alloc.schedule_id);
        if (inst) {
          const restoredPaid = Math.max(0, Math.round((inst.amount_paid - alloc.amount_allocated) * 100) / 100);
          const restoredRemaining = Math.round((inst.remaining_balance + alloc.amount_allocated) * 100) / 100;
          
          let restoredStatus = 'DUE';
          const today = new Date().toISOString().split('T')[0];
          if (restoredPaid === 0) {
            restoredStatus = inst.due_date < today ? 'OVERDUE' : 'DUE';
          } else {
            restoredStatus = 'PARTIALLY_PAID';
          }

          run(
            `UPDATE loan_schedules 
             SET amount_paid = ?, remaining_balance = ?, status = ?
             WHERE id = ?`,
            restoredPaid,
            restoredRemaining,
            restoredStatus,
            inst.id
          );
        }
      }

      const newLoanTotalPaid = Math.max(0, Math.round((loan.total_paid_amount - tx.amount_paid) * 100) / 100);
      const newLoanOutstanding = Math.round((loan.expected_total_repayment - newLoanTotalPaid) * 100) / 100;

      const hasOverdue = get(
        `SELECT id FROM loan_schedules WHERE loan_id = ? AND status = 'OVERDUE' LIMIT 1`,
        loan.id
      );
      const newLoanStatus = hasOverdue ? 'OVERDUE' : 'ACTIVE';

      run(
        `UPDATE loans 
         SET total_paid_amount = ?, outstanding_balance = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        newLoanTotalPaid,
        newLoanOutstanding,
        newLoanStatus,
        loan.id
      );

      run(
        `UPDATE payment_transactions 
         SET is_reversed = 1, reversal_reason = ?, reversed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        reversal_reason.trim(),
        tx.id
      );

      logAudit({
        adminId: req.admin.id,
        adminUsername: req.admin.username,
        action: 'PAYMENT_REVERSED',
        entityType: 'PAYMENT_TRANSACTION',
        entityId: tx.id,
        details: {
          receiptNumber: tx.receipt_number,
          loanId: tx.loan_id,
          amountReversed: tx.amount_paid,
          reason: reversal_reason.trim()
        },
        ipAddress: req.ip
      });
    });

    return res.json({
      message: `Payment transaction ${tx.receipt_number} reversed successfully. Outstanding balance restored.`
    });
  } catch (err) {
    return res.status(500).json({ error: `Reversal failed: ${err.message}` });
  }
}

/**
 * 5. Payment History Ledger
 */
function getPaymentHistory(req, res) {
  const { customer_id, loan_id, payment_method, date_from, date_to } = req.query;
  let sql = `
    SELECT pt.*, c.full_name as customer_name, c.mobile_number, l.principal_amount, a.full_name as admin_name
    FROM payment_transactions pt
    JOIN customers c ON pt.customer_id = c.id
    JOIN loans l ON pt.loan_id = l.id
    LEFT JOIN admins a ON pt.recorded_by_admin_id = a.id
    WHERE 1=1
  `;
  const params = [];

  if (customer_id) {
    sql += ' AND pt.customer_id = ?';
    params.push(customer_id);
  }
  if (loan_id) {
    sql += ' AND pt.loan_id = ?';
    params.push(loan_id);
  }
  if (payment_method && payment_method !== 'ALL') {
    sql += ' AND pt.payment_method = ?';
    params.push(payment_method);
  }
  if (date_from) {
    sql += ' AND pt.payment_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    sql += ' AND pt.payment_date <= ?';
    params.push(date_to);
  }

  sql += ' ORDER BY pt.created_at DESC';
  const transactions = all(sql, ...params);
  return res.json({ transactions });
}

/**
 * 6. Official Printable Receipt
 */
function getReceipt(req, res) {
  const { receiptNumber } = req.params;
  const tx = get(
    `SELECT pt.*, c.full_name as customer_name, c.mobile_number, c.address as customer_address,
            l.principal_amount, l.expected_total_repayment, l.outstanding_balance, l.total_duration_weeks
     FROM payment_transactions pt
     JOIN customers c ON pt.customer_id = c.id
     JOIN loans l ON pt.loan_id = l.id
     WHERE pt.receipt_number = ?`,
    receiptNumber
  );

  if (!tx) {
    return res.status(404).json({ error: 'Receipt not found.' });
  }

  const allocations = all(
    `SELECT pa.amount_allocated, ls.installment_number, ls.due_date, ls.remaining_balance
     FROM payment_allocations pa
     JOIN loan_schedules ls ON pa.schedule_id = ls.id
     WHERE pa.transaction_id = ?`,
    tx.id
  );

  const settingsRows = all('SELECT key, value FROM settings');
  const settings = {};
  for (const s of settingsRows) settings[s.key] = s.value;

  return res.json({
    receipt: tx,
    allocations,
    business: {
      name: settings.business_name || 'Vishva Finance',
      phone: settings.business_phone || '',
      email: settings.business_email || '',
      address: settings.business_address || '',
      currency: settings.currency_symbol || '₹'
    }
  });
}

module.exports = {
  initiatePaymentOtp,
  getSettlementQuote,
  recordPayment,
  reversePayment,
  getPaymentHistory,
  getReceipt
};
