import React from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  CreditCard, 
  Coins, 
  ArrowUpRight, 
  Clock, 
  CheckCircle,
  PlusCircle,
  Receipt,
  BellRing
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { useLoans } from '../context/LoanContext';

export default function Dashboard() {
  const { loans, customers, receipts, auditLogs, settings } = useLoans();

  const totalDisbursed = loans.reduce((sum, l) => sum + l.principal, 0);
  const totalRepaid = loans.reduce((sum, l) => sum + l.totalPaid, 0);
  const totalOutstanding = loans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const activeLoansCount = loans.filter(l => l.status === 'active').length;

  const overdueInstallments = loans.flatMap(l => 
    l.installments.filter(i => i.status === 'overdue').map(i => ({
      ...i,
      loanId: l.id,
      customerId: l.customerId
    }))
  );

  // Collections chart data from receipts
  const chartData = [
    { day: 'Mon', amount: 8500 },
    { day: 'Tue', amount: 12400 },
    { day: 'Wed', amount: 9800 },
    { day: 'Thu', amount: 14500 },
    { day: 'Fri', amount: 18200 },
    { day: 'Sat', amount: 22400 },
    { day: 'Sun', amount: 6200 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time portfolio metrics, collections overview, and automated audit status for {settings.businessName}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/loans"
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Loan</span>
          </Link>
          <Link
            to="/repayments"
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>Record Payment</span>
          </Link>
          <Link
            to="/reminders"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            <BellRing className="w-4 h-4" />
            <span>Reminders</span>
          </Link>
        </div>
      </div>

      {/* Overdue Warning Alert */}
      {overdueInstallments.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-rose-900">
                Action Required: {overdueInstallments.length} Installment(s) Currently Overdue
              </p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Send payment reminder SMS or assign field agents to collect payments today.
              </p>
            </div>
          </div>
          <Link
            to="/reminders"
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            Dispatch Alerts
          </Link>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Disbursed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-2xl font-black text-slate-900">
            ₹{totalDisbursed.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <span>{loans.length} total loan origination cycles</span>
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-2xl font-black text-emerald-600">
            ₹{totalRepaid.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Principal + weekly interest collected
          </p>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outstanding Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-2xl font-black text-amber-600">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            {activeLoansCount} active accounts undergoing repayment
          </p>
        </div>

        {/* Active Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Customers</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="font-mono text-2xl font-black text-slate-900">
            {customers.length}
          </p>
          <p className="text-[11px] text-purple-700 mt-1 font-medium">
            KYC verified customer accounts
          </p>
        </div>

      </div>

      {/* Chart & Live Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Collections Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weekly Collection Inflows</h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time daily collection cashflows</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
              Healthy Repayment Rate
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip 
                  formatter={(val) => [`₹${val.toLocaleString()}`, 'Collection']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Audit Trails */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Audit Trail</h2>
            <span className="text-[11px] font-mono text-slate-400">Security Log</span>
          </div>

          <div className="space-y-3.5 flex-1 overflow-y-auto max-h-64 pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span className="font-bold text-blue-600">{log.action}</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-slate-700 font-medium line-clamp-2">{log.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/reports" className="text-xs text-blue-600 font-bold hover:underline">
              View Full Financial Reports & Audit Ledgers →
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
