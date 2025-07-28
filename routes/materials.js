const express = require('express');
const router = express.Router();
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const { auth, checkPermission } = require('../middleware/auth');

// Tüm malzemeleri getir (filtreleme ve sayfalama ile)
router.get('/', auth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      status,
      search,
      sortBy = 'name',
      sortOrder = 'asc',
      lowStock
    } = req.query;

    // Filtre objesi oluştur
    const filter = { status: 'active' };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (status && status !== 'all') {
      if (status === 'low_stock') {
        filter.$expr = { $lte: ['$quantity', '$minStock'] };
      } else if (status === 'out_of_stock') {
        filter.quantity = 0;
      } else if (status === 'overstock') {
        filter.$expr = { $gte: ['$quantity', '$maxStock'] };
      }
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'supplier.name': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$quantity', '$minStock'] };
    }

    // Sıralama objesi
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Sayfalama hesaplamaları
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Verileri getir
    const materials = await Material.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'username fullName');
    
    // Toplam sayı
    const total = await Material.countDocuments(filter);
    
    // Özet istatistikler
    const stats = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
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

    res.json({
      materials,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
        limit: parseInt(limit)
      },
      stats: stats[0] || {
        totalItems: 0,
        totalValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0
      }
    });
    
  } catch (error) {
    console.error('Malzemeler getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Tek malzeme getir
router.get('/:id', auth, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id)
      .populate('createdBy', 'username fullName');
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    // Son işlemleri getir
    const recentTransactions = await Transaction.find({ materialId: material._id })
      .sort({ date: -1 })
      .limit(10)
      .populate('user.id', 'username fullName');
    
    res.json({
      material,
      recentTransactions
    });
    
  } catch (error) {
    console.error('Malzeme getirme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Yeni malzeme ekle
router.post('/', auth, checkPermission('materials', 'create'), async (req, res) => {
  try {
    const materialData = {
      ...req.body,
      createdBy: req.user.userId
    };
    
    const material = new Material(materialData);
    await material.save();
    
    // İlk stok girişi işlemi oluştur (eğer miktar > 0 ise)
    if (material.quantity > 0) {
      const transaction = new Transaction({
        type: 'in',
        materialId: material._id,
        quantity: material.quantity,
        unitPrice: material.unitPrice,
        reference: `INITIAL-${material.code}`,
        description: 'İlk stok girişi',
        user: {
          id: req.user.userId,
          name: req.user.username,
          role: req.user.role
        }
      });
      await transaction.save();
    }
    
    res.status(201).json({
      message: 'Malzeme başarıyla oluşturuldu',
      material
    });
    
  } catch (error) {
    console.error('Malzeme oluşturma hatası:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Bu malzeme kodu zaten kullanımda'
      });
    }
    
    res.status(400).json({
      message: error.message || 'Malzeme oluşturulurken hata oluştu'
    });
  }
});

// Malzeme güncelle
router.put('/:id', auth, checkPermission('materials', 'update'), async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    res.json({
      message: 'Malzeme başarıyla güncellendi',
      material
    });
    
  } catch (error) {
    console.error('Malzeme güncelleme hatası:', error);
    res.status(400).json({
      message: error.message || 'Malzeme güncellenirken hata oluştu'
    });
  }
});

// Malzeme sil (soft delete)
router.delete('/:id', auth, checkPermission('materials', 'delete'), async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(
      req.params.id,
      { status: 'inactive', lastUpdated: new Date() },
      { new: true }
    );
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    res.json({ message: 'Malzeme başarıyla silindi' });
    
  } catch (error) {
    console.error('Malzeme silme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Stok girişi
router.post('/:id/stock-in', auth, checkPermission('transactions', 'create'), async (req, res) => {
  try {
    const { quantity, unitPrice, reference, description, supplier, project } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçerli bir miktar giriniz' });
    }
    
    if (!unitPrice || unitPrice < 0) {
      return res.status(400).json({ message: 'Geçerli bir birim fiyat giriniz' });
    }
    
    if (!reference) {
      return res.status(400).json({ message: 'Referans numarası gerekli' });
    }
    
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    // Stok güncelle
    material.quantity += quantity;
    material.unitPrice = unitPrice; // Son alış fiyatını güncelle
    await material.save();
    
    // İşlem kaydı oluştur
    const transaction = new Transaction({
      type: 'in',
      materialId: material._id,
      quantity,
      unitPrice,
      reference,
      description,
      supplier,
      project,
      user: {
        id: req.user.userId,
        name: req.user.username,
        role: req.user.role
      }
    });
    
    await transaction.save();
    
    res.json({
      message: 'Stok girişi başarıyla kaydedildi',
      material,
      transaction
    });
    
  } catch (error) {
    console.error('Stok giriş hatası:', error);
    res.status(400).json({
      message: error.message || 'Stok girişi sırasında hata oluştu'
    });
  }
});

// Stok çıkışı
router.post('/:id/stock-out', auth, checkPermission('transactions', 'create'), async (req, res) => {
  try {
    const { quantity, reference, description, project, machine, customer } = req.body;
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Geçerli bir miktar giriniz' });
    }
    
    if (!reference) {
      return res.status(400).json({ message: 'Referans numarası gerekli' });
    }
    
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    if (material.quantity < quantity) {
      return res.status(400).json({
        message: `Yetersiz stok! Mevcut: ${material.quantity} ${material.unit}`
      });
    }
    
    // Stok güncelle
    material.quantity -= quantity;
    await material.save();
    
    // İşlem kaydı oluştur
    const transaction = new Transaction({
      type: 'out',
      materialId: material._id,
      quantity,
      unitPrice: material.unitPrice,
      reference,
      description,
      project,
      machine,
      customer,
      user: {
        id: req.user.userId,
        name: req.user.username,
        role: req.user.role
      }
    });
    
    await transaction.save();
    
    res.json({
      message: 'Stok çıkışı başarıyla kaydedildi',
      material,
      transaction
    });
    
  } catch (error) {
    console.error('Stok çıkış hatası:', error);
    res.status(400).json({
      message: error.message || 'Stok çıkışı sırasında hata oluştu'
    });
  }
});

// Stok düzeltmesi
router.post('/:id/stock-adjustment', auth, checkPermission('transactions', 'create'), async (req, res) => {
  try {
    const { newQuantity, reason, reference } = req.body;
    
    if (newQuantity < 0) {
      return res.status(400).json({ message: 'Miktar negatif olamaz' });
    }
    
    if (!reason) {
      return res.status(400).json({ message: 'Düzeltme sebebi gerekli' });
    }
    
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ message: 'Malzeme bulunamadı' });
    }
    
    const oldQuantity = material.quantity;
    const difference = newQuantity - oldQuantity;
    
    if (difference === 0) {
      return res.status(400).json({ message: 'Miktar değişmedi' });
    }
    
    // Stok güncelle
    material.quantity = newQuantity;
    await material.save();
    
    // İşlem kaydı oluştur
    const transaction = new Transaction({
      type: 'adjustment',
      materialId: material._id,
      quantity: difference,
      unitPrice: material.unitPrice,
      reference: reference || `ADJ-${Date.now()}`,
      description: `Stok düzeltmesi: ${oldQuantity} → ${newQuantity}. Sebep: ${reason}`,
      user: {
        id: req.user.userId,
        name: req.user.username,
        role: req.user.role
      }
    });
    
    await transaction.save();
    
    res.json({
      message: 'Stok düzeltmesi başarıyla kaydedildi',
      material,
      transaction,
      change: {
        from: oldQuantity,
        to: newQuantity,
        difference
      }
    });
    
  } catch (error) {
    console.error('Stok düzeltme hatası:', error);
    res.status(400).json({
      message: error.message || 'Stok düzeltmesi sırasında hata oluştu'
    });
  }
});

// Malzeme kategorilerini getir
router.get('/categories/list', auth, async (req, res) => {
  try {
    const categories = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(categories);
    
  } catch (error) {
    console.error('Kategori listesi hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// Düşük stok uyarıları
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    const lowStockMaterials = await Material.find({
      status: 'active',
      $expr: { $lte: ['$quantity', '$minStock'] }
    })
    .sort({ quantity: 1 })
    .limit(50);
    
    res.json(lowStockMaterials);
    
  } catch (error) {
    console.error('Düşük stok uyarıları hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;