const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const User = require('../models/User');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth, requirePermission } = require('../middleware/auth');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only JSON files are allowed'), false);
    }
  }
});

// Settings storage (in production, use database)
let systemSettings = {
  general: {
    companyName: 'Stok Yönetim Sistemi',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    currency: 'TRY',
    language: 'tr',
    timezone: 'Europe/Istanbul',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'tr-TR'
  },
  stock: {
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    autoReorderEnabled: false,
    autoReorderQuantity: 50,
    stockValuationMethod: 'FIFO',
    allowNegativeStock: false,
    requireApprovalForAdjustments: true
  },
  notifications: {
    emailNotifications: true,
    lowStockAlerts: true,
    criticalStockAlerts: true,
    newUserRegistration: true,
    systemMaintenance: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true
  },
  security: {
    passwordMinLength: 6,
    passwordRequireUppercase: false,
    passwordRequireNumbers: false,
    passwordRequireSpecialChars: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorEnabled: false
  }
};

// Load settings from file on startup
const loadSettings = async () => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const data = await fs.readFile(settingsPath, 'utf8');
    systemSettings = JSON.parse(data);
  } catch (error) {
    console.log('Settings file not found, using defaults');
  }
};

// Save settings to file
const saveSettings = async () => {
  try {
    const settingsPath = path.join(__dirname, '../data/settings.json');
    const dataDir = path.dirname(settingsPath);
    
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(settingsPath, JSON.stringify(systemSettings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

// Initialize settings
loadSettings();

// @route   GET /api/settings
// @desc    Get all system settings
// @access  Private (Admin only)
router.get('/', auth, requirePermission('canManageSettings'), async (req, res) => {
  try {
    res.json(systemSettings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   PUT /api/settings
// @desc    Update system settings
// @access  Private (Admin only)
router.put('/', [
  auth,
  requirePermission('canManageSettings'),
  body('category').isIn(['general', 'stock', 'notifications', 'security']),
  body('settings').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, settings } = req.body;
    
    // Validate specific settings based on category
    if (category === 'stock') {
      if (settings.lowStockThreshold && settings.lowStockThreshold < 0) {
        return res.status(400).json({ message: 'Düşük stok eşiği negatif olamaz' });
      }
      if (settings.criticalStockThreshold && settings.criticalStockThreshold < 0) {
        return res.status(400).json({ message: 'Kritik stok eşiği negatif olamaz' });
      }
    }
    
    if (category === 'security') {
      if (settings.passwordMinLength && (settings.passwordMinLength < 4 || settings.passwordMinLength > 20)) {
        return res.status(400).json({ message: 'Şifre uzunluğu 4-20 karakter arasında olmalıdır' });
      }
      if (settings.sessionTimeout && (settings.sessionTimeout < 15 || settings.sessionTimeout > 480)) {
        return res.status(400).json({ message: 'Oturum zaman aşımı 15-480 dakika arasında olmalıdır' });
      }
    }

    // Update settings
    systemSettings[category] = { ...systemSettings[category], ...settings };
    
    // Save to file
    await saveSettings();
    
    res.json({ 
      message: 'Ayarlar başarıyla güncellendi',
      settings: systemSettings[category]
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   GET /api/settings/system-stats
// @desc    Get system statistics
// @access  Private (Admin only)
router.get('/system-stats', auth, requirePermission('canManageSettings'), async (req, res) => {
  try {
    const [totalUsers, totalMaterials, totalTransactions] = await Promise.all([
      User.countDocuments(),
      Material.countDocuments(),
      Transaction.countDocuments()
    ]);
    
    // Calculate database size (simplified)
    const databaseSize = '15.2 MB'; // In production, calculate actual size
    
    // Get last backup date
    let lastBackup = null;
    try {
      const backupDir = path.join(__dirname, '../backups');
      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.startsWith('backup-'));
      if (backupFiles.length > 0) {
        const latestBackup = backupFiles.sort().pop();
        const stats = await fs.stat(path.join(backupDir, latestBackup));
        lastBackup = stats.mtime;
      }
    } catch (error) {
      // Backup directory doesn't exist or no backups
    }
    
    // Calculate system uptime (simplified)
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const systemUptime = `${days} gün, ${hours} saat`;
    
    res.json({
      totalUsers,
      totalMaterials,
      totalTransactions,
      databaseSize,
      lastBackup,
      systemUptime
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// @route   POST /api/settings/backup
// @desc    Create system backup
// @access  Private (Admin only)
router.post('/backup', auth, requirePermission('canManageSettings'), async (req, res) => {
  try {
    // Collect all data
    const [users, materials, transactions] = await Promise.all([
      User.find().select('-password'),
      Material.find(),
      Transaction.find().populate('material', 'name').populate('user', 'name email')
    ]);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: systemSettings,
      data: {
        users,
        materials,
        transactions
      }
    };
    
    // Create backup directory if it doesn't exist
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Generate backup filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `backup-${timestamp}-${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);
    
    // Save backup file
    await fs.writeFile(filepath, JSON.stringify(backupData, null, 2));
    
    // Send file to client
    res.download(filepath, `backup-${timestamp}.json`, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ message: 'Yedek indirme hatası' });
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ message: 'Yedek oluşturma hatası' });
  }
});

// @route   POST /api/settings/restore
// @desc    Restore system from backup
// @access  Private (Admin only)
router.post('/restore', [
  auth,
  requirePermission('canManageSettings'),
  upload.single('backup')
], async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Yedek dosyası gerekli' });
    }
    
    // Read and parse backup file
    const backupData = JSON.parse(await fs.readFile(req.file.path, 'utf8'));
    
    // Validate backup structure
    if (!backupData.data || !backupData.settings) {
      return res.status(400).json({ message: 'Geçersiz yedek dosyası' });
    }
    
    // Clear existing data (in production, use transactions)
    await Promise.all([
      User.deleteMany({ role: { $ne: 'admin' } }), // Keep admin users
      Material.deleteMany({}),
      Transaction.deleteMany({})
    ]);
    
    // Restore data
    if (backupData.data.materials && backupData.data.materials.length > 0) {
      await Material.insertMany(backupData.data.materials);
    }
    
    if (backupData.data.transactions && backupData.data.transactions.length > 0) {
      // Clean transaction data (remove populated fields)
      const cleanTransactions = backupData.data.transactions.map(t => ({
        ...t,
        material: typeof t.material === 'object' ? t.material._id : t.material,
        user: typeof t.user === 'object' ? t.user._id : t.user
      }));
      await Transaction.insertMany(cleanTransactions);
    }
    
    // Restore non-admin users
    if (backupData.data.users && backupData.data.users.length > 0) {
      const nonAdminUsers = backupData.data.users.filter(u => u.role !== 'admin');
      if (nonAdminUsers.length > 0) {
        await User.insertMany(nonAdminUsers);
      }
    }
    
    // Restore settings
    systemSettings = { ...systemSettings, ...backupData.settings };
    await saveSettings();
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);
    
    res.json({ message: 'Sistem başarıyla geri yüklendi' });
  } catch (error) {
    console.error('Restore error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('File cleanup error:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Geri yükleme hatası' });
  }
});

// @route   DELETE /api/settings/logs
// @desc    Clear system logs
// @access  Private (Admin only)
router.delete('/logs', auth, requirePermission('canManageSettings'), async (req, res) => {
  try {
    const logsDir = path.join(__dirname, '../logs');
    
    try {
      const files = await fs.readdir(logsDir);
      await Promise.all(
        files.map(file => fs.unlink(path.join(logsDir, file)))
      );
    } catch (error) {
      // Logs directory doesn't exist or is empty
    }
    
    res.json({ message: 'Sistem logları temizlendi' });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({ message: 'Log temizleme hatası' });
  }
});

// @route   GET /api/settings/export
// @desc    Export specific settings category
// @access  Private (Admin only)
router.get('/export/:category', [
  auth,
  requirePermission('canManageSettings')
], async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!systemSettings[category]) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    const exportData = {
      category,
      settings: systemSettings[category],
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${category}-settings.json"`);
    res.json(exportData);
  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({ message: 'Ayar dışa aktarma hatası' });
  }
});

// @route   POST /api/settings/import/:category
// @desc    Import specific settings category
// @access  Private (Admin only)
router.post('/import/:category', [
  auth,
  requirePermission('canManageSettings'),
  upload.single('settings')
], async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Ayar dosyası gerekli' });
    }
    
    if (!systemSettings[category]) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Read and parse settings file
    const importData = JSON.parse(await fs.readFile(req.file.path, 'utf8'));
    
    // Validate import structure
    if (importData.category !== category || !importData.settings) {
      return res.status(400).json({ message: 'Geçersiz ayar dosyası' });
    }
    
    // Update settings
    systemSettings[category] = { ...systemSettings[category], ...importData.settings };
    
    // Save to file
    await saveSettings();
    
    // Clean up uploaded file
    await fs.unlink(req.file.path);
    
    res.json({ 
      message: `${category} ayarları başarıyla içe aktarıldı`,
      settings: systemSettings[category]
    });
  } catch (error) {
    console.error('Import settings error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('File cleanup error:', unlinkError);
      }
    }
    
    res.status(500).json({ message: 'Ayar içe aktarma hatası' });
  }
});

// @route   POST /api/settings/reset/:category
// @desc    Reset settings category to defaults
// @access  Private (Admin only)
router.post('/reset/:category', [
  auth,
  requirePermission('canManageSettings')
], async (req, res) => {
  try {
    const { category } = req.params;
    
    const defaultSettings = {
      general: {
        companyName: 'Stok Yönetim Sistemi',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        currency: 'TRY',
        language: 'tr',
        timezone: 'Europe/Istanbul',
        dateFormat: 'DD/MM/YYYY',
        numberFormat: 'tr-TR'
      },
      stock: {
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        autoReorderEnabled: false,
        autoReorderQuantity: 50,
        stockValuationMethod: 'FIFO',
        allowNegativeStock: false,
        requireApprovalForAdjustments: true
      },
      notifications: {
        emailNotifications: true,
        lowStockAlerts: true,
        criticalStockAlerts: true,
        newUserRegistration: true,
        systemMaintenance: true,
        dailyReports: false,
        weeklyReports: true,
        monthlyReports: true
      },
      security: {
        passwordMinLength: 6,
        passwordRequireUppercase: false,
        passwordRequireNumbers: false,
        passwordRequireSpecialChars: false,
        sessionTimeout: 60,
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        twoFactorEnabled: false
      }
    };
    
    if (!defaultSettings[category]) {
      return res.status(404).json({ message: 'Kategori bulunamadı' });
    }
    
    // Reset to defaults
    systemSettings[category] = defaultSettings[category];
    
    // Save to file
    await saveSettings();
    
    res.json({ 
      message: `${category} ayarları varsayılan değerlere sıfırlandı`,
      settings: systemSettings[category]
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ message: 'Ayar sıfırlama hatası' });
  }
});

// Export settings for use in other modules
module.exports = {
  router,
  getSettings: () => systemSettings,
  getSetting: (category, key) => {
    return systemSettings[category] ? systemSettings[category][key] : null;
  }
};

// Export router as default
module.exports = router;