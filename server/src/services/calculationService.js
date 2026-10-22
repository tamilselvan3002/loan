/**
 * Loan Calculation Service
 * Supports Daily, Weekly, and Monthly repayment frequencies
 * Supports Flat Rate (Per-Term, Annualized, Fixed) and Reducing Balance
 * with strict penny/paisa rounding reconciliation on the final installment.
 */

function addIntervalToDate(dateString, intervalIndex, frequency = 'WEEKLY') {
  const d = new Date(dateString);
  const freq = (frequency || 'WEEKLY').toUpperCase();

  if (freq === 'DAILY') {
    d.setDate(d.getDate() + intervalIndex);
  } else if (freq === 'MONTHLY') {
    // Preserve day of month as much as possible
    const day = d.getDate();
    d.setMonth(d.getMonth() + intervalIndex);
    if (d.getDate() !== day) {
      d.setDate(0); // clamp to last day of previous month
    }
  } else {
    // Default WEEKLY
    d.setDate(d.getDate() + intervalIndex * 7);
  }

  return d.toISOString().split('T')[0];
}

function addWeeksToDate(dateString, weeks) {
  return addIntervalToDate(dateString, weeks, 'WEEKLY');
}

function calculateLoanSchedule({
  principal,
  interestRatePercent,
  interestMethod = 'FLAT_RATE',
  repaymentFrequency = 'WEEKLY',
  flatRateType = 'PER_TERM',
  customInterestAmount = 0,
  durationWeeks,
  durationDays,
  durationMonths,
  totalInstallments,
  firstRepaymentDate
}) {
  const p = Number(principal);
  const rate = Number(interestRatePercent || 0);
  const frequency = (repaymentFrequency || 'WEEKLY').toUpperCase();

  // Resolve total number of installments
  let installments = 0;
  if (totalInstallments && parseInt(totalInstallments, 10) > 0) {
    installments = parseInt(totalInstallments, 10);
  } else if (frequency === 'DAILY' && durationDays && parseInt(durationDays, 10) > 0) {
    installments = parseInt(durationDays, 10);
  } else if (frequency === 'MONTHLY' && durationMonths && parseInt(durationMonths, 10) > 0) {
    installments = parseInt(durationMonths, 10);
  } else if (durationWeeks && parseInt(durationWeeks, 10) > 0) {
    installments = parseInt(durationWeeks, 10);
  } else {
    installments = 10; // Default
  }

  if (p <= 0 || isNaN(p)) throw new Error('Principal must be a positive number');
  if (rate < 0 || isNaN(rate)) throw new Error('Interest rate must be a non-negative number');
  if (installments <= 0 || isNaN(installments)) throw new Error('Duration / Number of installments must be a positive integer');
  if (!firstRepaymentDate) throw new Error('First repayment date is required');

  let expectedTotalInterest = 0;
  let expectedTotalRepayment = 0;
  const schedule = [];

  // Equivalent duration in weeks for database compatibility
  let equivalentWeeks = installments;
  if (frequency === 'DAILY') {
    equivalentWeeks = Math.max(1, Math.ceil(installments / 7));
  } else if (frequency === 'MONTHLY') {
    equivalentWeeks = Math.max(1, Math.round(installments * 4.33));
  }

  if (interestMethod === 'FLAT_RATE') {
    if (flatRateType === 'PER_TERM') {
      // Flat % for the full tenure (e.g. 10% on 10,000 = 1,000)
      expectedTotalInterest = Math.round((p * (rate / 100)) * 100) / 100;
    } else if (flatRateType === 'FIXED_AMOUNT') {
      // Fixed rupee interest directly specified
      expectedTotalInterest = Math.round(Number(customInterestAmount || 0) * 100) / 100;
    } else {
      // Annualized percentage: (Principal * Rate / 100) * (Periods / PeriodsPerYear)
      let periodsPerYear = 52;
      if (frequency === 'DAILY') periodsPerYear = 365;
      else if (frequency === 'MONTHLY') periodsPerYear = 12;

      expectedTotalInterest = Math.round((p * (rate / 100) * (installments / periodsPerYear)) * 100) / 100;
    }
    expectedTotalRepayment = Math.round((p + expectedTotalInterest) * 100) / 100;

    const basePrincipalPerPeriod = Math.floor((p / installments) * 100) / 100;
    const baseInterestPerPeriod = Math.floor((expectedTotalInterest / installments) * 100) / 100;
    const baseInstallment = Math.round((basePrincipalPerPeriod + baseInterestPerPeriod) * 100) / 100;

    let accumulatedInstallments = 0;
    let accumulatedPrincipal = 0;
    let accumulatedInterest = 0;

    for (let i = 1; i <= installments; i++) {
      const dueDate = addIntervalToDate(firstRepaymentDate, i - 1, frequency);
      let installmentAmt, principalPart, interestPart;

      if (i === installments) {
        // Reconcile final installment to match exact total
        installmentAmt = Math.round((expectedTotalRepayment - accumulatedInstallments) * 100) / 100;
        principalPart = Math.round((p - accumulatedPrincipal) * 100) / 100;
        interestPart = Math.round((expectedTotalInterest - accumulatedInterest) * 100) / 100;
      } else {
        installmentAmt = baseInstallment;
        principalPart = basePrincipalPerPeriod;
        interestPart = baseInterestPerPeriod;
        accumulatedInstallments = Math.round((accumulatedInstallments + installmentAmt) * 100) / 100;
        accumulatedPrincipal = Math.round((accumulatedPrincipal + principalPart) * 100) / 100;
        accumulatedInterest = Math.round((accumulatedInterest + interestPart) * 100) / 100;
      }

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        scheduled_amount: installmentAmt,
        principal_component: principalPart,
        interest_component: interestPart,
        amount_paid: 0,
        remaining_balance: installmentAmt,
        status: 'UPCOMING'
      });
    }
  } else if (interestMethod === 'REDUCING_BALANCE') {
    // Reducing balance EMI
    let periodsPerYear = 52;
    if (frequency === 'DAILY') periodsPerYear = 365;
    else if (frequency === 'MONTHLY') periodsPerYear = 12;

    const periodicRate = (rate / 100) / periodsPerYear;
    let periodicEmi;

    if (periodicRate === 0) {
      periodicEmi = Math.round((p / installments) * 100) / 100;
      expectedTotalInterest = 0;
      expectedTotalRepayment = p;
    } else {
      const factor = Math.pow(1 + periodicRate, installments);
      periodicEmi = Math.round((p * (periodicRate * factor) / (factor - 1)) * 100) / 100;
    }

    let remainingPrincipal = p;
    let accumulatedInstallments = 0;
    let totalCalculatedInterest = 0;

    for (let i = 1; i <= installments; i++) {
      const dueDate = addIntervalToDate(firstRepaymentDate, i - 1, frequency);
      const interestForPeriod = Math.round((remainingPrincipal * periodicRate) * 100) / 100;
      totalCalculatedInterest = Math.round((totalCalculatedInterest + interestForPeriod) * 100) / 100;

      let principalPart = Math.round((periodicEmi - interestForPeriod) * 100) / 100;
      let installmentAmt = periodicEmi;

      if (i === installments) {
        principalPart = Math.round(remainingPrincipal * 100) / 100;
        installmentAmt = Math.round((principalPart + interestForPeriod) * 100) / 100;
      }

      remainingPrincipal = Math.max(0, Math.round((remainingPrincipal - principalPart) * 100) / 100);
      accumulatedInstallments = Math.round((accumulatedInstallments + installmentAmt) * 100) / 100;

      schedule.push({
        installment_number: i,
        due_date: dueDate,
        scheduled_amount: installmentAmt,
        principal_component: principalPart,
        interest_component: interestForPeriod,
        amount_paid: 0,
        remaining_balance: installmentAmt,
        status: 'UPCOMING'
      });
    }

    expectedTotalInterest = totalCalculatedInterest;
    expectedTotalRepayment = accumulatedInstallments;
  } else {
    throw new Error(`Unsupported interest method: ${interestMethod}`);
  }

  // Maturity date is the due date of the final installment
  const maturityDate = schedule[schedule.length - 1].due_date;
  const singleInstallmentAmount = schedule[0]?.scheduled_amount || 0;

  return {
    principal: p,
    interestRatePercent: rate,
    interestMethod,
    repaymentFrequency: frequency,
    totalDurationWeeks: equivalentWeeks,
    durationWeeks: equivalentWeeks,
    totalInstallments: installments,
    installmentAmount: singleInstallmentAmount,
    expectedTotalInterest,
    expectedTotalRepayment,
    maturityDate,
    schedule
  };
}

module.exports = {
  calculateLoanSchedule,
  addWeeksToDate,
  addIntervalToDate
};
