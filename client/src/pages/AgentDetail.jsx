import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CreditCard,
  Banknote,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Edit,
  Save,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function AgentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [id]);

  async function loadAgent() {
    try {
      setLoading(true);
      const res = await api.getAgentById(id);
      setData(res);
      setEditName(res.agent.full_name);
      setEditMobile(res.agent.mobile_number);
      setEditAddress(res.agent.address || '');
      setEditNotes(res.agent.notes || '');
      setEditStatus(res.agent.status);
    } catch (err) {
      alert(`Agent error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.updateAgent(id, {
        full_name: editName,
        mobile_number: editMobile,
        address: editAddress,
        notes: editNotes,
        status: editStatus
      });
      setIsEditing(false);
      loadAgent();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading || !data) {
    return (
      <div className="p-12 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  const { agent, loans, customers, stats } = data;
  const recoveryRate = stats.total_principal_issued > 0
    ? Math.round((stats.total_collected / stats.total_principal_issued) * 100)
    : 100;

  return (
    <div className="space-y-6">
      
      {/* Agent Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-xl text-blue-600 shrink-0">
              <UserCheck className="w-8 h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                  {agent.id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  agent.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {agent.status}
                </span>
                <span className="text-xs text-slate-400">
                  Joined on {formatDate(agent.joining_date)}
                </span>
              </div>

              <h2 className="text-2xl font-black text-slate-900 mt-1">{agent.full_name}</h2>

              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1 font-mono font-medium">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>{agent.mobile_number}</span>
                </div>
                {agent.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{agent.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start md:self-auto transition-colors"
          >
            <Edit className="w-3.5 h-3.5 text-slate-500" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Agent'}</span>
          </button>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Assigned Loans</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{stats.total_loans}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Active Accounts</p>
            <p className="text-lg font-bold text-blue-600 mt-0.5">{stats.active_loans}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Overdue Accounts</p>
            <p className="text-lg font-bold text-rose-600 mt-0.5">{stats.overdue_loans}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Principal Issued</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5 font-mono">{formatCurrency(stats.total_principal_issued)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Collected</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5 font-mono">{formatCurrency(stats.total_collected)}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Outstanding</p>
            <p className="text-lg font-bold text-amber-600 mt-0.5 font-mono">{formatCurrency(stats.total_outstanding)}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white rounded-3xl p-6 border border-blue-200 shadow-md">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Edit Agent Details</h3>
          <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Area / Address</label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Administrative Notes</label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Agent</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Associated Loans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Assigned Loans Portfolio</h3>
            <p className="text-xs text-slate-500 mt-0.5">Loans serviced by {agent.full_name}</p>
          </div>
        </div>

        {loans.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No loans have been assigned to this agent yet. Assign this agent when issuing a new loan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Loan ID</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Mobile</th>
                  <th className="p-3.5 font-mono">Principal</th>
                  <th className="p-3.5 font-mono text-emerald-600">Collected</th>
                  <th className="p-3.5 font-mono text-right font-bold">Outstanding</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-blue-600">{l.id}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{l.customer_name}</td>
                    <td className="p-3.5 font-mono text-slate-600">{l.customer_mobile}</td>
                    <td className="p-3.5 font-mono text-slate-900">{formatCurrency(l.principal_amount)}</td>
                    <td className="p-3.5 font-mono text-emerald-600 font-semibold">{formatCurrency(l.total_paid_amount)}</td>
                    <td className="p-3.5 font-mono text-right font-bold text-slate-900">{formatCurrency(l.outstanding_balance)}</td>
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
                      <button
                        onClick={() => navigate(`/loans/${l.id}`)}
                        className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs"
                      >
                        View Loan
                      </button>
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
