const bcrypt = require('bcryptjs');
const { get, run, transaction } = require('../config/db');

function seedInitialData() {
  transaction(() => {
    // Check if an admin exists
    const existingAdmin = get('SELECT id FROM admins LIMIT 1');
    if (!existingAdmin) {
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(defaultPassword, salt);
      run(
        `INSERT INTO admins (username, password_hash, full_name) VALUES (?, ?, ?)`,
        'admin',
        hash,
        'System Administrator'
      );
      console.log('✅ Initial administrator seeded (Username: admin)');
    }

    // Default settings
    const defaultSettings = [
      ['business_name', 'Sri Balaji Finance & Investments'],
      ['business_phone', '+91 98765 43210'],
      ['business_email', 'contact@balajifinance.local'],
      ['business_address', '124, Anna Salai, Mount Road, Chennai, Tamil Nadu 600002'],
      ['currency_symbol', '₹'],
      ['default_interest_rate', '12'],
      ['default_interest_method', 'FLAT_RATE'],
      ['default_duration_weeks', '20'],
      ['sms_provider', 'MOCK'],
      ['sms_api_key', ''],
      ['sms_sender_id', 'MYLOAN'],
      ['sms_dlt_reminder_template', 'Dear {#var#}, your weekly loan installment of Rs.{#var#} for Loan {#var#} is due on {#var#}. Please pay to avoid overdue charges.'],
      ['sms_dlt_otp_template', 'Your verification OTP for loan payment confirmation is {#var#}. Valid for 5 minutes. Do not share.'],
      ['enable_auto_reminders', '1']
    ];

    for (const [key, value] of defaultSettings) {
      const existing = get('SELECT key FROM settings WHERE key = ?', key);
      if (!existing) {
        run('INSERT INTO settings (key, value) VALUES (?, ?)', key, value);
      }
    }
  });
}

module.exports = { seedInitialData };
