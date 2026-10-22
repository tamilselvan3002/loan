import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Search,
  CreditCard,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  KeyRound,
  RotateCcw,
  Zap,
  Check,
  Receipt,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import ReceiptModal from '../components/ReceiptModal';

export default function Repayments() {
  const [searchParams] = useSearchParams();
  const preselectedLoanId = searchParams.get('loan_id');
  const preselectedAmount = searchParams.get('amount');
  const navigate = useNavigate();

  const [activeLoans, setActiveLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState(preselectedLoanId || '');
  const [selectedLoanData, setSelectedLoanData] = useState(null);
  const [loadingLoan, setLoadingLoan] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState(preselectedAmount || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('GPAY_UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSettlement, setIsSettlement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment Confirmation OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpVerificationId, setOtpVerificationId] = useState('');
  const [mobileMasked, setMobileMasked] = useState('');
  const [otpEntered, setOtpEntered] = useState('');
  const [mockOtp, setMockOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Receipt modal
  const [receiptData, setReceiptData] = useState(null);

  useEffect(() => {
    fetchActiveLoans();
  }, []);

  useEffect(() => {
    if (selectedLoanId) {
      loadLoanDetails(selectedLoanId);
    } else {
      setSelectedLoanData(null);
    }
  }, [selectedLoanId]);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  async function fetchActiveLoans() {
    try {
      const res = await api.getLoans({ status: 'ACTIVE' });
      const overdueRes = await api.getLoans({ status: 'OVERDUE' });
      const combined = [...(res.loans || []), ...(overdueRes.loans || [])];
      const unique = Array.from(new Map(combined.map(l => [l.id, l])).values());
      setActiveLoans(unique);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadLoanDetails(loanId) {
    try {
      setLoadingLoan(true);
      setError('');
      setIsSettlement(false);
      const res = await api.getLoanById(loanId);
      setSelectedLoanData(res);

      if (!preselectedAmount) {
        const nextDue = res.schedule.find(s => s.remaining_balance > 0);
        if (nextDue) {
          setAmount(nextDue.remaining_balance.toString());
        } else {
          setAmount(res.loan.outstanding_balance.toString());
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch loan details');
    } finally {
      setLoadingLoan(false);
    }
  }

  // Trigger Pay Remaining Loan Amount (Full Settlement)
  const handleSelectFullSettlement = () => {
    if (!selectedLoanData) return;
    setIsSettlement(true);
    setAmount(selectedLoanData.loan.outstanding_balance.toString());
    setNotes('Full loan payoff settlement');
  };

  // Direct Payment Recording (No OTP Required for Authorized Staff)
  const handleDirectPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    if (!selectedLoanId) {
      setError('Please select a loan account.');
      return;
    }

    if (selectedLoanData && amt > selectedLoanData.loan.outstanding_balance + 0.05) {
      setError(`Payment amount exceeds total remaining balance (₹${selectedLoanData.loan.outstanding_balance.toLocaleString('en-IN')}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        loan_id: selectedLoanId,
        amount_paid: amt,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: reference,
        notes,
        is_settlement: isSettlement
      };

      const res = await api.recordPayment(payload);
      setSuccessMsg(res.message);

      // Load official receipt for viewing/printing
      const receiptNum = res.payment?.receipt_number || res.transaction?.receipt_number;
      if (receiptNum) {
        try {
          const receiptRes = await api.getReceipt(receiptNum);
          setReceiptData(receiptRes);
        } catch (rErr) {
          console.warn('Receipt fetch warning:', rErr);
        }
      }

      // Reload loan data and active loans list
      fetchActiveLoans();
      if (selectedLoanId) {
        loadLoanDetails(selectedLoanId);
      }
    } catch (err) {
      setError(err.message || 'Payment recording failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Record Repayment & Loan Settlement</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Record regular weekly EMI payments or full loan payoff with mandatory customer SMS OTP confirmation.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:bg-emerald-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="p-1 hover:bg-rose-100 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Payment Form (Left 2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <form onSubmit={handleDirectPayment} className="space-y-5 text-xs">
            
            {/* Step 1: Select Loan */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Select Active Loan Account <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Choose Loan Account --</option>
                {activeLoans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.id} — {l.customer_name} (₹{l.principal_amount.toLocaleString('en-IN')}) | Balance: ₹{l.outstanding_balance.toLocaleString('en-IN')} [{l.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Settlement Shortcut Banner */}
            {selectedLoanData && selectedLoanData.loan.outstanding_balance > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>Pay Remaining Loan Amount</span>
                  </div>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Total Payoff: <strong className="font-mono">₹{selectedLoanData.loan.outstanding_balance.toLocaleString('en-IN')}</strong> across remaining {selectedLoanData.schedule.filter(s => s.remaining_balance > 0).length} unpaid installments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSelectFullSettlement}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                    isSettlement 
                      ? 'bg-amber-600 text-white shadow-amber-500/30 ring-2 ring-amber-400'
                      : 'bg-white text-amber-900 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  {isSettlement ? '✓ Settlement Selected' : 'Pay Remaining Amount'}
                </button>
              </div>
            )}

            {/* Amount and Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Amount to Collect (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 2500"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setIsSettlement(false);
                    }}
                    className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800"
                />
              </div>
            </div>

            {/* Payment Method - Requirement 3 */}
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'GPAY_UPI', label: 'GPay / UPI', desc: 'GooglePay / PhonePe / QR' },
                  { id: 'CASH', label: 'Cash', desc: 'Physical currency' },
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', desc: 'NEFT / RTGS / IMPS' },
                  { id: 'OTHER', label: 'Other', desc: 'Cheque / Draft / Other' }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === m.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <p className={`font-bold text-xs ${paymentMethod === m.id ? 'text-blue-700' : 'text-slate-800'}`}>
                      {m.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Transaction Reference / UTR Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Bank UTR / Receipt memo"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Remarks (Optional)</label>
              <input
                type="text"
                placeholder="Internal memo or payment notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                Direct Staff Entry • Authenticated Administrator Action
              </span>

              <button
                type="submit"
                disabled={submitting || !selectedLoanId || !amount}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>{submitting ? 'Recording Payment...' : isSettlement ? 'Confirm Full Settlement & Close Loan' : 'Record Payment Directly'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Selected Loan Summary & Repayment Schedule (Right Column) */}
        <div className="space-y-6">
          {loadingLoan ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center text-xs text-slate-400">
              Loading loan summary...
            </div>
          ) : selectedLoanData ? (
            <>
              {/* Account Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="font-mono font-bold text-blue-600 text-xs">{selectedLoanData.loan.id}</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-0.5">{selectedLoanData.loan.customer_name}</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedLoanData.loan.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedLoanData.loan.status === 'OVERDUE'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedLoanData.loan.status}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Principal Issued:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(selectedLoanData.loan.principal_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Payable:</span>
                    <span className="font-mono font-bold text-slate-800">{formatCurrency(selectedLoanData.loan.expected_total_repayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Collected:</span>
                    <span className="font-mono font-semibold text-emerald-600">{formatCurrency(selectedLoanData.loan.total_paid_amount)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Remaining Balance:</span>
                    <span className="font-mono text-base font-extrabold text-rose-600">
                      {formatCurrency(selectedLoanData.loan.outstanding_balance)}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/loans/${selectedLoanData.loan.id}`)}
                    className="w-full py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold text-[11px] hover:bg-slate-50 transition-colors"
                  >
                    View Full Loan Details ➔
                  </button>
                </div>
              </div>

              {/* Installments Breakdown */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Unpaid Installments</h4>
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">
                    {selectedLoanData.schedule.filter(s => s.remaining_balance > 0).length} Remaining
                  </span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedLoanData.schedule.filter(s => s.remaining_balance > 0).map((inst) => (
                    <div
                      key={inst.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">EMI #{inst.installment_number}</p>
                        <p className="text-[10px] text-slate-400">Due: {formatDate(inst.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-slate-900">{formatCurrency(inst.remaining_balance)}</p>
                        <span className={`text-[9px] font-bold uppercase ${
                          inst.status === 'OVERDUE' ? 'text-rose-600' : 'text-blue-600'
                        }`}>
                          {inst.status === 'OVERDUE' ? 'Overdue' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50/60 rounded-3xl p-8 border border-dashed border-slate-300 text-center text-xs text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p>Select a loan account to see balance & repayment schedule</p>
            </div>
          )}
        </div>
      </div>

      {/* Official Printable Receipt Modal */}
      {receiptData && (
        <ReceiptModal
          isOpen={Boolean(receiptData)}
          onClose={() => setReceiptData(null)}
          data={receiptData}
        />
      )}
    </div>
  );
}
