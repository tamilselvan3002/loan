const express = require('express');
const router = express.Router();

const { requireAdminAuth } = require('../middleware/auth');
const {
  uploadPhoto,
  uploadDocument,
  uploadCustomerPhotos,
  uploadCustomerRegistration
} = require('../middleware/upload');

// Controllers
const authController = require('../controllers/authController');
const customerController = require('../controllers/customerController');
const documentController = require('../controllers/documentController');
const loanController = require('../controllers/loanController');
const repaymentController = require('../controllers/repaymentController');
const reportController = require('../controllers/reportController');
const smsController = require('../controllers/smsController');
const settingsController = require('../controllers/settingsController');
const auditController = require('../controllers/auditController');
const backupController = require('../controllers/backupController');

// 1. Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', requireAdminAuth, authController.getMe);
router.post('/auth/change-password', requireAdminAuth, authController.changePassword);

// 2. Customers
router.get('/customers', requireAdminAuth, customerController.getCustomers);
router.post('/customers', requireAdminAuth, uploadCustomerRegistration, customerController.createCustomer);
router.get('/customers/:id', requireAdminAuth, customerController.getCustomerById);
router.put('/customers/:id', requireAdminAuth, uploadCustomerRegistration, customerController.updateCustomer);
router.patch('/customers/:id/archive', requireAdminAuth, customerController.archiveCustomer);
router.post('/customers/:id/archive', requireAdminAuth, customerController.archiveCustomer);
router.patch('/customers/:id/restore', requireAdminAuth, customerController.restoreCustomer);
router.post('/customers/:id/restore', requireAdminAuth, customerController.restoreCustomer);
router.delete('/customers/:id', requireAdminAuth, customerController.deleteCustomer);
router.get('/customers/:id/photo', requireAdminAuth, customerController.getCustomerPhoto);
router.get('/customers/:id/photos/:filename', requireAdminAuth, customerController.getCustomerPhoto);
router.post('/customers/:id/photos', requireAdminAuth, uploadCustomerPhotos, customerController.uploadCustomerPhotosHandler);
router.delete('/customers/:id/photos/:filename', requireAdminAuth, customerController.deleteCustomerPhotoHandler);
router.post('/customers/:id/documents/upsert', requireAdminAuth, uploadDocument.single('document'), customerController.upsertDocumentHandler);

// 3. Customer Documents
router.post('/documents/upload', requireAdminAuth, uploadDocument.single('document'), documentController.uploadCustomerDocument);
router.get('/documents/:id/file', requireAdminAuth, documentController.getDocumentFile);
router.delete('/documents/:id', requireAdminAuth, documentController.deleteCustomerDocument);

// 4. Loans
router.post('/loans/preview', requireAdminAuth, loanController.previewLoan);
router.post('/loans', requireAdminAuth, loanController.createLoan);
router.get('/loans', requireAdminAuth, loanController.getLoans);
router.get('/loans/:id', requireAdminAuth, loanController.getLoanById);
router.patch('/loans/:id/status', requireAdminAuth, loanController.updateLoanStatus);

// 5. Repayments & Receipts
router.post('/repayments/otp/initiate', requireAdminAuth, repaymentController.initiatePaymentOtp);
router.get('/repayments/settlement-quote/:loanId', requireAdminAuth, repaymentController.getSettlementQuote);
router.post('/repayments', requireAdminAuth, repaymentController.recordPayment);
router.post('/repayments/:id/reverse', requireAdminAuth, repaymentController.reversePayment);
router.get('/repayments/history', requireAdminAuth, repaymentController.getPaymentHistory);
router.get('/repayments/receipt/:receiptNumber', requireAdminAuth, repaymentController.getReceipt);

// 6. SMS & Reminders
router.post('/sms/otp/initiate', requireAdminAuth, smsController.handleInitiateOtp);
router.post('/sms/otp/verify', requireAdminAuth, smsController.handleVerifyOtp);
router.post('/sms/test', requireAdminAuth, smsController.handleSendTestSms);
router.post('/sms/retry/:logId', requireAdminAuth, smsController.handleRetrySms);
router.post('/sms/reminder', requireAdminAuth, smsController.handleSendReminder);
router.get('/sms/queue', requireAdminAuth, smsController.getRemindersQueue);
router.get('/sms/logs', requireAdminAuth, smsController.getSmsLogs);

// 7. Reports & Dashboard
router.get('/reports/dashboard', requireAdminAuth, reportController.getDashboardStats);
router.get('/reports/customers', requireAdminAuth, reportController.getCustomerWiseReport);
router.get('/reports/collections', requireAdminAuth, reportController.getCollectionReport);
router.get('/reports/overdue', requireAdminAuth, reportController.getOverdueReport);
router.get('/reports/financial-summary', requireAdminAuth, reportController.getFinancialSummary);

// 8. Settings & Firebase Public Config
router.get('/settings', requireAdminAuth, settingsController.getSettings);
router.post('/settings', requireAdminAuth, settingsController.updateSettings);
router.get('/settings/firebase-config', settingsController.getPublicFirebaseConfig);

// 9. Backups (Admin Only)
router.post('/backup/create', requireAdminAuth, backupController.createBackup);
router.post('/backups', requireAdminAuth, backupController.createBackup);
router.get('/backup/list', requireAdminAuth, backupController.listBackups);
router.get('/backups', requireAdminAuth, backupController.listBackups);
router.get('/backup/download/:filename', requireAdminAuth, backupController.downloadBackup);
router.get('/backups/download/:filename', requireAdminAuth, backupController.downloadBackup);
router.post('/backup/restore', requireAdminAuth, backupController.restoreBackup);
router.post('/backups/restore', requireAdminAuth, backupController.restoreBackup);

// 10. Audit Logs
router.get('/audit-logs', requireAdminAuth, auditController.getAuditLogs);

module.exports = router;
