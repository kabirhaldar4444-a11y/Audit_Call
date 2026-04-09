const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    
    if (error.message.includes('IP') || error.message.includes('whitelist') || error.message.includes('connect ECONNREFUSED')) {
      console.error('\n🛑 IP WHITELIST ERROR DETECTED!');
      console.error('--------------------------------------------------');
      console.error('Your current IP address needs to be whitelisted in MongoDB Atlas.');
      console.error('1. Go to: https://cloud.mongodb.com/');
      console.error('2. Navigate to: Security -> Network Access');
      console.error('3. Click: "+ ADD IP ADDRESS"');
      console.error('4. Add your current IP: 106.211.57.53');
      console.error('   (Or click "ALLOW ACCESS FROM ANYWHERE" for testing)');
      console.error('--------------------------------------------------\n');
    } else {
      console.error('\n📌 Check your .env file:');
      console.error('   - Is MONGODB_URI correct?');
      console.error('   - Did you replace <db_password> with your actual password?');
      console.error('   - Is your MongoDB cluster active?');
    }
    
    process.exit(1);
  }

};

module.exports = connectDB;
