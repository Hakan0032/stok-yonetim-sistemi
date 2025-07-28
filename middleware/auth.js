const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT token doğrulama middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Erişim reddedildi. Token bulunamadı.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mermer_stok_secret_key');
    
    // Kullanıcının hala aktif olup olmadığını kontrol et
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Geçersiz token veya kullanıcı aktif değil.' });
    }
    
    req.user = {
      userId: user._id,
      username: user.username,
      role: user.role,
      department: user.department,
      permissions: user.permissions
    };
    
    next();
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    res.status(401).json({ message: 'Geçersiz token.' });
  }
};

// Rol bazlı yetkilendirme middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Kimlik doğrulama gerekli.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Bu işlem için yetkiniz bulunmuyor.' 
      });
    }
    
    next();
  };
};

// İzin bazlı yetkilendirme middleware
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Kimlik doğrulama gerekli.' });
    }
    
    const hasPermission = req.user.permissions[resource] && 
                         req.user.permissions[resource][action];
    
    if (!hasPermission) {
      return res.status(403).json({ 
        message: `${resource} ${action} işlemi için yetkiniz bulunmuyor.` 
      });
    }
    
    next();
  };
};

module.exports = {
  auth,
  authorize,
  checkPermission
};