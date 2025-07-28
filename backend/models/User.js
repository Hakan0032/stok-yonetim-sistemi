const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'İsim gerekli'],
    trim: true,
    maxlength: [50, 'İsim 50 karakterden fazla olamaz']
  },
  email: {
    type: String,
    required: [true, 'Email gerekli'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir email adresi girin']
  },
  password: {
    type: String,
    required: [true, 'Şifre gerekli'],
    minlength: [6, 'Şifre en az 6 karakter olmalı']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  preferences: {
    language: {
      type: String,
      default: 'tr'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      lowStock: {
        type: Boolean,
        default: true
      },
      transactions: {
        type: Boolean,
        default: false
      }
    }
  },
  department: {
    type: String,
    enum: ['production', 'warehouse', 'management', 'maintenance'],
    default: 'warehouse'
  },
  permissions: {
    canViewReports: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: false
    },
    canManageStock: {
      type: Boolean,
      default: true
    },
    canExportData: {
      type: Boolean,
      default: false
    },
    canManageSettings: {
      type: Boolean,
      default: false
    }
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for user's full profile
UserSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    isActive: this.isActive,
    lastLogin: this.lastLogin,
    createdAt: this.createdAt
  };
});

// Method to check if user has specific permission
UserSchema.methods.hasPermission = function(permission) {
  if (this.role === 'admin') return true;
  return this.permissions[permission] || false;
};

// Method to get user's accessible features based on role
UserSchema.methods.getAccessibleFeatures = function() {
  const features = {
    dashboard: true,
    materials: this.permissions.canManageStock,
    transactions: this.permissions.canManageStock,
    reports: this.permissions.canViewReports,
    users: this.permissions.canManageUsers,
    export: this.permissions.canExportData
  };

  // Admin has access to everything
  if (this.role === 'admin') {
    Object.keys(features).forEach(key => {
      features[key] = true;
    });
  }

  return features;
};

// Static method to get users by role
UserSchema.statics.getUsersByRole = function(role) {
  return this.find({ role, isActive: true }).select('-password');
};

// Static method to get active users count
UserSchema.statics.getActiveUsersCount = function() {
  return this.countDocuments({ isActive: true });
};

module.exports = mongoose.model('User', UserSchema);