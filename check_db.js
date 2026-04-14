const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the backend directory
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

// We need to require the model. Let's check where it is.
const Call = require('./backend/models/Call');

const checkDB = async () => {
  try {
    console.log('Connecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');
    
    // Check which database is being used
    console.log('Using database:', mongoose.connection.db.databaseName);

    const count = await Call.countDocuments();
    console.log('Total calls in DB:', count);
    
    const activeCount = await Call.countDocuments({ isActive: true });
    console.log('Active calls in DB:', activeCount);

    const sample = await Call.findOne();
    if (sample) {
        console.log('Sample data found:');
        console.log('Call ID:', sample.callId);
        console.log('IsActive:', sample.isActive);
        console.log('Agent:', sample.agentName);
    } else {
        console.log('No records found in "calls" collection.');
        
        // Let's check all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkDB();
