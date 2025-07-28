const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const { auth, checkPermission } = require('../middleware/auth');

// Tüm işlemleri getir
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      type,
      materialId,
      startDate,
      endDate,
      userId,
      reference,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Filtre objesi oluştur
    const filter = {};
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (materialId) {
      filter.materialId = materialId;
    }
    
    if (userId) {
      filter['user.id'] = userId;
    }
    
    if (reference) {
      filter.reference = { $regex: reference, $options: 'i' };
    }
    
    // Tarih aralığı filtresi
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    // Sıralama objesi
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Sayfalama hesaplamaları
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verileri getir
    const transactions = await Transaction.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('materialId', 'code name unit category')
      .populate('user.id', 'username fullName');
    
    // Toplam sayı
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      transactions,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('İşlemler getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Tek işlem getir
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('materialId')
      .populate('user.id', 'username fullName')
      .populate('approvedBy', 'username fullName');
    
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    
    res.json(transaction);
    
  } catch (error) {
    console.error('İşlem getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// İşlem güncelle
router.put('/:id', auth, checkPermission('transactions', 'update'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    
    // Sadece pending durumundaki işlemler güncellenebilir
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        message: 'Sadece bekleyen işlemler güncellenebilir'
      });
    }
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('materialId', 'code name unit');
    
    res.json({
      message: 'İşlem başarıyla güncellendi',
      transaction: updatedTransaction
    });
    
  } catch (error) {
    console.error('İşlem güncelleme hatası:', error);
    res.status(400).json({
      message: error.message || 'İşlem güncellenirken hata oluştu'
    });
  }
});

// İşlem iptal et
router.patch('/:id/cancel', auth, checkPermission('transactions', 'update'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    
    if (transaction.status === 'cancelled') {
      return res.status(400).json({ message: 'İşlem zaten iptal edilmiş' });
    }
    
    // Eğer işlem tamamlanmışsa, stok düzeltmesi yap
    if (transaction.status === 'completed') {
      const material = await Material.findById(transaction.materialId);
      
      if (material) {
        if (transaction.type === 'in') {
          material.quantity -= transaction.quantity;
        } else if (transaction.type === 'out') {
          material.quantity += transaction.quantity;
        }
        await material.save();
      }
    }
    
    transaction.status = 'cancelled';
    await transaction.save();
    
    res.json({
      message: 'İşlem başarıyla iptal edildi',
      transaction
    });
    
  } catch (error) {
    console.error('İşlem iptal hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// İşlem onaylama
router.patch('/:id/approve', auth, checkPermission('transactions', 'update'), async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        message: 'Sadece bekleyen işlemler onaylanabilir'
      });
    }
    
    // Stok kontrolü (çıkış işlemleri için)
    if (transaction.type === 'out') {
      const material = await Material.findById(transaction.materialId);
      
      if (!material) {
        return res.status(404).json({ message: 'Malzeme bulunamadı' });
      }
      
      if (material.quantity < transaction.quantity) {
        return res.status(400).json({
          message: `Yetersiz stok! Mevcut: ${material.quantity} ${material.unit}`
        });
      }
      
      // Stok güncelle
      material.quantity -= transaction.quantity;
      await material.save();
    } else if (transaction.type === 'in') {
      // Giriş işlemi için stok artır
      const material = await Material.findById(transaction.materialId);
      
      if (material) {
        material.quantity += transaction.quantity;
        await material.save();
      }
    }
    
    transaction.status = 'completed';
    transaction.approvedBy = req.user.userId;
    transaction.approvalDate = new Date();
    await transaction.save();
    
    res.json({
      message: 'İşlem başarıyla onaylandı',
      transaction
    });
    
  } catch (error) {
    console.error('İşlem onaylama hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// İşlem istatistikleri
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Tarih aralığı filtresi
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.date.$lte = new Date(endDate);
      }
    }
    
    const stats = await Transaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: { $abs: '$quantity' } }
        }
      }
    ]);
    
    // Günlük işlem sayıları
    const dailyStats = await Transaction.aggregate([
      { $match: { status: 'completed', ...dateFilter } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    res.json({
      summary: stats,
      daily: dailyStats
    });
    
  } catch (error) {
    console.error('İşlem istatistikleri hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// En çok kullanılan malzemeler
router.get('/stats/top-materials', auth, async (req, res) => {
  try {
    const { limit = 10, type = 'out' } = req.query;
    
    const topMaterials = await Transaction.aggregate([
      { $match: { type, status: 'completed' } },
      {
        $group: {
          _id: '$materialId',
          totalQuantity: { $sum: { $abs: '$quantity' } },
          totalValue: { $sum: '$totalValue' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material'
        }
      },
      { $unwind: '$material' }
    ]);
    
    res.json(topMaterials);
    
  } catch (error) {
    console.error('En çok kullanılan malzemeler hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;