const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation hatası',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUser = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('İsim 2-50 karakter arasında olmalıdır'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Geçerli bir email adresi giriniz'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Şifre en az 6 karakter olmalıdır')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Şifre en az bir küçük harf, bir büyük harf ve bir rakam içermelidir'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'user'])
      .withMessage('Geçersiz rol'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Departman en fazla 50 karakter olabilir'),
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Geçersiz kullanıcı ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('İsim 2-50 karakter arasında olmalıdır'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Geçerli bir email adresi giriniz'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'user'])
      .withMessage('Geçersiz rol'),
    body('department')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Departman en fazla 50 karakter olabilir'),
    handleValidationErrors
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Geçerli bir email adresi giriniz'),
    body('password')
      .notEmpty()
      .withMessage('Şifre gereklidir'),
    handleValidationErrors
  ]
};

// Material validation rules
const validateMaterial = {
  create: [
    body('code')
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Malzeme kodu 2-20 karakter arasında olmalıdır')
      .matches(/^[A-Z0-9-_]+$/)
      .withMessage('Malzeme kodu sadece büyük harf, rakam, tire ve alt çizgi içerebilir'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Malzeme adı 2-100 karakter arasında olmalıdır'),
    body('category')
      .isIn(['otomasyon', 'pano', 'elektrik', 'mekanik'])
      .withMessage('Geçersiz kategori'),
    body('subcategory')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Alt kategori 1-50 karakter arasında olmalıdır'),
    body('unit')
      .isIn(['adet', 'metre', 'kg', 'litre', 'paket', 'kutu'])
      .withMessage('Geçersiz birim'),
    body('quantity')
      .isFloat({ min: 0 })
      .withMessage('Miktar 0 veya pozitif bir sayı olmalıdır'),
    body('minStock')
      .isFloat({ min: 0 })
      .withMessage('Minimum stok 0 veya pozitif bir sayı olmalıdır'),
    body('maxStock')
      .isFloat({ min: 0 })
      .withMessage('Maksimum stok 0 veya pozitif bir sayı olmalıdır')
      .custom((value, { req }) => {
        if (value < req.body.minStock) {
          throw new Error('Maksimum stok minimum stoktan küçük olamaz');
        }
        return true;
      }),
    body('unitPrice')
      .isFloat({ min: 0 })
      .withMessage('Birim fiyat 0 veya pozitif bir sayı olmalıdır'),
    body('supplier.name')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Tedarikçi adı en fazla 100 karakter olabilir'),
    body('supplier.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Geçerli bir email adresi giriniz'),
    body('location.warehouse')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Depo adı en fazla 50 karakter olabilir'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'discontinued'])
      .withMessage('Geçersiz durum'),
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Geçersiz malzeme ID'),
    body('code')
      .optional()
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Malzeme kodu 2-20 karakter arasında olmalıdır')
      .matches(/^[A-Z0-9-_]+$/)
      .withMessage('Malzeme kodu sadece büyük harf, rakam, tire ve alt çizgi içerebilir'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Malzeme adı 2-100 karakter arasında olmalıdır'),
    body('category')
      .optional()
      .isIn(['otomasyon', 'pano', 'elektrik', 'mekanik'])
      .withMessage('Geçersiz kategori'),
    body('unit')
      .optional()
      .isIn(['adet', 'metre', 'kg', 'litre', 'paket', 'kutu'])
      .withMessage('Geçersiz birim'),
    body('quantity')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Miktar 0 veya pozitif bir sayı olmalıdır'),
    body('unitPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Birim fiyat 0 veya pozitif bir sayı olmalıdır'),
    handleValidationErrors
  ]
};

// Transaction validation rules
const validateTransaction = {
  create: [
    body('type')
      .isIn(['in', 'out', 'transfer', 'adjustment'])
      .withMessage('Geçersiz işlem tipi'),
    body('materialId')
      .isMongoId()
      .withMessage('Geçersiz malzeme ID'),
    body('quantity')
      .isFloat({ min: 0.01 })
      .withMessage('Miktar pozitif bir sayı olmalıdır'),
    body('unitPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Birim fiyat 0 veya pozitif bir sayı olmalıdır'),
    body('reference')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Referans en fazla 50 karakter olabilir'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Açıklama en fazla 500 karakter olabilir'),
    body('project')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Proje adı en fazla 100 karakter olabilir'),
    body('supplier')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Tedarikçi adı en fazla 100 karakter olabilir'),
    handleValidationErrors
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Geçersiz işlem ID'),
    body('status')
      .optional()
      .isIn(['pending', 'completed', 'cancelled'])
      .withMessage('Geçersiz durum'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Açıklama en fazla 500 karakter olabilir'),
    handleValidationErrors
  ]
};

// Query validation rules
const validateQuery = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Sayfa numarası pozitif bir tamsayı olmalıdır'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit 1-100 arasında olmalıdır'),
    handleValidationErrors
  ],
  
  search: [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Arama terimi 1-100 karakter arasında olmalıdır'),
    query('category')
      .optional()
      .isIn(['otomasyon', 'pano', 'elektrik', 'mekanik'])
      .withMessage('Geçersiz kategori'),
    query('status')
      .optional()
      .isIn(['active', 'inactive', 'discontinued'])
      .withMessage('Geçersiz durum'),
    handleValidationErrors
  ]
};

// ID parameter validation
const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Geçersiz ID formatı'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateMaterial,
  validateTransaction,
  validateQuery,
  validateId
};