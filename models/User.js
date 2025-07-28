const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Kullanıcı adı gerekli'],
    unique: true,
    trim: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalı'],
    maxlength: [20, 'Kullanıcı adı en fazla 20 karakter olmalı']
  },
  email: {
    type: String,
    required: [true, 'E-posta gerekli'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Geçersiz e-posta adresi']
  },
  password: {
    type: String,
    required: [true, 'Şifre gerekli'],
    minlength: [6, 'Şifre en az 6 karakter olmalı']
  },
  firstName: {
    type: String,
    required: [true, 'Ad gerekli'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyad gerekli'],
    trim: true
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'manager', 'operator', 'viewer'],
      message: 'Geçersiz rol'
    },
    default: 'operator'
  },
  department: {
    type: String,
    enum: ['production', 'warehouse', 'maintenance', 'quality', 'management'],
    required: [true, 'Departman gerekli']
  },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || validator.isMobilePhone(v, 'tr-TR');
      },
      message: 'Geçersiz telefon numarası'
    }
  },
  avatar: {
    type: String,
    default: ''
  },
  permissions: {
    materials: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    transactions: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    reports: {
      view: { type: Boolean, default: true },
      export: { type: Boolean, default: false }
    },
    users: {
      manage: { type: Boolean, default: false }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, {
  timestamps: true
});

// Virtual alanlar
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// İndeksler
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Middleware - Şifre hashleme
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Şifre karşılaştırma metodu
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Giriş denemesi artırma
userSchema.methods.incLoginAttempts = function() {
  // Eğer önceki kilit süresi geçmişse, sayacı sıfırla
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // 5 başarısız denemeden sonra 2 saat kilitle
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Başarılı giriş sonrası sıfırlama
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

module.exports = mongoose.model('User', userSchema);