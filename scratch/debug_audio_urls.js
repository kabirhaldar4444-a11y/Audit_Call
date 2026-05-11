const mongoose = require('mongoose');

const URI = "mongodb+srv://kabirhaldar4444_db_user:uSyMCuiQb4N8oLaP@cluster0.uzfncp6.mongodb.net/call_audit?retryWrites=true&w=majority&appName=Cluster0";

async function checkData() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to DB');
    
    const Call = mongoose.model('Call', new mongoose.Schema({
      callId: String,
      audioUrl: String
    }));
    
    const sample = await Call.findOne({ audioUrl: { $ne: '' } });
    if (sample) {
      console.log('--- SAMPLE RECORD ---');
      console.log('Call ID:', sample.callId);
      console.log('Audio URL:', sample.audioUrl);
    } else {
      console.log('No records with audio URLs found.');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();
