import React from 'react';
import { X, Printer, CheckCircle, ShieldCheck } from 'lucide-react';
import { useLoans } from '../context/LoanContext';

export default function ReceiptModal({ receipt, onClose }) {
  const { settings } = useLoans();
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto no-print-bg">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        
        {/* Modal Controls - Hidden when printed */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide uppercase">Official Payment Receipt</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-8 bg-white text-slate-800 font-sans">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{settings.businessName}</h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{settings.tagline}</p>
                <p className="text-xs text-slate-600 mt-2 max-w-md">{settings.address}</p>
                <div className="flex gap-4 mt-1 text-xs text-slate-600">
                  <span><strong>Tel:</strong> {settings.contactNumber}</span>
                  <span><strong>GSTIN:</strong> {settings.gstNumber}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 font-mono text-xs font-bold rounded">
                  OFFICIAL RECEIPT
                </span>
                <p className="text-xs font-mono text-slate-500 mt-2">Receipt No:</p>
                <p className="font-mono text-sm font-bold text-slate-900">{receipt.receiptNumber}</p>
              </div>
            </div>
          </div>

          {/* Receipt Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Received From</p>
              <p className="font-bold text-slate-900 text-base mt-0.5">{receipt.customerName}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Customer ID: {receipt.customerId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Date & Time</p>
              <p className="font-semibold text-slate-800 mt-0.5">{receipt.paymentDate}</p>
              <p className="text-xs text-slate-500 mt-0.5">Mode: <strong className="text-slate-800">{receipt.paymentMode}</strong></p>
            </div>
          </div>

          {/* Loan & Payment Breakdown */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Description</th>
                  <th className="py-2.5 px-4 font-semibold">Ref / Loan ID</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">Weekly Loan Repayment</p>
                    <p className="text-xs text-slate-500">
                      {receipt.installmentsCovered && receipt.installmentsCovered.length > 0 
                        ? `Allocated to Installment(s) #${receipt.installmentsCovered.join(', #')}`
                        : 'Account credit balance'}
                    </p>
                    {receipt.notes && (
                      <p className="text-xs text-slate-400 italic mt-0.5">Note: {receipt.notes}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">
                    <div>{receipt.loanId}</div>
                    <div className="text-slate-400 mt-0.5">{receipt.referenceNumber}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-base font-bold text-slate-900">
                    ₹{Number(receipt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount In Words */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-900 font-semibold uppercase tracking-wider">Amount In Words</p>
            <p className="font-serif italic text-blue-950 font-semibold text-base mt-1">
              "{receipt.amountInWords}"
            </p>
          </div>

          {/* Remaining Balance & Settlement summary */}
          <div className="flex justify-between items-center px-4 py-3 bg-slate-100 rounded-xl mb-8">
            <span className="text-xs font-semibold text-slate-600 uppercase">Remaining Outstanding Balance:</span>
            <span className="font-mono text-base font-extrabold text-slate-900">
              ₹{Number(receipt.remainingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Signatures & Seal */}
          <div className="flex justify-between items-end pt-8 border-t border-slate-200">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Digitally Verified & Ledger Audited</span>
              </div>
              <p className="text-xs text-slate-400">Collected By: <strong>{receipt.collectedBy}</strong></p>
              <p className="text-[11px] text-slate-400 mt-0.5">This is a system generated official receipt.</p>
            </div>
            <div className="text-center w-48">
              <div className="border-b border-slate-900 mb-1.5 pb-8 font-serif italic text-xs text-slate-400">
                Authorized Signatory
              </div>
              <p className="text-xs font-semibold text-slate-800">For {settings.businessName}</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
