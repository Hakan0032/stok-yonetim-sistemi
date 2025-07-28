const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

/**
 * Şifre hash'leme fonksiyonu
 * @param {string} password - Hash'lenecek şifre
 * @returns {Promise<string>} Hash'lenmiş şifre
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Şifre doğrulama fonksiyonu
 * @param {string} password - Kontrol edilecek şifre
 * @param {string} hashedPassword - Hash'lenmiş şifre
 * @returns {Promise<boolean>} Şifre doğru mu?
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * JWT token oluşturma fonksiyonu
 * @param {Object} payload - Token'a eklenecek veri
 * @param {string} expiresIn - Token süresi
 * @returns {string} JWT token
 */
const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE || '7d') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * JWT token doğrulama fonksiyonu
 * @param {string} token - Doğrulanacak token
 * @returns {Object} Decode edilmiş token verisi
 */
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

/**
 * Rastgele string oluşturma fonksiyonu
 * @param {number} length - String uzunluğu
 * @returns {string} Rastgele string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Malzeme kodu oluşturma fonksiyonu
 * @param {string} category - Kategori
 * @param {string} subcategory - Alt kategori
 * @returns {string} Malzeme kodu
 */
const generateMaterialCode = (category, subcategory) => {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const subcategoryCode = subcategory.substring(0, 3).toUpperCase();
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  
  return `${categoryCode}-${subcategoryCode}-${randomCode}-${timestamp}`;
};

/**
 * Dosya boyutu formatı
 * @param {number} bytes - Byte cinsinden boyut
 * @returns {string} Formatlanmış boyut
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Tarih formatı
 * @param {Date} date - Formatlanacak tarih
 * @param {string} format - Format tipi
 * @returns {string} Formatlanmış tarih
 */
const formatDate = (date, format = 'dd/mm/yyyy') => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  switch (format) {
    case 'dd/mm/yyyy':
      return `${day}/${month}/${year}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'dd/mm/yyyy hh:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'relative':
      return getRelativeTime(d);
    default:
      return d.toLocaleDateString('tr-TR');
  }
};

/**
 * Göreceli zaman hesaplama
 * @param {Date} date - Hesaplanacak tarih
 * @returns {string} Göreceli zaman
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Az önce';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} dakika önce`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} saat önce`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} gün önce`;
  } else {
    return formatDate(date, 'dd/mm/yyyy');
  }
};

/**
 * Para formatı
 * @param {number} amount - Miktar
 * @param {string} currency - Para birimi
 * @returns {string} Formatlanmış para
 */
const formatCurrency = (amount, currency = 'TRY') => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

/**
 * Sayı formatı
 * @param {number} number - Formatlanacak sayı
 * @param {number} decimals - Ondalık basamak sayısı
 * @returns {string} Formatlanmış sayı
 */
const formatNumber = (number, decimals = 2) => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

/**
 * Email doğrulama
 * @param {string} email - Doğrulanacak email
 * @returns {boolean} Email geçerli mi?
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Telefon numarası doğrulama
 * @param {string} phone - Doğrulanacak telefon
 * @returns {boolean} Telefon geçerli mi?
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Dosya uzantısı kontrolü
 * @param {string} filename - Dosya adı
 * @param {Array} allowedExtensions - İzin verilen uzantılar
 * @returns {boolean} Uzantı geçerli mi?
 */
const isValidFileExtension = (filename, allowedExtensions) => {
  const extension = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(extension);
};

/**
 * Dosya varlığını kontrol etme
 * @param {string} filePath - Dosya yolu
 * @returns {Promise<boolean>} Dosya var mı?
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Dizin oluşturma
 * @param {string} dirPath - Dizin yolu
 * @returns {Promise<void>}
 */
const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Dosya silme
 * @param {string} filePath - Silinecek dosya yolu
 * @returns {Promise<boolean>} Silme başarılı mı?
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Pagination hesaplama
 * @param {number} page - Sayfa numarası
 * @param {number} limit - Sayfa başına kayıt
 * @param {number} total - Toplam kayıt
 * @returns {Object} Pagination bilgileri
 */
const calculatePagination = (page = 1, limit = 10, total = 0) => {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.max(1, Math.min(100, parseInt(limit)));
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;
  
  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: total,
    skip,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    prevPage: currentPage > 1 ? currentPage - 1 : null
  };
};

/**
 * Hata mesajı formatı
 * @param {Error} error - Hata objesi
 * @returns {Object} Formatlanmış hata
 */
const formatError = (error) => {
  return {
    message: error.message || 'Bilinmeyen hata',
    code: error.code || 'UNKNOWN_ERROR',
    status: error.status || 500,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  };
};

/**
 * API yanıt formatı
 * @param {boolean} success - Başarı durumu
 * @param {string} message - Mesaj
 * @param {*} data - Veri
 * @param {Object} meta - Meta bilgiler
 * @returns {Object} Formatlanmış yanıt
 */
const formatResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  if (meta !== null) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * Slug oluşturma
 * @param {string} text - Slug'a çevrilecek metin
 * @returns {string} Slug
 */
const createSlug = (text) => {
  const turkishChars = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
  };
  
  return text
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, char => turkishChars[char] || char)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateRandomString,
  generateMaterialCode,
  formatFileSize,
  formatDate,
  getRelativeTime,
  formatCurrency,
  formatNumber,
  isValidEmail,
  isValidPhone,
  isValidFileExtension,
  fileExists,
  ensureDirectory,
  deleteFile,
  calculatePagination,
  formatError,
  formatResponse,
  createSlug
};