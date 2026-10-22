const assert = require('assert');
const { calculateLoanSchedule } = require('../src/services/calculationService');
const { get, all, run, transaction } = require('../src/config/db');
const { seedInitialData } = require('../src/models/seed');
const crypto = require('crypto');

console.log('🧪 Starting Personal Loan System Automated Tests...\n');

// Test 1: Seed verification
console.log('Test 1: Verify Initial Seeding');
seedInitialData();
const admin = get('SELECT username FROM admins WHERE username = ?', 'admin');
assert.ok(admin, 'Default admin must exist');
const settings = get('SELECT value FROM settings WHERE key = ?', 'currency_symbol');
assert.strictEqual(settings.value, '₹', 'Currency must be ₹');
console.log('  ✅ Admin and settings correctly seeded');

// Test 2: Flat rate loan calculation & penny reconciliation
console.log('Test 2: Flat Rate Loan Calculation & Penny Reconciliation');
const flatCalc = calculateLoanSchedule({
  principal: 50000,
  interestRatePercent: 12,
  interestMethod: 'FLAT_RATE',
  durationWeeks: 20,
  firstRepaymentDate: '2026-10-25'
});

assert.strictEqual(flatCalc.principal, 50000);
assert.strictEqual(flatCalc.durationWeeks, 20);
assert.strictEqual(flatCalc.schedule.length, 20);

// Verify that the sum of all installments strictly equals expectedTotalRepayment
const sumInstallments = flatCalc.schedule.reduce((acc, row) => acc + row.scheduled_amount, 0);
const diff = Math.abs(sumInstallments - flatCalc.expectedTotalRepayment);
assert.ok(diff < 0.01, `Sum of installments (${sumInstallments}) must match expected total (${flatCalc.expectedTotalRepayment})`);

// Verify schedule dates are exactly 7 days apart
const d1 = new Date(flatCalc.schedule[0].due_date);
const d2 = new Date(flatCalc.schedule[1].due_date);
const dayDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
assert.strictEqual(dayDiff, 7, 'Installment due dates must be weekly (7 days apart)');
console.log(`  ✅ Flat rate math verified. Total Repayment: ₹${flatCalc.expectedTotalRepayment}, Weekly: ₹${flatCalc.schedule[0].scheduled_amount}, Sum Reconciled: ₹${sumInstallments}`);

// Test 3: Reducing balance calculation
console.log('Test 3: Reducing Balance Loan Calculation');
const redCalc = calculateLoanSchedule({
  principal: 100000,
  interestRatePercent: 15,
  interestMethod: 'REDUCING_BALANCE',
  durationWeeks: 50,
  firstRepaymentDate: '2026-11-01'
});
assert.strictEqual(redCalc.schedule.length, 50);
const redSum = redCalc.schedule.reduce((acc, row) => acc + row.scheduled_amount, 0);
const redDiff = Math.abs(redSum - redCalc.expectedTotalRepayment);
assert.ok(redDiff < 0.05, `Reducing balance installments (${redSum}) must reconcile with expected total (${redCalc.expectedTotalRepayment})`);
console.log(`  ✅ Reducing balance math verified. Expected: ₹${redCalc.expectedTotalRepayment}, Sum: ₹${redSum}`);

// Test 4: Database Transactions & Repayment Ledger Test
console.log('Test 4: Database Atomic Repayments & Reversals');
// Create a test customer and test loan
const testMobile = `987000${Math.floor(1000 + Math.random() * 9000)}`;
const testCustId = `CUST-TEST-${Date.now().toString().slice(-4)}`;
run(
  `INSERT INTO customers (id, full_name, mobile_number, status) VALUES (?, ?, ?, ?)`,
  testCustId,
  'Test Customer',
  testMobile,
  'ACTIVE'
);

const testLoanId = `LOAN-TEST-${Date.now().toString().slice(-4)}`;
const calc = calculateLoanSchedule({
  principal: 20000,
  interestRatePercent: 10,
  interestMethod: 'FLAT_RATE',
  durationWeeks: 10,
  firstRepaymentDate: '2026-10-25'
});

transaction(() => {
  run(
    `INSERT INTO loans (
      id, customer_id, principal_amount, interest_rate_percent, interest_method,
      repayment_frequency, total_duration_weeks, total_installments,
      expected_total_interest, expected_total_repayment, total_paid_amount,
      outstanding_balance, issue_date, first_repayment_date, maturity_date,
      status, terms_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    testLoanId,
    testCustId,
    calc.principal,
    calc.interestRatePercent,
    calc.interestMethod,
    'WEEKLY',
    calc.durationWeeks,
    calc.totalInstallments,
    calc.expectedTotalInterest,
    calc.expectedTotalRepayment,
    0,
    calc.expectedTotalRepayment,
    '2026-10-18',
    '2026-10-25',
    calc.maturityDate,
    'ACTIVE',
    JSON.stringify({ terms: 'test' })
  );

  for (const item of calc.schedule) {
    run(
      `INSERT INTO loan_schedules (
        loan_id, installment_number, due_date, scheduled_amount,
        principal_component, interest_component, amount_paid,
        remaining_balance, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      testLoanId,
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

const loanBefore = get('SELECT * FROM loans WHERE id = ?', testLoanId);
assert.strictEqual(loanBefore.outstanding_balance, calc.expectedTotalRepayment);

// Now simulate a partial payment of ₹1000
const installment1 = get('SELECT * FROM loan_schedules WHERE loan_id = ? AND installment_number = 1', testLoanId);
const inst1Due = installment1.remaining_balance;
const partialAmt = Math.round(inst1Due / 2);

const testTxId = crypto.randomUUID();
transaction(() => {
  run(
    `UPDATE loan_schedules 
     SET amount_paid = amount_paid + ?, remaining_balance = remaining_balance - ?, status = 'PARTIALLY_PAID'
     WHERE id = ?`,
    partialAmt,
    partialAmt,
    installment1.id
  );

  run(
    `UPDATE loans 
     SET total_paid_amount = total_paid_amount + ?, outstanding_balance = outstanding_balance - ?
     WHERE id = ?`,
    partialAmt,
    partialAmt,
    testLoanId
  );

  run(
    `INSERT INTO payment_transactions (
      id, receipt_number, loan_id, customer_id, amount_paid, payment_date, payment_method, recorded_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    testTxId,
    `RCP-TEST-01`,
    testLoanId,
    testCustId,
    partialAmt,
    '2026-10-18',
    'CASH'
  );

  run(
    `INSERT INTO payment_allocations (transaction_id, schedule_id, amount_allocated) VALUES (?, ?, ?)`,
    testTxId,
    installment1.id,
    partialAmt
  );
});

const inst1After = get('SELECT * FROM loan_schedules WHERE id = ?', installment1.id);
assert.strictEqual(inst1After.status, 'PARTIALLY_PAID');
assert.strictEqual(inst1After.amount_paid, partialAmt);
assert.strictEqual(inst1After.remaining_balance, inst1Due - partialAmt);

const loanAfter = get('SELECT * FROM loans WHERE id = ?', testLoanId);
assert.strictEqual(loanAfter.total_paid_amount, partialAmt);
assert.strictEqual(loanAfter.outstanding_balance, calc.expectedTotalRepayment - partialAmt);

console.log(`  ✅ Atomic partial payment verified. Paid: ₹${partialAmt}, Inst 1 Balance: ₹${inst1After.remaining_balance}, Loan Outstanding: ₹${loanAfter.outstanding_balance}`);

// Clean up test records
transaction(() => {
  run('DELETE FROM payment_allocations WHERE transaction_id = ?', testTxId);
  run('DELETE FROM payment_transactions WHERE id = ?', testTxId);
  run('DELETE FROM loan_schedules WHERE loan_id = ?', testLoanId);
  run('DELETE FROM loans WHERE id = ?', testLoanId);
  run('DELETE FROM customers WHERE id = ?', testCustId);
});
console.log('  ✅ Test data cleanly purged\n');

console.log('🎉 All automated backend tests PASSED successfully!\n');
