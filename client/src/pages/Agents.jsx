import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Search,
  Plus,
  Phone,
  Eye,
  Calendar,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Agent Form
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchAgents();
  }, [statusFilter]);

  async function fetchAgents(searchTerm = search) {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await api.getAgents(params);
      setAgents(res.agents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.createAgent({
        full_name: fullName,
        mobile_number: mobileNumber,
        address,
        joining_date: joiningDate,
        notes
      });
      setIsModalOpen(false);
      resetForm();
      fetchAgents();
      navigate(`/agents/${res.agent.id}`);
    } catch (err) {
      setFormError(err.message || 'Failed to create agent');
    } finally {
      setSubmitting(false);
    }
  };

  function resetForm() {
    setFullName('');
    setMobileNumber('');
    setAddress('');
    setJoiningDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormError('');
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Agent Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage collection agents, portfolio assignments, and performance</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Agent</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); fetchAgents(); }} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Agent ID (AGT-101), Name, or Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'INACTIVE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Agents' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
            <span>Loading agents...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <UserCheck className="w-8 h-8 text-slate-300" />
            <p className="font-semibold text-slate-600">No agents found</p>
            <p>Click "Add New Agent" above to register an agent.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Agent ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Mobile Number</th>
                  <th className="p-3.5 text-center">Assigned Loans</th>
                  <th className="p-3.5 text-right">Total Issued</th>
                  <th className="p-3.5 text-right">Total Collected</th>
                  <th className="p-3.5 text-right">Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agents.map((agt) => (
                  <tr key={agt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{agt.id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{agt.full_name}</td>
                    <td className="p-3.5 font-mono text-slate-700">{agt.mobile_number}</td>
                    <td className="p-3.5 text-center font-bold text-slate-800">{agt.total_loans}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">{formatCurrency(agt.total_principal_issued)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600">{formatCurrency(agt.total_collected)}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-amber-600">{formatCurrency(agt.total_outstanding)}</td>
                    <td className="p-3.5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        agt.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {agt.status}
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={() => navigate(`/agents/${agt.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Portfolio</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Register Field Agent</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Agent Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M. Suresh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98401 23456"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Territory</label>
                <textarea
                  rows={2}
                  placeholder="Assigned area or residence..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  placeholder="Guarantor, notes, identification..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  <span>Save Agent</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
