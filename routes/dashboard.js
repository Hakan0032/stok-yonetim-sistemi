const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// Dashboard ana verileri
router.get('/', auth, async (req, res) => {
  try {
    // Stok özeti
    const stockSummary = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0]
            }
          },
          outOfStockCount: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Genel istatistikler
    const generalStats = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalMaterials: { $sum: 1 },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } },
          totalLowStock: {
            $sum: {
              $cond: [{ $lte: ['$quantity', '$minStock'] }, 1, 0]
            }
          },
          totalOutOfStock: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          }
        }
      }
    ]);
    
    // Son 30 günün işlem istatistikleri
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo },
          status: 'completed'
        }
      },
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
    
    // Bugünün işlemleri
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTransactions = await Transaction.find({
      date: { $gte: today, $lt: tomorrow },
      status: 'completed'
    })
    .populate('materialId', 'code name')
    .populate('user.id', 'username')
    .sort({ date: -1 })
    .limit(10);
    
    // Kritik stok uyarıları
    const criticalStock = await Material.find({
      status: 'active',
      $expr: { $lte: ['$quantity', '$minStock'] }
    })
    .sort({ quantity: 1 })
    .limit(10)
    .select('code name quantity minStock unit category');
    
    // Stok sıfır olan malzemeler
    const outOfStock = await Material.find({
      status: 'active',
      quantity: 0
    })
    .limit(10)
    .select('code name category unit');
    
    res.json({
      stockSummary,
      generalStats: generalStats[0] || {
        totalMaterials: 0,
        totalValue: 0,
        totalLowStock: 0,
        totalOutOfStock: 0
      },
      recentTransactions,
      todayTransactions,
      criticalStock,
      outOfStock
    });
    
  } catch (error) {
    console.error('Dashboard verileri hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Stok trend analizi
router.get('/trends', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Günlük stok hareketleri
    const stockMovements = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          totalQuantity: { $sum: { $abs: '$quantity' } },
          totalValue: { $sum: '$totalValue' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);
    
    // Kategori bazlı harcama analizi
    const categorySpending = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate },
          status: 'completed',
          type: 'in'
        }
      },
      {
        $lookup: {
          from: 'materials',
          localField: 'materialId',
          foreignField: '_id',
          as: 'material'
        }
      },
      { $unwind: '$material' },
      {
        $group: {
          _id: '$material.category',
          totalSpent: { $sum: '$totalValue' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);
    
    res.json({
      stockMovements,
      categorySpending
    });
    
  } catch (error) {
    console.error('Trend analizi hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Performans metrikleri
router.get('/performance', auth, async (req, res) => {
  try {
    // Stok devir hızı (son 3 ay)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const stockTurnover = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: threeMonthsAgo },
          status: 'completed',
          type: 'out'
        }
      },
      {
        $group: {
          _id: '$materialId',
          totalOut: { $sum: { $abs: '$quantity' } },
          avgPrice: { $avg: '$unitPrice' }
        }
      },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'material'
        }
      },
      { $unwind: '$material' },
      {
        $project: {
          materialCode: '$material.code',
          materialName: '$material.name',
          currentStock: '$material.quantity',
          totalOut: 1,
          turnoverRate: {
            $cond: [
              { $gt: ['$material.quantity', 0] },
              { $divide: ['$totalOut', '$material.quantity'] },
              0
            ]
          }
        }
      },
      { $sort: { turnoverRate: -1 } },
      { $limit: 20 }
    ]);
    
    // En aktif kullanıcılar
    const activeUsers = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: threeMonthsAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$user.id',
          userName: { $first: '$user.name' },
          transactionCount: { $sum: 1 },
          totalValue: { $sum: '$totalValue' }
        }
      },
      { $sort: { transactionCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      stockTurnover,
      activeUsers
    });
    
  } catch (error) {
    console.error('Performans metrikleri hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;