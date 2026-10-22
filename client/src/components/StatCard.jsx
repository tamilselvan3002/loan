import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', alert = false }) {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-600',
      text: 'text-blue-600',
      border: 'border-blue-100'
    },
    emerald: {
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-600',
      text: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    amber: {
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-600',
      text: 'text-amber-600',
      border: 'border-amber-100'
    },
    rose: {
      bg: 'bg-rose-50',
      iconBg: 'bg-rose-600',
      text: 'text-rose-600',
      border: 'border-rose-100'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-600',
      text: 'text-purple-600',
      border: 'border-purple-100'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className={`
      bg-white rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md
      ${alert ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'}
    `}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${scheme.bg} flex items-center justify-center text-white shrink-0`}>
            <div className={`w-8 h-8 rounded-lg ${scheme.iconBg} flex items-center justify-center shadow-sm`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
