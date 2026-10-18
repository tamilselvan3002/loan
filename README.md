# 🏦 Personal Loan Management System (Admin Portal)

A complete, secure, responsive web application for private personal loan business administration. Built exclusively for administrator management of customers, field agents, multi-loan accounts, weekly repayment schedules, printable receipts, OTP verification, payment reminders, and financial reconciliation reports.

---

## 🌟 Key Features

1. **Strict Administrator-Only Access**:
   - Zero public registration or borrower logins.
   - Protected API routes and private document downloads with session-based JWT authentication and bcrypt password hashing.
   - Comprehensive audit logging for all critical operations.

2. **Customer 360° Management**:
   - Auto-generated unique Customer IDs (`CUST-1001`, `CUST-1002`, ...).
   - Verified mobile number duplicate prevention.
   - Customer photograph and private KYC document storage (Aadhaar, PAN, agreements).
   - View complete loan history across multiple loan cycles while retaining a single Customer ID.

3. **Field Agent Management**:
   - Auto-generated Agent IDs (`AGT-101`, `AGT-102`, ...).
   - Assign loans to specific agents.
   - Track agent portfolio: total loans assigned, principal issued, collections, and overdue loans.

4. **Loan Origination & Weekly Repayment Engine**:
   - Unique Loan IDs (`LOAN-1001`, `LOAN-1002`, ...).
   - Supports **Flat Rate Interest** and **Reducing Balance (EMI)** weekly interest calculation.
   - Live interactive repayment schedule preview before saving.
   - **Exact penny/paisa reconciliation** on final installment so \(\sum \text{installments} = \text{Total Repayment}\).
   - Immutable snapshot of loan terms stored at origination.
   - Active loan warning modal preventing accidental duplicate issuance without explicit administrator confirmation.

5. **Atomic Repayment Ledger & Official Receipts**:
   - Instant payment recording with cash, UPI, bank transfer, and cheque support.
   - Automatic cascade allocation across pending weekly installments.
   - Unique Receipt Number generation (`RCP-YYYYMMDD-XXXX`).
   - Official printable and downloadable payment receipt with business identity, amount in figures & English words (e.g., *Fifty Thousand Rupees Only*), and remaining balance.
   - Audited payment reversals with mandatory reason requirement.

6. **SMS Verification & Payment Reminders**:
   - Modular SMS Gateway: Starts in **Mock / Development Mode** (zero cost, simulated SMS logged to database and terminal) and switchable to **MSG91** live credentials in Settings.
   - Customer mobile OTP verification with 5-minute expiry and attempt limiting.
   - Automated queue for upcoming (next 3 days) and overdue weekly installments with single-click manual or bulk reminder dispatch.
   - Duplicate reminder prevention (max 1 reminder per borrower per day).

7. **Reports & Financial Reconciliation**:
   - Real-time calculations from SQLite database records (no fake or demo data).
   - Customer-wise, Agent-wise, Daily/Weekly/Monthly Collections, and Overdue aging reports.
   - Financial ledger reconciliation verification (\(\text{Collected} + \text{Outstanding} = \text{Total Expected}\)).
   - Single-click **CSV/Excel Export** and print-ready stylesheets.

8. **Secure Document Storage**:
   - Stored in a private server directory (`server/storage/documents/`).
   - Accessible only through authenticated endpoints (`/api/documents/:id/file`).

---

## 🛠️ Technology Stack

- **Backend**: Node.js & Express.js
- **Database**: SQLite with Node 24's native `node:sqlite` (ACID-compliant transactions, zero external C++ build tool dependencies, single-file persistence)
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Recharts
- **Security**: Bcrypt, JWT, Cookie-Parser, Multer

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v20+ or v24+)
- npm

### 2. Start the Application
From the project root directory, run:

```bash
npm start
```

This starts the unified Express server at **`http://localhost:5000`** serving both the REST API and the React web application.

### 3. Default Administrator Credentials
- **URL**: `http://localhost:5000`
- **Username**: `admin`
- **Initial Password**: `Admin@12345`

> [!IMPORTANT]
> Upon your first login, please visit the **Settings** page (`/settings`) to update your administrator password and customize your business name, contact details, and address for receipts.

---

## 💾 Database Backup & Recovery

The entire database is stored in a single persistent file at:
```
server/data/loan.db
```

### Creating a Backup
Simply copy `server/data/loan.db` to a secure backup directory or cloud drive:
```powershell
Copy-Item server/data/loan.db server/data/loan-backup-$(Get-Date -Format 'yyyyMMdd-HHmm').db
```

### Restoring from Backup
Stop the server, replace `server/data/loan.db` with your backup file, and restart the server.

---

## 📱 Switching SMS Provider to MSG91

1. Log in to the Admin Portal.
2. Navigate to **Settings** (`/settings`).
3. Scroll to **SMS Gateway & DLT Configuration**.
4. Change provider from `Mock / Development Mode` to `MSG91 Live SMS Gateway`.
5. Enter your MSG91 **AuthKey** and 6-character **DLT Sender ID** (e.g. `MYLOAN`).
6. Click **Save Settings**.
