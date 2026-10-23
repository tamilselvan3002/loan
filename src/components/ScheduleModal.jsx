import React from 'react';
import { X, Calendar, DollarSign, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function ScheduleModal({ loan, onClose, onRecordPayment }) {
  if (!loan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {loan.id}
              </span>
              <h2 className="text-lg font-bold">Repayment Schedule & Installment Ledger</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Principal: ₹{loan.principal.toLocaleString()} • {loan.tenureWeeks} Weeks ({loan.interestType.toUpperCase()} Interest @ {loan.annualInterestRate}%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Total Principal</span>
            <span className="font-mono text-base font-bold text-slate-900">₹{loan.principal.toLocaleString()}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Total Interest</span>
            <span className="font-mono text-base font-bold text-amber-600">₹{loan.totalInterest.toLocaleString()}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Total Repaid</span>
            <span className="font-mono text-base font-bold text-emerald-600">₹{loan.totalPaid.toLocaleString()}</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <span className="text-slate-500 block">Outstanding Balance</span>
            <span className="font-mono text-base font-bold text-rose-600">₹{loan.outstandingBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Due Date</th>
                <th className="py-2.5 px-3 text-right">Principal</th>
                <th className="py-2.5 px-3 text-right">Interest</th>
                <th className="py-2.5 px-3 text-right">Total Installment</th>
                <th className="py-2.5 px-3 text-right">Paid</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {loan.installments.map((inst) => {
                const isPaid = inst.status === 'paid';
                const isOverdue = inst.status === 'overdue';
                const isPartial = inst.status === 'partial';

                return (
                  <tr key={inst.installmentNumber} className={`hover:bg-slate-50/80 transition-colors ${isPaid ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{inst.installmentNumber}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inst.dueDate}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600">₹{inst.principalAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-amber-600">₹{inst.interestAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{inst.totalAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">
                      {inst.paidAmount ? `₹${inst.paidAmount.toFixed(2)}` : '₹0.00'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">
                          <AlertCircle className="w-3 h-3" /> Overdue
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3" /> Partial
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Weekly installments are calculated with penny-perfect reconciliation on week {loan.tenureWeeks}.
          </p>
          <div className="flex gap-3">
            {onRecordPayment && loan.status === 'active' && (
              <button
                onClick={() => {
                  onClose();
                  onRecordPayment(loan);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Record Payment
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
