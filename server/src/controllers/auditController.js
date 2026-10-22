const { all } = require('../config/db');

function getAuditLogs(req, res) {
  const { action, entity_type, search } = req.query;

  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (action && action !== 'ALL') {
    sql += ' AND action = ?';
    params.push(action);
  }

  if (entity_type && entity_type !== 'ALL') {
    sql += ' AND entity_type = ?';
    params.push(entity_type);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (entity_id LIKE ? OR details_json LIKE ? OR admin_username LIKE ?)';
    params.push(term, term, term);
  }

  sql += ' ORDER BY created_at DESC LIMIT 200';
  const logs = all(sql, ...params);

  return res.json({ logs });
}

module.exports = { getAuditLogs };
