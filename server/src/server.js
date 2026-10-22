require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const fs = require('fs');

const { seedInitialData } = require('./models/seed');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize seed data if not present
seedInitialData();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Personal Loan Management System',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend build if exists
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  return res.status(500).json({ error: err.message || 'Internal server error occurred.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🏦 Personal Loan Management System Server running`);
    console.log(`🚀 Port: ${PORT}`);
    console.log(`🔒 Admin Auth: Enabled (Strict Private Administration)`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
