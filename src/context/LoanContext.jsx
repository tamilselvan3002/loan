import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  INITIAL_CUSTOMERS, 
  INITIAL_AGENTS, 
  INITIAL_LOANS, 
  INITIAL_RECEIPTS, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_SMS_LOGS,
  INITIAL_SETTINGS 
} from '../utils/mockData';
import { calculateSchedule } from '../utils/loanCalculator';
import { numberToWords } from '../utils/numberToWords';

const LoanContext = createContext(null);

export function LoanProvider({ children }) {
  const [customers, setCustomers] = useState(() => {
    const s = localStorage.getItem('loan_customers');
    return s ? JSON.parse(s) : INITIAL_CUSTOMERS;
  });

  const [agents, setAgents] = useState(() => {
    const s = localStorage.getItem('loan_agents');
    return s ? JSON.parse(s) : INITIAL_AGENTS;
  });

  const [loans, setLoans] = useState(() => {
    const s = localStorage.getItem('loan_loans');
    return s ? JSON.parse(s) : INITIAL_LOANS;
  });

  const [receipts, setReceipts] = useState(() => {
    const s = localStorage.getItem('loan_receipts');
    return s ? JSON.parse(s) : INITIAL_RECEIPTS;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const s = localStorage.getItem('loan_audit_logs');
    return s ? JSON.parse(s) : INITIAL_AUDIT_LOGS;
  });

  const [smsLogs, setSmsLogs] = useState(() => {
    const s = localStorage.getItem('loan_sms_logs');
    return s ? JSON.parse(s) : INITIAL_SMS_LOGS;
  });

  const [settings, setSettings] = useState(() => {
    const s = localStorage.getItem('loan_settings');
    return s ? JSON.parse(s) : INITIAL_SETTINGS;
  });

  // Sync state to LocalStorage
  useEffect(() => { localStorage.setItem('loan_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('loan_agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('loan_loans', JSON.stringify(loans)); }, [loans]);
  useEffect(() => { localStorage.setItem('loan_receipts', JSON.stringify(receipts)); }, [receipts]);
  useEffect(() => { localStorage.setItem('loan_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('loan_sms_logs', JSON.stringify(smsLogs)); }, [smsLogs]);
  useEffect(() => { localStorage.setItem('loan_settings', JSON.stringify(settings)); }, [settings]);

  // Log an audit event
  const addAuditLog = (action, description) => {
    const newLog = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      action,
      description,
      actor: 'admin',
      ip: '127.0.0.1'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Add Customer
  const addCustomer = (customerData) => {
    // Check mobile duplicate
    const exists = customers.some(c => c.mobile.replace(/\D/g, '') === customerData.mobile.replace(/\D/g, ''));
    if (exists) {
      return { success: false, error: 'A customer with this mobile number already exists!' };
    }

    const nextNum = 1000 + customers.length + 1;
    const newCustomer = {
      ...customerData,
      id: `CUST-${nextNum}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    setCustomers(prev => [newCustomer, ...prev]);
    addAuditLog('CUSTOMER_CREATED', `Created customer profile ${newCustomer.name} (${newCustomer.id})`);
    return { success: true, customer: newCustomer };
  };

  // Add Agent
  const addAgent = (agentData) => {
    const nextNum = 100 + agents.length + 1;
    const newAgent = {
      ...agentData,
      id: `AGT-${nextNum}`,
      joinedDate: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    setAgents(prev => [newAgent, ...prev]);
    addAuditLog('AGENT_CREATED', `Registered new field agent ${newAgent.name} (${newAgent.id})`);
    return { success: true, agent: newAgent };
  };

  // Create Loan
  const createLoan = (loanParams) => {
    const { customerId, agentId, principal, annualInterestRate, tenureWeeks, interestType, purpose } = loanParams;
    
    // Check if customer already has active loan
    const hasActiveLoan = loans.some(l => l.customerId === customerId && l.status === 'active');
    
    const schedule = calculateSchedule({
      principal,
      annualInterestRate,
      tenureWeeks,
      interestType,
      startDate: new Date()
    });

    const nextNum = 1000 + loans.length + 1;
    const newLoan = {
      id: `LOAN-${nextNum}`,
      customerId,
      agentId,
      principal: Number(principal),
      annualInterestRate: Number(annualInterestRate),
      tenureWeeks: Number(tenureWeeks),
      interestType,
      purpose,
      disbursedDate: new Date().toISOString().split('T')[0],
      totalInterest: schedule.totalInterest,
      totalRepayment: schedule.totalRepayment,
      weeklyEmi: schedule.weeklyEmi,
      totalPaid: 0,
      outstandingBalance: schedule.totalRepayment,
      status: 'active',
      installments: schedule.installments
    };

    setLoans(prev => [newLoan, ...prev]);
    addAuditLog('LOAN_ORIGINATION', `Issued Loan ${newLoan.id} for Customer ${customerId} (₹${principal}, ${tenureWeeks} wks)`);

    // Send SMS Notification
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      sendSms({
        mobile: customer.mobile,
        recipientName: customer.name,
        loanId: newLoan.id,
        type: 'LOAN_APPROVED',
        message: `Congratulations ${customer.name}! Your loan ${newLoan.id} of ₹${principal} is approved. Weekly EMI is ₹${schedule.weeklyEmi}. - ${settings.businessName}`
      });
    }

    return { success: true, loan: newLoan, hadActiveLoanWarning: hasActiveLoan };
  };

  // Record Repayment with Cascade Allocation
  const recordPayment = ({
    loanId,
    amount,
    paymentMode,
    referenceNumber,
    notes = '',
    collectedBy
  }) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return { success: false, error: 'Payment amount must be greater than zero.' };

    const loanIndex = loans.findIndex(l => l.id === loanId);
    if (loanIndex === -1) return { success: false, error: 'Loan not found.' };

    const loan = { ...loans[loanIndex] };
    if (loan.status === 'closed') return { success: false, error: 'This loan has already been fully repaid and closed.' };

    let remainingToAllocate = amt;
    const coveredInstallmentNumbers = [];
    const updatedInstallments = loan.installments.map(inst => {
      if (remainingToAllocate <= 0 || inst.status === 'paid') return inst;

      const due = Math.round((inst.totalAmount - (inst.paidAmount || 0)) * 100) / 100;
      if (due <= 0) return inst;

      if (remainingToAllocate >= due) {
        remainingToAllocate = Math.round((remainingToAllocate - due) * 100) / 100;
        coveredInstallmentNumbers.push(inst.installmentNumber);
        return {
          ...inst,
          paidAmount: inst.totalAmount,
          status: 'paid',
          paidDate: new Date().toISOString().split('T')[0]
        };
      } else {
        const newPaid = Math.round(((inst.paidAmount || 0) + remainingToAllocate) * 100) / 100;
        coveredInstallmentNumbers.push(inst.installmentNumber);
        remainingToAllocate = 0;
        return {
          ...inst,
          paidAmount: newPaid,
          status: 'partial',
          paidDate: new Date().toISOString().split('T')[0]
        };
      }
    });

    const newTotalPaid = Math.round((loan.totalPaid + amt) * 100) / 100;
    const newOutstanding = Math.max(0, Math.round((loan.totalRepayment - newTotalPaid) * 100) / 100);
    const isClosed = newOutstanding <= 0.05;

    loan.installments = updatedInstallments;
    loan.totalPaid = newTotalPaid;
    loan.outstandingBalance = isClosed ? 0 : newOutstanding;
    loan.status = isClosed ? 'closed' : loan.status;

    const updatedLoans = [...loans];
    updatedLoans[loanIndex] = loan;
    setLoans(updatedLoans);

    // Create unique receipt
    const customer = customers.find(c => c.id === loan.customerId);
    const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const receiptNum = `${settings.receiptPrefix}-${todayStr}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReceipt = {
      receiptNumber: receiptNum,
      loanId: loan.id,
      customerId: loan.customerId,
      customerName: customer ? customer.name : 'Unknown Customer',
      amount: amt,
      amountInWords: numberToWords(amt),
      paymentMode,
      referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      paymentDate: new Date().toISOString().split('T')[0],
      collectedBy: collectedBy || 'Admin Direct',
      remainingBalance: loan.outstandingBalance,
      installmentsCovered: coveredInstallmentNumbers,
      notes
    };

    setReceipts(prev => [newReceipt, ...prev]);
    addAuditLog('PAYMENT_RECORDED', `Payment of ₹${amt} received for ${loan.id} (Receipt: ${receiptNum})`);

    // Dispatch SMS Receipt
    if (customer) {
      sendSms({
        mobile: customer.mobile,
        recipientName: customer.name,
        loanId: loan.id,
        type: 'PAYMENT_RECEIPT',
        message: `Thank you ${customer.name}! Received ₹${amt} for ${loan.id} via ${paymentMode}. Balance: ₹${loan.outstandingBalance}. Receipt: ${receiptNum}. - ${settings.businessName}`
      });
    }

    return { success: true, receipt: newReceipt };
  };

  // Reverse Payment (Audited)
  const reversePayment = (receiptNumber, reason) => {
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A mandatory explanation reason (min 5 characters) is required for audit.' };
    }

    const receipt = receipts.find(r => r.receiptNumber === receiptNumber);
    if (!receipt) return { success: false, error: 'Receipt not found.' };

    const loanIndex = loans.findIndex(l => l.id === receipt.loanId);
    if (loanIndex === -1) return { success: false, error: 'Associated loan not found.' };

    const loan = { ...loans[loanIndex] };
    const refundAmt = Number(receipt.amount);

    loan.totalPaid = Math.max(0, Math.round((loan.totalPaid - refundAmt) * 100) / 100);
    loan.outstandingBalance = Math.round((loan.totalRepayment - loan.totalPaid) * 100) / 100;
    if (loan.status === 'closed' && loan.outstandingBalance > 0) {
      loan.status = 'active';
    }

    const updatedLoans = [...loans];
    updatedLoans[loanIndex] = loan;
    setLoans(updatedLoans);

    // Remove or mark receipt reversed
    setReceipts(prev => prev.filter(r => r.receiptNumber !== receiptNumber));

    addAuditLog('PAYMENT_REVERSED', `Reversed payment ${receiptNumber} of ₹${refundAmt} on ${loan.id}. Reason: ${reason}`);

    return { success: true };
  };

  // SMS Dispatcher
  const sendSms = ({ mobile, recipientName, loanId, type, message }) => {
    const newSms = {
      id: `SMS-${Date.now().toString().slice(-4)}`,
      mobile,
      recipientName,
      loanId,
      type,
      message,
      timestamp: new Date().toLocaleString(),
      status: settings.smsProvider === 'MSG91' ? 'Dispatched via MSG91' : 'Delivered (Mock Mode)'
    };
    setSmsLogs(prev => [newSms, ...prev]);
    return { success: true, sms: newSms };
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    addAuditLog('SETTINGS_UPDATED', 'Updated business profile and SMS settings');
    return { success: true };
  };

  return (
    <LoanContext.Provider value={{
      customers,
      agents,
      loans,
      receipts,
      auditLogs,
      smsLogs,
      settings,
      addCustomer,
      addAgent,
      createLoan,
      recordPayment,
      reversePayment,
      sendSms,
      updateSettings
    }}>
      {children}
    </LoanContext.Provider>
  );
}

export const useLoans = () => useContext(LoanContext);
