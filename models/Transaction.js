const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  type: {
    type: String,
    required: [true, 'İşlem tipi gerekli'],
    enum: {
      values: ['in', 'out', 'transfer', 'adjustment', 'return'],
      message: 'Geçersiz işlem tipi'
    }
  },
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: [true, 'Malzeme ID gerekli']
  },
  quantity: {
    type: Number,
    required: [true, 'Miktar gerekli'],
    validate: {
      validator: function(v) {
        return v !== 0;
      },
      message: 'Miktar sıfır olamaz'
    }
  },
  unitPrice: {
    type: Number,
    required: [true, 'Birim fiyat gerekli'],
    min: [0, 'Fiyat negatif olamaz']
  },
  totalValue: {
    type: Number,
    required: true
  },
  reference: {
    type: String,
    required: [true, 'Referans numarası gerekli']
  },
  description: {
    type: String,
    maxlength: [500, 'Açıklama 500 karakterden uzun olamaz']
  },
  project: {
    name: String,
    code: String,
    manager: String
  },
  machine: {
    serialNumber: String,
    model: String,
    location: String
  },
  supplier: {
    name: String,
    invoiceNumber: String,
    invoiceDate: Date
  },
  customer: {
    name: String,
    orderNumber: String,
    deliveryDate: Date
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
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: String
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'approved'],
    default: 'completed'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// İndeksler
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ materialId: 1, date: -1 });
transactionSchema.index({ type: 1, date: -1 });
transactionSchema.index({ 'user.id': 1, date: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ date: -1 });

// Middleware - İşlem ID otomatik oluşturma
transactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const prefix = `${this.type.toUpperCase()}-${year}${month}${day}`;
    
    // Aynı gün içindeki son işlem numarasını bul
    const lastTransaction = await this.constructor
      .findOne({ transactionId: new RegExp(`^${prefix}`) })
      .sort({ transactionId: -1 });
    
    let sequence = 1;
    if (lastTransaction) {
      const lastSequence = parseInt(lastTransaction.transactionId.split('-').pop());
      sequence = lastSequence + 1;
    }
    
    this.transactionId = `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
  
  // Toplam değeri hesapla
  this.totalValue = Math.abs(this.quantity) * this.unitPrice;
  
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);