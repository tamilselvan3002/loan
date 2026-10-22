const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, run } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = get('SELECT * FROM admins WHERE username = ?', username.trim());
  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // Generate JWT token (valid for 24 hours)
  const token = jwt.sign(
    { id: admin.id, username: admin.username, full_name: admin.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Update last_login_at
  run('UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', admin.id);

  // Set HTTP-only cookie
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  logAudit({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'ADMIN_LOGIN',
    entityType: 'ADMIN',
    entityId: admin.id,
    ipAddress: req.ip
  });

  return res.json({
    message: 'Login successful',
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name
    }
  });
}

function logout(req, res) {
  if (req.admin) {
    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'ADMIN_LOGOUT',
      entityType: 'ADMIN',
      entityId: req.admin.id,
      ipAddress: req.ip
    });
  }

  res.clearCookie('admin_token');
  return res.json({ message: 'Logged out successfully' });
}

function getMe(req, res) {
  const admin = get('SELECT id, username, full_name, created_at, last_login_at FROM admins WHERE id = ?', req.admin.id);
  return res.json({ admin });
}

function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const admin = get('SELECT * FROM admins WHERE id = ?', req.admin.id);
  const isMatch = bcrypt.compareSync(currentPassword, admin.password_hash);
  if (!isMatch) {
    return res.status(400).json({ error: 'Incorrect current password.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);

  run('UPDATE admins SET password_hash = ? WHERE id = ?', newHash, admin.id);

  logAudit({
    adminId: admin.id,
    adminUsername: admin.username,
    action: 'PASSWORD_CHANGED',
    entityType: 'ADMIN',
    entityId: admin.id,
    ipAddress: req.ip
  });

  return res.json({ message: 'Password changed successfully.' });
}

module.exports = {
  login,
  logout,
  getMe,
  changePassword
};
