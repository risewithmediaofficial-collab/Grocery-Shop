const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 3000) => {
  let primaryUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/columbu_stores';
  let fallbackUri = null;

  if (primaryUri.includes('columbu_secure_mongo_password_2024')) {
    fallbackUri = primaryUri.replace('columbu_secure_mongo_password_2024', 'columbu_secret_pwd');
  } else if (primaryUri.includes('columbu_secret_pwd')) {
    fallbackUri = primaryUri.replace('columbu_secret_pwd', 'columbu_secure_mongo_password_2024');
  }

  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await mongoose.connect(primaryUri);
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${i}/${retries} failed: ${error.message}`);

      if (fallbackUri && error.message && error.message.toLowerCase().includes('auth')) {
        try {
          console.log('Retrying MongoDB connection with fallback credentials...');
          const conn = await mongoose.connect(fallbackUri);
          console.log(`MongoDB Connected (fallback credentials): ${conn.connection.host}`);
          return conn;
        } catch (fallbackError) {
          console.error(`Fallback MongoDB connection attempt failed: ${fallbackError.message}`);
        }
      }

      if (i === retries) {
        console.error('All MongoDB connection attempts exhausted. Exiting...');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
