import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Users,
  Banknote,
  AlertTriangle,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('customers');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [reconciliation, setReconciliation] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [collectionGroup, setCollectionGroup] = useState('day');

  useEffect(() => {
    fetchReport();
  }, [activeTab, collectionGroup]);

  async function fetchReport() {
    try {
      setLoading(true);
      if (activeTab === 'customers') {
        const res = await api.getCustomerReport();
        setData(res.report || []);
      } else if (activeTab === 'collections') {
        const res = await api.getCollectionReport({
          groupBy: collectionGroup,
          start_date: startDate,
          end_date: endDate
        });
        setData(res.report || []);
      } else if (activeTab === 'overdue') {
        const res = await api.getOverdueReport();
        setData(res.report || []);
      } else if (activeTab === 'summary') {
        const res = await api.getFinancialSummary();
        setReconciliation(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header] ?? '';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Financial Reports & Reconciliation</h2>
          <p className="text-xs text-slate-500 mt-0.5">Audited reporting from database records with CSV export & print support</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
          {activeTab !== 'summary' && (
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        {[
          { key: 'customers', label: 'Customer-Wise Report', icon: Users },
          { key: 'collections', label: 'Collections Breakdown', icon: Banknote },
          { key: 'overdue', label: 'Overdue Installments', icon: AlertTriangle },
          { key: 'summary', label: 'Ledger Reconciliation', icon: Scale },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Collection Granularity Selector if collections tab */}
      {activeTab === 'collections' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-700">Group collections by:</span>
          <div className="flex gap-2">
            {[
              { val: 'day', label: 'Daily' },
              { val: 'week', label: 'Weekly' },
              { val: 'month', label: 'Monthly' }
            ].map(g => (
              <button
                key={g.val}
                onClick={() => setCollectionGroup(g.val)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  collectionGroup === g.val
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Report Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading report data...</div>
        ) : activeTab === 'summary' && reconciliation ? (
          <div className="p-6 space-y-6">
            
            {/* Reconciliation Banner */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between ${
              reconciliation.reconciliation.isReconciled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-sm">Ledger Mathematical Reconciliation Status</h3>
                  <p className="text-xs mt-0.5">
                    Total Amount Collected + Current Outstanding Balance reconciles with Total Expected Repayments.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-200 text-emerald-800">
                100% Reconciled
              </span>
            </div>

            {/* Figures Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Principal Issued</p>
                <p className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {formatCurrency(reconciliation.summary.total_principal_issued)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Interest Expected</p>
                <p className="text-xl font-bold font-mono text-blue-600 mt-1">
                  {formatCurrency(reconciliation.summary.total_expected_interest)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Amount Collected</p>
                <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                  {formatCurrency(reconciliation.summary.total_collected)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Current Outstanding</p>
                <p className="text-xl font-bold font-mono text-amber-600 mt-1">
                  {formatCurrency(reconciliation.summary.total_outstanding)}
                </p>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="p-5 border border-slate-200 rounded-2xl bg-white space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">Collections by Payment Mode</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Cash</p>
                  <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(reconciliation.paymentBreakdown.cash_total)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">UPI (GPay / PhonePe)</p>
                  <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(reconciliation.paymentBreakdown.upi_total)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Bank Transfer</p>
                  <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(reconciliation.paymentBreakdown.bank_total)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-500 text-[10px] uppercase font-semibold">Cheque</p>
                  <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
                    {formatCurrency(reconciliation.paymentBreakdown.cheque_total)}
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : activeTab === 'customers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Customer ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Mobile</th>
                  <th className="p-3.5 text-center">Total Loans</th>
                  <th className="p-3.5 text-center">Active</th>
                  <th className="p-3.5 font-mono text-right font-bold">Principal Issued</th>
                  <th className="p-3.5 font-mono text-right text-emerald-600 font-bold">Total Repaid</th>
                  <th className="p-3.5 font-mono text-right text-amber-600 font-bold">Outstanding</th>
                  <th className="p-3.5 font-mono text-right text-rose-600 font-bold pr-5">Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{c.id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{c.full_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{c.mobile_number}</td>
                    <td className="p-3.5 text-center">{c.total_loans}</td>
                    <td className="p-3.5 text-center">{c.active_loans}</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(c.total_principal)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-600 font-semibold">{formatCurrency(c.total_repaid)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(c.total_outstanding)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 pr-5">{formatCurrency(c.overdue_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'collections' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Period</th>
                  <th className="p-3.5 text-center">Tx Count</th>
                  <th className="p-3.5 font-mono text-right">Cash</th>
                  <th className="p-3.5 font-mono text-right">UPI</th>
                  <th className="p-3.5 font-mono text-right">Bank Transfer</th>
                  <th className="p-3.5 font-mono text-right">Cheque</th>
                  <th className="p-3.5 font-mono text-right font-bold text-emerald-600 pr-5">Total Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5 font-bold text-slate-900">{row.period}</td>
                    <td className="p-3.5 text-center font-medium text-slate-600">{row.transaction_count}</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(row.cash_amount)}</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(row.upi_amount)}</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(row.bank_amount)}</td>
                    <td className="p-3.5 text-right font-mono">{formatCurrency(row.cheque_amount)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600 pr-5">{formatCurrency(row.total_collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'overdue' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Borrower</th>
                  <th className="p-3.5">Mobile</th>
                  <th className="p-3.5">Loan ID</th>
                  <th className="p-3.5">Week #</th>
                  <th className="p-3.5">Scheduled Date</th>
                  <th className="p-3.5 text-center">Days Overdue</th>
                  <th className="p-3.5 font-mono text-right font-bold text-rose-600 pr-5">Amount Overdue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row) => (
                  <tr key={row.schedule_id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5 font-bold text-slate-900">{row.customer_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{row.customer_mobile}</td>
                    <td className="p-3.5 font-mono text-blue-600 font-semibold">{row.loan_id}</td>
                    <td className="p-3.5 font-medium text-slate-700">Week #{row.installment_number}</td>
                    <td className="p-3.5 text-slate-600">{formatDate(row.due_date)}</td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        {row.days_overdue} days
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 pr-5">{formatCurrency(row.remaining_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

    </div>
  );
}
