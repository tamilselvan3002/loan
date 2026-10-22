const { run } = require('../config/db');

function logAudit({
  adminId = null,
  adminUsername = null,
  action,
  entityType,
  entityId = null,
  details = {},
  ipAddress = null
}) {
  try {
    // Sanitize details to never log passwords or secrets
    const sanitized = { ...details };
    delete sanitized.password;
    delete sanitized.password_hash;
    delete sanitized.otp;
    delete sanitized.otp_hash;
    delete sanitized.sms_api_key;

    run(
      `INSERT INTO audit_logs (admin_id, admin_username, action, entity_type, entity_id, details_json, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      adminId,
      adminUsername || 'admin',
      action,
      entityType,
      entityId ? String(entityId) : null,
      JSON.stringify(sanitized),
      ipAddress
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
