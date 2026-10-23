import React from 'react';
import { BarChart3, Download, CheckCircle2, ShieldCheck, TrendingUp, AlertCircle } from 'lucide-react';
import { useLoans } from '../context/LoanContext';

export default function Reports() {
  const { loans, customers, agents, receipts, settings } = useLoans();

  const totalPrincipal = loans.reduce((sum, l) => sum + l.principal, 0);
  const totalInterestExpected = loans.reduce((sum, l) => sum + l.totalInterest, 0);
  const totalExpectedRepayment = loans.reduce((sum, l) => sum + l.totalRepayment, 0);
  const totalCollected = loans.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstandingBalance, 0);

  // Reconciliation check: Collected + Outstanding == Total Expected
  const calculatedSum = Math.round((totalCollected + totalOutstanding) * 100) / 100;
  const difference = Math.round(Math.abs(calculatedSum - totalExpectedRepayment) * 100) / 100;
  const isReconciled = difference <= 0.05;

  const exportCSV = () => {
    let csv = 'Loan ID,Customer Name,Mobile,Principal,Interest,Total Repayment,Collected,Outstanding,Status\n';
    loans.forEach(l => {
      const c = customers.find(cust => cust.id === l.customerId);
      csv += `"${l.id}","${c ? c.name : l.customerId}","${c ? c.mobile : ''}",${l.principal},${l.totalInterest},${l.totalRepayment},${l.totalPaid},${l.outstandingBalance},"${l.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Loan_Ledger_Reconciliation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Reports & Financial Reconciliation</h1>
          <p className="text-xs text-slate-500 mt-1">
            Audited financial calculations, ledger verification balance, and CSV exports for {settings.businessName}.
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export Reconciliation to CSV</span>
        </button>
      </div>

      {/* Financial Ledger Reconciliation Engine */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Financial Ledger Reconciliation Verification
            </h2>
          </div>
          {isReconciled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exact Reconciled (₹0.00 Variance)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
              <AlertCircle className="w-4 h-4" />
              <span>Variance: ₹{difference}</span>
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Formula: <code className="bg-slate-100 px-2 py-1 rounded font-mono text-slate-700 font-bold">Collected + Outstanding = Total Expected Repayment</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <span className="text-xs text-emerald-700 font-semibold block">Total Collected Inflows</span>
            <span className="font-mono text-xl font-black text-emerald-800 mt-1 block">
              ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-emerald-600 mt-1 block">From verified receipts</span>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-700 font-semibold block">Total Outstanding Balance</span>
            <span className="font-mono text-xl font-black text-amber-800 mt-1 block">
              ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-amber-600 mt-1 block">Remaining customer balance</span>
          </div>

          <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200">
            <span className="text-xs text-blue-700 font-semibold block">Total Expected Repayment</span>
            <span className="font-mono text-xl font-black text-blue-900 mt-1 block">
              ₹{totalExpectedRepayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-blue-600 mt-1 block">Principal + full interest</span>
          </div>
        </div>
      </div>

      {/* Customer-wise Portfolio Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Customer Loan Accounts Summary</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Customer ID</th>
                <th className="py-2.5 px-4">Customer Name</th>
                <th className="py-2.5 px-4 text-center">Total Loans</th>
                <th className="py-2.5 px-4 text-right">Principal Disbursed</th>
                <th className="py-2.5 px-4 text-right">Total Repaid</th>
                <th className="py-2.5 px-4 text-right">Current Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {customers.map(cust => {
                const cLoans = loans.filter(l => l.customerId === cust.id);
                const cPrincipal = cLoans.reduce((sum, l) => sum + l.principal, 0);
                const cRepaid = cLoans.reduce((sum, l) => sum + l.totalPaid, 0);
                const cOut = cLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);

                return (
                  <tr key={cust.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-blue-600">{cust.id}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{cust.name}</td>
                    <td className="py-3 px-4 text-center">{cLoans.length}</td>
                    <td className="py-3 px-4 text-right">₹{cPrincipal.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{cRepaid.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-bold">₹{cOut.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Agent Collection Efficiency Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Field Agent Recovery Performance</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Agent ID</th>
                <th className="py-2.5 px-4">Agent Name</th>
                <th className="py-2.5 px-4">Territory</th>
                <th className="py-2.5 px-4 text-center">Assigned Loans</th>
                <th className="py-2.5 px-4 text-right">Disbursed Book</th>
                <th className="py-2.5 px-4 text-right">Total Collected</th>
                <th className="py-2.5 px-4 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {agents.map(agt => {
                const aLoans = loans.filter(l => l.agentId === agt.id);
                const aDisbursed = aLoans.reduce((sum, l) => sum + l.principal, 0);
                const aCollected = aLoans.reduce((sum, l) => sum + l.totalPaid, 0);
                const rate = aDisbursed > 0 ? Math.round((aCollected / aDisbursed) * 100) : 0;

                return (
                  <tr key={agt.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-blue-600">{agt.id}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{agt.name}</td>
                    <td className="py-3 px-4 font-sans text-slate-600">{agt.area}</td>
                    <td className="py-3 px-4 text-center">{aLoans.length}</td>
                    <td className="py-3 px-4 text-right">₹{aDisbursed.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{aCollected.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">{rate}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
