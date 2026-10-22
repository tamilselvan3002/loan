const fs = require('fs');
const path = require('path');
const { db, dbPath } = require('../config/db');
const { logAudit } = require('../services/auditService');

const backupsDir = path.join(__dirname, '../../backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

function createBackup(req, res) {
  try {
    // Flush WAL to disk first
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');

    const timestamp = Date.now();
    const filename = `backup-${timestamp}.db`;
    const targetPath = path.join(backupsDir, filename);

    fs.copyFileSync(dbPath, targetPath);
    const stats = fs.statSync(targetPath);

    logAudit({
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      action: 'BACKUP_CREATED',
      entityType: 'DATABASE',
      entityId: filename,
      details: { sizeBytes: stats.size, filename },
      ipAddress: req.ip
    });

    return res.json({
      message: 'Database backup created successfully.',
      backup: {
        filename,
        size: stats.size,
        createdAt: new Date(stats.mtime).toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ error: `Backup failed: ${err.message}` });
  }
}

function listBackups(req, res) {
  try {
    if (!fs.existsSync(backupsDir)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.db'))
      .map(filename => {
        const fullPath = path.join(backupsDir, filename);
        const stats = fs.statSync(fullPath);
        return {
          filename,
          size: stats.size,
          createdAt: new Date(stats.mtime).toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ backups: files });
  } catch (err) {
    return res.status(500).json({ error: `Failed to list backups: ${err.message}` });
  }
}

function downloadBackup(req, res) {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup file not found.' });
    }

    return res.download(filePath, filename);
  } catch (err) {
    return res.status(500).json({ error: `Download failed: ${err.message}` });
  }
}

function restoreBackup(req, res) {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Backup filename is required.' });
    }

    const safeName = path.basename(filename);
    const sourcePath = path.join(backupsDir, safeName);

    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ error: 'Specified backup file does not exist.' });
    }

    // 1. Create a safety snapshot of current DB before overwriting
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    const safetySnapshot = path.join(backupsDir, `pre-restore-${Date.now()}.db`);
    fs.copyFileSync(dbPath, safetySnapshot);

    // 2. Overwrite main DB file
    fs.copyFileSync(sourcePath, dbPath);

    // 3. Remove existing WAL and SHM files to ensure clean startup
    const walFile = `${dbPath}-wal`;
    const shmFile = `${dbPath}-shm`;
    if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
    if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

    logAudit({
      adminId: req.admin?.id,
      adminUsername: req.admin?.username,
      action: 'BACKUP_RESTORED',
      entityType: 'DATABASE',
      entityId: safeName,
      details: { restoredFrom: safeName, safetySnapshot },
      ipAddress: req.ip
    });

    return res.json({
      message: 'Database restored successfully from backup.',
      restoredFile: safeName
    });
  } catch (err) {
    return res.status(500).json({ error: `Restore failed: ${err.message}` });
  }
}

module.exports = {
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup
};
