const { MongoClient } = require('mongodb');
require('dotenv').config();

console.log('Testing MongoDB connection with MongoClient...');
console.log('MongoDB URI:', process.env.MONGODB_URI);

// Parse the connection string to check components
const uri = process.env.MONGODB_URI;
console.log('Connection string components:');
const urlParts = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@([^/]+)\/([^?]+)/);
if (urlParts) {
  console.log('Username:', urlParts[1]);
  console.log('Password:', urlParts[2]);
  console.log('Cluster:', urlParts[3]);
  console.log('Database:', urlParts[4]);
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
});

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test database access
    const db = client.db();
    console.log('Database name:', db.databaseName);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await client.close();
    console.log('Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error codeName:', error.codeName);
    await client.close();
    process.exit(1);
  }
}

testConnection();