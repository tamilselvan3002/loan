const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  };

  // If body is plain object, serialize to JSON
  if (config.body && !(config.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(config.body);
  }

  // Include credentials for HTTP-only cookies
  config.credentials = 'include';

  // Support Bearer token from localStorage as fallback
  const token = localStorage.getItem('admin_token');
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  if (response.status === 401) {
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || 'A network error occurred.');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  changePassword: (passwords) => request('/auth/change-password', { method: 'POST', body: passwords }),

  // Customers
  getCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/customers?${qs}`);
  },
  getCustomerById: (id) => request(`/customers/${id}`),
  createCustomer: (formData) => request('/customers', { method: 'POST', body: formData }),
  updateCustomer: (id, formData) => request(`/customers/${id}`, { method: 'PUT', body: formData }),
  archiveCustomer: (id) => request(`/customers/${id}/archive`, { method: 'PATCH' }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  getCustomerPhotoUrl: (id, filename = null) => {
    const token = localStorage.getItem('admin_token');
    const path = filename 
      ? `${BASE_URL}/customers/${id}/photos/${encodeURIComponent(filename)}`
      : `${BASE_URL}/customers/${id}/photo`;
    return token ? `${path}?token=${encodeURIComponent(token)}` : path;
  },
  uploadCustomerPhotos: (id, formData) => request(`/customers/${id}/photos`, { method: 'POST', body: formData }),
  deleteCustomerPhoto: (id, filename) => request(`/customers/${id}/photos/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  upsertCustomerDocument: (id, formData) => request(`/customers/${id}/documents/upsert`, { method: 'POST', body: formData }),

  // Documents
  uploadDocument: (formData) => request('/documents/upload', { method: 'POST', body: formData }),
  getDocumentFileUrl: (id) => {
    const token = localStorage.getItem('admin_token');
    return token ? `${BASE_URL}/documents/${id}/file?token=${encodeURIComponent(token)}` : `${BASE_URL}/documents/${id}/file`;
  },
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),

  // Loans
  previewLoan: (data) => request('/loans/preview', { method: 'POST', body: data }),
  createLoan: (data) => request('/loans', { method: 'POST', body: data }),
  getLoans: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/loans?${qs}`);
  },
  getLoanById: (id) => request(`/loans/${id}`),
  updateLoanStatus: (id, data) => request(`/loans/${id}/status`, { method: 'PATCH', body: data }),

  // Repayments & Receipts
  initiatePaymentOtp: (data) => request('/repayments/otp/initiate', { method: 'POST', body: data }),
  getSettlementQuote: (loanId) => request(`/repayments/settlement-quote/${loanId}`),
  recordPayment: (data) => request('/repayments', { method: 'POST', body: data }),
  reversePayment: (id, reason) => request(`/repayments/${id}/reverse`, { method: 'POST', body: { reversal_reason: reason } }),
  getPaymentHistory: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/repayments/history?${qs}`);
  },
  getReceipt: (receiptNumber) => request(`/repayments/receipt/${receiptNumber}`),

  // SMS & Reminders
  initiateOtp: (data) => request('/sms/otp/initiate', { method: 'POST', body: data }),
  verifyOtp: (data) => request('/sms/otp/verify', { method: 'POST', body: data }),
  sendTestSms: (data) => request('/sms/test', { method: 'POST', body: data }),
  retrySms: (logId) => request(`/sms/retry/${logId}`, { method: 'POST' }),
  sendReminder: (data) => request('/sms/reminder', { method: 'POST', body: data }),
  getRemindersQueue: () => request('/sms/queue'),
  getSmsLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sms/logs?${qs}`);
  },

  // Reports & Dashboard
  getDashboardStats: () => request('/reports/dashboard'),
  getCustomerReport: () => request('/reports/customers'),
  getCollectionReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports/collections?${qs}`);
  },
  getOverdueReport: () => request('/reports/overdue'),
  getFinancialSummary: () => request('/reports/financial-summary'),

  // Settings & Firebase Config
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'POST', body: data }),
  getFirebaseConfig: () => request('/settings/firebase-config'),

  // Database Backups
  createBackup: () => request('/backup/create', { method: 'POST' }),
  listBackups: () => request('/backup/list'),
  getBackupDownloadUrl: (filename) => {
    const token = localStorage.getItem('admin_token');
    const path = `${BASE_URL}/backup/download/${encodeURIComponent(filename)}`;
    return token ? `${path}?token=${encodeURIComponent(token)}` : path;
  },
  restoreBackup: (filename) => request('/backup/restore', { method: 'POST', body: { filename } }),

  // Audit Logs
  getAuditLogs: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/audit-logs?${qs}`);
  }
};
