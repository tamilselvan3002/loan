const { get, all } = require('../config/db');
const { syncOverdueStatuses } = require('./loanController');

function getDashboardStats(req, res) {
  syncOverdueStatuses();

  const today = new Date().toISOString().split('T')[0];

  // Calculate start of current week (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0 for Monday
  const startOfWeekDate = new Date(now);
  startOfWeekDate.setDate(now.getDate() - dayOfWeek);
  const startOfWeek = startOfWeekDate.toISOString().split('T')[0];

  // Next 7 days for upcoming payments
  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(now.getDate() + 7);
  const endOfNextWeek = nextWeekDate.toISOString().split('T')[0];

  // 1. Overall counts
  const totalCustomers = get('SELECT COUNT(*) as count FROM customers')?.count || 0;

  // 2. Loan totals
  const loanTotals = get(`
    SELECT 
      COUNT(*) as total_loans,
      COALESCE(SUM(principal_amount), 0) as total_principal,
      COALESCE(SUM(expected_total_interest), 0) as total_interest,
      COALESCE(SUM(expected_total_repayment), 0) as total_expected,
      COALESCE(SUM(total_paid_amount), 0) as total_collected,
      COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
      SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_loans,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_loans,
      SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_loans
    FROM loans
    WHERE status != 'CANCELLED'
  `) || {};

  // 3. Payments collected today and this week
  const todayCollections = get(
    `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payment_transactions WHERE payment_date = ? AND is_reversed = 0`,
    today
  )?.total || 0;

  const thisWeekCollections = get(
    `SELECT COALESCE(SUM(amount_paid), 0) as total FROM payment_transactions WHERE payment_date >= ? AND payment_date <= ? AND is_reversed = 0`,
    startOfWeek,
    today
  )?.total || 0;

  // 4. Upcoming payments in next 7 days
  const upcomingPayments = get(
    `SELECT 
       COUNT(*) as count,
       COALESCE(SUM(remaining_balance), 0) as amount
     FROM loan_schedules
     WHERE due_date >= ? AND due_date <= ? AND remaining_balance > 0 AND status IN ('UPCOMING', 'DUE')`,
    today,
    endOfNextWeek
  ) || { count: 0, amount: 0 };

  // 5. Overdue payments
  const overduePayments = get(
    `SELECT 
       COUNT(*) as count,
       COALESCE(SUM(remaining_balance), 0) as amount
     FROM loan_schedules
     WHERE due_date < ? AND remaining_balance > 0`,
    today
  ) || { count: 0, amount: 0 };

  // 6. Recent transactions (latest 10)
  const recentTransactions = all(`
    SELECT pt.*, c.full_name as customer_name
    FROM payment_transactions pt
    JOIN customers c ON pt.customer_id = c.id
    ORDER BY pt.created_at DESC
    LIMIT 10
  `);

  // 7. Recent 6 weeks collection trend
  const weeklyTrend = all(`
    SELECT 
      strftime('%Y-W%W', payment_date) as week_label,
      COALESCE(SUM(amount_paid), 0) as amount
    FROM payment_transactions
    WHERE is_reversed = 0
    GROUP BY week_label
    ORDER BY week_label DESC
    LIMIT 8
  `).reverse();

  return res.json({
    kpis: {
      totalCustomers,
      totalLoans: loanTotals.total_loans || 0,
      totalPrincipal: loanTotals.total_principal || 0,
      totalInterestExpected: loanTotals.total_interest || 0,
      totalAmountCollected: loanTotals.total_collected || 0,
      totalOutstanding: loanTotals.total_outstanding || 0,
      activeLoans: loanTotals.active_loans || 0,
      completedLoans: loanTotals.completed_loans || 0,
      overdueLoans: loanTotals.overdue_loans || 0,
      todayCollections,
      thisWeekCollections,
      upcomingCount: upcomingPayments.count,
      upcomingAmount: upcomingPayments.amount,
      overdueCount: overduePayments.count,
      overdueAmount: overduePayments.amount
    },
    recentTransactions,
    weeklyTrend
  });
}

function getCustomerWiseReport(req, res) {
  const rows = all(`
    SELECT 
      c.id, c.full_name, c.mobile_number, c.status as customer_status,
      COUNT(l.id) as total_loans,
      SUM(CASE WHEN l.status IN ('ACTIVE', 'OVERDUE') THEN 1 ELSE 0 END) as active_loans,
      COALESCE(SUM(l.principal_amount), 0) as total_principal,
      COALESCE(SUM(l.total_paid_amount), 0) as total_repaid,
      COALESCE(SUM(l.outstanding_balance), 0) as total_outstanding,
      (
        SELECT COALESCE(SUM(ls.remaining_balance), 0)
        FROM loan_schedules ls
        JOIN loans l2 ON ls.loan_id = l2.id
        WHERE l2.customer_id = c.id AND ls.due_date < date('now') AND ls.remaining_balance > 0
      ) as overdue_amount
    FROM customers c
    LEFT JOIN loans l ON c.id = l.customer_id AND l.status != 'CANCELLED'
    GROUP BY c.id
    ORDER BY total_outstanding DESC, c.full_name ASC
  `);

  return res.json({ report: rows });
}


function getCollectionReport(req, res) {
  const { groupBy = 'day', start_date, end_date } = req.query;

  let dateGroupExpr = "date(payment_date)";
  if (groupBy === 'week') dateGroupExpr = "strftime('%Y-W%W', payment_date)";
  if (groupBy === 'month') dateGroupExpr = "strftime('%Y-%m', payment_date)";

  let sql = `
    SELECT 
      ${dateGroupExpr} as period,
      COUNT(*) as transaction_count,
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_amount,
      COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_amount,
      COALESCE(SUM(CASE WHEN payment_method = 'BANK_TRANSFER' THEN amount_paid ELSE 0 END), 0) as bank_amount,
      COALESCE(SUM(CASE WHEN payment_method = 'CHEQUE' THEN amount_paid ELSE 0 END), 0) as cheque_amount,
      COALESCE(SUM(amount_paid), 0) as total_collected
    FROM payment_transactions
    WHERE is_reversed = 0
  `;
  const params = [];

  if (start_date) {
    sql += ' AND payment_date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    sql += ' AND payment_date <= ?';
    params.push(end_date);
  }

  sql += ` GROUP BY period ORDER BY period DESC`;

  const rows = all(sql, ...params);
  return res.json({ report: rows });
}

function getOverdueReport(req, res) {
  syncOverdueStatuses();
  const today = new Date().toISOString().split('T')[0];

  const rows = all(`
    SELECT 
      ls.id as schedule_id, ls.installment_number, ls.due_date, ls.scheduled_amount, 
      ls.amount_paid, ls.remaining_balance,
      CAST((julianday(?) - julianday(ls.due_date)) AS INTEGER) as days_overdue,
      l.id as loan_id, l.principal_amount,
      c.id as customer_id, c.full_name as customer_name, c.mobile_number as customer_mobile
    FROM loan_schedules ls
    JOIN loans l ON ls.loan_id = l.id
    JOIN customers c ON l.customer_id = c.id
    WHERE ls.due_date < ? AND ls.remaining_balance > 0 AND l.status != 'CANCELLED'
    ORDER BY days_overdue DESC, ls.due_date ASC
  `, today, today);

  return res.json({ report: rows });
}

function getFinancialSummary(req, res) {
  const summary = get(`
    SELECT 
      COUNT(*) as total_loans,
      COALESCE(SUM(principal_amount), 0) as total_principal_issued,
      COALESCE(SUM(expected_total_interest), 0) as total_expected_interest,
      COALESCE(SUM(expected_total_repayment), 0) as total_expected_repayment,
      COALESCE(SUM(total_paid_amount), 0) as total_collected,
      COALESCE(SUM(outstanding_balance), 0) as total_outstanding
    FROM loans
    WHERE status != 'CANCELLED'
  `);

  const paymentBreakdown = get(`
    SELECT 
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount_paid ELSE 0 END), 0) as cash_total,
      COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN amount_paid ELSE 0 END), 0) as upi_total,
      COALESCE(SUM(CASE WHEN payment_method = 'BANK_TRANSFER' THEN amount_paid ELSE 0 END), 0) as bank_total,
      COALESCE(SUM(CASE WHEN payment_method = 'CHEQUE' THEN amount_paid ELSE 0 END), 0) as cheque_total,
      COUNT(*) as total_payments_count
    FROM payment_transactions
    WHERE is_reversed = 0
  `);

  // Reconciliation check
  const calculatedTotal = (summary?.total_collected || 0) + (summary?.total_outstanding || 0);
  const expectedTotal = summary?.total_expected_repayment || 0;
  const discrepancy = Math.round(Math.abs(calculatedTotal - expectedTotal) * 100) / 100;

  return res.json({
    summary,
    paymentBreakdown,
    reconciliation: {
      totalCollected: summary?.total_collected || 0,
      totalOutstanding: summary?.total_outstanding || 0,
      sum: calculatedTotal,
      expectedTotal,
      isReconciled: discrepancy <= 0.05,
      discrepancy
    }
  });
}

module.exports = {
  getDashboardStats,
  getCustomerWiseReport,
  getCollectionReport,
  getOverdueReport,
  getFinancialSummary
};
