import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Coins, 
  Receipt, 
  BellRing, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldAlert,
  Building2,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLoans } from '../context/LoanContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { settings, loans } = useLoans();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const overdueCount = loans.reduce((acc, loan) => {
    return acc + loan.installments.filter(i => i.status === 'overdue').length;
  }, 0);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customers', label: 'Customers 360°', icon: Users },
    { to: '/agents', label: 'Field Agents', icon: UserCheck },
    { to: '/loans', label: 'Loans & Schedules', icon: Coins },
    { to: '/repayments', label: 'Repayments & Receipts', icon: Receipt },
    { 
      to: '/reminders', 
      label: 'SMS & Reminders', 
      icon: BellRing, 
      badge: overdueCount > 0 ? `${overdueCount}` : null 
    },
    { to: '/reports', label: 'Reports & Reconciliation', icon: BarChart3 },
    { to: '/settings', label: 'Portal Settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-slate-800">
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800 no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
            PL
          </div>
          <span className="font-bold text-sm tracking-tight">{settings.businessName}</span>
        </div>
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen z-40 bg-slate-900 text-slate-300 w-64 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 ease-in-out no-print
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo Brand Header */}
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h1 className="font-extrabold text-sm text-white tracking-tight truncate">{settings.businessName}</h1>
                <p className="text-[11px] text-blue-400 font-medium">Administrator Portal</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-slate-800">
          <div className="p-3 bg-slate-800/60 rounded-xl mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                AD
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.username || 'Admin'}</p>
                <p className="text-[10px] text-emerald-400 font-medium">Super Administrator</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Admin Workspace</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800">Operational Console</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>System Online: <strong>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
