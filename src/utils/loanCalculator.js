/**
 * Calculates weekly repayment schedules with exact paisa/penny reconciliation
 */
export function calculateSchedule({
  principal,
  annualInterestRate, // in percentage, e.g. 15 for 15%
  tenureWeeks,
  interestType = 'flat', // 'flat' or 'reducing'
  startDate = new Date()
}) {
  const p = Number(principal);
  const rate = Number(annualInterestRate) / 100;
  const weeks = Number(tenureWeeks);
  
  if (!p || !weeks || weeks <= 0) return { totalInterest: 0, totalRepayment: 0, installments: [] };

  const start = new Date(startDate);
  const installments = [];

  if (interestType === 'flat') {
    // Flat rate calculation: Interest is based purely on principal for the fraction of year (weeks / 52)
    const annualInterest = p * rate;
    const totalInterest = Math.round((annualInterest * (weeks / 52)) * 100) / 100;
    const totalRepayment = Math.round((p + totalInterest) * 100) / 100;
    
    const regularInstallment = Math.floor((totalRepayment / weeks) * 100) / 100;
    const regularPrincipal = Math.floor((p / weeks) * 100) / 100;
    const regularInterest = Math.round((regularInstallment - regularPrincipal) * 100) / 100;

    let accumulatedTotal = 0;
    let accumulatedPrincipal = 0;
    let remainingPrincipal = p;

    for (let i = 1; i <= weeks; i++) {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + (i * 7));

      let instAmount = regularInstallment;
      let instPrincipal = regularPrincipal;
      let instInterest = regularInterest;

      // Final installment reconciliation
      if (i === weeks) {
        instAmount = Math.round((totalRepayment - accumulatedTotal) * 100) / 100;
        instPrincipal = Math.round((p - accumulatedPrincipal) * 100) / 100;
        instInterest = Math.round((instAmount - instPrincipal) * 100) / 100;
      }

      accumulatedTotal = Math.round((accumulatedTotal + instAmount) * 100) / 100;
      accumulatedPrincipal = Math.round((accumulatedPrincipal + instPrincipal) * 100) / 100;
      remainingPrincipal = Math.max(0, Math.round((p - accumulatedPrincipal) * 100) / 100);

      installments.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        totalAmount: instAmount,
        principalAmount: instPrincipal,
        interestAmount: instInterest,
        paidAmount: 0,
        remainingPrincipal: remainingPrincipal,
        status: 'pending' // pending, partial, paid, overdue
      });
    }

    return {
      principal: p,
      totalInterest,
      totalRepayment,
      weeklyEmi: regularInstallment,
      installments
    };
  } else {
    // Reducing balance EMI calculation
    const weeklyRate = rate / 52;
    // EMI = [P * r * (1+r)^n] / [(1+r)^n - 1]
    const factor = Math.pow(1 + weeklyRate, weeks);
    const regularInstallment = Math.round(((p * weeklyRate * factor) / (factor - 1)) * 100) / 100;

    let currentBalance = p;
    let totalInterest = 0;
    let totalRepayment = 0;

    for (let i = 1; i <= weeks; i++) {
      const dueDate = new Date(start);
      dueDate.setDate(dueDate.getDate() + (i * 7));

      const instInterest = Math.round((currentBalance * weeklyRate) * 100) / 100;
      let instPrincipal = Math.round((regularInstallment - instInterest) * 100) / 100;
      let instAmount = regularInstallment;

      if (i === weeks || currentBalance - instPrincipal < 0) {
        instPrincipal = currentBalance;
        instAmount = Math.round((instPrincipal + instInterest) * 100) / 100;
      }

      currentBalance = Math.max(0, Math.round((currentBalance - instPrincipal) * 100) / 100);
      totalInterest = Math.round((totalInterest + instInterest) * 100) / 100;
      totalRepayment = Math.round((totalRepayment + instAmount) * 100) / 100;

      installments.push({
        installmentNumber: i,
        dueDate: dueDate.toISOString().split('T')[0],
        totalAmount: instAmount,
        principalAmount: instPrincipal,
        interestAmount: instInterest,
        paidAmount: 0,
        remainingPrincipal: currentBalance,
        status: 'pending'
      });
    }

    return {
      principal: p,
      totalInterest,
      totalRepayment,
      weeklyEmi: regularInstallment,
      installments
    };
  }
}
