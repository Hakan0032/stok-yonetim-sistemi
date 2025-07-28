const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// Get material categories (must be before /:id routes)
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = [
      { value: 'otomasyon', label: 'Otomasyon' },
      { value: 'pano', label: 'Pano' },
      { value: 'elektrik', label: 'Elektrik' },
      { value: 'mekanik', label: 'Mekanik' }
    ];
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Kategoriler getirilirken hata oluştu' });
  }
});

// Validation rules
const materialValidation = [
  body('code').notEmpty().withMessage('Malzeme kodu gereklidir'),
  body('name').notEmpty().withMessage('Malzeme adı gereklidir'),
  body('category').isIn(['otomasyon', 'pano', 'elektrik', 'mekanik']).withMessage('Geçersiz kategori'),
  body('unit').isIn(['adet', 'metre', 'kg', 'litre', 'paket', 'kutu']).withMessage('Geçersiz birim'),
  body('unitPrice').isFloat({ min: 0 }).withMessage('Geçerli bir birim fiyat giriniz'),
  body('minStock').isInt({ min: 0 }).withMessage('Minimum stok negatif olamaz'),
  body('maxStock').isInt({ min: 0 }).withMessage('Maksimum stok negatif olamaz')
];

const stockTransactionValidation = [
  body('quantity').isFloat({ min: 0.01 }).withMessage('Miktar pozitif olmalıdır'),
  body('reference').notEmpty().withMessage('Referans gereklidir')
];

// Get all materials
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      status,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = { status: 'active' };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Stock status filter
    if (status === 'low') {
      query.$expr = { $lte: ['$quantity', '$minStock'] };
    } else if (status === 'normal') {
      query.$expr = { $gt: ['$quantity', '$minStock'] };
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const materials = await Material.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    const total = await Material.countDocuments(query);

    res.json({
      materials,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ message: 'Malzemeler getirilirken hata oluştu' });
  }
});

// Get material by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    res.json(material);
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).json({ message: 'Malzeme getirilirken hata oluştu' });
  }
});

// Create new material
router.post('/', auth, materialValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    // Check if material code already exists
    const existingMaterial = await Material.findOne({ code: req.body.code.toUpperCase() });
    if (existingMaterial) {
      return res.status(400).json({ message: 'Bu malzeme kodu zaten kullanılıyor' });
    }

    const material = new Material({
      ...req.body,
      code: req.body.code.toUpperCase(),
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    const savedMaterial = await material.save();
    
    // Create initial transaction record
    if (savedMaterial.quantity > 0) {
      const transaction = new Transaction({
        type: 'in',
        materialId: savedMaterial._id,
        quantity: savedMaterial.quantity,
        unitPrice: savedMaterial.unitPrice,
        totalValue: savedMaterial.quantity * savedMaterial.unitPrice,
        reference: 'INITIAL_STOCK',
        description: 'İlk stok girişi',
        user: {
          id: req.user.id,
          name: req.user.name
        }
      });
      await transaction.save();
    }

    res.status(201).json(savedMaterial);
  } catch (error) {
    console.error('Error creating material:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Bu malzeme kodu zaten kullanılıyor' });
    } else {
      res.status(500).json({ message: 'Malzeme oluşturulurken hata oluştu' });
    }
  }
});

// Update material
router.put('/:id', auth, materialValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Check if new code conflicts with existing material
    if (req.body.code.toUpperCase() !== material.code) {
      const existingMaterial = await Material.findOne({ 
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingMaterial) {
        return res.status(400).json({ message: 'Bu malzeme kodu zaten kullanılıyor' });
      }
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        code: req.body.code.toUpperCase(),
        updatedBy: req.user.id,
        lastUpdated: new Date()
      },
      { new: true, runValidators: true }
    );

    res.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    if (error.code === 11000) {
      res.status(400).json({ message: 'Bu malzeme kodu zaten kullanılıyor' });
    } else {
      res.status(500).json({ message: 'Malzeme güncellenirken hata oluştu' });
    }
  }
});

// Delete material (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Check if material has transactions
    const transactionCount = await Transaction.countDocuments({ materialId: req.params.id });
    if (transactionCount > 0) {
      // Soft delete - mark as inactive
      await Material.findByIdAndUpdate(req.params.id, { 
        status: 'inactive',
        updatedBy: req.user.id,
        lastUpdated: new Date()
      });
      res.json({ message: 'Malzeme pasif duruma getirildi' });
    } else {
      // Hard delete if no transactions
      await Material.findByIdAndDelete(req.params.id);
      res.json({ message: 'Malzeme başarıyla silindi' });
    }
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).json({ message: 'Malzeme silinirken hata oluştu' });
  }
});

// Stock in
router.post('/:id/stock-in', auth, stockTransactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { quantity, unitPrice, reference, description, supplier, project } = req.body;
    
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Update material stock and price
    material.quantity += parseFloat(quantity);
    if (unitPrice) {
      material.unitPrice = parseFloat(unitPrice);
    }
    material.updatedBy = req.user.id;
    await material.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'in',
      materialId: material._id,
      quantity: parseFloat(quantity),
      unitPrice: unitPrice || material.unitPrice,
      totalValue: parseFloat(quantity) * (unitPrice || material.unitPrice),
      reference,
      description,
      supplier,
      project,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });
    await transaction.save();

    res.json({ 
      message: 'Stok girişi başarıyla kaydedildi',
      material, 
      transaction 
    });
  } catch (error) {
    console.error('Error processing stock in:', error);
    res.status(500).json({ message: 'Stok girişi işlenirken hata oluştu' });
  }
});

// Stock out
router.post('/:id/stock-out', auth, stockTransactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validasyon hatası',
        errors: errors.array()
      });
    }

    const { quantity, reference, description, project } = req.body;
    
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }

    // Check if enough stock available
    if (material.quantity < parseFloat(quantity)) {
      return res.status(400).json({ message: 'Yetersiz stok' });
    }

    // Update material stock
    material.quantity -= parseFloat(quantity);
    material.updatedBy = req.user.id;
    await material.save();

    // Create transaction record
    const transaction = new Transaction({
      type: 'out',
      materialId: material._id,
      quantity: parseFloat(quantity),
      unitPrice: material.unitPrice,
      totalValue: parseFloat(quantity) * material.unitPrice,
      reference,
      description,
      project,
      user: {
        id: req.user.id,
        name: req.user.name
      }
    });
    await transaction.save();

    res.json({ 
      message: 'Stok çıkışı başarıyla kaydedildi',
      material, 
      transaction 
    });
  } catch (error) {
    console.error('Error processing stock out:', error);
    res.status(500).json({ message: 'Stok çıkışı işlenirken hata oluştu' });
  }
});

// Get material transactions
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await Transaction.find({ materialId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments({ materialId: req.params.id });

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching material transactions:', error);
    res.status(500).json({ message: 'İşlemler getirilirken hata oluştu' });
  }
});

module.exports = router;
      