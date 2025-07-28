const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'İşlem tipi gereklidir'],
    enum: {
      values: ['in', 'out', 'transfer', 'adjustment'],
      message: 'Geçersiz işlem tipi'
    }
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: [true, 'Malzeme ID gereklidir']
  },
  quantity: {
    type: Number,
    required: [true, 'Miktar gereklidir'],
    min: [0.01, 'Miktar pozitif olmalıdır']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Birim fiyat gereklidir'],
    min: [0, 'Birim fiyat negatif olamaz']
  },
  totalValue: {
    type: Number,
    required: [true, 'Toplam değer gereklidir']
  },
  reference: {
    type: String,
    required: [true, 'Referans gereklidir'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  project: {
    name: {
      type: String,
      trim: true
    },
    code: {
      type: String,
      trim: true
    },
    manager: {
      type: String,
      trim: true
    }
  },
  supplier: {
    name: {
      type: String,
      trim: true
    },
    invoice: {
      type: String,
      trim: true
    },
    date: {
      type: Date
    }
  },
  location: {
    from: {
      warehouse: String,
      shelf: String,
      position: String
    },
    to: {
      warehouse: String,
      shelf: String,
      position: String
    }
  },
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Kullanıcı ID gereklidir']
    },
    name: {
      type: String,
      required: [true, 'Kullanıcı adı gereklidir'],
      trim: true
    }
  },
  date: {
    type: Date,
    default: Date.now,
    required: [true, 'Tarih gereklidir']
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'cancelled'],
      message: 'Geçersiz durum'
    },
    default: 'completed'
  },
  notes: {
    type: String,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String
  }]
}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ materialId: 1, date: -1 });
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ 'user.id': 1, date: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ date: -1 });

// Pre-save middleware to calculate total value
transactionSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitPrice')) {
    this.totalValue = this.quantity * this.unitPrice;
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);