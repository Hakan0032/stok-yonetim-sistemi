const mongoose = require('mongoose');
require('dotenv').config();

// Renk kodları
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

// MongoDB bağlantı testi
const testConnection = async () => {
  try {
    log('cyan', '\n=== MongoDB Bağlantı Testi ===\n');
    
    // Önce Atlas'a bağlanmayı dene
    const ATLAS_URI = process.env.MONGODB_URI;
    const LOCAL_URI = 'mongodb://localhost:27017/mermer_stok';
    
    if (ATLAS_URI && ATLAS_URI.includes('mongodb+srv')) {
      log('blue', '🔄 MongoDB Atlas bağlantısı deneniyor...');
      log('yellow', `URI: ${ATLAS_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
      
      try {
        await mongoose.connect(ATLAS_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000,
        });
        
        log('green', '✅ MongoDB Atlas bağlantısı BAŞARILI!');
        
        // Veritabanı bilgilerini göster
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        log('cyan', '\n📊 Veritabanı Bilgileri:');
        log('blue', `   Veritabanı: ${db.databaseName}`);
        log('blue', `   Koleksiyonlar: ${collections.length}`);
        
        if (collections.length > 0) {
          log('yellow', '   Mevcut koleksiyonlar:');
          collections.forEach(col => {
            log('yellow', `     - ${col.name}`);
          });
        }
        
        // Test verisi oluştur
        await testDatabaseOperations();
        
        return true;
        
      } catch (atlasError) {
        log('red', '❌ MongoDB Atlas bağlantısı BAŞARISIZ!');
        log('red', `   Hata: ${atlasError.message}`);
        
        if (atlasError.message.includes('authentication failed')) {
          log('yellow', '\n🔧 Atlas Kimlik Doğrulama Hatası - Çözüm:');
          log('yellow', '1. MongoDB Atlas\'a giriş yapın (https://cloud.mongodb.com)');
          log('yellow', '2. Database Access > Add New Database User');
          log('yellow', '3. Kullanıcı adı: admin, Şifre: admin123');
          log('yellow', '4. Database User Privileges: Atlas admin');
          log('yellow', '5. Network Access > Add IP Address: 0.0.0.0/0');
          log('yellow', '6. 1-2 dakika bekleyin ve tekrar deneyin');
        }
        
        // Local MongoDB'ye geç
        log('blue', '\n🔄 Local MongoDB bağlantısı deneniyor...');
        
        try {
          await mongoose.connect(LOCAL_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
          });
          
          log('green', '✅ Local MongoDB bağlantısı BAŞARILI!');
          await testDatabaseOperations();
          return true;
          
        } catch (localError) {
          log('red', '❌ Local MongoDB bağlantısı da BAŞARISIZ!');
          log('red', `   Hata: ${localError.message}`);
          
          log('yellow', '\n🔧 Local MongoDB Kurulum:');
          log('yellow', '1. MongoDB Community Server indirin');
          log('yellow', '2. Kurulum yapın ve MongoDB servisini başlatın');
          log('yellow', '3. Veya Docker kullanın: docker run -d -p 27017:27017 mongo');
          
          return false;
        }
      }
    } else {
      log('blue', '🔄 Local MongoDB bağlantısı deneniyor...');
      
      try {
        await mongoose.connect(LOCAL_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
        });
        
        log('green', '✅ Local MongoDB bağlantısı BAŞARILI!');
        await testDatabaseOperations();
        return true;
        
      } catch (error) {
        log('red', '❌ MongoDB bağlantısı BAŞARISIZ!');
        log('red', `   Hata: ${error.message}`);
        return false;
      }
    }
    
  } catch (error) {
    log('red', `❌ Beklenmeyen hata: ${error.message}`);
    return false;
  }
};

// Veritabanı işlemlerini test et
const testDatabaseOperations = async () => {
  try {
    log('cyan', '\n🧪 Veritabanı İşlemleri Testi:');
    
    const db = mongoose.connection.db;
    
    // Test koleksiyonu oluştur
    const testCollection = db.collection('test_connection');
    
    // Test verisi ekle
    const testDoc = {
      message: 'MongoDB bağlantısı test edildi',
      timestamp: new Date(),
      status: 'success'
    };
    
    await testCollection.insertOne(testDoc);
    log('green', '   ✅ Veri ekleme testi başarılı');
    
    // Test verisini oku
    const foundDoc = await testCollection.findOne({ message: testDoc.message });
    if (foundDoc) {
      log('green', '   ✅ Veri okuma testi başarılı');
    }
    
    // Test verisini sil
    await testCollection.deleteOne({ _id: foundDoc._id });
    log('green', '   ✅ Veri silme testi başarılı');
    
    log('green', '\n🎉 Tüm veritabanı işlemleri başarılı!');
    
  } catch (error) {
    log('red', `❌ Veritabanı işlem hatası: ${error.message}`);
  }
};

// Ana fonksiyon
const main = async () => {
  try {
    const success = await testConnection();
    
    if (success) {
      log('green', '\n🚀 Veritabanı hazır! Şimdi seed verilerini yükleyebilirsiniz:');
      log('cyan', '   npm run seed');
      log('cyan', '   veya: node scripts/seedDatabase.js');
    } else {
      log('red', '\n❌ Veritabanı bağlantısı kurulamadı!');
      log('yellow', 'Lütfen yukarıdaki çözüm önerilerini takip edin.');
    }
    
  } catch (error) {
    log('red', `❌ Test hatası: ${error.message}`);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log('blue', '\n🔌 MongoDB bağlantısı kapatıldı');
    }
    process.exit(0);
  }
};

// Script çalıştırıldığında
if (require.main === module) {
  main();
}

module.exports = { testConnection };