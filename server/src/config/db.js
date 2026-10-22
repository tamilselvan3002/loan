const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'loan.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Run schema setup
const schemaPath = path.join(__dirname, '../models/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Ensure migration for customers columns and consumed_auth_tokens
function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consumed_auth_tokens (
      id TEXT PRIMARY KEY,
      token_uid TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      consumed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_consumed_tokens_uid ON consumed_auth_tokens(token_uid);
    CREATE INDEX IF NOT EXISTS idx_consumed_tokens_mobile ON consumed_auth_tokens(mobile_number);
  `);

  const cols = db.prepare('PRAGMA table_info(customers)').all().map(c => c.name);
  const required = [
    { name: 'alt_mobile', type: 'TEXT' },
    { name: 'dob', type: 'DATE' },
    { name: 'street', type: 'TEXT' },
    { name: 'village_town', type: 'TEXT' },
    { name: 'district', type: 'TEXT' },
    { name: 'state', type: 'TEXT' },
    { name: 'pincode', type: 'TEXT' },
    { name: 'photos_json', type: 'TEXT' },
    { name: 'bank_name', type: 'TEXT' },
    { name: 'account_holder', type: 'TEXT' },
    { name: 'account_number', type: 'TEXT' },
    { name: 'ifsc_code', type: 'TEXT' },
    { name: 'nominee_name', type: 'TEXT' },
    { name: 'nominee_mobile', type: 'TEXT' },
    { name: 'nominee_relationship', type: 'TEXT' },
    { name: 'nominee_address', type: 'TEXT' }
  ];

  for (const col of required) {
    if (!cols.includes(col.name)) {
      try {
        db.exec(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type};`);
      } catch (e) {
        // column already exists
      }
    }
  }
}
runMigrations();

// Transaction helper
function transaction(fn) {
  db.exec('BEGIN TRANSACTION');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Ergonomic helpers
function get(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

function all(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

function run(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

module.exports = {
  db,
  dbPath,
  get,
  all,
  run,
  transaction,
};
