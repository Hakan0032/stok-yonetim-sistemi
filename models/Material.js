const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Malzeme kodu gerekli'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Malzeme adı gerekli'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Kategori gerekli'],
    enum: {
      values: ['otomasyon', 'pano', 'elektrik', 'mekanik', 'yedek_parca'],
      message: 'Geçersiz kategori'
    }
  },
  subcategory: {
    type: String,
    required: [true, 'Alt kategori gerekli']
  },
  unit: {
    type: String,
    required: [true, 'Birim gerekli'],
    enum: {
      values: ['adet', 'metre', 'kg', 'litre', 'paket', 'kutu'],
      message: 'Geçersiz birim'
    }
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Miktar negatif olamaz']
  },
  minStock: {
    type: Number,
    required: true,
    default: 10,
    min: [0, 'Minimum stok negatif olamaz']
  },
  maxStock: {
    type: Number,
    required: true,
    default: 1000,
    validate: {
      validator: function(v) {
        return v >= this.minStock;
      },
      message: 'Maksimum stok minimum stoktan küçük olamaz'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Birim fiyat gerekli'],
    min: [0, 'Fiyat negatif olamaz']
  },
  currency: {
    type: String,
    default: 'TRY',
    enum: ['TRY', 'USD', 'EUR']
  },
  supplier: {
    name: {
      type: String,
      required: [true, 'Tedarikçi adı gerekli']
    },
    contact: String,
    email: {
      type: String,
      lowercase: true
    },
    phone: String,
    address: String
  },
  location: {
    warehouse: {
      type: String,
      required: [true, 'Depo bilgisi gerekli'],
      default: 'Ana Depo'
    },
    shelf: String,
    position: String
  },
  specifications: {
    brand: String,
    model: String,
    voltage: String,
    power: String,
    dimensions: String,
    weight: String,
    color: String,
    material: String,
    certification: [String]
  },
  images: [{
    url: String,
    description: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  documents: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['datasheet', 'manual', 'certificate', 'warranty']
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  tags: [String],
  notes: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// İndeksler
materialSchema.index({ code: 1 });
materialSchema.index({ name: 'text', category: 1 });
materialSchema.index({ category: 1, subcategory: 1 });
materialSchema.index({ quantity: 1, minStock: 1 });

// Virtual alanlar
materialSchema.virtual('totalValue').get(function() {
  return this.quantity * this.unitPrice;
});

materialSchema.virtual('stockStatus').get(function() {
  if (this.quantity <= 0) return 'out_of_stock';
  if (this.quantity <= this.minStock) return 'low_stock';
  if (this.quantity >= this.maxStock) return 'overstock';
  return 'normal';
});

// Middleware
materialSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

module.exports = mongoose.model('Material', materialSchema);