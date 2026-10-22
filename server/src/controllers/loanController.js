const { get, all, run, transaction } = require('../config/db');
const { calculateLoanSchedule } = require('../services/calculationService');
const { logAudit } = require('../services/auditService');

function generateNextLoanId() {
  const lastLoan = get(`SELECT id FROM loans WHERE id LIKE 'LOAN-%' ORDER BY id DESC LIMIT 1`);
  if (!lastLoan) {
    return 'LOAN-1001';
  }
  const match = lastLoan.id.match(/^LOAN-(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `LOAN-${nextNum}`;
  }
  return `LOAN-${Date.now().toString().slice(-4)}`;
}

/**
 * Periodically or on-demand mark overdue schedules and loans
 */
function syncOverdueStatuses() {
  const today = new Date().toISOString().split('T')[0];

  transaction(() => {
    // 1. Mark installments as OVERDUE if due_date < today and status is UPCOMING or DUE or PARTIALLY_PAID
    run(
      `UPDATE loan_schedules 
       SET status = 'OVERDUE' 
       WHERE due_date < ? 
         AND remaining_balance > 0 
         AND status != 'OVERDUE'`,
      today
    );

    // 2. Mark installments as DUE if due_date = today and remaining_balance > 0
    run(
      `UPDATE loan_schedules 
       SET status = 'DUE' 
       WHERE due_date = ? 
         AND remaining_balance > 0 
         AND status = 'UPCOMING'`,
      today
    );

    // 3. Mark loans as OVERDUE if they have overdue installments and are ACTIVE
    run(
      `UPDATE loans 
       SET status = 'OVERDUE', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'ACTIVE' 
         AND id IN (
           SELECT DISTINCT loan_id FROM loan_schedules WHERE status = 'OVERDUE'
         )`
    );

    // 4. Mark loans as ACTIVE if they were OVERDUE but have no more overdue installments and outstanding > 0
    run(
      `UPDATE loans 
       SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'OVERDUE' 
         AND outstanding_balance > 0
         AND id NOT IN (
           SELECT DISTINCT loan_id FROM loan_schedules WHERE status = 'OVERDUE'
         )`
    );
  });
}

function previewLoan(req, res) {
  try {
    const {
      principal,
      interestRatePercent,
      interestMethod,
      repaymentFrequency = 'WEEKLY',
      flatRateType,
      customInterestAmount,
      durationWeeks,
      durationDays,
      durationMonths,
      totalInstallments,
      firstRepaymentDate
    } = req.body;

    const calculation = calculateLoanSchedule({
      principal,
      interestRatePercent,
      interestMethod,
      repaymentFrequency,
      flatRateType,
      customInterestAmount,
      durationWeeks,
      durationDays,
      durationMonths,
      totalInstallments,
      firstRepaymentDate
    });

    return res.json({ calculation });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

function createLoan(req, res) {
  try {
    const {
      customer_id,
      agent_id,
      principal_amount,
      interest_rate_percent,
      interest_method = 'FLAT_RATE',
      repayment_frequency = 'WEEKLY',
      flat_rate_type = 'PER_TERM',
      custom_interest_amount = 0,
      duration_weeks,
      duration_days,
      duration_months,
      total_installments,
      first_repayment_date,
      issue_date,
      notes,
      confirm_active_loan_override = false
    } = req.body;

    // Validate customer
    const customer = get('SELECT * FROM customers WHERE id = ?', customer_id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (customer.status === 'BLACKLISTED') {
      return res.status(400).json({ error: 'Cannot issue loan: Customer is blacklisted.' });
    }

    // Check for existing active or overdue loans for this customer
    const existingActiveLoans = all(
      `SELECT id, principal_amount, outstanding_balance, status 
       FROM loans 
       WHERE customer_id = ? AND status IN ('ACTIVE', 'OVERDUE')`,
      customer_id
    );

    if (existingActiveLoans.length > 0 && !confirm_active_loan_override) {
      return res.status(409).json({
        requiresConfirmation: true,
        message: `Customer already has ${existingActiveLoans.length} active/overdue loan(s) with an outstanding balance of ₹${existingActiveLoans.reduce((sum, l) => sum + l.outstanding_balance, 0).toLocaleString('en-IN')}. Do you want to proceed?`,
        activeLoans: existingActiveLoans
      });
    }

    // Calculate loan schedule
    const calculation = calculateLoanSchedule({
      principal: principal_amount,
      interestRatePercent: interest_rate_percent,
      interestMethod: interest_method,
      repaymentFrequency: repayment_frequency,
      flatRateType: flat_rate_type,
      customInterestAmount: custom_interest_amount,
      durationWeeks: duration_weeks,
      durationDays: duration_days,
      durationMonths: duration_months,
      totalInstallments: total_installments,
      firstRepaymentDate: first_repayment_date
    });

    const loanId = generateNextLoanId();
    const loanIssueDate = issue_date || new Date().toISOString().split('T')[0];

    // Snapshot of terms
    const termsSnapshot = {
      principal: calculation.principal,
      interestRatePercent: calculation.interestRatePercent,
      interestMethod: calculation.interestMethod,
      repaymentFrequency: calculation.repaymentFrequency || 'WEEKLY',
      durationWeeks: calculation.durationWeeks,
      totalInstallments: calculation.totalInstallments,
      expectedTotalInterest: calculation.expectedTotalInterest,
      expectedTotalRepayment: calculation.expectedTotalRepayment,
      issueDate: loanIssueDate,
      firstRepaymentDate: first_repayment_date,
      maturityDate: calculation.maturityDate,
      issuedAt: new Date().toISOString()
    };

    // Execute atomic creation
    transaction(() => {
      run(
        `INSERT INTO loans (
           id, customer_id, agent_id, principal_amount, interest_rate_percent, 
           interest_method, repayment_frequency, total_duration_weeks, total_installments,
           expected_total_interest, expected_total_repayment, total_paid_amount,
           outstanding_balance, issue_date, first_repayment_date, maturity_date,
           status, terms_snapshot_json, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        loanId,
        customer_id,
        agent_id || null,
        calculation.principal,
        calculation.interestRatePercent,
        calculation.interestMethod,
        calculation.repaymentFrequency || 'WEEKLY',
        calculation.durationWeeks,
        calculation.totalInstallments,
        calculation.expectedTotalInterest,
        calculation.expectedTotalRepayment,
        0,
        calculation.expectedTotalRepayment,
        loanIssueDate,
        first_repayment_date,
        calculation.maturityDate,
        'ACTIVE',
        JSON.stringify(termsSnapshot),
        notes ? notes.trim() : null
      );

      for (const item of calculation.schedule) {
        run(
          `INSERT INTO loan_schedules (
             loan_id, installment_number, due_date, scheduled_amount,
             principal_component, interest_component, amount_paid,
             remaining_balance, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          loanId,
          item.installment_number,
          item.due_date,
          item.scheduled_amount,
          item.principal_component,
          item.interest_component,
          0,
          item.remaining_balance,
          'UPCOMING'
        );
      }
    });

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'LOAN_CREATED',
      entityType: 'LOAN',
      entityId: loanId,
      details: {
        customer_id,
        agent_id,
        principal: calculation.principal,
        expectedTotalRepayment: calculation.expectedTotalRepayment,
        durationWeeks: calculation.durationWeeks
      },
      ipAddress: req.ip
    });

    const createdLoan = get('SELECT * FROM loans WHERE id = ?', loanId);
    return res.status(201).json({
      message: 'Loan successfully created and repayment schedule generated.',
      loan: createdLoan
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}

function getLoans(req, res) {
  syncOverdueStatuses();

  const { status, search, customer_id } = req.query;
  let sql = `
    SELECT l.*, 
           c.full_name as customer_name, c.mobile_number as customer_mobile
    FROM loans l
    JOIN customers c ON l.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'ALL') {
    sql += ' AND l.status = ?';
    params.push(status);
  }

  if (customer_id) {
    sql += ' AND l.customer_id = ?';
    params.push(customer_id);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (l.id LIKE ? OR c.full_name LIKE ? OR c.mobile_number LIKE ?)';
    params.push(term, term, term);
  }

  sql += ' ORDER BY l.created_at DESC';
  const loans = all(sql, ...params);

  return res.json({ loans });
}

function getLoanById(req, res) {
  syncOverdueStatuses();

  const { id } = req.params;
  const loan = get(
    `SELECT l.*, 
            c.full_name as customer_name, c.mobile_number as customer_mobile, c.address as customer_address
     FROM loans l
     JOIN customers c ON l.customer_id = c.id
     WHERE l.id = ?`,
    id
  );

  if (!loan) {
    return res.status(404).json({ error: 'Loan not found.' });
  }

  const schedule = all(
    `SELECT * FROM loan_schedules WHERE loan_id = ? ORDER BY installment_number ASC`,
    id
  );

  const payments = all(
    `SELECT * FROM payment_transactions WHERE loan_id = ? ORDER BY payment_date DESC, created_at DESC`,
    id
  );

  let termsSnapshot = null;
  try {
    termsSnapshot = JSON.parse(loan.terms_snapshot_json);
  } catch (e) {}

  return res.json({
    loan,
    termsSnapshot,
    schedule,
    payments
  });
}

function updateLoanStatus(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;

  const loan = get('SELECT * FROM loans WHERE id = ?', id);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found.' });
  }

  if (status && !['ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  run(
    `UPDATE loans 
     SET status = COALESCE(?, status), 
         notes = COALESCE(?, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    status || null,
    notes !== undefined ? notes : null,
    id
  );

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'LOAN_STATUS_UPDATED',
    entityType: 'LOAN',
    entityId: id,
    details: { oldStatus: loan.status, newStatus: status, notes },
    ipAddress: req.ip
  });

  const updated = get('SELECT * FROM loans WHERE id = ?', id);
  return res.json({ loan: updated, message: 'Loan updated successfully.' });
}

module.exports = {
  previewLoan,
  createLoan,
  getLoans,
  getLoanById,
  updateLoanStatus,
  syncOverdueStatuses
};
