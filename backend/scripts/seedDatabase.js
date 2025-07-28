const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Material = require('../models/Material');
const Transaction = require('../models/Transaction');
require('dotenv').config();

// MongoDB bağlantısı
const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mermer_stok';
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error.message);
    process.exit(1);
  }
};

// Örnek kullanıcılar
const createUsers = async () => {
  try {
    // Mevcut kullanıcıları temizle
    await User.deleteMany({});
    
    const users = [
      {
        name: 'Admin User',
        email: 'admin@yuceler.com',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        department: 'management',
        permissions: {
          canViewReports: true,
          canManageUsers: true,
          canManageStock: true,
          canExportData: true,
          canManageSettings: true
        }
      },
      {
        name: 'Depo Sorumlusu',
        email: 'depo@yuceler.com',
        password: await bcrypt.hash('depo123', 10),
        role: 'manager',
        department: 'warehouse',
        permissions: {
          canViewReports: true,
          canManageUsers: false,
          canManageStock: true,
          canExportData: true,
          canManageSettings: false
        }
      },
      {
        name: 'Operatör',
        email: 'operator@yuceler.com',
        password: await bcrypt.hash('operator123', 10),
        role: 'user',
        department: 'production',
        permissions: {
          canViewReports: false,
          canManageUsers: false,
          canManageStock: true,
          canExportData: false,
          canManageSettings: false
        }
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log('✅ Kullanıcılar oluşturuldu:', createdUsers.length);
    return createdUsers;
  } catch (error) {
    console.error('❌ Kullanıcı oluşturma hatası:', error.message);
    throw error;
  }
};

// Örnek malzemeler
const createMaterials = async (users) => {
  try {
    // Mevcut malzemeleri temizle
    await Material.deleteMany({});
    
    const materials = [
      {
        code: 'OTO001',
        name: 'PLC Siemens S7-1200',
        description: 'Siemens S7-1200 CPU 1214C DC/DC/DC',
        category: 'otomasyon',
        subcategory: 'PLC',
        unit: 'adet',
        quantity: 15,
        minStock: 5,
        maxStock: 50,
        unitPrice: 2500.00,
        supplier: {
          name: 'Siemens Türkiye',
          contact: 'Ahmet Yılmaz',
          email: 'ahmet@siemens.com.tr',
          phone: '+90 212 123 4567'
        },
        location: {
          warehouse: 'Ana Depo',
          shelf: 'A1',
          position: '01'
        },
        specifications: {
          brand: 'Siemens',
          model: 'S7-1200 CPU 1214C',
          voltage: '24V DC',
          dimensions: '110 x 100 x 75 mm'
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      },
      {
        code: 'OTO002',
        name: 'HMI Dokunmatik Panel',
        description: 'Siemens KTP700 Basic PN 7 inch HMI Panel',
        category: 'otomasyon',
        subcategory: 'HMI',
        unit: 'adet',
        quantity: 8,
        minStock: 3,
        maxStock: 20,
        unitPrice: 1800.00,
        supplier: {
          name: 'Siemens Türkiye',
          contact: 'Ahmet Yılmaz',
          email: 'ahmet@siemens.com.tr',
          phone: '+90 212 123 4567'
        },
        location: {
          warehouse: 'Ana Depo',
          shelf: 'A1',
          position: '02'
        },
        specifications: {
          brand: 'Siemens',
          model: 'KTP700 Basic PN',
          dimensions: '7 inch'
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      },
      {
        code: 'PAN001',
        name: 'Elektrik Panosu 600x800',
        description: 'IP65 Polyester Elektrik Panosu',
        category: 'pano',
        subcategory: 'Polyester Pano',
        unit: 'adet',
        quantity: 12,
        minStock: 5,
        maxStock: 30,
        unitPrice: 850.00,
        supplier: {
          name: 'Pano Sistemleri A.Ş.',
          contact: 'Mehmet Demir',
          email: 'mehmet@panosistem.com',
          phone: '+90 216 987 6543'
        },
        location: {
          warehouse: 'Ana Depo',
          shelf: 'B1',
          position: '01'
        },
        specifications: {
          dimensions: '600x800x250 mm',
          material: 'Polyester',
          color: 'RAL 7035'
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      },
      {
        code: 'ELK001',
        name: 'Kontaktör 3 Fazlı 25A',
        description: 'Schneider LC1D25M7 3 Fazlı Kontaktör',
        category: 'elektrik',
        subcategory: 'Kontaktör',
        unit: 'adet',
        quantity: 25,
        minStock: 10,
        maxStock: 100,
        unitPrice: 180.00,
        supplier: {
          name: 'Schneider Electric',
          contact: 'Fatma Kaya',
          email: 'fatma@schneider.com.tr',
          phone: '+90 212 555 0123'
        },
        location: {
          warehouse: 'Ana Depo',
          shelf: 'C1',
          position: '01'
        },
        specifications: {
          brand: 'Schneider',
          model: 'LC1D25M7',
          voltage: '220V AC',
          current: '25A'
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      },
      {
        code: 'MEK001',
        name: 'Redüktör Motor 1.5kW',
        description: 'SEW Eurodrive Redüktör Motor',
        category: 'mekanik',
        subcategory: 'Motor',
        unit: 'adet',
        quantity: 6,
        minStock: 2,
        maxStock: 15,
        unitPrice: 3200.00,
        supplier: {
          name: 'SEW Eurodrive',
          contact: 'Ali Özkan',
          email: 'ali@sew.com.tr',
          phone: '+90 216 444 7788'
        },
        location: {
          warehouse: 'Ana Depo',
          shelf: 'D1',
          position: '01'
        },
        specifications: {
          brand: 'SEW',
          power: '1.5kW',
          voltage: '380V',
          rpm: '1400'
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      }
    ];

    const createdMaterials = await Material.insertMany(materials);
    console.log('✅ Malzemeler oluşturuldu:', createdMaterials.length);
    return createdMaterials;
  } catch (error) {
    console.error('❌ Malzeme oluşturma hatası:', error.message);
    throw error;
  }
};

// Örnek işlemler
const createTransactions = async (users, materials) => {
  try {
    // Mevcut işlemleri temizle
    await Transaction.deleteMany({});
    
    const transactions = [
      {
        type: 'in',
        materialId: materials[0]._id,
        quantity: 10,
        unitPrice: 2500.00,
        totalValue: 25000.00,
        reference: 'GRS-2024-001',
        description: 'Yeni PLC alımı',
        supplier: {
          name: 'Siemens Türkiye',
          invoice: 'SIE-2024-001',
          date: new Date('2024-01-15')
        },
        user: {
          id: users[1]._id,
          name: users[1].name
        },
        date: new Date('2024-01-15')
      },
      {
        type: 'out',
        materialId: materials[0]._id,
        quantity: 2,
        unitPrice: 2500.00,
        totalValue: 5000.00,
        reference: 'CKS-2024-001',
        description: 'Proje A için PLC çıkışı',
        project: {
          name: 'Otomasyon Projesi A',
          code: 'PRJ-A-2024',
          manager: 'Mühendis Ahmet'
        },
        user: {
          id: users[2]._id,
          name: users[2].name
        },
        date: new Date('2024-01-20')
      },
      {
        type: 'in',
        materialId: materials[1]._id,
        quantity: 5,
        unitPrice: 1800.00,
        totalValue: 9000.00,
        reference: 'GRS-2024-002',
        description: 'HMI panel alımı',
        supplier: {
          name: 'Siemens Türkiye',
          invoice: 'SIE-2024-002',
          date: new Date('2024-01-18')
        },
        user: {
          id: users[1]._id,
          name: users[1].name
        },
        date: new Date('2024-01-18')
      },
      {
        type: 'out',
        materialId: materials[3]._id,
        quantity: 5,
        unitPrice: 180.00,
        totalValue: 900.00,
        reference: 'CKS-2024-002',
        description: 'Kontaktör çıkışı',
        project: {
          name: 'Pano Montajı B',
          code: 'PRJ-B-2024',
          manager: 'Tekniker Mehmet'
        },
        user: {
          id: users[2]._id,
          name: users[2].name
        },
        date: new Date('2024-01-22')
      }
    ];

    const createdTransactions = await Transaction.insertMany(transactions);
    console.log('✅ İşlemler oluşturuldu:', createdTransactions.length);
    return createdTransactions;
  } catch (error) {
    console.error('❌ İşlem oluşturma hatası:', error.message);
    throw error;
  }
};

// Ana fonksiyon
const seedDatabase = async () => {
  try {
    console.log('🚀 Veritabanı seed işlemi başlatılıyor...');
    
    await connectDB();
    
    const users = await createUsers();
    const materials = await createMaterials(users);
    const transactions = await createTransactions(users, materials);
    
    console.log('\n✅ Veritabanı seed işlemi tamamlandı!');
    console.log(`📊 Oluşturulan veriler:`);
    console.log(`   - Kullanıcılar: ${users.length}`);
    console.log(`   - Malzemeler: ${materials.length}`);
    console.log(`   - İşlemler: ${transactions.length}`);
    
    console.log('\n🔐 Test kullanıcıları:');
    console.log('   Admin: admin@yuceler.com / admin123');
    console.log('   Depo: depo@yuceler.com / depo123');
    console.log('   Operatör: operator@yuceler.com / operator123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed işlemi hatası:', error.message);
    process.exit(1);
  }
};

// Script çalıştırıldığında
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };