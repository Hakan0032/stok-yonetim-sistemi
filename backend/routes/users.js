const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/users
// @desc    Get all users with pagination and filtering (Admin only)
// @access  Private/Admin
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role = '',
      status = '',
      department = ''
    } = req.query;

    // Build query
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Role filter
    if (role) {
      query.role = role;
    }
    
    // Status filter
    if (status) {
      query.isActive = status === 'active';
    }
    
    // Department filter
    if (department) {
      query.department = department;
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get users with pagination
    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/users/:id
// @desc    Get user by ID
// @access  Private/Admin
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   POST api/users
// @desc    Create a new user (Admin only)
// @access  Private/Admin
router.post('/', auth, adminAuth, [
  body('name', 'İsim gerekli').not().isEmpty(),
  body('email', 'Geçerli bir email girin').isEmail(),
  body('password', 'Şifre en az 6 karakter olmalı').isLength({ min: 6 }),
  body('role', 'Geçerli bir rol seçin').isIn(['user', 'manager', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'Bu email zaten kayıtlı' });
    }

    // Create new user
    user = new User({
      name,
      email,
      password,
      role
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    res.json({ 
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   PUT api/users/:id
// @desc    Update user (Admin only)
// @access  Private/Admin
router.put('/:id', auth, adminAuth, [
  body('name', 'İsim gerekli').not().isEmpty(),
  body('email', 'Geçerli bir email girin').isEmail(),
  body('role', 'Geçerli bir rol seçin').isIn(['user', 'manager', 'admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, role, isActive } = req.body;
    
    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: req.params.id } });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu email başka bir kullanıcı tarafından kullanılıyor' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   PUT api/users/:id/password
// @desc    Reset user password (Admin only)
// @access  Private/Admin
router.put('/:id/password', auth, adminAuth, [
  body('newPassword', 'Yeni şifre en az 6 karakter olmalı').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    res.json({ message: 'Kullanıcı şifresi başarıyla sıfırlandı' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   DELETE api/users/:id
// @desc    Delete user (Admin only)
// @access  Private/Admin
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Kendi hesabınızı silemezsiniz' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Kullanıcı başarıyla silindi' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

// @route   PUT api/users/:id/toggle-status
// @desc    Toggle user active status (Admin only)
// @access  Private/Admin
router.put('/:id/toggle-status', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Kendi hesabınızın durumunu değiştiremezsiniz' });
    }

    user.isActive = !user.isActive;
    await user.save();
    
    res.json({ 
      message: `Kullanıcı ${user.isActive ? 'aktif' : 'pasif'} hale getirildi`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router;