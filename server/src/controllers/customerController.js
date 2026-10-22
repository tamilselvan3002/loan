const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { get, all, run, transaction } = require('../config/db');
const { logAudit } = require('../services/auditService');
const { photosDir, documentsDir } = require('../middleware/upload');
const { verifyFirebasePhoneToken, markTokenConsumed } = require('../config/firebaseAdmin');

function generateNextCustomerId() {
  const lastCustomer = get(`SELECT id FROM customers WHERE id LIKE 'CUST-%' ORDER BY id DESC LIMIT 1`);
  if (!lastCustomer) {
    return 'CUST-1001';
  }
  const match = lastCustomer.id.match(/^CUST-(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `CUST-${nextNum}`;
  }
  return `CUST-${Date.now().toString().slice(-4)}`;
}

function getCustomers(req, res) {
  const { search, status } = req.query;
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ' AND (id LIKE ? OR full_name LIKE ? OR mobile_number LIKE ? OR nominee_name LIKE ?)';
    params.push(term, term, term, term);
  }

  if (status && status !== 'ALL') {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';
  const customers = all(sql, ...params);

  // Augment with loan summary count
  const results = customers.map(c => {
    const loanStats = get(
      `SELECT 
         COUNT(*) as total_loans,
         SUM(CASE WHEN status = 'ACTIVE' OR status = 'OVERDUE' THEN 1 ELSE 0 END) as active_loans,
         COALESCE(SUM(outstanding_balance), 0) as total_outstanding
       FROM loans WHERE customer_id = ?`,
      c.id
    );

    let parsedPhotos = [];
    try {
      if (c.photos_json) parsedPhotos = JSON.parse(c.photos_json);
      else if (c.photo_filename) parsedPhotos = [c.photo_filename];
    } catch (e) {
      if (c.photo_filename) parsedPhotos = [c.photo_filename];
    }

    return {
      ...c,
      photos: parsedPhotos,
      total_loans: loanStats ? loanStats.total_loans : 0,
      active_loans: loanStats ? loanStats.active_loans : 0,
      total_outstanding: loanStats ? loanStats.total_outstanding : 0
    };
  });

  return res.json({ customers: results });
}

function getCustomerById(req, res) {
  const { id } = req.params;
  const customer = get('SELECT * FROM customers WHERE id = ?', id);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Parse photos JSON
  let photos = [];
  try {
    if (customer.photos_json) photos = JSON.parse(customer.photos_json);
    else if (customer.photo_filename) photos = [customer.photo_filename];
  } catch (e) {
    if (customer.photo_filename) photos = [customer.photo_filename];
  }

  // Fetch all loans for this customer (without agent join)
  const rawLoans = all(
    `SELECT l.* 
     FROM loans l 
     WHERE l.customer_id = ? 
     ORDER BY l.created_at DESC`,
    id
  );

  // Augment each loan with detailed installment counts, overdue, and next due date
  const loans = rawLoans.map(l => {
    const stats = get(
      `SELECT 
         COUNT(CASE WHEN status = 'PAID' THEN 1 END) as installments_paid,
         COUNT(CASE WHEN status != 'PAID' THEN 1 END) as installments_remaining,
         COALESCE(SUM(CASE WHEN status = 'OVERDUE' OR (due_date < date('now') AND status != 'PAID') THEN remaining_balance ELSE 0 END), 0) as overdue_amount
       FROM loan_schedules WHERE loan_id = ?`,
      l.id
    ) || { installments_paid: 0, installments_remaining: 0, overdue_amount: 0 };

    const nextSchedule = get(
      `SELECT installment_number, due_date, scheduled_amount, remaining_balance
       FROM loan_schedules
       WHERE loan_id = ? AND remaining_balance > 0
       ORDER BY installment_number ASC LIMIT 1`,
      l.id
    );

    return {
      ...l,
      original_loan_amount: l.principal_amount,
      total_interest: l.expected_total_interest,
      total_repayment_amount: l.expected_total_repayment,
      installments_paid: stats.installments_paid,
      installments_remaining: stats.installments_remaining,
      overdue_amount: stats.overdue_amount,
      next_installment_amount: nextSchedule ? nextSchedule.remaining_balance : 0,
      next_installment_number: nextSchedule ? nextSchedule.installment_number : null,
      next_payment_due_date: nextSchedule ? nextSchedule.due_date : null
    };
  });

  // Fetch all payment transactions for this customer
  const payments = all(
    `SELECT pt.*, l.id as loan_id 
     FROM payment_transactions pt
     JOIN loans l ON pt.loan_id = l.id
     WHERE pt.customer_id = ?
     ORDER BY pt.payment_date DESC, pt.created_at DESC`,
    id
  );

  // Fetch upcoming installments across all active loans
  const upcomingDue = all(
    `SELECT ls.*, l.id as loan_id 
     FROM loan_schedules ls
     JOIN loans l ON ls.loan_id = l.id
     WHERE l.customer_id = ? AND ls.status IN ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'OVERDUE')
     ORDER BY ls.due_date ASC`,
    id
  );

  // Fetch all KYC and nominee documents
  const rawDocuments = all(
    `SELECT id, document_type, original_name, stored_filename, mime_type, file_size, uploaded_at 
     FROM customer_documents 
     WHERE customer_id = ? 
     ORDER BY uploaded_at DESC`,
    id
  );

  // Segregate documents for UI convenience
  const segregated = {
    aadhaar_front: rawDocuments.find(d => d.document_type === 'AADHAAR_FRONT') || null,
    aadhaar_back: rawDocuments.find(d => d.document_type === 'AADHAAR_BACK') || null,
    nominee_aadhaar_front: rawDocuments.find(d => d.document_type === 'NOMINEE_AADHAAR_FRONT') || null,
    nominee_aadhaar_back: rawDocuments.find(d => d.document_type === 'NOMINEE_AADHAAR_BACK') || null,
    other_documents: rawDocuments.filter(d => ![
      'AADHAAR_FRONT', 'AADHAAR_BACK', 
      'NOMINEE_AADHAAR_FRONT', 'NOMINEE_AADHAAR_BACK'
    ].includes(d.document_type))
  };

  // Financial summary
  const summary = {
    total_loans: loans.length,
    active_loans: loans.filter(l => l.status === 'ACTIVE' || l.status === 'OVERDUE').length,
    completed_loans: loans.filter(l => l.status === 'COMPLETED').length,
    total_borrowed: loans.reduce((sum, l) => sum + (l.principal_amount || 0), 0),
    total_repaid: loans.reduce((sum, l) => sum + (l.total_paid_amount || 0), 0),
    total_outstanding: loans.reduce((sum, l) => sum + (l.outstanding_balance || 0), 0)
  };

  return res.json({
    customer: {
      ...customer,
      photos
    },
    loans,
    payments,
    upcomingDue,
    documents: rawDocuments,
    segregatedDocuments: segregated,
    summary
  });
}

async function createCustomer(req, res) {
  try {
    const {
      full_name,
      mobile_number,
      alt_mobile,
      dob,
      street,
      village_town,
      district,
      state,
      pincode,
      address,
      notes,
      status = 'ACTIVE',
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      nominee_name,
      nominee_mobile,
      nominee_relationship,
      nominee_address,
      firebase_id_token
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Customer full name is required.' });
    }

    if (!mobile_number || !mobile_number.trim()) {
      return res.status(400).json({ error: 'Customer mobile number is required.' });
    }

    const cleanMobile = mobile_number.trim();

    // Check mobile number uniqueness
    const existing = get('SELECT id, full_name FROM customers WHERE mobile_number = ?', cleanMobile);
    if (existing) {
      return res.status(400).json({
        error: `A customer (${existing.full_name} - ${existing.id}) is already registered with mobile number ${cleanMobile}.`
      });
    }

    const customerId = generateNextCustomerId();

    // Handle uploaded files
    const files = req.files || {};
    const photoFiles = files.photos || (files.photo ? [files.photo[0]] : []);
    const photoFilenames = photoFiles.map(f => f.filename);
    const primaryPhoto = photoFilenames.length > 0 ? photoFilenames[0] : null;

    // Build address string if not given
    const formattedAddress = address || [
      street, village_town, district, state ? `${state} ${pincode || ''}` : pincode
    ].filter(Boolean).join(', ');

    // Atomic creation
    transaction(() => {
      run(
        `INSERT INTO customers (
           id, full_name, mobile_number, alt_mobile, dob, address,
           street, village_town, district, state, pincode,
           photo_filename, photos_json,
           bank_name, account_holder, account_number, ifsc_code,
           nominee_name, nominee_mobile, nominee_relationship, nominee_address,
           notes, status
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        customerId,
        full_name.trim(),
        cleanMobile,
        alt_mobile ? alt_mobile.trim() : null,
        dob || null,
        formattedAddress || null,
        street ? street.trim() : null,
        village_town ? village_town.trim() : null,
        district ? district.trim() : null,
        state ? state.trim() : null,
        pincode ? pincode.trim() : null,
        primaryPhoto,
        JSON.stringify(photoFilenames),
        bank_name ? bank_name.trim() : null,
        account_holder ? account_holder.trim() : null,
        account_number ? account_number.trim() : null,
        ifsc_code ? ifsc_code.trim().toUpperCase() : null,
        nominee_name ? nominee_name.trim() : null,
        nominee_mobile ? nominee_mobile.trim() : null,
        nominee_relationship ? nominee_relationship.trim() : null,
        nominee_address ? nominee_address.trim() : null,
        notes ? notes.trim() : null,
        status
      );

      // Save customer documents
      const docFields = [
        { field: 'aadhaar_front', type: 'AADHAAR_FRONT' },
        { field: 'aadhaar_back', type: 'AADHAAR_BACK' },
        { field: 'nominee_aadhaar_front', type: 'NOMINEE_AADHAAR_FRONT' },
        { field: 'nominee_aadhaar_back', type: 'NOMINEE_AADHAAR_BACK' }
      ];

      for (const item of docFields) {
        if (files[item.field] && files[item.field][0]) {
          const file = files[item.field][0];
          const docId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
          run(
            `INSERT INTO customer_documents (id, customer_id, document_type, original_name, stored_filename, mime_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            docId,
            customerId,
            item.type,
            file.originalname,
            file.filename,
            file.mimetype,
            file.size
          );
        }
      }
    });

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'CUSTOMER_CREATED',
      entityType: 'CUSTOMER',
      entityId: customerId,
      details: { full_name, mobile_number: cleanMobile },
      ipAddress: req.ip
    });

    const created = get('SELECT * FROM customers WHERE id = ?', customerId);
    return res.status(201).json({
      customer: {
        ...created,
        photos: photoFilenames
      },
      message: 'Customer registered successfully.'
    });
  } catch (err) {
    return res.status(500).json({ error: `Customer registration failed: ${err.message}` });
  }
}

function updateCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = get('SELECT * FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const {
      full_name,
      mobile_number,
      alt_mobile,
      dob,
      street,
      village_town,
      district,
      state,
      pincode,
      address,
      notes,
      status,
      bank_name,
      account_holder,
      account_number,
      ifsc_code,
      nominee_name,
      nominee_mobile,
      nominee_relationship,
      nominee_address
    } = req.body;

    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ error: 'Customer full name is required.' });
    }

    if (!mobile_number || !mobile_number.trim()) {
      return res.status(400).json({ error: 'Customer mobile number is required.' });
    }

    const cleanMobile = mobile_number.trim();

    // Check duplicate mobile
    const duplicate = get('SELECT id FROM customers WHERE mobile_number = ? AND id != ?', cleanMobile, id);
    if (duplicate) {
      return res.status(400).json({ error: `Mobile number ${cleanMobile} is already in use by customer ${duplicate.id}.` });
    }

    const formattedAddress = address || [
      street, village_town, district, state ? `${state} ${pincode || ''}` : pincode
    ].filter(Boolean).join(', ');

    // Handle documents if uploaded via update form
    const files = req.files || {};
    const docFields = [
      { field: 'aadhaar_front', type: 'AADHAAR_FRONT' },
      { field: 'aadhaar_back', type: 'AADHAAR_BACK' },
      { field: 'bank_passbook_front', type: 'BANK_PASSBOOK_FRONT' },
      { field: 'bank_passbook_back', type: 'BANK_PASSBOOK_BACK' },
      { field: 'nominee_aadhaar_front', type: 'NOMINEE_AADHAAR_FRONT' },
      { field: 'nominee_aadhaar_back', type: 'NOMINEE_AADHAAR_BACK' }
    ];

    for (const item of docFields) {
      if (files[item.field] && files[item.field][0]) {
        const file = files[item.field][0];
        // Remove existing doc of this type
        const oldDoc = get('SELECT stored_filename FROM customer_documents WHERE customer_id = ? AND document_type = ?', id, item.type);
        if (oldDoc) {
          const oldPath = path.join(documentsDir, oldDoc.stored_filename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
          run('DELETE FROM customer_documents WHERE customer_id = ? AND document_type = ?', id, item.type);
        }

        const docId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        run(
          `INSERT INTO customer_documents (id, customer_id, document_type, original_name, stored_filename, mime_type, file_size)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          docId,
          id,
          item.type,
          file.originalname,
          file.filename,
          file.mimetype,
          file.size
        );
      }
    }

    // Handle extra photos if uploaded
    let currentPhotos = [];
    try {
      if (customer.photos_json) currentPhotos = JSON.parse(customer.photos_json);
      else if (customer.photo_filename) currentPhotos = [customer.photo_filename];
    } catch (e) {
      if (customer.photo_filename) currentPhotos = [customer.photo_filename];
    }

    const newPhotoFiles = files.photos || (files.photo ? [files.photo[0]] : []);
    for (const f of newPhotoFiles) {
      if (currentPhotos.length < 4) {
        currentPhotos.push(f.filename);
      }
    }

    run(
      `UPDATE customers 
       SET full_name = ?, mobile_number = ?, alt_mobile = ?, dob = ?, address = ?,
           street = ?, village_town = ?, district = ?, state = ?, pincode = ?,
           photo_filename = ?, photos_json = ?,
           bank_name = ?, account_holder = ?, account_number = ?, ifsc_code = ?,
           nominee_name = ?, nominee_mobile = ?, nominee_relationship = ?, nominee_address = ?,
           notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      full_name.trim(),
      cleanMobile,
      alt_mobile ? alt_mobile.trim() : null,
      dob || null,
      formattedAddress || null,
      street ? street.trim() : null,
      village_town ? village_town.trim() : null,
      district ? district.trim() : null,
      state ? state.trim() : null,
      pincode ? pincode.trim() : null,
      currentPhotos[0] || null,
      JSON.stringify(currentPhotos),
      bank_name ? bank_name.trim() : null,
      account_holder ? account_holder.trim() : null,
      account_number ? account_number.trim() : null,
      ifsc_code ? ifsc_code.trim().toUpperCase() : null,
      nominee_name ? nominee_name.trim() : null,
      nominee_mobile ? nominee_mobile.trim() : null,
      nominee_relationship ? nominee_relationship.trim() : null,
      nominee_address ? nominee_address.trim() : null,
      notes ? notes.trim() : null,
      status || customer.status,
      id
    );

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'CUSTOMER_UPDATED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { full_name, mobile_number: cleanMobile, status },
      ipAddress: req.ip
    });

    const updated = get('SELECT * FROM customers WHERE id = ?', id);
    return res.json({
      customer: {
        ...updated,
        photos: currentPhotos
      },
      message: 'Customer profile updated successfully.'
    });
  } catch (err) {
    return res.status(500).json({ error: `Update failed: ${err.message}` });
  }
}

function archiveCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = get('SELECT id, full_name, status FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    run("UPDATE customers SET status = 'ARCHIVED', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id);

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'CUSTOMER_ARCHIVED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { full_name: customer.full_name },
      ipAddress: req.ip
    });

    const updated = get('SELECT * FROM customers WHERE id = ?', id);
    return res.json({ 
      message: `Customer ${customer.full_name} (${id}) archived successfully.`,
      customer: updated
    });
  } catch (err) {
    return res.status(500).json({ error: `Archival failed: ${err.message}` });
  }
}

function restoreCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = get('SELECT id, full_name, status FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    run("UPDATE customers SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP WHERE id = ?", id);

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'CUSTOMER_RESTORED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { full_name: customer.full_name },
      ipAddress: req.ip
    });

    const updated = get('SELECT * FROM customers WHERE id = ?', id);
    return res.json({ 
      message: `Customer ${customer.full_name} (${id}) restored successfully.`,
      customer: updated
    });
  } catch (err) {
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
}

function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const customer = get('SELECT * FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Check financial history: loans and payments
    const loanStats = get(
      `SELECT 
         COUNT(*) as total_loans,
         COALESCE(SUM(outstanding_balance), 0) as total_outstanding,
         SUM(CASE WHEN status IN ('ACTIVE', 'OVERDUE') THEN 1 ELSE 0 END) as active_loans
       FROM loans WHERE customer_id = ?`,
      id
    );

    const paymentCount = get(
      'SELECT COUNT(*) as count FROM payment_transactions WHERE customer_id = ?',
      id
    )?.count || 0;

    const totalLoans = loanStats?.total_loans || 0;

    // Strict financial lock rule
    if (totalLoans > 0 || paymentCount > 0) {
      return res.status(409).json({
        locked: true,
        canArchive: true,
        error: `Customer ${customer.full_name} (${id}) has financial records (${totalLoans} loan account(s), ₹${loanStats?.total_outstanding?.toLocaleString('en-IN') || 0} outstanding, ${paymentCount} payment transaction(s)). Hard deletion is permanently locked to preserve financial ledger and audit integrity. You can safely Archive this customer instead.`,
        details: {
          totalLoans,
          activeLoans: loanStats?.active_loans || 0,
          totalOutstanding: loanStats?.total_outstanding || 0,
          paymentCount
        }
      });
    }

    // Zero-loan customer: allow permanent deletion and unlink files
    transaction(() => {
      // Unlink photos
      let photos = [];
      try {
        if (customer.photos_json) photos = JSON.parse(customer.photos_json);
        else if (customer.photo_filename) photos = [customer.photo_filename];
      } catch (e) {
        if (customer.photo_filename) photos = [customer.photo_filename];
      }

      for (const p of photos) {
        const photoPath = path.join(photosDir, p);
        if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
      }

      // Unlink documents
      const docs = all('SELECT stored_filename FROM customer_documents WHERE customer_id = ?', id);
      for (const d of docs) {
        const docPath = path.join(documentsDir, d.stored_filename);
        if (fs.existsSync(docPath)) fs.unlinkSync(docPath);
      }

      run('DELETE FROM customer_documents WHERE customer_id = ?', id);
      run('DELETE FROM customers WHERE id = ?', id);
    });

    logAudit({
      adminId: req.admin.id,
      adminUsername: req.admin.username,
      action: 'CUSTOMER_DELETED',
      entityType: 'CUSTOMER',
      entityId: id,
      details: { full_name: customer.full_name, mobile: customer.mobile_number },
      ipAddress: req.ip
    });

    return res.json({ message: `Customer ${customer.full_name} (${id}) and all associated files permanently deleted.` });
  } catch (err) {
    return res.status(500).json({ error: `Deletion failed: ${err.message}` });
  }
}

function getCustomerPhoto(req, res) {
  const { id, filename } = req.params;
  const customer = get('SELECT photo_filename, photos_json FROM customers WHERE id = ?', id);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  let photoTarget = filename || customer.photo_filename;
  if (!photoTarget) {
    return res.status(404).json({ error: 'No photograph recorded for customer.' });
  }

  const filePath = path.join(photosDir, path.basename(photoTarget));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Photo file not found on disk.' });
  }

  return res.sendFile(filePath);
}

function uploadCustomerPhotosHandler(req, res) {
  try {
    const { id } = req.params;
    const customer = get('SELECT * FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    let existingPhotos = [];
    try {
      if (customer.photos_json) existingPhotos = JSON.parse(customer.photos_json);
      else if (customer.photo_filename) existingPhotos = [customer.photo_filename];
    } catch (e) {
      if (customer.photo_filename) existingPhotos = [customer.photo_filename];
    }

    const files = req.files || [];
    for (const f of files) {
      if (existingPhotos.length < 4) {
        existingPhotos.push(f.filename);
      } else {
        // delete extra from disk
        const excess = path.join(photosDir, f.filename);
        if (fs.existsSync(excess)) fs.unlinkSync(excess);
      }
    }

    run(
      `UPDATE customers 
       SET photo_filename = ?, photos_json = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      existingPhotos[0] || null,
      JSON.stringify(existingPhotos),
      id
    );

    return res.json({
      message: 'Photos uploaded successfully.',
      photos: existingPhotos
    });
  } catch (err) {
    return res.status(500).json({ error: `Upload photos failed: ${err.message}` });
  }
}

function deleteCustomerPhotoHandler(req, res) {
  try {
    const { id, filename } = req.params;
    const customer = get('SELECT * FROM customers WHERE id = ?', id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    let photos = [];
    try {
      if (customer.photos_json) photos = JSON.parse(customer.photos_json);
      else if (customer.photo_filename) photos = [customer.photo_filename];
    } catch (e) {
      if (customer.photo_filename) photos = [customer.photo_filename];
    }

    const targetName = path.basename(filename);
    const updatedPhotos = photos.filter(p => p !== targetName);

    const filePath = path.join(photosDir, targetName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    run(
      `UPDATE customers 
       SET photo_filename = ?, photos_json = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      updatedPhotos[0] || null,
      JSON.stringify(updatedPhotos),
      id
    );

    return res.json({
      message: 'Photograph deleted successfully.',
      photos: updatedPhotos
    });
  } catch (err) {
    return res.status(500).json({ error: `Delete photo failed: ${err.message}` });
  }
}

function upsertDocumentHandler(req, res) {
  try {
    const { id } = req.params;
    const { document_type } = req.body;
    const customer = get('SELECT id FROM customers WHERE id = ?', id);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No document file provided.' });
    }

    if (!document_type) {
      return res.status(400).json({ error: 'Document type is required.' });
    }

    // Remove existing document of this type for this customer
    const existing = get(
      'SELECT id, stored_filename FROM customer_documents WHERE customer_id = ? AND document_type = ?',
      id,
      document_type
    );

    if (existing) {
      const oldPath = path.join(documentsDir, existing.stored_filename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      run('DELETE FROM customer_documents WHERE id = ?', existing.id);
    }

    const docId = `DOC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    run(
      `INSERT INTO customer_documents (id, customer_id, document_type, original_name, stored_filename, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      docId,
      id,
      document_type,
      req.file.originalname,
      req.file.filename,
      req.file.mimetype,
      req.file.size
    );

    const savedDoc = get('SELECT * FROM customer_documents WHERE id = ?', docId);
    return res.json({
      message: 'Document saved successfully.',
      document: savedDoc
    });
  } catch (err) {
    return res.status(500).json({ error: `Document upload failed: ${err.message}` });
  }
}

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  archiveCustomer,
  restoreCustomer,
  deleteCustomer,
  getCustomerPhoto,
  uploadCustomerPhotosHandler,
  deleteCustomerPhotoHandler,
  upsertDocumentHandler
};
