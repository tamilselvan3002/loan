import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import ReceiptModal from '../components/ReceiptModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [receiptData, setReceiptData] = useState(null);
  const [txToReverse, setTxToReverse] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const params = {};
      if (methodFilter !== 'ALL') params.payment_method = methodFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const res = await api.getPaymentHistory(params);
      setPayments(res.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenReceipt(receiptNumber) {
    try {
      const res = await api.getReceipt(receiptNumber);
      setReceiptData(res);
    } catch (err) {
      alert(`Could not load receipt: ${err.message}`);
    }
  }

  async function handleConfirmReversal(reason) {
    if (!txToReverse) return;
    await api.reversePayment(txToReverse.id, reason);
    setTxToReverse(null);
    fetchPayments();
  }

  const filteredPayments = payments.filter((pt) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      pt.receipt_number.toLowerCase().includes(term) ||
      pt.customer_name.toLowerCase().includes(term) ||
      pt.loan_id.toLowerCase().includes(term) ||
      (pt.transaction_reference && pt.transaction_reference.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Payment Ledger & Receipts</h2>
        <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit trail of all recorded financial collections and receipts</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Receipt No (RCP-...), Customer, or Loan ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          {/* Payment Method */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash in Hand</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>

          {/* Date range filter trigger */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button
              onClick={fetchPayments}
              className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
            >
              Filter
            </button>
          </div>

        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span>Loading payment records...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <Receipt className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No payment transactions found</p>
            <p>Modify your filters or search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Receipt No</th>
                  <th className="p-3.5">Payment Date</th>
                  <th className="p-3.5">Borrower Customer</th>
                  <th className="p-3.5">Loan ID</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5 font-mono text-right font-bold">Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((tx) => (
                  <tr key={tx.id} className={`hover:bg-slate-50/70 transition-colors ${tx.is_reversed ? 'bg-rose-50/30 opacity-75' : ''}`}>
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">
                      {tx.receipt_number}
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      {formatDate(tx.payment_date)}
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => navigate(`/customers/${tx.customer_id}`)}
                        className="font-bold text-slate-900 hover:text-blue-600 text-left"
                      >
                        {tx.customer_name}
                      </button>
                      <p className="text-[10px] text-slate-400 font-mono">{tx.customer_mobile}</p>
                    </td>
                    <td className="p-3.5 font-mono">
                      <button
                        onClick={() => navigate(`/loans/${tx.loan_id}`)}
                        className="text-slate-700 hover:text-blue-600 font-semibold"
                      >
                        {tx.loan_id}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.payment_method}
                      </span>
                      {tx.transaction_reference && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{tx.transaction_reference}</p>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-right font-bold text-slate-900">
                      <span className={tx.is_reversed ? 'line-through text-slate-400' : 'text-emerald-600'}>
                        {formatCurrency(tx.amount_paid)}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      {tx.is_reversed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          REVERSED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          CONFIRMED
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReceipt(tx.receipt_number)}
                          className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-semibold text-xs inline-flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        {!tx.is_reversed && (
                          <button
                            onClick={() => setTxToReverse(tx)}
                            title="Reverse payment transaction"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(receiptData)}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />

      {/* Reversal Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(txToReverse)}
        onClose={() => setTxToReverse(null)}
        onConfirm={handleConfirmReversal}
        title="Reverse Payment Transaction"
        message={`Are you sure you want to reverse Receipt ${txToReverse?.receipt_number} for ₹${txToReverse?.amount_paid}? This will restore the installment balances and increase the loan's outstanding amount. Original audit records will remain preserved.`}
        confirmText="Confirm Reversal"
        isDanger={true}
        requireReason={true}
        reasonPlaceholder="Enter mandatory reason for reversing this payment..."
      />

    </div>
  );
}
