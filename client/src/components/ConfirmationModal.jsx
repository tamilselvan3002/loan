import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false,
  requireReason = false,
  reasonPlaceholder = 'Please enter reason for this action...'
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is mandatory for this action.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              {isDanger ? <AlertCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{message}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {requireReason && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Reason / Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-600 font-medium">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2.5">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-colors flex items-center gap-1.5 ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              {loading && <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
