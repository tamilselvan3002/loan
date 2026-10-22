import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Search,
  Plus,
  Banknote,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    fetchLoans();
  }, [statusFilter]);

  async function fetchLoans(searchTerm = search) {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.getLoans(params);
      setLoans(res.loans || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLoans();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Loan Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage issued personal loans, interest terms, and repayment schedules</p>
        </div>
        <button
          onClick={() => navigate('/loans/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Loan</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Loan ID (LOAN-1001), Customer, or Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'ACTIVE', 'OVERDUE', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Loans' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span>Loading loans...</span>
          </div>
        ) : loans.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <CreditCard className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No loan records found</p>
            <p>Click "Issue New Loan" to create a loan schedule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Loan ID</th>
                  <th className="p-3.5">Borrower</th>
                  <th className="p-3.5 font-mono">Principal</th>
                  <th className="p-3.5">Duration</th>
                  <th className="p-3.5 font-mono text-emerald-600">Repaid</th>
                  <th className="p-3.5 font-mono text-right font-bold">Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{l.id}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900">{l.customer_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{l.customer_mobile}</p>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">{formatCurrency(l.principal_amount)}</td>
                    <td className="p-3.5 text-slate-600">
                      {l.total_installments || l.total_duration_weeks} {l.repayment_frequency === 'DAILY' ? 'days' : l.repayment_frequency === 'MONTHLY' ? 'mos' : 'wks'} ({l.interest_rate_percent}%)
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-emerald-600">{formatCurrency(l.total_paid_amount)}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-900 text-right">{formatCurrency(l.outstanding_balance)}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        l.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : l.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'OVERDUE'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/loans/${l.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {l.status !== 'COMPLETED' && l.status !== 'CANCELLED' && (
                          <button
                            onClick={() => navigate(`/repayments?loan_id=${l.id}`)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Collect</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
