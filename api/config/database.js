const mongoose = require('mongoose');

const connectDB = async () => {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Connecting to MongoDB (Attempt ${retryCount + 1}/${maxRetries})...`);
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
        console.error('\n⚠️  MONGODB CONNECTION FAILED - FALLING BACK TO LOCAL MODE');
        console.error('--------------------------------------------------');
        console.error('Data will be stored locally but NOT persisted to the cloud.');
        console.error('To fix this:');
        console.error('1. Go to: https://cloud.mongodb.com/');
        console.error('2. Navigate to: Security -> Network Access');
        console.error('3. Click: "+ ADD IP ADDRESS"');
        console.error('4. Select "ALLOW ACCESS FROM ANYWHERE" (for development)');
        console.error('5. Restart the server');
        console.error('--------------------------------------------------\n');
        
        // Set a flag indicating we're in offline mode
        process.env.DB_MODE = 'offline';
        return null;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

module.exports = connectDB;
