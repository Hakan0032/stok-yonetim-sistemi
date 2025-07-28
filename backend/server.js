const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Rate limiting - disabled for development
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
// });

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
// app.use(limiter); // disabled for development
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection configuration
const connectDB = async () => {
  try {
    // Primary MongoDB URI (Atlas for production, local for development)
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mermer_stok';
    
    // Fallback to local MongoDB if Atlas connection fails
    const LOCAL_MONGODB_URI = `mongodb://${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 27017}/${process.env.DB_NAME || 'mermer_stok'}`;
    
    console.log('MongoDB bağlantısı deneniyor...');
    console.log('Primary URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // 5 second timeout
      });
      console.log('✅ MongoDB Atlas bağlantısı başarılı');
    } catch (atlasError) {
      console.log('⚠️ MongoDB Atlas bağlantısı başarısız, local MongoDB deneniyor...');
      console.log('Atlas Error:', atlasError.message);
      
      try {
        await mongoose.connect(LOCAL_MONGODB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
        });
        console.log('✅ Local MongoDB bağlantısı başarılı');
      } catch (localError) {
        console.error('❌ Hem Atlas hem de local MongoDB bağlantısı başarısız');
        console.error('Local Error:', localError.message);
        throw new Error('MongoDB bağlantısı kurulamadı');
      }
    }
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error.message);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/materials', require('./routes/materials'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Sunucu hatası', error: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Endpoint bulunamadı' });
});

const PORT = process.env.PORT || 5001;
// Server restart trigger

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
});

module.exports = app;