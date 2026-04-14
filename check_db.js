const mongoose = require('mongoose');

const uri = 'mongodb+srv://kabirhaldar4444_db_user:uSyMCuiQb4N8oLaP@cluster0.uzfncp6.mongodb.net/call_audit?retryWrites=true&w=majority&appName=Cluster0';

console.log('🔄 Testing MongoDB Atlas connection...');

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ SUCCESS: Connected to MongoDB Atlas!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ FAILURE: Connection failed!');
  console.error('Error:', err.message);
  
  if (err.message.includes('IP address')) {
    console.log('\n💡 CAUSE: Your current IP address is not whitelisted in MongoDB Atlas.');
    console.log('Please add 0.0.0.0/0 to your MongoDB Atlas Network Access.');
  }
  
  process.exit(1);
});
