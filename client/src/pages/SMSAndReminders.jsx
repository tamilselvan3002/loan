import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  BellRing,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  CheckCheck
} from 'lucide-react';
import { api } from '../services/api';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function SMSAndReminders() {
  const [activeTab, setActiveTab] = useState('queue');
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    try {
      setLoading(true);
      const [sRes, qRes] = await Promise.all([
        api.getSettings(),
        api.getRemindersQueue()
      ]);
      setSettings(sRes.settings || {});
      setQueue(qRes.queue || []);

      if (activeTab === 'logs') {
        const lRes = await api.getSmsLogs();
        setLogs(lRes.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendSingleReminder(item) {
    try {
      setSendingId(item.schedule_id);
      await api.sendReminder({
        customerId: item.customer_id,
        loanId: item.loan_id,
        installmentNumber: item.installment_number,
        dueDate: item.due_date,
        amountDue: item.remaining_balance,
        isOverdue: Boolean(item.is_overdue)
      });
      setStatusMessage(`✅ Reminder dispatched to ${item.customer_name} (${item.customer_mobile}).`);
      setTimeout(() => setStatusMessage(''), 5000);
      loadData();
    } catch (err) {
      setStatusMessage(`❌ Failed: ${err.message}`);
      setTimeout(() => setStatusMessage(''), 6000);
    } finally {
      setSendingId(null);
    }
  }

  async function handleSendAllOverdue() {
    const overdueItems = queue.filter(q => q.is_overdue && !q.reminders_sent_today);
    if (overdueItems.length === 0) {
      alert('No unsent overdue installments in queue.');
      return;
    }

    if (!confirm(`Are you sure you want to send reminders to ${overdueItems.length} overdue customer(s)?`)) {
      return;
    }

    let sent = 0;
    for (const item of overdueItems) {
      try {
        await api.sendReminder({
          customerId: item.customer_id,
          loanId: item.loan_id,
          installmentNumber: item.installment_number,
          dueDate: item.due_date,
          amountDue: item.remaining_balance,
          isOverdue: true
        });
        sent++;
      } catch (e) {
        console.error(e);
      }
    }

    setStatusMessage(`✅ Dispatched ${sent} overdue payment reminders.`);
    setTimeout(() => setStatusMessage(''), 6000);
    loadData();
  }

  return (
    <div className="space-y-6">
      
      {/* Header and Provider Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">SMS & Payment Reminders</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage automated payment reminders and review SMS delivery logs</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">Active SMS Mode:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            settings?.sms_provider === 'MSG91' && settings?.has_sms_api_key
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{settings?.sms_provider === 'MSG91' ? 'MSG91 Live Production' : 'Mock / Development Mode'}</span>
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-lg flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>Reminder Queue ({queue.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>SMS Transmission Logs</span>
        </button>
      </div>

      {/* Tab 1: Reminder Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Upcoming & Overdue Installments</h3>
              <p className="text-xs text-slate-500 mt-0.5">Installments due in the next 3 days or already overdue</p>
            </div>
            {queue.some(q => q.is_overdue && !q.reminders_sent_today) && (
              <button
                onClick={handleSendAllOverdue}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Remind All Overdue</span>
              </button>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading queue...</div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">All Installments Up to Date</p>
              <p>No upcoming installments due in the next 3 days or overdue.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5 pl-5">Status</th>
                    <th className="p-3.5">Borrower</th>
                    <th className="p-3.5">Mobile</th>
                    <th className="p-3.5">Loan ID</th>
                    <th className="p-3.5">Installment #</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5 font-mono text-right font-bold">Amount Due</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {queue.map((item) => (
                    <tr key={item.schedule_id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 pl-5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.is_overdue ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.is_overdue ? 'OVERDUE' : 'DUE SOON'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">{item.customer_name}</td>
                      <td className="p-3.5 font-mono text-slate-600">{item.customer_mobile}</td>
                      <td className="p-3.5 font-mono text-blue-600 font-semibold">{item.loan_id}</td>
                      <td className="p-3.5 font-medium text-slate-700">Week #{item.installment_number}</td>
                      <td className="p-3.5 text-slate-600">{formatDate(item.due_date)}</td>
                      <td className="p-3.5 font-mono text-right font-bold text-slate-900">{formatCurrency(item.remaining_balance)}</td>
                      <td className="p-3.5 pr-5 text-right">
                        {item.reminders_sent_today > 0 ? (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center justify-end gap-1">
                            <CheckCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span>Sent Today</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSendSingleReminder(item)}
                            disabled={sendingId === item.schedule_id}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-sm transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            <span>{sendingId === item.schedule_id ? 'Sending...' : 'Send Reminder'}</span>
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
      )}

      {/* Tab 2: SMS Transmission Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">SMS Transmission Logs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Audited delivery records of OTPs and reminders</p>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading SMS logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No SMS records logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp</th>
                    <th className="p-3.5">Recipient Mobile</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Message Content</th>
                    <th className="p-3.5">Provider</th>
                    <th className="p-3.5 pr-5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 pl-5 text-slate-500 whitespace-nowrap">{formatDateTime(log.sent_at)}</td>
                      <td className="p-3.5 font-mono font-semibold text-slate-800">{log.recipient_mobile}</td>
                      <td className="p-3.5 font-medium text-slate-700">{log.customer_name || '—'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {log.sms_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-sm truncate" title={log.message_body}>
                        {log.message_body}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{log.provider}</td>
                      <td className="p-3.5 pr-5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'SIMULATED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
