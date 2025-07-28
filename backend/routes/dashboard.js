const express = require('express');
const { query, validationResult } = require('express-validator');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Public
router.get('/overview', async (req, res) => {
  try {
    // Get basic counts
    const totalMaterials = await Material.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Get low stock materials count
    const lowStockMaterials = await Material.countDocuments({
      status: 'active',
      $expr: { $lte: ['$currentStock', '$minStock'] }
    });
    
    // Get out of stock materials count
    const outOfStockMaterials = await Material.countDocuments({
      status: 'active',
      currentStock: 0
    });
    
    // Get total stock value
    const stockValue = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ['$currentStock', '$unitPrice'] }
          }
        }
      }
    ]);
    
    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTransactions = await Transaction.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow }
    });
    
    // Get this month's transaction value
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthTransactionValue = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: monthStart },
          type: { $in: ['in', 'out'] }
        }
      },
      {
        $group: {
          _id: '$type',
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);
    
    // Get recent activities
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('materialId', 'name sku')
      .populate('user.id', 'name')
      .select('type quantity totalValue description createdAt');
    
    // Get top materials by value
    const topMaterialsByValue = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $addFields: {
          totalValue: { $multiply: ['$currentStock', '$unitPrice'] }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          sku: 1,
          currentStock: 1,
          unitPrice: 1,
          totalValue: 1,
          category: 1
        }
      }
    ]);
    
    // Get materials by category
    const materialsByCategory = await Material.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: {
            $sum: { $multiply: ['$currentStock', '$unitPrice'] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      overview: {
        totalMaterials,
        totalUsers,
        lowStockMaterials,
        outOfStockMaterials,
        totalStockValue: stockValue[0]?.totalValue || 0,
        todayTransactions
      },
      monthlyTransactionValue: {
        in: monthTransactionValue.find(t => t._id === 'in')?.totalValue || 0,
        out: monthTransactionValue.find(t => t._id === 'out')?.totalValue || 0
      },
      recentTransactions,
      topMaterialsByValue,
      materialsByCategory
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/dashboard/stock-alerts
// @desc    Get stock alerts (low stock, out of stock)
// @access  Public
router.get('/stock-alerts', async (req, res) => {
  try {
    // Low stock materials
    const lowStockMaterials = await Material.find({
      status: 'active',
      $expr: { $lte: ['$currentStock', '$minStock'] },
      currentStock: { $gt: 0 }
    })
    .select('name sku currentStock minStock category unitPrice')
    .sort({ currentStock: 1 })
    .limit(20);
    
    // Out of stock materials
    const outOfStockMaterials = await Material.find({
      status: 'active',
      currentStock: 0
    })
    .select('name sku category unitPrice lastStockUpdate')
    .sort({ lastStockUpdate: 1 })
    .limit(20);
    
    // Overstock materials (above max stock)
    const overstockMaterials = await Material.find({
      status: 'active',
      $expr: { $gte: ['$currentStock', '$maxStock'] }
    })
    .select('name sku currentStock maxStock category unitPrice')
    .sort({ currentStock: -1 })
    .limit(20);
    
    res.json({
      lowStock: lowStockMaterials,
      outOfStock: outOfStockMaterials,
      overstock: overstockMaterials,
      summary: {
        lowStockCount: lowStockMaterials.length,
        outOfStockCount: outOfStockMaterials.length,
        overstockCount: overstockMaterials.length
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/dashboard/transaction-trends
// @desc    Get transaction trends for charts
// @access  Public
router.get('/transaction-trends', [
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('groupBy').optional().isIn(['day', 'week', 'month'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { period = '30d', groupBy = 'day' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Build aggregation pipeline based on groupBy
    let dateGrouping;
    switch (groupBy) {
      case 'day':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        break;
      case 'week':
        dateGrouping = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        break;
      case 'month':
        dateGrouping = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        break;
    }
    
    const trends = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            date: dateGrouping,
            type: '$type'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      {
        $sort: {
          '_id.date.year': 1,
          '_id.date.month': 1,
          '_id.date.day': 1,
          '_id.date.week': 1
        }
      }
    ]);
    
    // Get category-wise transaction trends
    const categoryTrends = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
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
      },
      {
        $group: {
          _id: {
            category: '$materialInfo.category',
            type: '$type'
          },
          count: { $sum: 1 },
          totalValue: { $sum: '$totalValue' }
        }
      },
      {
        $sort: { totalValue: -1 }
      }
    ]);
    
    res.json({
      trends,
      categoryTrends,
      period,
      groupBy,
      dateRange: {
        start: startDate,
        end: endDate
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/dashboard/top-materials
// @desc    Get top materials by various metrics
// @access  Public
router.get('/top-materials', [
  query('metric').optional().isIn(['value', 'quantity', 'transactions']),
  query('period').optional().isIn(['7d', '30d', '90d', '1y']),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { metric = 'value', period = '30d', limit = 10 } = req.query;
    
    // Calculate date range for transaction-based metrics
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    let topMaterials;
    
    switch (metric) {
      case 'value':
        // Top materials by current stock value
        topMaterials = await Material.aggregate([
          { $match: { status: 'active' } },
          {
            $addFields: {
              totalValue: { $multiply: ['$currentStock', '$unitPrice'] }
            }
          },
          { $sort: { totalValue: -1 } },
          { $limit: parseInt(limit) },
          {
            $project: {
              name: 1,
              sku: 1,
              category: 1,
              currentStock: 1,
              unitPrice: 1,
              totalValue: 1
            }
          }
        ]);
        break;
        
      case 'quantity':
        // Top materials by current stock quantity
        topMaterials = await Material.find({ status: 'active' })
          .sort({ currentStock: -1 })
          .limit(parseInt(limit))
          .select('name sku category currentStock unitPrice');
        break;
        
      case 'transactions':
        // Top materials by transaction activity
        topMaterials = await Transaction.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: '$material',
              transactionCount: { $sum: 1 },
              totalValue: { $sum: '$totalValue' },
              totalQuantity: { $sum: '$quantity' }
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
              transactionCount: 1,
              totalValue: 1,
              totalQuantity: 1
            }
          },
          { $sort: { transactionCount: -1 } },
          { $limit: parseInt(limit) }
        ]);
        break;
    }
    
    res.json({
      topMaterials,
      metric,
      period,
      limit: parseInt(limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

// @route   GET api/dashboard/user-activity
// @desc    Get user activity statistics
// @access  Private
router.get('/user-activity', auth, [
  query('period').optional().isIn(['7d', '30d', '90d'])
], async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }
    
    // Get user transaction activity
    const userActivity = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$createdBy',
          transactionCount: { $sum: 1 },
          totalValue: { $sum: '$totalValue' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          role: '$userInfo.role',
          transactionCount: 1,
          totalValue: 1
        }
      },
      { $sort: { transactionCount: -1 } },
      { $limit: 10 }
    ]);
    
    // Get active users count
    const activeUsersCount = await User.countDocuments({
      isActive: true,
      lastLogin: { $gte: startDate }
    });
    
    res.json({
      userActivity,
      activeUsersCount,
      period
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Sunucu hatası');
  }
});

module.exports = router;