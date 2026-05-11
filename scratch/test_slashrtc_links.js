const axios = require('axios');
const mongoose = require('mongoose');

const URI = "mongodb+srv://kabirhaldar4444_db_user:uSyMCuiQb4N8oLaP@cluster0.uzfncp6.mongodb.net/call_audit?retryWrites=true&w=majority&appName=Cluster0";

async function testLinks() {
  try {
    await mongoose.connect(URI);
    const Call = mongoose.model('Call', new mongoose.Schema({ audioUrl: String }));
    const sample = await Call.findOne({ audioUrl: { $regex: 'slashrtc' } });
    
    if (sample) {
      console.log('Testing URL:', sample.audioUrl);
      try {
        const res = await axios.get(sample.audioUrl, { 
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        console.log('Status Code:', res.status);
        if (res.data.includes('Unable to load requested file')) {
          console.error('DETECTED: SlashRTC Server-side 404 error in the content.');
        } else {
          console.log('Content looks okay (Length:', res.data.length, ')');
        }
      } catch (err) {
        console.error('HTTP Error:', err.message);
      }
    } else {
      console.log('No SlashRTC links found.');
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

testLinks();
