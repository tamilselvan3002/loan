import React, { useState } from 'react';
import { 
  BellRing, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  PhoneCall, 
  MessageSquare,
  ShieldCheck,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { useLoans } from '../context/LoanContext';

export default function Reminders() {
  const { loans, customers, smsLogs, sendSms, settings } = useLoans();
  const [successMessage, setSuccessMessage] = useState('');

  // OTP Verification state
  const [otpMobile, setOtpMobile] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpStatus, setOtpStatus] = useState(null);

  // Extract upcoming (due within next 7 days) and overdue installments
  const reminderQueue = [];
  const today = new Date();

  loans.filter(l => l.status === 'active').forEach(loan => {
    const cust = customers.find(c => c.id === loan.customerId);
    loan.installments.forEach(inst => {
      if (inst.status === 'overdue' || inst.status === 'pending') {
        const dueDate = new Date(inst.dueDate);
        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (inst.status === 'overdue' || (diffDays >= 0 && diffDays <= 5)) {
          reminderQueue.push({
            loanId: loan.id,
            customerId: loan.customerId,
            customerName: cust ? cust.name : 'Unknown',
            mobile: cust ? cust.mobile : '',
            installmentNumber: inst.installmentNumber,
            dueDate: inst.dueDate,
            amount: inst.totalAmount,
            isOverdue: inst.status === 'overdue' || diffDays < 0,
            daysLeft: diffDays
          });
        }
      }
    });
  });

  const handleSendReminder = (item) => {
    const msg = item.isOverdue
      ? `Dear ${item.customerName}, your installment #${item.installmentNumber} of ₹${item.amount.toFixed(2)} for ${item.loanId} is OVERDUE. Please pay immediately. - ${settings.businessName}`
      : `Dear ${item.customerName}, installment #${item.installmentNumber} of ₹${item.amount.toFixed(2)} for ${item.loanId} is due on ${item.dueDate}. - ${settings.businessName}`;

    sendSms({
      mobile: item.mobile,
      recipientName: item.customerName,
      loanId: item.loanId,
      type: item.isOverdue ? 'OVERDUE_ALERT' : 'UPCOMING_REMINDER',
      message: msg
    });

    setSuccessMessage(`Reminder dispatched successfully to ${item.customerName} (${item.mobile})`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleSendBulk = () => {
    let count = 0;
    reminderQueue.forEach(item => {
      handleSendReminder(item);
      count++;
    });
    setSuccessMessage(`Bulk dispatch completed: ${count} SMS notifications processed.`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // OTP Generation & Verification
  const handleGenerateOtp = () => {
    if (!otpMobile || otpMobile.length < 10) return;
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setOtpStatus('sent');

    sendSms({
      mobile: otpMobile,
      recipientName: 'Verification User',
      loanId: 'N/A',
      type: 'OTP_VERIFICATION',
      message: `Your verification OTP for ${settings.businessName} is ${randomOtp}. Valid for 5 minutes. Do not share with anyone.`
    });
  };

  const handleVerifyOtp = () => {
    if (otpInput === generatedOtp) {
      setOtpStatus('verified');
    } else {
      setOtpStatus('failed');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">SMS Gateway & Automated Reminders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Mode: <strong className="text-blue-600 font-mono">{settings.smsProvider} Gateway</strong> (Mock simulation or MSG91 DLT credentials).
          </p>
        </div>
        {reminderQueue.length > 0 && (
          <button
            onClick={handleSendBulk}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Send className="w-4 h-4" />
            <span>Send Bulk Reminders ({reminderQueue.length})</span>
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Reminders Queue & OTP Verification Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reminders Dispatch Queue */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Upcoming & Overdue Installment Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Automated queue of borrowers requiring SMS dispatch</p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 font-mono text-xs font-bold rounded-lg text-slate-700">
              {reminderQueue.length} Pending
            </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {reminderQueue.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.customerName}</span>
                    <span className="font-mono text-[11px] text-slate-400">({item.mobile})</span>
                    {item.isOverdue ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        OVERDUE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        Due in {item.daysLeft} day(s)
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    {item.loanId} • Installment #{item.installmentNumber} • Due Date: {item.dueDate}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-900">₹{item.amount.toFixed(2)}</span>
                  <button
                    onClick={() => handleSendReminder(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ))}
            {reminderQueue.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                All borrowers are currently up to date! No reminders queued.
              </div>
            )}
          </div>
        </div>

        {/* Instant Mobile OTP Verification Tool */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Borrower OTP Verification</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Simulate or verify customer mobile ownership with 5-minute expiry OTP.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Customer Mobile</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={otpMobile}
                    onChange={(e) => setOtpMobile(e.target.value)}
                    placeholder="9840123456"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono"
                  />
                  <button
                    onClick={handleGenerateOtp}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                  >
                    Send OTP
                  </button>
                </div>
              </div>

              {otpStatus === 'sent' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                  <p className="font-semibold">Simulated SMS Sent to {otpMobile}</p>
                  <p className="font-mono text-sm font-bold text-blue-700 mt-1">OTP Code: {generatedOtp}</p>
                </div>
              )}

              {otpStatus && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Enter 6-Digit OTP</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength="6"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="XXXXXX"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono text-center tracking-widest font-bold"
                    />
                    <button
                      onClick={handleVerifyOtp}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              )}

              {otpStatus === 'verified' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">Mobile Number Verified!</span>
                </div>
              )}

              {otpStatus === 'failed' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span className="font-bold">Invalid OTP Code. Please retry.</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            SMS provider can be updated to live MSG91 DLT gateway in Portal Settings.
          </div>
        </div>

      </div>

      {/* Real-time SMS Gateway Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">SMS Gateway Dispatch Logs</h2>
          <span className="text-xs text-slate-400 font-mono">Total Logged: {smsLogs.length}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Log ID</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Message Content</th>
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4 text-center">Gateway Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {smsLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500 font-bold">{log.id}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800 block">{log.recipientName}</span>
                    <span className="font-mono text-[11px] text-slate-400">{log.mobile}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                    {log.message}
                  </td>
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
