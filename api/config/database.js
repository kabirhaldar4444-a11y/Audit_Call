const mongoose = require('mongoose');

// Global diagnostic tracking
global.lastDbError = null;
global.lastDbAttempt = null;

const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      global.lastDbAttempt = new Date().toISOString();
      console.log(`🔄 Connecting to MongoDB (Attempt ${retryCount + 1}/${maxRetries})...`);
      
      // Fuzzy detection for environment variable typos
      const uri = process.env.MONGODB_URI || 
                  process.env.MONGO_URI || 
                  process.env.MONGODB_URL || 
                  process.env.DATABASE_URL;

      if (!uri || uri.includes('<db_password>')) {
        throw new Error('MONGODB_URI (or equivalent) is undefined in Vercel. Please check your spelling in Vercel Settings.');
      }

      const conn = await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      return conn;
    } catch (error) {
      retryCount++;
      global.lastDbError = error.message;
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
