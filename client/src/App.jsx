import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Loans from './pages/Loans';
import NewLoan from './pages/NewLoan';
import LoanDetail from './pages/LoanDetail';
import Repayments from './pages/Repayments';
import PaymentHistory from './pages/PaymentHistory';
import SMSAndReminders from './pages/SMSAndReminders';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';

function ProtectedLayout() {
  const { admin, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  // Derive title from pathname
  const path = location.pathname;
  let pageTitle = 'Dashboard';
  if (path.startsWith('/customers/')) pageTitle = 'Customer Profile';
  else if (path.startsWith('/customers')) pageTitle = 'Customer Management';
  else if (path.startsWith('/loans/new')) pageTitle = 'Issue New Loan';
  else if (path.startsWith('/loans/')) pageTitle = 'Loan Overview';
  else if (path.startsWith('/loans')) pageTitle = 'Loan Accounts';
  else if (path.startsWith('/repayments')) pageTitle = 'Collect Payment';
  else if (path.startsWith('/payment-history')) pageTitle = 'Payment Ledger';
  else if (path.startsWith('/sms-reminders')) pageTitle = 'SMS & Reminders';
  else if (path.startsWith('/reports')) pageTitle = 'Financial Reports';
  else if (path.startsWith('/audit-logs')) pageTitle = 'System Audit Trail';
  else if (path.startsWith('/settings')) pageTitle = 'System Settings';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} title={pageTitle} />
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerDetail />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/new" element={<NewLoan />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/repayments" element={<Repayments />} />
            <Route path="/payment-history" element={<PaymentHistory />} />
            <Route path="/sms-reminders" element={<SMSAndReminders />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
