import { calculateSchedule } from './loanCalculator';

export const INITIAL_SETTINGS = {
  businessName: 'Apex Capital Microfinance & Loans',
  tagline: 'Trusted Personal & Micro Business Lending',
  contactNumber: '+91 98765 43210',
  email: 'admin@apexloans.com',
  address: 'No. 42, Anna Salai, Mount Road, Chennai, Tamil Nadu - 600002',
  gstNumber: '33AABCA1234D1Z5',
  receiptPrefix: 'RCP',
  smsProvider: 'MOCK', // 'MOCK' or 'MSG91'
  msg91AuthKey: '',
  msg91SenderId: 'APEXLN',
  penaltyPerDay: 50
};

export const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-1001',
    name: 'Rajesh Kumar',
    mobile: '9840123456',
    email: 'rajesh.kumar@gmail.com',
    address: '15, Gandhi Nagar 2nd Street, Adyar, Chennai',
    panNumber: 'ABCDE1234F',
    aadhaarNumber: '9876 5432 1012',
    occupation: 'Retail Shop Owner',
    monthlyIncome: 45000,
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    createdAt: '2026-08-01',
    status: 'active'
  },
  {
    id: 'CUST-1002',
    name: 'Priya Sharma',
    mobile: '9789012345',
    email: 'priya.sharma@outlook.com',
    address: '88, Lake View Road, Velachery, Chennai',
    panNumber: 'BKUPS9876K',
    aadhaarNumber: '4567 8901 2345',
    occupation: 'Software Engineer',
    monthlyIncome: 85000,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face',
    createdAt: '2026-08-15',
    status: 'active'
  },
  {
    id: 'CUST-1003',
    name: 'Ananth Murugan',
    mobile: '9444123890',
    email: 'ananth.m@yahoo.com',
    address: '24, Main Bazaar, Tambaram, Chennai',
    panNumber: 'CQWPM4567M',
    aadhaarNumber: '3456 7890 1234',
    occupation: 'Automobile Mechanic',
    monthlyIncome: 38000,
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    createdAt: '2026-09-01',
    status: 'active'
  }
];

export const INITIAL_AGENTS = [
  {
    id: 'AGT-101',
    name: 'Suresh Babu',
    mobile: '9940123456',
    email: 'suresh.agent@apexloans.com',
    area: 'South Chennai (Adyar, Velachery)',
    status: 'active',
    joinedDate: '2026-01-10'
  },
  {
    id: 'AGT-102',
    name: 'Meena Vijayakumar',
    mobile: '9884123789',
    email: 'meena.agent@apexloans.com',
    area: 'Central Chennai (T.Nagar, Kodambakkam)',
    status: 'active',
    joinedDate: '2026-03-15'
  }
];

// Helper to construct pre-seeded loans
function createSeedLoans() {
  const schedule1 = calculateSchedule({
    principal: 50000,
    annualInterestRate: 14,
    tenureWeeks: 12,
    interestType: 'flat',
    startDate: '2026-08-10'
  });

  // Mark first 6 installments as paid
  let paidSum1 = 0;
  schedule1.installments.forEach((inst, idx) => {
    if (idx < 6) {
      inst.paidAmount = inst.totalAmount;
      inst.status = 'paid';
      inst.paidDate = '2026-08-17';
      paidSum1 += inst.totalAmount;
    } else if (idx === 6) {
      inst.status = 'overdue';
    }
  });

  const schedule2 = calculateSchedule({
    principal: 100000,
    annualInterestRate: 18,
    tenureWeeks: 20,
    interestType: 'reducing',
    startDate: '2026-09-01'
  });

  let paidSum2 = 0;
  schedule2.installments.forEach((inst, idx) => {
    if (idx < 4) {
      inst.paidAmount = inst.totalAmount;
      inst.status = 'paid';
      inst.paidDate = '2026-09-08';
      paidSum2 += inst.totalAmount;
    }
  });

  const schedule3 = calculateSchedule({
    principal: 30000,
    annualInterestRate: 12,
    tenureWeeks: 10,
    interestType: 'flat',
    startDate: '2026-07-01'
  });

  // Complete payoff for loan 3
  let paidSum3 = 0;
  schedule3.installments.forEach((inst) => {
    inst.paidAmount = inst.totalAmount;
    inst.status = 'paid';
    inst.paidDate = inst.dueDate;
    paidSum3 += inst.totalAmount;
  });

  return [
    {
      id: 'LOAN-1001',
      customerId: 'CUST-1001',
      agentId: 'AGT-101',
      principal: 50000,
      annualInterestRate: 14,
      tenureWeeks: 12,
      interestType: 'flat',
      disbursedDate: '2026-08-10',
      totalInterest: schedule1.totalInterest,
      totalRepayment: schedule1.totalRepayment,
      weeklyEmi: schedule1.weeklyEmi,
      totalPaid: Math.round(paidSum1 * 100) / 100,
      outstandingBalance: Math.round((schedule1.totalRepayment - paidSum1) * 100) / 100,
      status: 'active',
      installments: schedule1.installments,
      purpose: 'Grocery shop inventory replenishment'
    },
    {
      id: 'LOAN-1002',
      customerId: 'CUST-1002',
      agentId: 'AGT-102',
      principal: 100000,
      annualInterestRate: 18,
      tenureWeeks: 20,
      interestType: 'reducing',
      disbursedDate: '2026-09-01',
      totalInterest: schedule2.totalInterest,
      totalRepayment: schedule2.totalRepayment,
      weeklyEmi: schedule2.weeklyEmi,
      totalPaid: Math.round(paidSum2 * 100) / 100,
      outstandingBalance: Math.round((schedule2.totalRepayment - paidSum2) * 100) / 100,
      status: 'active',
      installments: schedule2.installments,
      purpose: 'Home renovation and appliance purchase'
    },
    {
      id: 'LOAN-1003',
      customerId: 'CUST-1003',
      agentId: 'AGT-101',
      principal: 30000,
      annualInterestRate: 12,
      tenureWeeks: 10,
      interestType: 'flat',
      disbursedDate: '2026-07-01',
      totalInterest: schedule3.totalInterest,
      totalRepayment: schedule3.totalRepayment,
      weeklyEmi: schedule3.weeklyEmi,
      totalPaid: Math.round(paidSum3 * 100) / 100,
      outstandingBalance: 0,
      status: 'closed',
      installments: schedule3.installments,
      purpose: 'Bike repair shop tools & spare parts'
    }
  ];
}

export const INITIAL_LOANS = createSeedLoans();

export const INITIAL_RECEIPTS = [
  {
    receiptNumber: 'RCP-20261012-1001',
    loanId: 'LOAN-1001',
    customerId: 'CUST-1001',
    customerName: 'Rajesh Kumar',
    amount: 4307.7,
    amountInWords: 'Four Thousand Three Hundred and Seven Rupees Only',
    paymentMode: 'UPI',
    referenceNumber: 'UPI-32984712048',
    paymentDate: '2026-10-12',
    collectedBy: 'Suresh Babu (AGT-101)',
    remainingBalance: 21538.5,
    installmentsCovered: [6],
    notes: 'Timely weekly EMI collected via Google Pay'
  },
  {
    receiptNumber: 'RCP-20261015-1002',
    loanId: 'LOAN-1002',
    customerId: 'CUST-1002',
    customerName: 'Priya Sharma',
    amount: 5187.3,
    amountInWords: 'Five Thousand One Hundred and Eighty Seven Rupees Only',
    paymentMode: 'Bank Transfer',
    referenceNumber: 'NEFT-HDFC00129384',
    paymentDate: '2026-10-15',
    collectedBy: 'Admin Direct',
    remainingBalance: 82996.8,
    installmentsCovered: [4],
    notes: 'Online NetBanking transfer'
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUD-001',
    timestamp: '2026-10-18T10:15:00Z',
    action: 'LOAN_ORIGINATION',
    description: 'Issued Loan LOAN-1002 for Priya Sharma (Amount: ₹1,00,000, 20 Weeks)',
    actor: 'admin',
    ip: '127.0.0.1'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-10-18T14:30:00Z',
    action: 'PAYMENT_RECORDED',
    description: 'Recorded payment of ₹5,187.30 for LOAN-1002 (Receipt: RCP-20261015-1002)',
    actor: 'admin',
    ip: '127.0.0.1'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-10-19T09:00:00Z',
    action: 'SYSTEM_STARTUP',
    description: 'Admin Portal initialized and loaded loan ledgers',
    actor: 'system',
    ip: '127.0.0.1'
  }
];

export const INITIAL_SMS_LOGS = [
  {
    id: 'SMS-001',
    mobile: '9840123456',
    recipientName: 'Rajesh Kumar',
    loanId: 'LOAN-1001',
    type: 'OVERDUE_ALERT',
    message: 'Dear Rajesh Kumar, your weekly EMI of ₹4308 for loan LOAN-1001 is overdue. Please pay immediately to avoid late fee. - Apex Loans',
    timestamp: '2026-10-18 10:00 AM',
    status: 'Delivered (Mock Mode)'
  },
  {
    id: 'SMS-002',
    mobile: '9789012345',
    recipientName: 'Priya Sharma',
    loanId: 'LOAN-1002',
    type: 'PAYMENT_RECEIPT',
    message: 'Thank you Priya Sharma! Received ₹5187 for LOAN-1002 (Receipt: RCP-20261015-1002). Remaining balance: ₹82997. - Apex Loans',
    timestamp: '2026-10-15 02:30 PM',
    status: 'Delivered (Mock Mode)'
  }
];
