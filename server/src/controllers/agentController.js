const { get, all, run } = require('../config/db');
const { logAudit } = require('../services/auditService');

function generateNextAgentId() {
  const lastAgent = get(`SELECT id FROM agents WHERE id LIKE 'AGT-%' ORDER BY id DESC LIMIT 1`);
  if (!lastAgent) {
    return 'AGT-101';
  }
  const match = lastAgent.id.match(/^AGT-(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `AGT-${nextNum}`;
  }
  return `AGT-${Date.now().toString().slice(-3)}`;
}

function getAgents(req, res) {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM agents WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (id LIKE ? OR full_name LIKE ? OR mobile_number LIKE ?)';
    params.push(term, term, term);
  }

  if (status && status !== 'ALL') {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';
  const agents = all(sql, ...params);

  // Compute metrics for each agent
  const results = agents.map(agent => {
    const stats = get(
      `SELECT 
         COUNT(*) as total_loans,
         COALESCE(SUM(principal_amount), 0) as total_principal_issued,
         COALESCE(SUM(total_paid_amount), 0) as total_collected,
         COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
         SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_loans
       FROM loans WHERE agent_id = ?`,
      agent.id
    );

    return {
      ...agent,
      total_loans: stats ? stats.total_loans : 0,
      total_principal_issued: stats ? stats.total_principal_issued : 0,
      total_collected: stats ? stats.total_collected : 0,
      total_outstanding: stats ? stats.total_outstanding : 0,
      overdue_loans: stats ? stats.overdue_loans : 0
    };
  });

  return res.json({ agents: results });
}

function getAgentById(req, res) {
  const { id } = req.params;
  const agent = get('SELECT * FROM agents WHERE id = ?', id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found.' });
  }

  // Loans assigned to this agent with customer names
  const loans = all(
    `SELECT l.*, c.full_name as customer_name, c.mobile_number as customer_mobile
     FROM loans l
     JOIN customers c ON l.customer_id = c.id
     WHERE l.agent_id = ?
     ORDER BY l.created_at DESC`,
    id
  );

  // Associated unique customers
  const customers = all(
    `SELECT DISTINCT c.id, c.full_name, c.mobile_number, c.status
     FROM customers c
     JOIN loans l ON c.id = l.customer_id
     WHERE l.agent_id = ?`,
    id
  );

  const stats = {
    total_loans: loans.length,
    active_loans: loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE').length,
    completed_loans: loans.filter(l => l.status === 'COMPLETED').length,
    overdue_loans: loans.filter(l => l.status === 'OVERDUE').length,
    total_principal_issued: loans.reduce((sum, l) => sum + (l.principal_amount || 0), 0),
    total_collected: loans.reduce((sum, l) => sum + (l.total_paid_amount || 0), 0),
    total_outstanding: loans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0)
  };

  return res.json({
    agent,
    loans,
    customers,
    stats
  });
}

function createAgent(req, res) {
  const { full_name, mobile_number, address, joining_date, notes, status = 'ACTIVE' } = req.body;

  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'Agent full name is required.' });
  }

  if (!mobile_number || !mobile_number.trim()) {
    return res.status(400).json({ error: 'Agent mobile number is required.' });
  }

  const agentId = generateNextAgentId();
  const joinDate = joining_date || new Date().toISOString().split('T')[0];

  run(
    `INSERT INTO agents (id, full_name, mobile_number, address, joining_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    agentId,
    full_name.trim(),
    mobile_number.trim(),
    address ? address.trim() : null,
    joinDate,
    notes ? notes.trim() : null,
    status
  );

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'AGENT_CREATED',
    entityType: 'AGENT',
    entityId: agentId,
    details: { full_name, mobile_number, status },
    ipAddress: req.ip
  });

  const created = get('SELECT * FROM agents WHERE id = ?', agentId);
  return res.status(201).json({ agent: created, message: 'Agent created successfully.' });
}

function updateAgent(req, res) {
  const { id } = req.params;
  const { full_name, mobile_number, address, joining_date, notes, status } = req.body;

  const agent = get('SELECT * FROM agents WHERE id = ?', id);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found.' });
  }

  run(
    `UPDATE agents 
     SET full_name = ?, mobile_number = ?, address = ?, joining_date = ?, notes = ?, status = ?
     WHERE id = ?`,
    full_name ? full_name.trim() : agent.full_name,
    mobile_number ? mobile_number.trim() : agent.mobile_number,
    address !== undefined ? (address ? address.trim() : null) : agent.address,
    joining_date || agent.joining_date,
    notes !== undefined ? (notes ? notes.trim() : null) : agent.notes,
    status || agent.status,
    id
  );

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'AGENT_UPDATED',
    entityType: 'AGENT',
    entityId: id,
    details: { full_name, mobile_number, status },
    ipAddress: req.ip
  });

  const updated = get('SELECT * FROM agents WHERE id = ?', id);
  return res.json({ agent: updated, message: 'Agent updated successfully.' });
}

module.exports = {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent
};
