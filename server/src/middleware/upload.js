const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const photosDir = path.join(__dirname, '../../storage/photos');
const documentsDir = path.join(__dirname, '../../storage/documents');

if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

// Photo storage engine
const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `photo-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

// Document storage engine
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, documentsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `doc-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

// Combined storage engine for Customer Profile Registration & Updating
const combinedStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'photo' || file.fieldname === 'photos') {
      cb(null, photosDir);
    } else {
      cb(null, documentsDir);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPhoto = (file.fieldname === 'photo' || file.fieldname === 'photos');
    const prefix = isPhoto ? 'photo' : 'doc';
    const uniqueName = `${prefix}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const photoFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP image formats are allowed for photographs.'));
  }
};

const documentFileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, PNG, and WEBP file types are allowed for documents.'));
  }
};

const combinedFilter = (req, file, cb) => {
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedDocMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (file.fieldname === 'photo' || file.fieldname === 'photos') {
    if (allowedImageMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WEBP image formats are allowed for photographs.'));
    }
  } else {
    if (allowedDocMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, PNG, and WEBP file types are allowed for documents.'));
    }
  }
};

const uploadPhoto = multer({
  storage: photoStorage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
  fileFilter: photoFileFilter
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: documentFileFilter
});

const uploadCustomerPhotos = multer({
  storage: photoStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: photoFileFilter
}).array('photos', 4);

const uploadCustomerRegistration = multer({
  storage: combinedStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: combinedFilter
}).fields([
  { name: 'photo', maxCount: 1 },
  { name: 'photos', maxCount: 4 },
  { name: 'aadhaar_front', maxCount: 1 },
  { name: 'aadhaar_back', maxCount: 1 },
  { name: 'bank_passbook_front', maxCount: 1 },
  { name: 'bank_passbook_back', maxCount: 1 },
  { name: 'nominee_aadhaar_front', maxCount: 1 },
  { name: 'nominee_aadhaar_back', maxCount: 1 }
]);

module.exports = {
  uploadPhoto,
  uploadDocument,
  uploadCustomerPhotos,
  uploadCustomerRegistration,
  photosDir,
  documentsDir
};
