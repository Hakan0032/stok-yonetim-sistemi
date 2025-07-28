const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth, checkPermission } = require('../middleware/auth');

// Stok durumu raporu
router.get('/stock-status', auth, checkPermission('reports', 'view'), async (req, res) => {
  try {
    const { category, warehouse, format = 'json' } = req.query;
    
    const filter = { status: 'active' };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (warehouse && warehouse !== 'all') {
      filter['location.warehouse'] = warehouse;
    }
    
    const stockReport = await Material.find(filter)
      .select('code name category quantity minStock maxStock unitPrice unit location supplier')
      .sort({ category: 1, name: 1 });
    
    // Stok durumu hesapla
    const reportData = stockReport.map(material => ({
      ...material.toObject(),
      totalValue: material.quantity * material.unitPrice,
      stockStatus: material.stockStatus,
      daysOfStock: material.quantity > 0 ? Math.floor(material.quantity / (material.minStock / 30)) : 0
    }));
    
    // Özet istatistikler
    const summary = {
      totalItems: reportData.length,
      totalValue: reportData.reduce((sum, item) => sum + item.totalValue, 0),
      lowStockItems: reportData.filter(item => item.stockStatus === 'low_stock').length,
      outOfStockItems: reportData.filter(item => item.stockStatus === 'out_of_stock').length,
      overstockItems: reportData.filter(item => item.stockStatus === 'overstock').length
    };
    
    if (format === 'csv') {
      // CSV formatında döndür
      const csv = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stok-durumu.csv');
      return res.send(csv);
    }
    
    res.json({
      data: reportData,
      summary,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Stok durumu raporu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Stok hareket raporu
router.get('/stock-movements', auth, checkPermission('reports', 'view'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      materialId,
      type,
      category,
      format = 'json'
    } = req.query;
    
    const filter = { status: 'completed' };
    
    // Tarih aralığı
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    if (type && type !== 'all') {
      filter.type = type;
    }
    
    if (materialId) {
      filter.materialId = materialId;
    }
    
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'materials',
          localField: 'materialId',
          foreignField: '_id',
          as: 'material'
        }
      },
      { $unwind: '$material' }
    ];
    
    if (category && category !== 'all') {
      pipeline.push({
        $match: { 'material.category': category }
      });
    }
    
    pipeline.push(
      {
        $project: {
          transactionId: 1,
          date: 1,
          type: 1,
          quantity: 1,
          unitPrice: 1,
          totalValue: 1,
          reference: 1,
          description: 1,
          'user.name': 1,
          'material.code': 1,
          'material.name': 1,
          'material.category': 1,
          'material.unit': 1
        }
      },
      { $sort: { date: -1 } }
    );
    
    const movements = await Transaction.aggregate(pipeline);
    
    // Özet istatistikler
    const summary = {
      totalTransactions: movements.length,
      totalValue: movements.reduce((sum, item) => sum + item.totalValue, 0),
      inTransactions: movements.filter(item => item.type === 'in').length,
      outTransactions: movements.filter(item => item.type === 'out').length,
      adjustments: movements.filter(item => item.type === 'adjustment').length
    };
    
    if (format === 'csv') {
      const csv = convertToCSV(movements);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stok-hareketleri.csv');
      return res.send(csv);
    }
    
    res.json({
      data: movements,
      summary,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Stok hareket raporu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Maliyet analizi raporu
router.get('/cost-analysis', auth, checkPermission('reports', 'view'), async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    
    const filter = {
      status: 'completed',
      type: 'in'
    };
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    let pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'materials',
          localField: 'materialId',
          foreignField: '_id',
          as: 'material'
        }
      },
      { $unwind: '$material' }
    ];
    
    if (category && category !== 'all') {
      pipeline.push({
        $match: { 'material.category': category }
      });
    }
    
    // Kategori bazlı maliyet analizi
    const categoryAnalysis = await Transaction.aggregate([
      ...pipeline,
      {
        $group: {
          _id: '$material.category',
          totalSpent: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$unitPrice' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);
    
    // Tedarikçi bazlı analiz
    const supplierAnalysis = await Transaction.aggregate([
      ...pipeline,
      {
        $group: {
          _id: '$material.supplier.name',
          totalSpent: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' },
          avgPrice: { $avg: '$unitPrice' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);
    
    // Aylık harcama trendi
    const monthlyTrend = await Transaction.aggregate([
      ...pipeline,
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          totalSpent: { $sum: '$totalValue' },
          transactionCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    res.json({
      categoryAnalysis,
      supplierAnalysis,
      monthlyTrend,
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('Maliyet analizi raporu hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// ABC analizi
router.get('/abc-analysis', auth, checkPermission('reports', 'view'), async (req, res) => {
  try {
    const { months = 12 } = req.query;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    
    // Malzeme bazlı kullanım analizi
    const materialUsage = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate },
          status: 'completed',
          type: 'out'
        }
      },
      {
        $group: {
          _id: '$materialId',
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: { $abs: '$quantity' } },
          transactionCount: { $sum: 1 }
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
          code: '$material.code',
          name: '$material.name',
          category: '$material.category',
          currentStock: '$material.quantity',
          totalValue: 1,
          totalQuantity: 1,
          transactionCount: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);
    
    // ABC sınıflandırması
    const totalValue = materialUsage.reduce((sum, item) => sum + item.totalValue, 0);
    let cumulativeValue = 0;
    
    const abcClassified = materialUsage.map(item => {
      cumulativeValue += item.totalValue;
      const cumulativePercentage = (cumulativeValue / totalValue) * 100;
      
      let abcClass;
      if (cumulativePercentage <= 80) {
        abcClass = 'A';
      } else if (cumulativePercentage <= 95) {
        abcClass = 'B';
      } else {
        abcClass = 'C';
      }
      
      return {
        ...item,
        valuePercentage: (item.totalValue / totalValue) * 100,
        cumulativePercentage,
        abcClass
      };
    });
    
    // Sınıf özetleri
    const classSummary = {
      A: abcClassified.filter(item => item.abcClass === 'A'),
      B: abcClassified.filter(item => item.abcClass === 'B'),
      C: abcClassified.filter(item => item.abcClass === 'C')
    };
    
    res.json({
      materials: abcClassified,
      summary: {
        A: {
          count: classSummary.A.length,
          totalValue: classSummary.A.reduce((sum, item) => sum + item.totalValue, 0),
          percentage: (classSummary.A.reduce((sum, item) => sum + item.totalValue, 0) / totalValue) * 100
        },
        B: {
          count: classSummary.B.length,
          totalValue: classSummary.B.reduce((sum, item) => sum + item.totalValue, 0),
          percentage: (classSummary.B.reduce((sum, item) => sum + item.totalValue, 0) / totalValue) * 100
        },
        C: {
          count: classSummary.C.length,
          totalValue: classSummary.C.reduce((sum, item) => sum + item.totalValue, 0),
          percentage: (classSummary.C.reduce((sum, item) => sum + item.totalValue, 0) / totalValue) * 100
        }
      },
      generatedAt: new Date()
    });
    
  } catch (error) {
    console.error('ABC analizi hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// CSV dönüştürme fonksiyonu
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // CSV için özel karakterleri escape et
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });
  
  return [csvHeaders, ...csvRows].join('\n');
}

module.exports = router;