const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Malzeme kodu gereklidir'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Malzeme adı gereklidir'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Kategori gereklidir'],
    enum: {
      values: ['otomasyon', 'pano', 'elektrik', 'mekanik'],
      message: 'Geçersiz kategori'
    }
  },
  subcategory: {
    type: String,
    required: [true, 'Alt kategori gereklidir'],
    trim: true
  },
  unit: {
    type: String,
    required: [true, 'Birim gereklidir'],
    enum: {
      values: ['adet', 'metre', 'kg', 'litre', 'paket', 'kutu'],
      message: 'Geçersiz birim'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Miktar gereklidir'],
    min: [0, 'Miktar negatif olamaz'],
    default: 0
  },
  minStock: {
    type: Number,
    required: [true, 'Minimum stok gereklidir'],
    min: [0, 'Minimum stok negatif olamaz'],
    default: 10
  },
  maxStock: {
    type: Number,
    required: [true, 'Maksimum stok gereklidir'],
    min: [0, 'Maksimum stok negatif olamaz'],
    default: 1000,
    validate: {
      validator: function(value) {
        return value >= this.minStock;
      },
      message: 'Maksimum stok minimum stoktan küçük olamaz'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Birim fiyat gereklidir'],
    min: [0, 'Birim fiyat negatif olamaz']
  },
  supplier: {
    name: {
      type: String,
      trim: true
    },
    contact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  location: {
    warehouse: {
      type: String,
      trim: true,
      default: 'Ana Depo'
    },
    shelf: {
      type: String,
      trim: true
    },
    position: {
      type: String,
      trim: true
    }
  },
  specifications: {
    brand: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    voltage: {
      type: String,
      trim: true
    },
    power: {
      type: String,
      trim: true
    },
    dimensions: {
      type: String,
      trim: true
    },
    weight: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      trim: true
    },
    material: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'discontinued'],
      message: 'Geçersiz durum'
    },
    default: 'active'
  },
  barcode: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total value
materialSchema.virtual('totalValue').get(function() {
  return this.quantity * this.unitPrice;
});

// Virtual for stock status
materialSchema.virtual('stockStatus').get(function() {
  if (this.quantity <= this.minStock) {
    return 'critical';
  } else if (this.quantity <= this.minStock * 1.5) {
    return 'low';
  } else {
    return 'normal';
  }
});

// Indexes
materialSchema.index({ code: 1 });
materialSchema.index({ name: 'text', description: 'text' });
materialSchema.index({ category: 1, subcategory: 1 });
materialSchema.index({ quantity: 1, minStock: 1 });

// Pre-save middleware
materialSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Material', materialSchema);