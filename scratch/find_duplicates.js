const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

const CallSchema = new mongoose.Schema({
  callId: String,
  agentName: String,
  date: Date
}, { strict: false });

const Call = mongoose.model('Call', CallSchema);

async function findDuplicates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const total = await Call.countDocuments();
    console.log(`Total Records: ${total}`);

    const genericIds = await Call.find({ callId: { $regex: /^GEN-/ } }).countDocuments();
    console.log(`Generic (GEN-...) Records: ${genericIds}`);

    const naIds = await Call.find({ callId: "N/A" }).countDocuments();
    console.log(`N/A Call IDs: ${naIds}`);

    const duplicates = await Call.aggregate([
      {
        $group: {
          _id: "$callId",
          count: { $sum: 1 },
          agentNames: { $addToSet: "$agentName" }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    if (duplicates.length === 0) {
      console.log('No duplicate Call IDs found.');
    } else {
      console.log(`Found ${duplicates.length} groups of duplicate Call IDs:`);
      duplicates.forEach(d => {
        console.log(`\nCall ID: ${d._id} (Found ${d.count} times by agents: ${d.agentNames.join(', ')})`);
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

findDuplicates();
