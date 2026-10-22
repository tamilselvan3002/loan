import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  CreditCard,
  Banknote,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  PlusCircle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import StatCard from '../components/StatCard';
import ReceiptModal from '../components/ReceiptModal';
import { api } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptModalData, setReceiptModalData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const recentTransactions = data?.recentTransactions || [];
  const weeklyTrend = data?.weeklyTrend || [];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-white px-3 py-2 rounded-2xl shadow-md border border-white/20 hidden sm:flex items-center justify-center">
            <img src="/logo.png" alt="Vishva Finance" className="h-9 w-auto object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Financial Overview</h2>
            <p className="text-xs text-blue-200 mt-1 max-w-xl">
              Live database ledger. Displays real-time principal issues, collections, and outstanding loan schedules.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/customers')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
          >
            <Users className="w-4 h-4 text-blue-300" />
            <span>Customers</span>
          </button>
          <button
            onClick={() => navigate('/loans/new')}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold backdrop-blur-sm transition-colors flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-blue-300" />
            <span>Issue Loan</span>
          </button>
          <button
            onClick={() => navigate('/repayments')}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
          >
            <Banknote className="w-4 h-4" />
            <span>Collect Payment</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outstanding"
          value={formatCurrency(kpis.totalOutstanding)}
          subtitle={`${kpis.activeLoans} active loans, ${kpis.overdueLoans} overdue`}
          icon={CreditCard}
          color="amber"
          alert={kpis.overdueLoans > 0}
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(kpis.totalAmountCollected)}
          subtitle={`₹${formatCurrency(kpis.thisWeekCollections, false)} collected this week`}
          icon={Banknote}
          color="emerald"
        />
        <StatCard
          title="Principal Issued"
          value={formatCurrency(kpis.totalPrincipal)}
          subtitle={`Expected Interest: ${formatCurrency(kpis.totalInterestExpected)}`}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Overdue Balance"
          value={formatCurrency(kpis.overdueAmount)}
          subtitle={`${kpis.overdueCount} installment(s) overdue`}
          icon={AlertTriangle}
          color="rose"
          alert={kpis.overdueCount > 0}
        />
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Today's Collections</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(kpis.todayCollections)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Recorded today</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Upcoming Due (7 Days)</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(kpis.upcomingAmount)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{kpis.upcomingCount} installments due soon</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Registered Borrowers</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{kpis.totalCustomers}</p>
          <p className="text-xs text-slate-400 mt-0.5">{kpis.totalAgents} field agents registered</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total Loans Issued</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{kpis.totalLoans}</p>
          <p className="text-xs text-slate-400 mt-0.5">{kpis.completedLoans} completed repayment</p>
        </div>
      </div>

      {/* Charts & Collection Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Collections Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Weekly Collections Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Collections received per week</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Full Reports</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            {weeklyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No payment history recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="week_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val) => [formatCurrency(val), 'Collected']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Loan Portfolio Status Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Loan Portfolio Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Distribution of active and completed accounts</p>

            <div className="mt-6 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Active On-Time Loans</span>
                  <span className="text-blue-600">{kpis.activeLoans}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${kpis.totalLoans ? (kpis.activeLoans / kpis.totalLoans) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Completed Fully Repaid</span>
                  <span className="text-emerald-600">{kpis.completedLoans}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${kpis.totalLoans ? (kpis.completedLoans / kpis.totalLoans) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">Overdue Repayments</span>
                  <span className="text-rose-600">{kpis.overdueLoans}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-rose-500 h-full rounded-full"
                    style={{ width: `${kpis.totalLoans ? (kpis.overdueLoans / kpis.totalLoans) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Collection Recovery Rate:</span>
            <span className="font-bold text-slate-800">
              {kpis.totalPrincipal > 0 
                ? `${Math.min(100, Math.round((kpis.totalAmountCollected / (kpis.totalPrincipal + kpis.totalInterestExpected)) * 100))}%` 
                : '100%'}
            </span>
          </div>
        </div>

      </div>

      {/* Recent Payment Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Payment Transactions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest receipts issued to customers</p>
          </div>
          <button
            onClick={() => navigate('/payment-history')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Full History</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No payments recorded yet. Click "Collect Payment" to record your first transaction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Receipt No</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Loan ID</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{tx.receipt_number}</td>
                    <td className="p-3.5 text-slate-600">{formatDate(tx.payment_date)}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{tx.customer_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{tx.loan_id}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.payment_method}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-600 font-mono">
                      {formatCurrency(tx.amount_paid)}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => handleOpenReceipt(tx.receipt_number)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
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
        isOpen={Boolean(receiptModalData)}
        onClose={() => setReceiptModalData(null)}
        data={receiptModalData}
      />

    </div>
  );
}
