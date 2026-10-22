import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Calculator,
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  ShieldCheck,
  Building2,
  Clock,
  Banknote,
  Percent
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import ConfirmationModal from '../components/ConfirmationModal';

export default function NewLoan() {
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id');
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form inputs
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [principal, setPrincipal] = useState(10000);
  const [repaymentFrequency, setRepaymentFrequency] = useState('WEEKLY'); // 'DAILY', 'WEEKLY', 'MONTHLY'
  
  // Interest Mode: 'AMOUNT' (Direct ₹ Rupee Entry - Default) or 'PERCENTAGE' (%)
  const [interestMode, setInterestMode] = useState('AMOUNT');
  const [interestAmount, setInterestAmount] = useState(1000);
  const [totalAmount, setTotalAmount] = useState(11000);
  const [interestRate, setInterestRate] = useState(10);
  const [interestMethod, setInterestMethod] = useState('FLAT_RATE');
  const [flatRateType, setFlatRateType] = useState('FIXED_AMOUNT');
  
  const [duration, setDuration] = useState(10); // 10 weeks by default
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default first repayment date helper based on frequency
  const calculateDefaultFirstRepay = (freq, baseDateStr) => {
    const d = baseDateStr ? new Date(baseDateStr) : new Date();
    if (freq === 'DAILY') {
      d.setDate(d.getDate() + 1);
    } else if (freq === 'MONTHLY') {
      d.setMonth(d.getMonth() + 1);
    } else {
      d.setDate(d.getDate() + 7);
    }
    return d.toISOString().split('T')[0];
  };

  const [firstRepaymentDate, setFirstRepaymentDate] = useState(calculateDefaultFirstRepay('WEEKLY', new Date().toISOString().split('T')[0]));
  const [notes, setNotes] = useState('');

  // Preview state
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [calculating, setCalculating] = useState(false);

  // Active loan confirmation warning modal
  const [activeLoanWarning, setActiveLoanWarning] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPrerequisites();
  }, []);

  // Update calculations when principal, interest, or duration changes
  useEffect(() => {
    updatePreview();
  }, [principal, repaymentFrequency, interestMode, interestAmount, totalAmount, interestRate, interestMethod, duration, firstRepaymentDate]);

  const handleFrequencyChange = (newFreq) => {
    setRepaymentFrequency(newFreq);
    if (newFreq === 'DAILY') {
      setDuration(30);
    } else if (newFreq === 'MONTHLY') {
      setDuration(6);
    } else {
      setDuration(10);
    }
    setFirstRepaymentDate(calculateDefaultFirstRepay(newFreq, issueDate));
  };

  // When Principal changes
  const handlePrincipalChange = (val) => {
    const p = Number(val) || 0;
    setPrincipal(val);
    if (interestMode === 'AMOUNT') {
      setTotalAmount(p + Number(interestAmount));
      if (p > 0) {
        setInterestRate(Math.round((Number(interestAmount) / p) * 100 * 10) / 10);
      }
    } else {
      const calcInt = Math.round((p * (Number(interestRate) / 100)) * 100) / 100;
      setInterestAmount(calcInt);
      setTotalAmount(p + calcInt);
    }
  };

  // When Interest Amount (₹) changes
  const handleInterestAmountChange = (val) => {
    const intVal = Number(val) || 0;
    setInterestAmount(val);
    const p = Number(principal) || 0;
    setTotalAmount(p + intVal);
    if (p > 0) {
      setInterestRate(Math.round((intVal / p) * 100 * 10) / 10);
    }
  };

  // When Total Repayment Amount (₹) changes directly
  const handleTotalAmountChange = (val) => {
    const totVal = Number(val) || 0;
    setTotalAmount(val);
    const p = Number(principal) || 0;
    const diff = Math.max(0, totVal - p);
    setInterestAmount(diff);
    if (p > 0) {
      setInterestRate(Math.round((diff / p) * 100 * 10) / 10);
    }
  };

  // When Interest Rate (%) changes in percentage mode
  const handleInterestRateChange = (val) => {
    const r = Number(val) || 0;
    setInterestRate(val);
    const p = Number(principal) || 0;
    const calcInt = Math.round((p * (r / 100)) * 100) / 100;
    setInterestAmount(calcInt);
    setTotalAmount(p + calcInt);
  };

  async function loadPrerequisites() {
    try {
      setLoadingInitial(true);
      const [cRes, sRes] = await Promise.all([
        api.getCustomers({ status: 'ACTIVE' }),
        api.getSettings()
      ]);
      setCustomers(cRes.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  }

  async function updatePreview() {
    const p = Number(principal);
    const d = Number(duration);
    if (!p || p <= 0 || !d || d <= 0 || !firstRepaymentDate) return;

    try {
      setCalculating(true);
      setPreviewError('');

      const effectiveRate = interestMode === 'AMOUNT'
        ? (p > 0 ? (Number(interestAmount) / p) * 100 : 0)
        : Number(interestRate);

      const effectiveFlatType = interestMode === 'AMOUNT' ? 'FIXED_AMOUNT' : 'PER_TERM';

      const res = await api.previewLoan({
        principal: p,
        interestRatePercent: effectiveRate,
        interestMethod: interestMode === 'PERCENTAGE' ? interestMethod : 'FLAT_RATE',
        repaymentFrequency,
        flatRateType: effectiveFlatType,
        customInterestAmount: Number(interestAmount),
        durationWeeks: repaymentFrequency === 'WEEKLY' ? d : undefined,
        durationDays: repaymentFrequency === 'DAILY' ? d : undefined,
        durationMonths: repaymentFrequency === 'MONTHLY' ? d : undefined,
        totalInstallments: d,
        firstRepaymentDate
      });
      setPreview(res.calculation);
    } catch (err) {
      setPreviewError(err.message);
      setPreview(null);
    } finally {
      setCalculating(false);
    }
  }

  async function handleIssueLoan(confirmOverride = false) {
    if (!customerId) {
      alert('Please select a customer first.');
      return;
    }

    const p = Number(principal);
    const d = Number(duration);
    const intAmt = Number(interestAmount);

    if (!p || p <= 0) {
      alert('Please enter a valid loan principal amount.');
      return;
    }

    if (!d || d <= 0) {
      alert('Please select duration weeks / installments.');
      return;
    }

    setSubmitting(true);
    try {
      const effectiveRate = p > 0 ? Math.round((intAmt / p) * 100 * 10) / 10 : 0;

      const res = await api.createLoan({
        customer_id: customerId,
        principal_amount: p,
        interest_rate_percent: effectiveRate,
        interest_method: interestMode === 'PERCENTAGE' ? interestMethod : 'FLAT_RATE',
        repayment_frequency: repaymentFrequency,
        flat_rate_type: interestMode === 'AMOUNT' ? 'FIXED_AMOUNT' : 'PER_TERM',
        custom_interest_amount: intAmt,
        duration_weeks: repaymentFrequency === 'WEEKLY' ? d : Math.max(1, Math.ceil(d / 7)),
        duration_days: repaymentFrequency === 'DAILY' ? d : undefined,
        duration_months: repaymentFrequency === 'MONTHLY' ? d : undefined,
        total_installments: d,
        first_repayment_date: firstRepaymentDate,
        issue_date: issueDate,
        notes,
        confirm_active_loan_override: confirmOverride
      });

      navigate(`/loans/${res.loan.id}`);
    } catch (err) {
      if (err.status === 409 && err.data?.requiresConfirmation) {
        setActiveLoanWarning(err.data.message);
      } else {
        alert(`Loan creation failed: ${err.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInitial) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const calculatedEmi = (duration && Number(duration) > 0) 
    ? Math.round((Number(totalAmount) / Number(duration))) 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Issue New Loan & EMI Calculator</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Enter loan amount, interest in rupees, and duration weeks. System automatically calculates total repayment and weekly EMI schedule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Inputs (Left 1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Loan Parameters</h3>

          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">-- Choose Borrower --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.full_name} ({c.mobile_number})
                </option>
              ))}
            </select>
          </div>

          {/* Repayment Frequency Selector (Daily, Weekly, Monthly) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Repayment Schedule Frequency <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleFrequencyChange('DAILY')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  repaymentFrequency === 'DAILY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => handleFrequencyChange('WEEKLY')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  repaymentFrequency === 'WEEKLY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => handleFrequencyChange('MONTHLY')}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  repaymentFrequency === 'MONTHLY'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* 1. Principal Loan Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Loan Amount / Principal (அசல் கடன் தொகை ₹) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="500"
                min="500"
                value={principal}
                onChange={(e) => handlePrincipalChange(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Interest Mode Toggle (₹ Rupees Mode vs % Percentage Mode) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Interest Calculation</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInterestMode('AMOUNT')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    interestMode === 'AMOUNT'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ₹ Rupee Amount
                </button>
                <button
                  type="button"
                  onClick={() => setInterestMode('PERCENTAGE')}
                  className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                    interestMode === 'PERCENTAGE'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  % Percentage
                </button>
              </div>
            </div>

            {/* Rupee Amount Mode: Direct Interest in ₹ */}
            {interestMode === 'AMOUNT' ? (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Interest Amount (வட்டித் தொகை ₹) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({interestRate}% flat equivalent)
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={interestAmount}
                      onChange={(e) => handleInterestAmountChange(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-amber-600 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Auto Calculated Total Repayment Amount */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Repayment Amount (அசல் + வட்டி மொத்தம் ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="100"
                      min={principal}
                      value={totalAmount}
                      onChange={(e) => handleTotalAmountChange(e.target.value)}
                      className="w-full pl-8 pr-4 py-2.5 text-sm font-mono font-extrabold text-emerald-700 border border-emerald-300 rounded-xl bg-emerald-50/50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    ₹{Number(principal).toLocaleString('en-IN')} (Principal) + ₹{Number(interestAmount).toLocaleString('en-IN')} (Interest)
                  </p>
                </div>
              </div>
            ) : (
              /* Percentage Mode */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Interest Rate (% per term)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={interestRate}
                    onChange={(e) => handleInterestRateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 flex justify-between text-xs font-mono font-bold">
                  <span className="text-slate-600 font-sans font-medium">Calculated Interest:</span>
                  <span className="text-amber-600">₹{Number(interestAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Duration in Weeks / Days / Months */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {repaymentFrequency === 'DAILY' ? 'Duration (Days / Daily EMIs)' : repaymentFrequency === 'MONTHLY' ? 'Duration (Months / Monthly EMIs)' : 'Duration (Weeks / வாரங்கள்)'} <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={repaymentFrequency === 'DAILY' ? 365 : repaymentFrequency === 'MONTHLY' ? 60 : 104}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-xl bg-slate-50 focus:bg-white"
              />
              <div className="flex gap-1 shrink-0">
                {(repaymentFrequency === 'DAILY' ? [30, 60, 100] : repaymentFrequency === 'MONTHLY' ? [3, 6, 12] : [10, 15, 20, 50]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setDuration(num)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                      Number(duration) === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {num}{repaymentFrequency === 'DAILY' ? 'd' : repaymentFrequency === 'MONTHLY' ? 'm' : 'w'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Installment Preview Badge */}
          {calculatedEmi > 0 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  {repaymentFrequency === 'DAILY' ? 'Daily EMI' : repaymentFrequency === 'MONTHLY' ? 'Monthly EMI' : 'Weekly EMI (வாரத் தவணை)'}
                </p>
                <p className="font-mono text-base font-extrabold text-emerald-700 mt-0.5">
                  ₹{calculatedEmi.toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">/ {repaymentFrequency === 'DAILY' ? 'day' : repaymentFrequency === 'MONTHLY' ? 'month' : 'week'}</span>
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                {duration} Installments
              </span>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  setFirstRepaymentDate(calculateDefaultFirstRepay(repaymentFrequency, e.target.value));
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">1st Due Date</label>
              <input
                type="date"
                value={firstRepaymentDate}
                onChange={(e) => setFirstRepaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Purpose (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Personal loan, business expansion..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50"
            />
          </div>

          <button
            type="button"
            disabled={submitting || !customerId || !preview}
            onClick={() => handleIssueLoan(false)}
            className="w-full mt-4 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Confirm & Issue Loan Account</span>
          </button>
        </div>

        {/* Schedule & Breakdown Live Preview (Right 2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {previewError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              Calculation Error: {previewError}
            </div>
          )}

          {preview && (
            <>
              {/* Summary Metrics Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-sm tracking-wide">
                      Loan Term & Repayment Schedule Breakdown
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                    {preview.repaymentFrequency || repaymentFrequency} Repayment
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Principal (அசல்)</p>
                    <p className="font-mono text-lg font-bold text-white mt-0.5">{formatCurrency(preview.principal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Interest (வட்டி)</p>
                    <p className="font-mono text-lg font-bold text-amber-400 mt-0.5">{formatCurrency(preview.expectedTotalInterest)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Total Repayment (மொத்தம்)</p>
                    <p className="font-mono text-lg font-bold text-emerald-400 mt-0.5">{formatCurrency(preview.expectedTotalRepayment)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Installment EMI (தவணை)</p>
                    <p className="font-mono text-lg font-bold text-cyan-300 mt-0.5">
                      {formatCurrency(preview.installmentAmount || preview.schedule[0]?.scheduled_amount)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
                  <div>
                    <span>Total Installments: </span>
                    <strong className="text-white font-mono">{preview.totalInstallments} {repaymentFrequency === 'DAILY' ? 'Days' : repaymentFrequency === 'MONTHLY' ? 'Months' : 'Weeks'}</strong>
                  </div>
                  <div>
                    <span>Maturity Date: </span>
                    <strong className="text-white font-mono">{formatDate(preview.maturityDate)}</strong>
                  </div>
                </div>
              </div>

              {/* Installment Schedule Table */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Calculated Repayment Schedule ({preview.schedule.length} Installments)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">Reconciled to ₹0.00 exact total</span>
                </div>

                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 pl-3">EMI #</th>
                        <th className="p-2.5">Due Date</th>
                        <th className="p-2.5 font-mono text-right">Principal</th>
                        <th className="p-2.5 font-mono text-right">Interest</th>
                        <th className="p-2.5 font-mono text-right font-bold text-slate-900 pr-3">Total Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {preview.schedule.map((item) => (
                        <tr key={item.installment_number} className="hover:bg-slate-50/80">
                          <td className="p-2 pl-3 font-semibold text-slate-700">#{item.installment_number}</td>
                          <td className="p-2 font-sans text-slate-600 font-medium">{formatDate(item.due_date)}</td>
                          <td className="p-2 text-right text-slate-600">{formatCurrency(item.principal_component)}</td>
                          <td className="p-2 text-right text-amber-600">{formatCurrency(item.interest_component)}</td>
                          <td className="p-2 pr-3 text-right font-bold text-blue-700">{formatCurrency(item.scheduled_amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!preview && !previewError && (
            <div className="h-64 flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-300 text-slate-400 text-xs">
              <Calculator className="w-8 h-8 text-slate-300 mb-2" />
              <p>Configure parameters on the left to see live schedule preview</p>
            </div>
          )}

        </div>
      </div>

      {/* Multiple Active Loans Warning Modal */}
      {activeLoanWarning && (
        <ConfirmationModal
          isOpen={Boolean(activeLoanWarning)}
          title="Active Loan Warning"
          message={activeLoanWarning}
          confirmLabel="Proceed & Issue Additional Loan"
          confirmVariant="warning"
          onConfirm={() => {
            setActiveLoanWarning(null);
            handleIssueLoan(true);
          }}
          onClose={() => setActiveLoanWarning(null)}
        />
      )}
    </div>
  );
}
