const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

async function checkAndFixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('calls');

    console.log('\n--- Current Indexes ---');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    const callIdIndex = indexes.find(idx => idx.key.callId === 1);
    if (callIdIndex && callIdIndex.unique) {
      console.log('\n⚠️ Found unique index on callId. Dropping it to allow duplicates...');
      await collection.dropIndex(callIdIndex.name);
      console.log('✅ Unique index dropped successfully.');
    } else {
      console.log('\nNo unique index on callId found.');
    }

    console.log('\n--- Duplicate Check ---');
    const callIdToCheck = '1068670';
    const count = await collection.countDocuments({ 
        callId: { $regex: new RegExp('^' + callIdToCheck) } 
    });
    console.log(`Found ${count} records matching Call ID ${callIdToCheck}*`);

    const records = await collection.find({ 
        callId: { $regex: new RegExp('^' + callIdToCheck) } 
    }).toArray();
    
    records.forEach(r => {
        console.log(`- ID: ${r.callId}, Date: ${r.date}, Agent: ${r.agentName}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAndFixIndexes();
