const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Connecting to MongoDB (Attempt ${retryCount + 1}/${maxRetries})...`);
      
      if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<db_password>')) {
        throw new Error('MONGODB_URI is undefined or contains placeholders. Please add your connection string to Vercel/Environment Variables.');
      }

      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retryCount++;
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      
      if (retryCount >= maxRetries) {
        console.error('\n⚠️  MONGODB CONNECTION FAILED');
        console.error('--------------------------------------------------');
        console.error('To fix this:');
        console.error('1. Go to: https://cloud.mongodb.com/');
        console.error('2. Navigate to: Security -> Network Access');
        console.error('3. Click: "+ ADD IP ADDRESS"');
        console.error('4. Select "ALLOW ACCESS FROM ANYWHERE" (for development)');
        console.error('--------------------------------------------------\n');
        
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

module.exports = connectDB;
