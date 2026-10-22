import React from 'react';
import { Menu, PlusCircle, Banknote, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatters';

export default function Header({ onMenuClick, title }) {
  const navigate = useNavigate();
  const todayFormatted = formatDate(new Date().toISOString().split('T')[0]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
        </div>

        <button
          onClick={() => navigate('/loans/new')}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
          <span>New Loan</span>
        </button>

        <button
          onClick={() => navigate('/repayments')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-colors"
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Collect Payment</span>
        </button>
      </div>
    </header>
  );
}
