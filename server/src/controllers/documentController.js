const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { get, run, all } = require('../config/db');
const { logAudit } = require('../services/auditService');
const { documentsDir } = require('../middleware/upload');

function uploadCustomerDocument(req, res) {
  const { customer_id, document_type } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Customer ID is required.' });
  }

  const customer = get('SELECT id FROM customers WHERE id = ?', customer_id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer does not exist.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded.' });
  }

  const docId = `DOC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  run(
    `INSERT INTO customer_documents (id, customer_id, document_type, original_name, stored_filename, mime_type, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    docId,
    customer_id,
    document_type || 'OTHER',
    req.file.originalname,
    req.file.filename,
    req.file.mimetype,
    req.file.size
  );

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'CUSTOMER_DOCUMENT',
    entityId: docId,
    details: { customer_id, document_type, original_name: req.file.originalname, file_size: req.file.size },
    ipAddress: req.ip
  });

  const createdDoc = get('SELECT * FROM customer_documents WHERE id = ?', docId);
  return res.status(201).json({ document: createdDoc, message: 'Document uploaded securely.' });
}

function getDocumentFile(req, res) {
  const { id } = req.params;
  const doc = get('SELECT * FROM customer_documents WHERE id = ?', id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  const filePath = path.join(documentsDir, doc.stored_filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File is missing from disk storage.' });
  }

  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader('Content-Disposition', `inline; filename="${doc.original_name}"`);
  return res.sendFile(filePath);
}

function deleteCustomerDocument(req, res) {
  const { id } = req.params;
  const doc = get('SELECT * FROM customer_documents WHERE id = ?', id);

  if (!doc) {
    return res.status(404).json({ error: 'Document not found.' });
  }

  // Remove from disk
  const filePath = path.join(documentsDir, doc.stored_filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  run('DELETE FROM customer_documents WHERE id = ?', id);

  logAudit({
    adminId: req.admin.id,
    adminUsername: req.admin.username,
    action: 'DOCUMENT_DELETED',
    entityType: 'CUSTOMER_DOCUMENT',
    entityId: id,
    details: { customer_id: doc.customer_id, document_type: doc.document_type, original_name: doc.original_name },
    ipAddress: req.ip
  });

  return res.json({ message: 'Document deleted successfully.' });
}

module.exports = {
  uploadCustomerDocument,
  getDocumentFile,
  deleteCustomerDocument
};
