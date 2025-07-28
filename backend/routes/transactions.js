const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Transaction = require('../models/Transaction');
const Material = require('../models/Material');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/transactions
// @desc    Get all transactions with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['in', 'out', 'adjustment']),
  query('material').optional().custom(value => {
    // Allow empty string or undefined
    if (!value || value === '' || value.trim() === '') {
      return true;
    }
    // Validate MongoDB ObjectId format
    return /^[0-9a-fA-F]{24}$/.test(value);
  }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('sortBy').optional().isIn(['createdAt', 'quantity', 'totalValue']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      type,
      material,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (material && material.trim() !== '') {
      filter.materialId = material;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const transactions = await Transaction.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('materialId', 'name sku category unit')
      .populate('user.id', 'name email')
      .exec();

    // Get total count for pagination
    const total = await Transaction.countDocuments(filter);

    // Calculate summary statistics
    const summary = await Transaction.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalValue' },
          totalIn: {
            $sum: {
              $cond: [{ $eq: ['$type', 'in'] }, '$totalValue', 0]
            }
          },
          totalOut: {
            $sum: {
              $cond: [{ $eq: ['$type', 'out'] }, '$totalValue', 0]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
      summary: summary[0] || { totalValue: 0, totalIn: 0, totalOut: 0, count: 0 }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/transactions/:id
// @desc    Get transaction by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('materialId', 'name sku category unit unitPrice')
      .populate('user.id', 'name email')
      .populate('supplier', 'name contact email phone');
    
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   POST api/transactions/stock-in
// @desc    Create stock in transaction
// @access  Private (requires canManageStock permission)
router.post('/stock-in', [auth, requirePermission('canManageStock')], [
  body('material', 'Malzeme ID gerekli').isMongoId(),
  body('quantity', 'Miktar gerekli ve pozitif olmalı').isInt({ min: 1 }),
  body('unitPrice', 'Birim fiyat gerekli ve pozitif olmalı').isFloat({ min: 0 }),
  body('description', 'Açıklama gerekli').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { material, quantity, unitPrice, description, supplier, invoiceNumber, batchNumber } = req.body;

    // Check if material exists
    const materialDoc = await Material.findById(material);
    if (!materialDoc) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Create transaction
    const transaction = new Transaction({
      materialId: material,
      type: 'in',
      quantity,
      unitPrice,
      totalValue: quantity * unitPrice,
      description,
      supplier,
      invoiceNumber,
      batchNumber,
      user: { id: req.user.id }
    });

    await transaction.save();

    // Update material stock
    materialDoc.currentStock += quantity;
    materialDoc.lastStockUpdate = new Date();
    materialDoc.updatedBy = req.user.id;
    await materialDoc.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('materialId', 'name sku category unit')
      .populate('user.id', 'name email');

    res.status(201).json({
      transaction: populatedTransaction,
      newStock: materialDoc.currentStock
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   POST api/transactions/stock-out
// @desc    Create stock out transaction
// @access  Private (requires canManageStock permission)
router.post('/stock-out', [auth, requirePermission('canManageStock')], [
  body('material', 'Malzeme ID gerekli').isMongoId(),
  body('quantity', 'Miktar gerekli ve pozitif olmalı').isInt({ min: 1 }),
  body('description', 'Açıklama gerekli').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { material, quantity, description, destination, workOrder, projectCode } = req.body;

    // Check if material exists
    const materialDoc = await Material.findById(material);
    if (!materialDoc) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Check if enough stock available
    if (materialDoc.currentStock < quantity) {
      return res.status(400).json({ 
        message: `Yetersiz stok. Mevcut stok: ${materialDoc.currentStock}` 
      });
    }

    // Create transaction
    const transaction = new Transaction({
      materialId: material,
      type: 'out',
      quantity,
      unitPrice: materialDoc.unitPrice,
      totalValue: quantity * materialDoc.unitPrice,
      description,
      destination,
      workOrder,
      projectCode,
      user: { id: req.user.id }
    });

    await transaction.save();

    // Update material stock
    materialDoc.currentStock -= quantity;
    materialDoc.lastStockUpdate = new Date();
    materialDoc.updatedBy = req.user.id;
    await materialDoc.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('materialId', 'name sku category unit')
      .populate('user.id', 'name email');

    res.status(201).json({
      transaction: populatedTransaction,
      newStock: materialDoc.currentStock,
      lowStockWarning: materialDoc.currentStock <= materialDoc.minStock
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   POST api/transactions/adjustment
// @desc    Create stock adjustment transaction
// @access  Private (requires canManageStock permission)
router.post('/adjustment', [auth, requirePermission('canManageStock')], [
  body('material', 'Malzeme ID gerekli').isMongoId(),
  body('adjustmentQuantity', 'Düzeltme miktarı gerekli').isInt(),
  body('reason', 'Sebep gerekli').not().isEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { material, adjustmentQuantity, reason } = req.body;

    // Check if material exists
    const materialDoc = await Material.findById(material);
    if (!materialDoc) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    const newStock = materialDoc.currentStock + adjustmentQuantity;
    if (newStock < 0) {
      return res.status(400).json({ 
        message: `Stok negatif olamaz. Mevcut stok: ${materialDoc.currentStock}` 
      });
    }

    // Create transaction
    const transaction = new Transaction({
      materialId: material,
      type: 'adjustment',
      quantity: Math.abs(adjustmentQuantity),
      direction: adjustmentQuantity > 0 ? 'in' : 'out',
      unitPrice: materialDoc.unitPrice,
      totalValue: Math.abs(adjustmentQuantity) * materialDoc.unitPrice,
      description: `Stok düzeltmesi: ${reason}`,
      adjustmentReason: reason,
      user: { id: req.user.id }
    });

    await transaction.save();

    // Update material stock
    materialDoc.currentStock = newStock;
    materialDoc.lastStockUpdate = new Date();
    materialDoc.updatedBy = req.user.id;
    await materialDoc.save();

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('materialId', 'name sku category unit')
      .populate('user.id', 'name email');

    res.status(201).json({
      transaction: populatedTransaction,
      oldStock: materialDoc.currentStock - adjustmentQuantity,
      newStock: materialDoc.currentStock,
      adjustment: adjustmentQuantity
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/transactions/material/:materialId
// @desc    Get transactions for specific material
// @access  Private
router.get('/material/:materialId', auth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { materialId } = req.params;

    const transactions = await Transaction.find({ materialId: materialId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name email')
      .exec();

    const total = await Transaction.countDocuments({ materialId: materialId });

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Geçersiz malzeme ID' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/transactions/summary/daily
// @desc    Get daily transaction summary
// @access  Private
router.get('/summary/daily', auth, [
  query('days').optional().isInt({ min: 1, max: 365 })
], async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const summary = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            type: '$type'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.type': 1
        }
      }
    ]);

    res.json(summary);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   DELETE api/transactions/:id
// @desc    Delete transaction (admin only)
// @access  Private (admin only)
router.delete('/:id', [auth, requirePermission('canManageUsers')], async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }

    // Reverse the stock change
    const material = await Material.findById(transaction.material);
    if (material) {
      if (transaction.type === 'in' || (transaction.type === 'adjustment' && transaction.direction === 'in')) {
        material.currentStock -= transaction.quantity;
      } else if (transaction.type === 'out' || (transaction.type === 'adjustment' && transaction.direction === 'out')) {
        material.currentStock += transaction.quantity;
      }
      
      if (material.currentStock < 0) {
        return res.status(400).json({ 
          message: 'Bu işlem silinemez çünkü stok negatif olur' 
        });
      }
      
      await material.save();
    }

    await Transaction.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'İşlem başarıyla silindi',
      newStock: material ? material.currentStock : null
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'İşlem bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router;