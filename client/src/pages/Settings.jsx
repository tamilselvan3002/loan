import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  Lock,
  MessageSquare,
  CreditCard,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Flame,
  Database,
  Download,
  RotateCcw,
  ExternalLink,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { formatDate, formatDateTime } from '../utils/formatters';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Backup & Restore state
  const [backups, setBackups] = useState([]);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState('');
  const [backupMsg, setBackupMsg] = useState('');

  // Live Test SMS state
  const [testMobile, setTestMobile] = useState('');
  const [sendingTestSms, setSendingTestSms] = useState(false);
  const [testSmsFeedback, setTestSmsFeedback] = useState('');

  async function handleSendTestSms(e) {
    e.preventDefault();
    if (!testMobile || testMobile.replace(/[^0-9]/g, '').length !== 10) {
      setTestSmsFeedback('❌ Please enter a valid 10-digit mobile number.');
      return;
    }
    setSendingTestSms(true);
    setTestSmsFeedback('');
    try {
      const res = await api.sendTestSms({
        mobileNumber: testMobile.trim(),
        message: `Test SMS from Vishva Finance gateway at ${new Date().toLocaleTimeString('en-IN')}. If you received this, SMS configuration is working 100%!`
      });
      setTestSmsFeedback(`✅ Test SMS dispatched: status=${res.result?.status} | ${res.result?.providerResponse || ''}`);
    } catch (err) {
      setTestSmsFeedback(`❌ Failed to send test SMS: ${err.message}`);
    } finally {
      setSendingTestSms(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadBackups();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res.settings || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBackups() {
    try {
      const res = await api.listBackups();
      setBackups(res.backups || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  }

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  async function handleSaveSettings(e) {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMsg('');
    try {
      await api.updateSettings(settings);
      setStatusMsg('✅ Settings updated successfully.');
      setTimeout(() => setStatusMsg(''), 5000);
      loadSettings();
    } catch (err) {
      setStatusMsg(`❌ Error: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setPasswordMsg('✅ Password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleCreateBackup() {
    try {
      setCreatingBackup(true);
      setBackupMsg('');
      const res = await api.createBackup();
      setBackupMsg(`✅ Backup created: ${res.backup.filename}`);
      loadBackups();
      setTimeout(() => setBackupMsg(''), 6000);
    } catch (err) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setCreatingBackup(false);
    }
  }

  async function handleRestoreBackup(filename) {
    const confirmed = window.confirm(
      `⚠️ WARNING: Restoring from "${filename}" will replace the current database with the backup snapshot. A safety pre-restore backup will be created automatically. Proceed?`
    );
    if (!confirmed) return;

    try {
      setRestoringFilename(filename);
      setBackupMsg('');
      await api.restoreBackup(filename);
      setBackupMsg(`✅ Database successfully restored from ${filename}. Reloading...`);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      alert(`Restore failed: ${err.message}`);
      setRestoringFilename('');
    }
  }

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Configuration & Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">Customize business identity, Firebase Phone Auth, loan defaults, backups, and security</p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs font-medium shadow-md flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        
        {/* Section 1: Business Profile */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Business Profile & Receipts</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business / Firm Name</label>
              <input
                type="text"
                value={settings.business_name || ''}
                onChange={(e) => handleChange('business_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Business Mobile / Telephone</label>
              <input
                type="text"
                value={settings.business_phone || ''}
                onChange={(e) => handleChange('business_phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Administrative Email</label>
              <input
                type="email"
                value={settings.business_email || ''}
                onChange={(e) => handleChange('business_email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '₹'}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Registered Address (Printed on Receipts)</label>
              <textarea
                rows={2}
                value={settings.business_address || ''}
                onChange={(e) => handleChange('business_address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 2: SMS Gateway & OTP Provider Configuration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                SMS Gateway & Payment Confirmation OTP Provider
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono">
              Provider: {settings.sms_provider || 'MOCK'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Supported SMS Providers for Indian Mobile Numbers:</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Select <strong>MOCK (Simulated Test Mode)</strong> to test payment confirmations and automated SMS receipts instantly without SMS charges. For production, switch to <strong>Fast2SMS</strong> (Indian Quick SMS), <strong>MSG91</strong>, or <strong>Twilio</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMS Provider</label>
              <select
                value={settings.sms_provider || 'MOCK'}
                onChange={(e) => handleChange('sms_provider', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-bold"
              >
                <option value="MOCK">MOCK (Simulated Development Mode)</option>
                <option value="FAST2SMS">Fast2SMS (India Quick SMS / DLT-Free)</option>
                <option value="MSG91">MSG91 (Flow / Transactional API)</option>
                <option value="TWILIO">Twilio (Global Cloud SMS)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">API Key / Auth Token</label>
              <input
                type="password"
                placeholder="Enter SMS Gateway API Key"
                value={settings.sms_api_key || ''}
                onChange={(e) => handleChange('sms_api_key', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sender ID / Header</label>
              <input
                type="text"
                placeholder="e.g. VISHVA"
                maxLength={6}
                value={settings.sms_sender_id || 'VISHVA'}
                onChange={(e) => handleChange('sms_sender_id', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          {settings.sms_provider === 'TWILIO' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Twilio Account SID</label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={settings.sms_account_sid || ''}
                  onChange={(e) => handleChange('sms_account_sid', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Twilio From Phone Number</label>
                <input
                  type="text"
                  placeholder="+1xxxxxxxxxx"
                  value={settings.sms_from_phone || ''}
                  onChange={(e) => handleChange('sms_from_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>
            </div>
          )}

          {/* Interactive Test SMS Panel */}
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 text-xs">Verify Live SMS Gateway</p>
                <p className="text-[11px] text-slate-500">
                  Send a test message to your personal mobile to confirm gateway credentials and real-time delivery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="10-digit mobile"
                  value={testMobile}
                  onChange={(e) => setTestMobile(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  className="px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs w-40 bg-white"
                />
                <button
                  type="button"
                  onClick={handleSendTestSms}
                  disabled={sendingTestSms || testMobile.length !== 10}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs disabled:opacity-50 transition-all shadow-sm"
                >
                  {sendingTestSms ? 'Sending...' : 'Send Test SMS'}
                </button>
              </div>
            </div>

            {testSmsFeedback && (
              <p className="mt-2 text-[11px] font-semibold text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                {testSmsFeedback}
              </p>
            )}
          </div>
        </div>

        {/* Section 3: Loan Calculation Defaults */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Loan & Repayment Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Interest Rate (%)</label>
              <input
                type="number"
                step="0.5"
                value={settings.default_interest_rate || 10}
                onChange={(e) => handleChange('default_interest_rate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Calculation Method</label>
              <select
                value={settings.default_interest_method || 'FLAT_RATE'}
                onChange={(e) => handleChange('default_interest_method', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50"
              >
                <option value="FLAT_RATE">Flat Rate</option>
                <option value="REDUCING_BALANCE">Reducing Balance (EMI)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Duration (Weeks)</label>
              <input
                type="number"
                value={settings.default_duration_weeks || 20}
                onChange={(e) => handleChange('default_duration_weeks', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={savingSettings}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{savingSettings ? 'Saving Settings...' : 'Save All Settings'}</span>
          </button>
        </div>
      </form>

      {/* Section 4: Database Backup & Recovery */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Database Backup & Recovery</h3>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{creatingBackup ? 'Creating Backup...' : 'Create Instant Backup'}</span>
          </button>
        </div>

        {backupMsg && (
          <div className="p-3 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 text-xs font-medium">
            {backupMsg}
          </div>
        )}

        <div className="text-xs text-slate-500">
          <p>Backups create complete atomic snapshots of all customers, loans, schedules, payments, and settings in WAL-flushed SQLite format.</p>
        </div>

        {backups.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No database backups created yet. Click "Create Instant Backup" above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {backups.map((b) => (
              <div key={b.filename} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/70 transition-colors">
                <div>
                  <p className="font-mono font-bold text-slate-800 text-xs">{b.filename}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatDateTime(b.createdAt)} • {(b.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={api.getBackupDownloadUrl(b.filename)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-all"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => handleRestoreBackup(b.filename)}
                    disabled={restoringFilename === b.filename}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{restoringFilename === b.filename ? 'Restoring...' : 'Restore'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 5: Change Admin Password */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Lock className="w-4 h-4 text-rose-600" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">Administrator Security Credentials</h3>
        </div>

        {passwordMsg && <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold">{passwordMsg}</div>}
        {passwordError && <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold">{passwordError}</div>}

        <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password (min 8 chars)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Updating...' : 'Change Password'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
