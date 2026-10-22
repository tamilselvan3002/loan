import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  Eye,
  User,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime } from '../utils/formatters';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  async function fetchLogs() {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.getAuditLogs(params);
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Audit Trail</h2>
        <p className="text-xs text-slate-500 mt-0.5">Immutable record of administrative operations, loans, payments, and security events</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Entity ID (LOAN-1001, CUST-1001), Admin, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {[
            'ALL',
            'LOAN_CREATED',
            'PAYMENT_RECORDED',
            'PAYMENT_REVERSED',
            'CUSTOMER_CREATED',
            'DOCUMENT_UPLOADED',
            'SETTINGS_UPDATED'
          ].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                actionFilter === act
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'ALL' ? 'All Actions' : act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No audit logs found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                <tr>
                  <th className="p-3.5 pl-5">Timestamp</th>
                  <th className="p-3.5">Administrator</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity Type</th>
                  <th className="p-3.5">Entity ID</th>
                  <th className="p-3.5">IP Address</th>
                  <th className="p-3.5 pr-5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="p-3.5 pl-5 text-slate-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="p-3.5 font-bold text-slate-900">{log.admin_username}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('PAYMENT_REVERSED') || log.action.includes('DELETED')
                          ? 'bg-rose-100 text-rose-800'
                          : log.action.includes('PAYMENT') || log.action.includes('CREATED')
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{log.entity_type}</td>
                    <td className="p-3.5 font-mono font-bold text-blue-600">{log.entity_id || '—'}</td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">{log.ip_address || '—'}</td>
                    <td className="p-3.5 pr-5 text-right">
                      {log.details_json && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View JSON</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Audit Log Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedLog.action} • {selectedLog.entity_type} #{selectedLog.entity_id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs overflow-x-auto max-h-80">
              <pre>{JSON.stringify(JSON.parse(selectedLog.details_json || '{}'), null, 2)}</pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
