const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const CallSchema = new mongoose.Schema({}, { strict: false });
const Call = mongoose.model('Call', CallSchema);

async function sampleIds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const total = await Call.countDocuments();
    console.log(`Total Records: ${total}`);

    const samples = await Call.find({}, { callId: 1 }).limit(20).sort({ createdAt: -1 });
    console.log('Recent Call IDs:');
    samples.forEach(s => console.log(s.callId));

    const compIds = await Call.find({ callId: { $regex: /^COMP-/ } }).limit(20).sort({ createdAt: -1 });
    console.log('\nRecent COMP- IDs:');
    compIds.forEach(s => console.log(s.callId));

    // Check for a specific agent/phone pattern
    if (compIds.length > 0) {
        const first = compIds[0].callId;
        const base = first.substring(0, first.lastIndexOf('-'));
        const count = await Call.countDocuments({ callId: { $regex: new RegExp('^' + base) } });
        console.log(`\nRecords starting with ${base}: ${count}`);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

sampleIds();
