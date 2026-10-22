import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Banknote,
  Receipt,
  MessageSquare,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  X,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { admin, logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Loans', path: '/loans', icon: CreditCard },
    { name: 'Repayments', path: '/repayments', icon: Banknote },
    { name: 'Payment History', path: '/payment-history', icon: Receipt },
    { name: 'SMS & Reminders', path: '/sms-reminders', icon: MessageSquare },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Audit Logs', path: '/audit-logs', icon: ShieldAlert },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800
        transition-transform duration-300 ease-in-out lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1.5 rounded-xl border border-slate-700 shadow-md flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Vishva Finance Logo" 
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                end={item.path === '/'}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Admin User & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                {admin?.full_name ? admin.full_name.charAt(0) : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{admin?.full_name || 'Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">@{admin?.username || 'admin'}</p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
