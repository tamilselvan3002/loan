import React from 'react';
import { Printer, X, CheckCircle2, Building2 } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, numberToWordsINR } from '../utils/formatters';

export default function ReceiptModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const { receipt, allocations = [], business } = data;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Controls (Hidden in print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            <span>Payment Receipt Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="receipt-container p-8 text-slate-800 bg-white" id="printable-receipt">
          
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-5 mb-5 flex justify-between items-start">
            <div className="flex items-start gap-3">
              <div className="bg-white p-1.5 rounded-lg border border-slate-300 shadow-sm">
                <img src="/logo.png" alt="Vishva Finance" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
                  {business?.name || 'Vishva Finance'}
                </h2>
                <p className="text-xs text-slate-600 max-w-md">{business?.address}</p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Phone: <span className="font-medium text-slate-800">{business?.phone}</span>
                  {business?.email && <> | Email: <span className="font-medium text-slate-800">{business?.email}</span></>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded tracking-wider uppercase mb-2">
                Payment Receipt
              </span>
              <p className="text-xs font-mono font-bold text-blue-700">{receipt.receipt_number}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(receipt.payment_date)}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Customer Details</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{receipt.customer_name}</p>
              <p className="text-slate-600 font-mono text-[11px]">ID: {receipt.customer_id}</p>
              <p className="text-slate-600">Mobile: {receipt.customer_mobile}</p>
              {receipt.customer_address && <p className="text-slate-600 truncate mt-0.5">{receipt.customer_address}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Loan & Payment Meta</p>
              <p className="text-slate-700 mt-0.5"><span className="text-slate-500">Loan ID:</span> <span className="font-mono font-bold text-slate-900">{receipt.loan_id}</span></p>
              <p className="text-slate-700"><span className="text-slate-500">Payment Mode:</span> <span className="font-semibold text-slate-900">{receipt.payment_method}</span></p>
              {receipt.transaction_reference && (
                <p className="text-slate-700"><span className="text-slate-500">Ref No:</span> <span className="font-mono">{receipt.transaction_reference}</span></p>
              )}
              <p className="text-slate-700"><span className="text-slate-500">Recorded At:</span> {formatDateTime(receipt.created_at)}</p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Amount Received</p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">
                  {formatCurrency(receipt.amount_paid)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-200 text-emerald-800 uppercase">
                  Confirmed
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-200/60">
              <p className="text-xs text-slate-700 italic">
                <span className="font-medium text-slate-600">In Words:</span> {numberToWordsINR(receipt.amount_paid)}
              </p>
            </div>
          </div>

          {/* Installment Allocation Table */}
          {allocations.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-2">Installment Allocation</p>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Installment #</th>
                      <th className="p-2.5">Scheduled Due Date</th>
                      <th className="p-2.5 text-right">Allocated Amount</th>
                      <th className="p-2.5 text-right">Installment Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allocations.map((a, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-medium text-slate-800">Week #{a.installment_number}</td>
                        <td className="p-2.5 text-slate-600">{formatDate(a.due_date)}</td>
                        <td className="p-2.5 text-right font-semibold text-emerald-600">{formatCurrency(a.amount_allocated)}</td>
                        <td className="p-2.5 text-right font-medium text-slate-700">{formatCurrency(a.remaining_balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Outstanding Balance Banner */}
          <div className="flex justify-between items-center py-3 px-4 bg-slate-900 text-white rounded-xl mb-8">
            <span className="text-xs font-medium text-slate-300">Remaining Loan Outstanding Balance:</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              {formatCurrency(receipt.outstanding_balance)}
            </span>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 mb-8">Customer Signature:</p>
              <div className="border-t border-dashed border-slate-400 w-44"></div>
            </div>
            <div className="text-right flex flex-col items-end">
              <p className="text-slate-500 mb-8">Authorized Signatory / Seal:</p>
              <div className="border-t border-dashed border-slate-400 w-48"></div>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">{business?.name}</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            This is a computer generated payment receipt issued by {business?.name}. Valid without alterations.
          </div>
        </div>

        {/* Modal Footer (Hidden in print) */}
        <div className="no-print px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
}
