const mongoose = require('mongoose');
require('dotenv').config();

class DatabaseConnection {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      // MongoDB Atlas bağlantısını dene
      if (process.env.MONGODB_URI) {
        console.log('🔄 MongoDB Atlas bağlantısı deneniyor...');
        await this.connectToAtlas();
      } else {
        // Yerel MongoDB'ye bağlan
        console.log('🔄 Yerel MongoDB bağlantısı deneniyor...');
        await this.connectToLocal();
      }
    } catch (error) {
      console.error('❌ Veritabanı bağlantı hatası:', error.message);
      
      if (this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        console.log(`🔄 ${this.retryDelay / 1000} saniye sonra tekrar denenecek... (${this.connectionAttempts}/${this.maxRetries})`);
        
        setTimeout(() => {
          this.connect();
        }, this.retryDelay);
      } else {
        console.error('❌ Maksimum bağlantı denemesi aşıldı. Uygulama sonlandırılıyor.');
        process.exit(1);
      }
    }
  }

  async connectToAtlas() {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    await mongoose.connect(process.env.MONGODB_URI, options);
    this.isConnected = true;
    console.log('✅ MongoDB Atlas bağlantısı başarılı!');
    console.log(`📊 Veritabanı: ${mongoose.connection.name}`);
  }

  async connectToLocal() {
    const localUri = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'stok_yonetim'}`;
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(localUri, options);
    this.isConnected = true;
    console.log('✅ Yerel MongoDB bağlantısı başarılı!');
    console.log(`📊 Veritabanı: ${mongoose.connection.name}`);
  }

  setupEventListeners() {
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose bağlantısı kuruldu');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose bağlantı hatası:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose bağlantısı kesildi');
      this.isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB bağlantısı kapatıldı (SIGINT)');
        process.exit(0);
      } catch (error) {
        console.error('❌ Bağlantı kapatma hatası:', error);
        process.exit(1);
      }
    });

    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        console.log('🛑 MongoDB bağlantısı kapatıldı (SIGTERM)');
        process.exit(0);
      } catch (error) {
        console.error('❌ Bağlantı kapatma hatası:', error);
        process.exit(1);
      }
    });
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    };
  }

  async testConnection() {
    try {
      await mongoose.connection.db.admin().ping();
      console.log('🏓 Veritabanı ping başarılı!');
      return true;
    } catch (error) {
      console.error('❌ Veritabanı ping hatası:', error);
      return false;
    }
  }
}

module.exports = new DatabaseConnection();