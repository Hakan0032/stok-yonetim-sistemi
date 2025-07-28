const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createTestUser = async () => {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mermer_stok';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB bağlantısı başarılı');
    
    // Check if test user already exists
    const existingUser = await User.findById('60f1f77bcf86cd799439011a');
    
    if (existingUser) {
      console.log('Test kullanıcısı zaten mevcut');
      process.exit(0);
    }
    
    // Create test user with specific ID
    const testUser = new User({
      _id: '60f1f77bcf86cd799439011a',
      name: 'Test User',
      email: 'test@example.com',
      password: '$2a$10$dummy.hash.for.test.user.only', // Dummy hash since we're bypassing auth
      role: 'admin',
      isActive: true,
      department: 'management',
      permissions: {
        canViewReports: true,
        canManageUsers: true,
        canManageStock: true,
        canExportData: true,
        canManageSettings: true
      }
    });
    
    await testUser.save();
    console.log('Test kullanıcısı başarıyla oluşturuldu');
    
  } catch (error) {
    console.error('Test kullanıcısı oluşturma hatası:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createTestUser();