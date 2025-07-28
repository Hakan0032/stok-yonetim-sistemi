const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Kullanıcı kaydı
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, department } = req.body;
    
    // Kullanıcı zaten var mı kontrol et
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        message: 'Bu e-posta veya kullanıcı adı zaten kullanımda'
      });
    }
    
    // Yeni kullanıcı oluştur
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role: role || 'operator',
      department
    });
    
    // Rol bazlı izinleri ayarla
    switch (user.role) {
      case 'admin':
        user.permissions = {
          materials: { create: true, read: true, update: true, delete: true },
          transactions: { create: true, read: true, update: true, delete: true },
          reports: { view: true, export: true },
          users: { manage: true }
        };
        break;
      case 'manager':
        user.permissions = {
          materials: { create: true, read: true, update: true, delete: false },
          transactions: { create: true, read: true, update: true, delete: false },
          reports: { view: true, export: true },
          users: { manage: false }
        };
        break;
      case 'operator':
        user.permissions = {
          materials: { create: false, read: true, update: true, delete: false },
          transactions: { create: true, read: true, update: false, delete: false },
          reports: { view: true, export: false },
          users: { manage: false }
        };
        break;
      default:
        // viewer için varsayılan izinler zaten ayarlanmış
        break;
    }
    
    await user.save();
    
    // JWT token oluştur
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'mermer_stok_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        permissions: user.permissions
      }
    });
    
  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcı girişi
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        message: 'Kullanıcı adı ve şifre gerekli'
      });
    }
    
    // Kullanıcıyı bul (username veya email ile)
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
      isActive: true
    });
    
    if (!user) {
      return res.status(401).json({
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }
    
    // Hesap kilitli mi kontrol et
    if (user.isLocked) {
      return res.status(423).json({
        message: 'Hesap geçici olarak kilitlendi. Lütfen daha sonra tekrar deneyin.'
      });
    }
    
    // Şifre kontrolü
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      return res.status(401).json({
        message: 'Geçersiz kullanıcı adı veya şifre'
      });
    }
    
    // Başarılı giriş
    await user.resetLoginAttempts();
    
    // JWT token oluştur
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'mermer_stok_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Kullanıcı bilgilerini getir
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
    
  } catch (error) {
    console.error('Kullanıcı bilgisi getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Şifre değiştirme
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Mevcut şifre ve yeni şifre gerekli'
      });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    // Mevcut şifre kontrolü
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        message: 'Mevcut şifre yanlış'
      });
    }
    
    // Yeni şifre uzunluk kontrolü
    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Yeni şifre en az 6 karakter olmalı'
      });
    }
    
    // Şifreyi güncelle
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Şifre başarıyla değiştirildi' });
    
  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Çıkış (token blacklist için genişletilebilir)
router.post('/logout', auth, (req, res) => {
  res.json({ message: 'Başarıyla çıkış yapıldı' });
});

module.exports = router;