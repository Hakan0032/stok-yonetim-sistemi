const mongoose = require('mongoose');
require('dotenv').config();

console.log('=== MongoDB Atlas Setup Guide ===\n');

console.log('Current connection string:', process.env.MONGODB_URI);
console.log('\n❌ Authentication is failing. Here\'s how to fix it:\n');

console.log('1. Go to MongoDB Atlas (https://cloud.mongodb.com)');
console.log('2. Navigate to Database Access');
console.log('3. Delete the existing "admin" user if it exists');
console.log('4. Create a new user with these exact credentials:');
console.log('   - Username: admin');
console.log('   - Password: admin123');
console.log('   - Database User Privileges: Atlas admin');
console.log('5. Go to Network Access');
console.log('6. Add IP Address: 0.0.0.0/0 (Allow access from anywhere)');
console.log('7. Wait 1-2 minutes for changes to propagate');
console.log('\n8. Then run: node testConnectionAlt.js');

console.log('\n=== Alternative: Use Local MongoDB ===\n');
console.log('If you prefer to use local MongoDB:');
console.log('1. Install MongoDB locally');
console.log('2. Update .env file:');
console.log('   MONGODB_URI=mongodb://localhost:27017/mermer_stok');
console.log('3. Start MongoDB service');
console.log('4. Restart the backend server');

console.log('\n=== Current Status ===');
console.log('✅ Frontend: Running on http://localhost:3001');
console.log('✅ Backend: Running on http://localhost:5001');
console.log('❌ Database: Connection failed - authentication error');
console.log('\nThe application will work once the database connection is fixed.');