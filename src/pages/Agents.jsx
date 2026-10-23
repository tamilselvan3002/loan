import React, { useState } from 'react';
import { UserCheck, Plus, Phone, Mail, MapPin, Coins, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useLoans } from '../context/LoanContext';

export default function Agents() {
  const { agents, loans, addAgent } = useLoans();
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    area: ''
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return;

    addAgent(formData);
    setShowAddModal(false);
    setFormData({ name: '', mobile: '', email: '', area: '' });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Field Agent Portfolio Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track collection agent territories, assigned loan books, and overdue recovery performance.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Field Agent</span>
        </button>
      </div>

      {/* Agents Portfolio Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent) => {
          const assignedLoans = loans.filter(l => l.agentId === agent.id);
          const totalAssignedPrincipal = assignedLoans.reduce((sum, l) => sum + l.principal, 0);
          const totalCollected = assignedLoans.reduce((sum, l) => sum + l.totalPaid, 0);
          const totalOutstanding = assignedLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
          
          const overdueCount = assignedLoans.reduce((acc, l) => {
            return acc + l.installments.filter(i => i.status === 'overdue').length;
          }, 0);

          return (
            <div key={agent.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {agent.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{agent.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {agent.id}
                        </span>
                        <span className="text-[11px] text-slate-400">Joined: {agent.joinedDate}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg">
                    Active Agent
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-6 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono">{agent.mobile}</span>
                  </div>
                  {agent.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{agent.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Territory: <strong>{agent.area}</strong></span>
                  </div>
                </div>

                {/* Portfolio Metrics */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-medium">Assigned Loans</span>
                    <span className="font-mono text-base font-bold text-slate-900">{assignedLoans.length} accounts</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-medium">Disbursed Volume</span>
                    <span className="font-mono text-base font-bold text-slate-900">₹{totalAssignedPrincipal.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-medium">Total Collected</span>
                    <span className="font-mono text-base font-bold text-emerald-600">₹{totalCollected.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-500 block font-medium">Overdue Installments</span>
                    <span className={`font-mono text-base font-bold ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {overdueCount} overdue
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Recovery: <strong>{totalAssignedPrincipal > 0 ? Math.round((totalCollected / totalAssignedPrincipal) * 100) : 0}%</strong>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Outstanding: ₹{totalOutstanding.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden my-6">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Register Field Collection Agent</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agent Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Karthik Mani"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="10-digit phone"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="agent@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Area / Territory *</label>
                <input
                  type="text"
                  required
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g. North Chennai (Parrys, Royapuram)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Save Agent
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
