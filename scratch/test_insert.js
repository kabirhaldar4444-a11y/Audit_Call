const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

async function testUpload() {
  const testData = [
    {
      callId: 'TEST_DUP_1',
      agentName: 'Test Agent',
      date: new Date().toISOString(),
      uploadedBy: '65e0... (some valid id)', // Wait, I need a valid ID
      status: 'pending'
    },
    {
        callId: 'TEST_DUP_1',
        agentName: 'Test Agent',
        date: new Date().toISOString(),
        status: 'pending'
    }
  ];

  try {
    // I can't easily test the API because I need a JWT token.
    // But I can test the controller logic by running it directly.
    const mongoose = require('mongoose');
    const Call = require('../backend/models/Call');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const callsToSave = testData.map(d => ({ ...d, uploadedBy: '65e0f7a77b8e1a2b3c4d5e6f' }));

    const bulkOps = callsToSave.map(call => ({
      insertOne: {
        document: call
      }
    }));

    console.log('Attempting bulkWrite with insertOne...');
    const result = await Call.bulkWrite(bulkOps, { ordered: false });
    console.log('Result:', JSON.stringify(result, null, 2));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testUpload();
