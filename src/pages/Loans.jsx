import React, { useState } from 'react';
import { 
  Coins, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Eye, 
  Receipt,
  X,
  ArrowRight
} from 'lucide-react';
import { useLoans } from '../context/LoanContext';
import { calculateSchedule } from '../utils/loanCalculator';
import ScheduleModal from '../components/ScheduleModal';

export default function Loans({ onOpenPaymentModal }) {
  const { loans, customers, agents, createLoan } = useLoans();
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [showOriginateModal, setShowOriginateModal] = useState(false);
  const [viewingScheduleLoan, setViewingScheduleLoan] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingOriginationData, setPendingOriginationData] = useState(null);

  // Form State
  const [form, setForm] = useState({
    customerId: '',
    agentId: '',
    principal: '50000',
    annualInterestRate: '15',
    tenureWeeks: '12',
    interestType: 'flat', // 'flat' or 'reducing'
    purpose: ''
  });

  // Live schedule preview calculation
  const livePreview = calculateSchedule({
    principal: Number(form.principal) || 0,
    annualInterestRate: Number(form.annualInterestRate) || 0,
    tenureWeeks: Number(form.tenureWeeks) || 0,
    interestType: form.interestType,
    startDate: new Date()
  });

  const filteredLoans = loans.filter(l => {
    if (filterStatus === 'active') return l.status === 'active';
    if (filterStatus === 'closed') return l.status === 'closed';
    return true;
  });

  const handleOriginateSubmit = (e) => {
    e.preventDefault();
    if (!form.customerId || !form.agentId || !form.principal || !form.tenureWeeks) return;

    // Check if customer already has active loan
    const hasActiveLoan = loans.some(l => l.customerId === form.customerId && l.status === 'active');
    
    if (hasActiveLoan) {
      setPendingOriginationData(form);
      setShowDuplicateWarning(true);
      return;
    }

    proceedCreation(form);
  };

  const proceedCreation = (loanParams) => {
    createLoan(loanParams);
    setShowDuplicateWarning(false);
    setShowOriginateModal(false);
    setForm({
      customerId: '',
      agentId: '',
      principal: '50000',
      annualInterestRate: '15',
      tenureWeeks: '12',
      interestType: 'flat',
      purpose: ''
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Loan Origination & Repayment Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Flat-rate & reducing-balance weekly interest calculation with exact penny/paisa reconciliation.
          </p>
        </div>
        <button
          onClick={() => {
            if (customers.length > 0) setForm(f => ({ ...f, customerId: customers[0].id }));
            if (agents.length > 0) setForm(f => ({ ...f, agentId: agents[0].id }));
            setShowOriginateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Loan Origination</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterStatus === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Loans ({loans.length})
        </button>
        <button
          onClick={() => setFilterStatus('active')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterStatus === 'active' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({loans.filter(l => l.status === 'active').length})
        </button>
        <button
          onClick={() => setFilterStatus('closed')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
            filterStatus === 'closed' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Settled / Closed ({loans.filter(l => l.status === 'closed').length})
        </button>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Loan ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Terms</th>
                <th className="py-3 px-4 text-right">Principal</th>
                <th className="py-3 px-4 text-right">Weekly EMI</th>
                <th className="py-3 px-4 text-right">Repaid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.map((loan) => {
                const customer = customers.find(c => c.id === loan.customerId);
                const agent = agents.find(a => a.id === loan.agentId);
                const isClosed = loan.status === 'closed';

                return (
                  <tr key={loan.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                      {loan.id}
                      <span className="block text-[10px] text-slate-400 font-sans mt-0.5">{loan.disbursedDate}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{customer ? customer.name : loan.customerId}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{customer?.mobile}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800">{loan.tenureWeeks} wks</span>
                      <span className="text-[11px] text-slate-500 block">
                        {loan.interestType.toUpperCase()} @ {loan.annualInterestRate}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{loan.principal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600">
                      ₹{loan.weeklyEmi.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                      ₹{loan.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-600">
                      ₹{loan.outstandingBalance.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isClosed 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {isClosed ? 'CLOSED' : 'ACTIVE'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setViewingScheduleLoan(loan)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Schedule</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Origination Wizard Modal with Live Preview */}
      {showOriginateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-bold">Originate Loan & Preview Repayment Schedule</h2>
              </div>
              <button
                onClick={() => setShowOriginateModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOriginateSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Borrower Customer *</label>
                  <select
                    required
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.id}) - {c.mobile}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Field Agent *</label>
                  <select
                    required
                    value={form.agentId}
                    onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="">Select Agent...</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.id}) - {a.area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Principal (₹) *</label>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={form.principal}
                    onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tenure (Weeks) *</label>
                  <input
                    type="number"
                    min="1"
                    max="104"
                    required
                    value={form.tenureWeeks}
                    onChange={(e) => setForm({ ...form, tenureWeeks: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Annual Interest (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form.annualInterestRate}
                    onChange={(e) => setForm({ ...form, annualInterestRate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Interest Engine</label>
                  <select
                    value={form.interestType}
                    onChange={(e) => setForm({ ...form, interestType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 font-semibold"
                  >
                    <option value="flat">Flat Rate</option>
                    <option value="reducing">Reducing EMI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loan Purpose / Remarks</label>
                <input
                  type="text"
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  placeholder="e.g. Small business working capital"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800"
                />
              </div>

              {/* Live Interactive Calculation Preview */}
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Live Interactive Repayment Calculation</span>
                  </h4>
                  <span className="text-[11px] font-mono text-blue-700 font-semibold">
                    {livePreview.installments.length} Weekly Installments
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Principal</span>
                    <span className="font-mono font-bold text-slate-900">₹{livePreview.principal.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Total Interest</span>
                    <span className="font-mono font-bold text-amber-600">₹{livePreview.totalInterest.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Total Repayment</span>
                    <span className="font-mono font-bold text-slate-900">₹{livePreview.totalRepayment.toLocaleString()}</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-400 block">Weekly EMI</span>
                    <span className="font-mono font-bold text-blue-600">₹{livePreview.weeklyEmi.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mt-2 italic">
                  * Note: Penny/paisa reconciliation is automatically adjusted on the final week installment to ensure exact equality.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowOriginateModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Confirm & Issue Loan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Duplicate Active Loan Warning Confirmation Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-amber-300 overflow-hidden my-6 p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">Active Loan Warning</h3>
            <p className="text-xs text-slate-600 text-center mt-2">
              This borrower already has an active loan account undergoing repayment. Issuing another loan concurrently requires explicit administrator authorization.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowDuplicateWarning(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => proceedCreation(pendingOriginationData)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20"
              >
                Authorize & Disburse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repayment Schedule Breakdown Modal */}
      {viewingScheduleLoan && (
        <ScheduleModal
          loan={viewingScheduleLoan}
          onClose={() => setViewingScheduleLoan(null)}
          onRecordPayment={() => {
            // Can switch tab or record payment
          }}
        />
      )}

    </div>
  );
}
