-- Personal Loan Management System Schema
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    mobile_number TEXT UNIQUE NOT NULL,
    alt_mobile TEXT,
    dob DATE,
    address TEXT,
    street TEXT,
    village_town TEXT,
    district TEXT,
    state TEXT,
    pincode TEXT,
    photo_filename TEXT,
    photos_json TEXT,
    bank_name TEXT,
    account_holder TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    nominee_name TEXT,
    nominee_mobile TEXT,
    nominee_relationship TEXT,
    nominee_address TEXT,
    notes TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED', 'BLACKLISTED')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_documents (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    original_name TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consumed_auth_tokens (
    id TEXT PRIMARY KEY,
    token_uid TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    consumed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES customers(id),
    agent_id TEXT,
    principal_amount REAL NOT NULL,
    interest_rate_percent REAL NOT NULL,
    interest_method TEXT NOT NULL CHECK(interest_method IN ('FLAT_RATE', 'REDUCING_BALANCE')),
    repayment_frequency TEXT DEFAULT 'WEEKLY',
    total_duration_weeks INTEGER NOT NULL,
    total_installments INTEGER NOT NULL,
    expected_total_interest REAL NOT NULL,
    expected_total_repayment REAL NOT NULL,
    total_paid_amount REAL DEFAULT 0,
    outstanding_balance REAL NOT NULL,
    issue_date DATE NOT NULL,
    first_repayment_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'OVERDUE', 'CANCELLED')),
    terms_snapshot_json TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id TEXT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    scheduled_amount REAL NOT NULL,
    principal_component REAL NOT NULL,
    interest_component REAL NOT NULL,
    amount_paid REAL DEFAULT 0,
    remaining_balance REAL NOT NULL,
    status TEXT DEFAULT 'UPCOMING' CHECK(status IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE')),
    last_payment_date DATE
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    receipt_number TEXT UNIQUE NOT NULL,
    loan_id TEXT NOT NULL REFERENCES loans(id),
    customer_id TEXT NOT NULL REFERENCES customers(id),
    amount_paid REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('GPAY_UPI', 'CASH', 'BANK_TRANSFER', 'OTHER', 'UPI', 'CHEQUE')),
    transaction_reference TEXT,
    notes TEXT,
    recorded_by_admin_id INTEGER REFERENCES admins(id),
    is_reversed INTEGER DEFAULT 0,
    reversal_reason TEXT,
    reversed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
    schedule_id INTEGER NOT NULL REFERENCES loan_schedules(id),
    amount_allocated REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id TEXT PRIMARY KEY,
    mobile_number TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL,
    reference_id TEXT,
    attempts INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_mobile TEXT NOT NULL,
    customer_id TEXT REFERENCES customers(id),
    loan_id TEXT REFERENCES loans(id),
    sms_type TEXT NOT NULL,
    message_body TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_response TEXT,
    status TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER REFERENCES admins(id),
    admin_username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details_json TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup and reporting performance
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_loans_customer ON loans(customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_agent ON loans(agent_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_schedules_loan ON loan_schedules(loan_id);
CREATE INDEX IF NOT EXISTS idx_schedules_due_date ON loan_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON loan_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payments_loan ON payment_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payment_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_created ON sms_logs(sent_at);
