import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Banknote,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  BellRing,
  ArrowLeft,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function LoanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [receiptModalData, setReceiptModalData] = useState(null);

  // Quick Pay Modal State
  const [payModalSchedule, setPayModalSchedule] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [recordingPay, setRecordingPay] = useState(false);
  const [payError, setPayError] = useState('');

  // Cancel Loan Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Reminder feedback
  const [reminderStatus, setReminderStatus] = useState('');

  useEffect(() => {
    loadLoan();
  }, [id]);

  async function loadLoan() {
    try {
      setLoading(true);
      const res = await api.getLoanById(id);
      setData(res);
    } catch (err) {
      alert(`Error loading loan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenReceipt(receiptNumber) {
    try {
      const res = await api.getReceipt(receiptNumber);
      setReceiptModalData(res);
    } catch (err) {
      alert(`Could not load receipt: ${err.message}`);
    }
  }

  async function handleSendReminder(inst) {
    try {
      setReminderStatus(`Sending reminder to ${data.loan.customer_mobile}...`);
      await api.sendReminder({
        customerId: data.loan.customer_id,
        loanId: data.loan.id,
        installmentNumber: inst.installment_number,
        dueDate: inst.due_date,
        amountDue: inst.remaining_balance,
        isOverdue: inst.status === 'OVERDUE'
      });
      setReminderStatus(`✅ Payment reminder successfully sent to ${data.loan.customer_name} (${data.loan.customer_mobile}).`);
      setTimeout(() => setReminderStatus(''), 6000);
    } catch (err) {
      setReminderStatus(`❌ Failed to send reminder: ${err.message}`);
      setTimeout(() => setReminderStatus(''), 8000);
    }
  }

  const handleOpenPayModal = (schedule) => {
    setPayModalSchedule(schedule);
    setPayAmount(schedule.remaining_balance.toString());
    setPayMethod('CASH');
    setPayRef('');
    setPayNotes('');
    setPayError('');
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPayError('');
    setRecordingPay(true);

    try {
      const res = await api.recordPayment({
        loan_id: id,
        amount_paid: Number(payAmount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: payMethod,
        transaction_reference: payRef,
        notes: payNotes
      });

      setPayModalSchedule(null);
      await loadLoan();

      // Open receipt automatically
      const rNum = res.receiptNumber || res.payment?.receipt_number || res.transaction?.receipt_number;
      if (rNum) {
        handleOpenReceipt(rNum);
      }
    } catch (err) {
      setPayError(err.message || 'Payment recording failed');
    } finally {
      setRecordingPay(false);
    }
  };

  const handleCancelLoan = async (reason) => {
    await api.updateLoanStatus(id, {
      status: 'CANCELLED',
      notes: reason ? `${data.loan.notes || ''} [Cancelled: ${reason}]` : undefined
    });
    loadLoan();
  };

  if (loading || !data) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const { loan, termsSnapshot, schedule, payments } = data;

  return (
    <div className="space-y-6">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/loans')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{loan.id}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                loan.status === 'ACTIVE'
                  ? 'bg-blue-100 text-blue-800'
                  : loan.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : loan.status === 'OVERDUE'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {loan.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {formatDate(loan.issue_date)} • Maturity on {formatDate(loan.maturity_date)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loan.status !== 'COMPLETED' && loan.status !== 'CANCELLED' && loan.outstanding_balance > 0 && (
            <>
              <button
                onClick={() => navigate(`/repayments?loan_id=${loan.id}&amount=${loan.outstanding_balance}`)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                title="Settle full remaining loan balance"
              >
                <span>Pay Remaining Loan Amount</span>
              </button>

              <button
                onClick={() => navigate(`/repayments?loan_id=${loan.id}`)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
              >
                <Banknote className="w-4 h-4" />
                <span>Record Payment</span>
              </button>
            </>
          )}

          {loan.status === 'ACTIVE' && loan.total_paid_amount === 0 && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Loan</span>
            </button>
          )}
        </div>
      </div>

      {/* Reminder notification toast */}
      {reminderStatus && (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span>{reminderStatus}</span>
          <button onClick={() => setReminderStatus('')} className="text-slate-400 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* Loan Financial Overview Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Principal Amount</p>
            <p className="text-lg font-black text-slate-900 mt-1 font-mono">{formatCurrency(loan.principal_amount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{loan.interest_rate_percent}% {loan.interest_method}</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Interest</p>
            <p className="text-lg font-black text-blue-600 mt-1 font-mono">{formatCurrency(loan.expected_total_interest)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Calculated over term</p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Expected Repayment</p>
            <p className="text-lg font-black text-slate-900 mt-1 font-mono">{formatCurrency(loan.expected_total_repayment)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {loan.total_installments || loan.total_duration_weeks} {loan.repayment_frequency ? loan.repayment_frequency.toLowerCase() : 'weekly'} installments
            </p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Collected</p>
            <p className="text-lg font-black text-emerald-600 mt-1 font-mono">{formatCurrency(loan.total_paid_amount)}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5 font-semibold">
              {Math.min(100, Math.round((loan.total_paid_amount / loan.expected_total_repayment) * 100))}% repaid
            </p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 sm:col-span-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Outstanding Balance</p>
            <p className="text-2xl font-black text-amber-500 mt-1 font-mono">{formatCurrency(loan.outstanding_balance)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Remaining to complete loan</p>
          </div>
        </div>

        {/* Customer & Agent Details Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Borrower Customer</p>
              <button
                onClick={() => navigate(`/customers/${loan.customer_id}`)}
                className="font-bold text-slate-900 hover:text-blue-600 text-left"
              >
                {loan.customer_name} ({loan.customer_id})
              </button>
              <p className="text-slate-500 font-mono text-[11px]">{loan.customer_mobile}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Repayment Schedule Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Weekly Repayment Schedule</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track individual weekly due dates, paid portions, and overdue status</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {schedule.filter(s => s.status === 'PAID').length} of {schedule.length} installments settled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3.5 pl-5">Installment #</th>
                <th className="p-3.5">Scheduled Due Date</th>
                <th className="p-3.5 font-mono text-right">Scheduled Amount</th>
                <th className="p-3.5 font-mono text-right text-emerald-600">Amount Paid</th>
                <th className="p-3.5 font-mono text-right font-bold">Remaining Due</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {schedule.map((inst) => (
                <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 pl-5 font-sans font-medium text-slate-800">
                    Week #{inst.installment_number}
                  </td>
                  <td className="p-3.5 font-sans text-slate-600">
                    {formatDate(inst.due_date)}
                  </td>
                  <td className="p-3.5 text-right font-medium text-slate-700">
                    {formatCurrency(inst.scheduled_amount)}
                  </td>
                  <td className="p-3.5 text-right font-semibold text-emerald-600">
                    {formatCurrency(inst.amount_paid)}
                  </td>
                  <td className="p-3.5 text-right font-bold text-slate-900">
                    {formatCurrency(inst.remaining_balance)}
                  </td>
                  <td className="p-3.5 text-center font-sans">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      inst.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : inst.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-800'
                        : inst.status === 'PARTIALLY_PAID'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {inst.status === 'PAID'
                        ? 'Paid'
                        : inst.status === 'OVERDUE'
                        ? 'Overdue'
                        : inst.status === 'PARTIALLY_PAID'
                        ? 'Partially Paid'
                        : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3.5 pr-5 text-right font-sans">
                    <div className="flex items-center justify-end gap-1.5">
                      {inst.remaining_balance > 0 && (
                        <>
                          <button
                            onClick={() => handleSendReminder(inst)}
                            title="Send SMS reminder to borrower"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <BellRing className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenPayModal(inst)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                          >
                            Pay
                          </button>
                        </>
                      )}
                      {inst.status === 'PAID' && (
                        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Settled</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Transactions History for this Loan */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Payment Transaction History</h3>
            <p className="text-xs text-slate-500 mt-0.5">Recorded payments received for {loan.id}</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payments have been recorded for this loan yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Receipt No</th>
                  <th className="p-3.5">Payment Date</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5 font-mono text-right">Amount Paid</th>
                  <th className="p-3.5 pr-5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{pt.receipt_number}</td>
                    <td className="p-3.5 text-slate-600">{formatDate(pt.payment_date)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {pt.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono">{pt.transaction_reference || '—'}</td>
                    <td className="p-3.5 font-mono text-right font-bold text-emerald-600">{formatCurrency(pt.amount_paid)}</td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => handleOpenReceipt(pt.receipt_number)}
                        className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium inline-flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payModalSchedule && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Loan Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Week #{payModalSchedule.installment_number} • Due: {formatCurrency(payModalSchedule.remaining_balance)}</p>
              </div>
              <button onClick={() => setPayModalSchedule(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {payError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {payError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Full installment: {formatCurrency(payModalSchedule.remaining_balance)} | Loan Outstanding: {formatCurrency(loan.outstanding_balance)}
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                >
                  <option value="CASH">Cash in Hand</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer / NEFT / IMPS</option>
                  <option value="CHEQUE">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Reference / UTR Number</label>
                <input
                  type="text"
                  placeholder="Optional reference / UPI txn ID"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  placeholder="Collector note or remarks..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPayModalSchedule(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPay}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  {recordingPay && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <span>Confirm Receipt & Update Balances</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Loan Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleCancelLoan}
        title="Cancel Loan Account"
        message="Are you sure you want to cancel this loan? This action is only permitted if no payments have been collected."
        confirmText="Cancel Loan"
        isDanger={true}
        requireReason={true}
        reasonPlaceholder="Reason for cancellation..."
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptModalData)}
        onClose={() => setReceiptModalData(null)}
        data={receiptModalData}
      />

    </div>
  );
}
