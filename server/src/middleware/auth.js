const jwt = require('jsonwebtoken');
const { get } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'personal-loan-secret-jwt-key-2026';

function requireAdminAuth(req, res, next) {
  let token = null;

  if (req.cookies && req.cookies.admin_token) {
    token = req.cookies.admin_token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in as administrator.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = get('SELECT id, username, full_name FROM admins WHERE id = ?', decoded.id);

    if (!admin) {
      return res.status(401).json({ error: 'Session expired or administrator no longer exists.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

module.exports = {
  requireAdminAuth,
  JWT_SECRET
};
