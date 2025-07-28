const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Authentication middleware - TEMPORARILY DISABLED
const auth = async (req, res, next) => {
  // Bypass authentication for testing
  req.user = {
    id: '60f1f77bcf86cd799439011a',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin'
  };
  req.userDetails = {
    _id: '60f1f77bcf86cd799439011a',
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    isActive: true
  };
  next();
};

// Admin authorization middleware
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    }
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Manager or Admin authorization middleware
const managerAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Yönetici yetkisi gerekli' });
    }
    next();
  } catch (err) {
    console.error('Manager auth error:', err.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Kullanıcı bulunamadı' });
      }
      
      if (!user.hasPermission(permission)) {
        return res.status(403).json({ 
          message: `Bu işlem için ${permission} yetkisi gerekli` 
        });
      }
      
      next();
    } catch (err) {
      console.error('Permission auth error:', err.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  };
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (user && user.isActive) {
        req.user = decoded.user;
        req.userDetails = user;
      }
    }
    
    next();
  } catch (err) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Rate limiting for sensitive operations
const sensitiveOpAuth = async (req, res, next) => {
  try {
    // Additional checks for sensitive operations
    const user = await User.findById(req.user.id);
    
    // Check if user has been active recently
    const lastActivity = user.lastLogin;
    const now = new Date();
    const timeDiff = now - lastActivity;
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return res.status(401).json({ 
        message: 'Güvenlik nedeniyle tekrar giriş yapmanız gerekiyor' 
      });
    }
    
    next();
  } catch (err) {
    console.error('Sensitive operation auth error:', err.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

module.exports = {
  auth,
  adminAuth,
  managerAuth,
  requirePermission,
  optionalAuth,
  sensitiveOpAuth
};