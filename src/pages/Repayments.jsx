import React, { useState } from 'react';
import { 
  Receipt, 
  Plus, 
  Printer, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  DollarSign, 
  X,
  CreditCard
} from 'lucide-react';
import { useLoans } from '../context/LoanContext';
import ReceiptModal from '../components/ReceiptModal';

export default function Repayments() {
  const { loans, receipts, customers, recordPayment, reversePayment } = useLoans();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Reversal Modal State
  const [reversalTargetReceipt, setReversalTargetReceipt] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversalError, setReversalError] = useState('');

  // Payment Form State
  const [formData, setFormData] = useState({
    loanId: '',
    amount: '',
    paymentMode: 'Cash',
    referenceNumber: '',
    notes: '',
    collectedBy: 'Admin Direct'
  });
  const [formError, setFormError] = useState('');

  const activeLoans = loans.filter(l => l.status === 'active');

  const filteredReceipts = receipts.filter(r => {
    const term = searchTerm.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(term) ||
      r.customerName.toLowerCase().includes(term) ||
      r.loanId.toLowerCase().includes(term) ||
      (r.referenceNumber && r.referenceNumber.toLowerCase().includes(term))
    );
  });

  const handleRecordSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.loanId || !formData.amount || Number(formData.amount) <= 0) {
      setFormError('Please select a loan and enter a valid positive payment amount.');
      return;
    }

    const res = recordPayment(formData);
    if (res.success) {
      setShowPaymentModal(false);
      setSelectedReceipt(res.receipt); // Open printable receipt immediately
      setFormData({
        loanId: '',
        amount: '',
        paymentMode: 'Cash',
        referenceNumber: '',
        notes: '',
        collectedBy: 'Admin Direct'
      });
    } else {
      setFormError(res.error);
    }
  };

  const handleReverseSubmit = (e) => {
    e.preventDefault();
    setReversalError('');

    const res = reversePayment(reversalTargetReceipt.receiptNumber, reversalReason);
    if (res.success) {
      setReversalTargetReceipt(null);
      setReversalReason('');
    } else {
      setReversalError(res.error);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Repayments Ledger & Receipts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Atomic payment recording, automatic installment cascade, official printable receipts, and audited reversals.
          </p>
        </div>
        <button
          onClick={() => {
            if (activeLoans.length > 0) {
              setFormData(f => ({ ...f, loanId: activeLoans[0].id, amount: activeLoans[0].weeklyEmi }));
            }
            setShowPaymentModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Payment</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Receipt No (e.g. RCP-20261012-...), Customer Name, or Loan ID..."
          className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-600">
            Clear
          </button>
        )}
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer & Loan</th>
                <th className="py-3 px-4">Mode / Ref</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4 text-right">Remaining Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.map((rcp) => (
                <tr key={rcp.receiptNumber} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {rcp.receiptNumber}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-mono">
                    {rcp.paymentDate}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{rcp.customerName}</p>
                    <p className="text-[11px] text-blue-600 font-mono font-semibold">{rcp.loanId}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-800">{rcp.paymentMode}</span>
                    <span className="text-[11px] text-slate-400 font-mono block truncate max-w-xs">{rcp.referenceNumber}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 text-sm">
                    ₹{Number(rcp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    ₹{Number(rcp.remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedReceipt(rcp)}
                        title="Print Receipt"
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReversalTargetReceipt(rcp)}
                        title="Reverse Payment (Audited)"
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400 text-xs">
                    No payment receipts match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-6">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">Record Customer Loan Repayment</h2>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Active Loan Account *</label>
                <select
                  required
                  value={formData.loanId}
                  onChange={(e) => {
                    const l = loans.find(x => x.id === e.target.value);
                    setFormData({
                      ...formData,
                      loanId: e.target.value,
                      amount: l ? l.weeklyEmi : ''
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">Choose loan account...</option>
                  {activeLoans.map(l => {
                    const c = customers.find(cust => cust.id === l.customerId);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.id} - {c ? c.name : l.customerId} (Balance: ₹{l.outstandingBalance.toLocaleString()})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-semibold"
                  >
                    <option value="Cash">Cash (Hand-to-Hand)</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / UTR / Cheque No</label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g. UPI-2394819203"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Collected By</label>
                  <input
                    type="text"
                    value={formData.collectedBy}
                    onChange={(e) => setFormData({ ...formData, collectedBy: e.target.value })}
                    placeholder="Collector Name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Regular installment collection"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 leading-relaxed">
                Payments automatically cascade across pending weekly installments in chronological order. An official receipt with amount in words will be generated immediately.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  Post Payment & Print Receipt
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Audited Payment Reversal Modal */}
      {reversalTargetReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-rose-300 overflow-hidden my-6">
            
            <div className="flex items-center justify-between px-6 py-4 bg-rose-700 text-white">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                <h2 className="text-base font-bold">Audited Payment Reversal</h2>
              </div>
              <button
                onClick={() => setReversalTargetReceipt(null)}
                className="p-1.5 text-rose-200 hover:text-white rounded-lg hover:bg-rose-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReverseSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                <p className="font-bold">You are reversing:</p>
                <p className="font-mono mt-1">Receipt: {reversalTargetReceipt.receiptNumber}</p>
                <p className="font-mono font-bold mt-0.5">Amount: ₹{reversalTargetReceipt.amount.toLocaleString()} for {reversalTargetReceipt.loanId}</p>
              </div>

              {reversalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reversalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Explanation Reason *
                </label>
                <textarea
                  required
                  rows="3"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Explain why this payment is being reversed (e.g. Cheque bounced / duplicate entry / wrong loan account selected)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReversalTargetReceipt(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-600/20"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Official Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

    </div>
  );
}
