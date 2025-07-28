const express = require('express');
const { query, validationResult } = require('express-validator');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth, requirePermission } = require('../middleware/auth');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

const router = express.Router();

// @route   GET api/reports/stock-report
// @desc    Generate stock report
// @access  Private (requires canViewReports permission)
router.get('/stock-report', [auth, requirePermission('canViewReports')], [
  query('format').optional().isIn(['json', 'excel', 'pdf']),
  query('category').optional().isString(),
  query('status').optional().custom(value => {
    if (value === '' || value === undefined || ['active', 'inactive', 'discontinued'].includes(value)) {
      return true;
    }
    throw new Error('Invalid status value');
  }),
  query('stockLevel').optional().custom(value => {
    if (value === '' || value === undefined || ['all', 'low', 'out', 'overstock'].includes(value)) {
      return true;
    }
    throw new Error('Invalid stockLevel value');
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request query:', req.query);
      return res.status(400).json({ errors: errors.array() });
    }

    const { format = 'json', category, status = 'active', stockLevel = 'all' } = req.query;

    // Build filter
    const filter = { status };
    if (category) {
      filter.category = category;
    }

    // Add stock level filter
    switch (stockLevel) {
      case 'low':
        filter.$expr = { $lte: ['$currentStock', '$minStock'] };
        filter.currentStock = { $gt: 0 };
        break;
      case 'out':
        filter.currentStock = 0;
        break;
      case 'overstock':
        filter.$expr = { $gte: ['$currentStock', '$maxStock'] };
        break;
    }

    const materials = await Material.find(filter)
      .populate('supplier', 'name contact')
      .populate('createdBy', 'name')
      .sort({ name: 1 });

    // Calculate totals
    const totals = {
      totalMaterials: materials.length,
      totalStockValue: materials.reduce((sum, material) => 
        sum + (material.currentStock * material.unitPrice), 0),
      totalStockQuantity: materials.reduce((sum, material) => 
        sum + material.currentStock, 0),
      lowStockCount: materials.filter(m => m.currentStock <= m.minStock && m.currentStock > 0).length,
      outOfStockCount: materials.filter(m => m.currentStock === 0).length
    };

    const reportData = {
      materials,
      totals,
      generatedAt: new Date(),
      filters: { category, status, stockLevel }
    };

    if (format === 'json') {
      return res.json(reportData);
    }

    if (format === 'excel') {
      // Create Excel workbook
      const wb = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = materials.map(material => ({
        'SKU': material.sku,
        'Malzeme Adı': material.name,
        'Kategori': material.category,
        'Mevcut Stok': material.currentStock,
        'Birim': material.unit,
        'Birim Fiyat': material.unitPrice,
        'Toplam Değer': material.currentStock * material.unitPrice,
        'Min Stok': material.minStock,
        'Max Stok': material.maxStock,
        'Durum': material.status,
        'Tedarikçi': material.supplier?.name || '',
        'Konum': material.location || '',
        'Son Güncelleme': material.updatedAt
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Stok Raporu');

      // Add summary sheet
      const summaryData = [
        ['Toplam Malzeme Sayısı', totals.totalMaterials],
        ['Toplam Stok Değeri', totals.totalStockValue],
        ['Toplam Stok Miktarı', totals.totalStockQuantity],
        ['Düşük Stok Sayısı', totals.lowStockCount],
        ['Tükenen Stok Sayısı', totals.outOfStockCount],
        ['Rapor Tarihi', new Date().toLocaleString('tr-TR')]
      ];
      
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Özet');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=stok-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=stok-raporu-${new Date().toISOString().split('T')[0]}.pdf`);
      
      doc.pipe(res);
      
      // PDF content
      doc.fontSize(20).text('Stok Raporu', 50, 50);
      doc.fontSize(12).text(`Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}`, 50, 80);
      
      let yPosition = 120;
      
      // Summary
      doc.fontSize(14).text('Özet', 50, yPosition);
      yPosition += 25;
      doc.fontSize(10)
        .text(`Toplam Malzeme: ${totals.totalMaterials}`, 50, yPosition)
        .text(`Toplam Değer: ${totals.totalStockValue.toLocaleString('tr-TR')} TL`, 200, yPosition)
        .text(`Düşük Stok: ${totals.lowStockCount}`, 400, yPosition);
      
      yPosition += 40;
      
      // Materials table header
      doc.fontSize(10)
        .text('SKU', 50, yPosition)
        .text('Malzeme Adı', 120, yPosition)
        .text('Kategori', 250, yPosition)
        .text('Stok', 320, yPosition)
        .text('Birim Fiyat', 370, yPosition)
        .text('Toplam Değer', 450, yPosition);
      
      yPosition += 20;
      
      // Materials data
      materials.slice(0, 30).forEach(material => { // Limit to first 30 items
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(8)
          .text(material.sku, 50, yPosition)
          .text(material.name.substring(0, 20), 120, yPosition)
          .text(material.category, 250, yPosition)
          .text(material.currentStock.toString(), 320, yPosition)
          .text(material.unitPrice.toLocaleString('tr-TR'), 370, yPosition)
          .text((material.currentStock * material.unitPrice).toLocaleString('tr-TR'), 450, yPosition);
        
        yPosition += 15;
      });
      
      doc.end();
      return;
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/reports/transaction-report
// @desc    Generate transaction report
// @access  Private (requires canViewReports permission)
router.get('/transaction-report', [auth, requirePermission('canViewReports')], [
  query('format').optional().isIn(['json', 'excel', 'pdf']),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('type').optional().isIn(['in', 'out', 'adjustment']),
  query('material').optional().isMongoId(),
  query('user').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format = 'json', startDate, endDate, type, material, user } = req.query;

    // Build filter
    const filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (type) filter.type = type;
    if (material) filter.material = material;
    if (user) filter.createdBy = user;

    const transactions = await Transaction.find(filter)
      .populate('material', 'name sku category unit')
      .populate('createdBy', 'name email')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totals = {
      totalTransactions: transactions.length,
      totalValue: transactions.reduce((sum, t) => sum + t.totalValue, 0),
      totalQuantity: transactions.reduce((sum, t) => sum + t.quantity, 0),
      inTransactions: transactions.filter(t => t.type === 'in').length,
      outTransactions: transactions.filter(t => t.type === 'out').length,
      adjustmentTransactions: transactions.filter(t => t.type === 'adjustment').length,
      inValue: transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.totalValue, 0),
      outValue: transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.totalValue, 0)
    };

    const reportData = {
      transactions,
      totals,
      generatedAt: new Date(),
      filters: { startDate, endDate, type, material, user }
    };

    if (format === 'json') {
      return res.json(reportData);
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      
      const excelData = transactions.map(transaction => ({
        'Tarih': transaction.createdAt.toLocaleString('tr-TR'),
        'Tip': transaction.type === 'in' ? 'Giriş' : transaction.type === 'out' ? 'Çıkış' : 'Düzeltme',
        'Malzeme': transaction.material?.name || '',
        'SKU': transaction.material?.sku || '',
        'Kategori': transaction.material?.category || '',
        'Miktar': transaction.quantity,
        'Birim': transaction.material?.unit || '',
        'Birim Fiyat': transaction.unitPrice,
        'Toplam Değer': transaction.totalValue,
        'Açıklama': transaction.description,
        'Kullanıcı': transaction.createdBy?.name || '',
        'Tedarikçi': transaction.supplier?.name || '',
        'Fatura No': transaction.invoiceNumber || '',
        'Parti No': transaction.batchNumber || ''
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'İşlem Raporu');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=islem-raporu-${new Date().toISOString().split('T')[0]}.xlsx`);
      return res.send(buffer);
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/reports/abc-analysis
// @desc    Generate ABC analysis report
// @access  Private (requires canViewReports permission)
router.get('/abc-analysis', [auth, requirePermission('canViewReports')], [
  query('period').optional().isIn(['30d', '90d', '180d', '1y']),
  query('format').optional().isIn(['json', 'excel'])
], async (req, res) => {
  try {
    const { period = '90d', format = 'json' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '180d':
        startDate.setDate(startDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get transaction data for ABC analysis
    const materialAnalysis = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          type: { $in: ['in', 'out'] }
        }
      },
      {
        $group: {
          _id: '$material',
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'materials',
          localField: '_id',
          foreignField: '_id',
          as: 'materialInfo'
        }
      },
      {
        $unwind: '$materialInfo'
      },
      {
        $project: {
          name: '$materialInfo.name',
          sku: '$materialInfo.sku',
          category: '$materialInfo.category',
          currentStock: '$materialInfo.currentStock',
          unitPrice: '$materialInfo.unitPrice',
          totalValue: 1,
          totalQuantity: 1,
          transactionCount: 1
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Calculate ABC classification
    const totalValue = materialAnalysis.reduce((sum, item) => sum + item.totalValue, 0);
    let cumulativeValue = 0;
    let cumulativePercentage = 0;
    
    const abcAnalysis = materialAnalysis.map((item, index) => {
      cumulativeValue += item.totalValue;
      cumulativePercentage = (cumulativeValue / totalValue) * 100;
      
      let classification;
      if (cumulativePercentage <= 80) {
        classification = 'A';
      } else if (cumulativePercentage <= 95) {
        classification = 'B';
      } else {
        classification = 'C';
      }
      
      return {
        ...item,
        rank: index + 1,
        valuePercentage: (item.totalValue / totalValue) * 100,
        cumulativePercentage,
        classification
      };
    });

    // Calculate summary
    const summary = {
      A: abcAnalysis.filter(item => item.classification === 'A'),
      B: abcAnalysis.filter(item => item.classification === 'B'),
      C: abcAnalysis.filter(item => item.classification === 'C')
    };

    const reportData = {
      analysis: abcAnalysis,
      summary: {
        A: { count: summary.A.length, percentage: (summary.A.length / abcAnalysis.length) * 100 },
        B: { count: summary.B.length, percentage: (summary.B.length / abcAnalysis.length) * 100 },
        C: { count: summary.C.length, percentage: (summary.C.length / abcAnalysis.length) * 100 }
      },
      period,
      totalValue,
      generatedAt: new Date()
    };

    if (format === 'json') {
      return res.json(reportData);
    }

    if (format === 'excel') {
      const wb = XLSX.utils.book_new();
      
      const excelData = abcAnalysis.map(item => ({
        'Sıra': item.rank,
        'SKU': item.sku,
        'Malzeme Adı': item.name,
        'Kategori': item.category,
        'Toplam Değer': item.totalValue,
        'Değer Yüzdesi': item.valuePercentage.toFixed(2) + '%',
        'Kümülatif Yüzde': item.cumulativePercentage.toFixed(2) + '%',
        'ABC Sınıfı': item.classification,
        'İşlem Sayısı': item.transactionCount,
        'Toplam Miktar': item.totalQuantity,
        'Mevcut Stok': item.currentStock
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'ABC Analizi');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=abc-analizi-${new Date().toISOString().split('T')[0]}.xlsx`);
      return res.send(buffer);
    }

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/reports/cost-analysis
// @desc    Generate cost analysis report
// @access  Private (requires canViewReports permission)
router.get('/cost-analysis', [auth, requirePermission('canViewReports')], [
  query('period').optional().isIn(['30d', '90d', '180d', '1y']),
  query('groupBy').optional().isIn(['category', 'supplier', 'material'])
], async (req, res) => {
  try {
    const { period = '90d', groupBy = 'category' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '180d':
        startDate.setDate(startDate.getDate() - 180);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    let groupField;
    let lookupField;
    
    switch (groupBy) {
      case 'category':
        groupField = '$materialInfo.category';
        break;
      case 'supplier':
        groupField = '$supplierInfo.name';
        break;
      case 'material':
        groupField = '$materialInfo.name';
        break;
    }

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          type: { $in: ['in', 'out'] }
        }
      },
      {
        $lookup: {
          from: 'materials',
          localField: 'material',
          foreignField: '_id',
          as: 'materialInfo'
        }
      },
      {
        $unwind: '$materialInfo'
      }
    ];

    if (groupBy === 'supplier') {
      pipeline.push({
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      });
      pipeline.push({
        $unwind: { path: '$supplierInfo', preserveNullAndEmptyArrays: true }
      });
    }

    pipeline.push(
      {
        $group: {
          _id: groupField,
          totalCost: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$totalValue', 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$totalValue', 0] } },
          inTransactions: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, 1, 0] } },
          outTransactions: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, 1, 0] } },
          totalQuantityIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] } },
          totalQuantityOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] } }
        }
      },
      {
        $addFields: {
          netValue: { $subtract: ['$totalRevenue', '$totalCost'] },
          margin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalCost'] }, '$totalRevenue'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { totalCost: -1 } }
    );

    const costAnalysis = await Transaction.aggregate(pipeline);

    // Calculate totals
    const totals = costAnalysis.reduce((acc, item) => {
      acc.totalCost += item.totalCost;
      acc.totalRevenue += item.totalRevenue;
      acc.totalTransactions += item.inTransactions + item.outTransactions;
      return acc;
    }, { totalCost: 0, totalRevenue: 0, totalTransactions: 0 });

    res.json({
      costAnalysis,
      totals: {
        ...totals,
        netValue: totals.totalRevenue - totals.totalCost,
        overallMargin: totals.totalRevenue > 0 ? ((totals.totalRevenue - totals.totalCost) / totals.totalRevenue) * 100 : 0
      },
      period,
      groupBy,
      generatedAt: new Date()
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router;