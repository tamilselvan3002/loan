const { get, all, run, transaction } = require('../config/db');
const { logAudit } = require('../services/auditService');

function getSettings(req, res) {
  const rows = all('SELECT key, value FROM settings');
  const settings = {};

  for (const row of rows) {
    if (row.key === 'sms_api_key' && row.value) {
      settings[row.key] = row.value.length > 8 
        ? `${row.value.slice(0, 4)}••••••••${row.value.slice(-4)}`
        : '••••••••';
      settings['has_sms_api_key'] = true;
    } else {
      settings[row.key] = row.value;
    }
  }

  return res.json({ settings });
}

function getPublicFirebaseConfig(req, res) {
  const apiKey = get("SELECT value FROM settings WHERE key = 'firebase_api_key'")?.value || process.env.VITE_FIREBASE_API_KEY || '';
  const authDomain = get("SELECT value FROM settings WHERE key = 'firebase_auth_domain'")?.value || process.env.VITE_FIREBASE_AUTH_DOMAIN || '';
  const projectId = get("SELECT value FROM settings WHERE key = 'firebase_project_id'")?.value || process.env.VITE_FIREBASE_PROJECT_ID || '';
  const appId = get("SELECT value FROM settings WHERE key = 'firebase_app_id'")?.value || process.env.VITE_FIREBASE_APP_ID || '';

  return res.json({
    firebaseConfig: {
      apiKey,
      authDomain,
      projectId,
      appId
    },
    isConfigured: Boolean(apiKey && projectId)
  });
}

function updateSettings(req, res) {
  const updates = req.body;
  const allowedKeys = [
    'business_name',
    'business_phone',
    'business_email',
    'business_address',
    'currency_symbol',
    'default_interest_rate',
    'default_interest_method',
    'default_duration_weeks',
    'sms_provider',
    'sms_api_key',
    'sms_sender_id',
    'sms_dlt_reminder_template',
    'sms_dlt_otp_template',
    'enable_auto_reminders',
    'firebase_api_key',
    'firebase_auth_domain',
    'firebase_project_id',
    'firebase_app_id'
  ];

  transaction(() => {
    for (const key of Object.keys(updates)) {
      if (allowedKeys.includes(key)) {
        const val = updates[key];
        // If sms_api_key is sent as empty or masked without change, don't overwrite if existing
        if (key === 'sms_api_key' && (val.includes('••••') || val.trim() === '')) {
          continue;
        }

        const existing = get('SELECT key FROM settings WHERE key = ?', key);
        if (existing) {
          run('UPDATE settings SET value = ? WHERE key = ?', String(val), key);
        } else {
          run('INSERT INTO settings (key, value) VALUES (?, ?)', key, String(val));
        }
      }
    }
  });

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'SETTINGS_UPDATED',
    entityType: 'SETTINGS',
    entityId: 'SYSTEM',
    details: updates,
    ipAddress: req.ip
  });

  return res.json({ message: 'Settings saved successfully.' });
}

module.exports = {
  getSettings,
  getPublicFirebaseConfig,
  updateSettings
};
