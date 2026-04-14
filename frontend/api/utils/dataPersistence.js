const fs = require('fs');
const path = require('path');

// Local data storage path
const dataStorePath = path.join(__dirname, '../data/calls.json');
const dataDir = path.dirname(dataStorePath);

// Ensure data directory exists
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️  Could not create dataDir in dataPersistence.js. Vercel environment is read-only.');
}

/**
 * Save call data to both MongoDB and local file storage
 */
async function saveCallData(callData, Call) {
  try {
    // Try to save to MongoDB if connected
    if (process.env.DB_MODE !== 'offline' && Call) {
      try {
        await Call.bulkWrite([{
          updateOne: {
            filter: { callId: callData.callId },
            update: { $set: callData },
            upsert: true
          }
        }], { ordered: false });
      } catch (dbError) {
        console.warn('⚠️  Failed to save to MongoDB, saving locally only:', dbError.message);
      }
    }
    
    // Always save to local file as backup
    saveToLocalFile(callData);
  } catch (error) {
    console.error('Error in saveCallData:', error);
    throw error;
  }
}

/**
 * Save a single call record to local JSON file
 */
function saveToLocalFile(callData) {
  try {
    let allCalls = [];
    
    if (fs.existsSync(dataStorePath)) {
      const content = fs.readFileSync(dataStorePath, 'utf8');
      allCalls = JSON.parse(content || '[]');
    }
    
    // Find and update existing call or add new one
    const existingIndex = allCalls.findIndex(c => c.callId === callData.callId);
    if (existingIndex > -1) {
      allCalls[existingIndex] = { ...allCalls[existingIndex], ...callData };
    } else {
      allCalls.push(callData);
    }
    
    fs.writeFileSync(dataStorePath, JSON.stringify(allCalls, null, 2));
    console.log(`📁 Data saved locally: ${callData.callId}`);
  } catch (error) {
    console.error('Error saving to local file:', error);
  }
}

/**
 * Save multiple call records to local JSON file efficiently
 */
function saveManyToLocalFile(newCallsArray) {
  try {
    if (!newCallsArray || !Array.isArray(newCallsArray) || newCallsArray.length === 0) {
      return;
    }

    let allCalls = [];
    if (fs.existsSync(dataStorePath)) {
      try {
        const content = fs.readFileSync(dataStorePath, 'utf8');
        allCalls = JSON.parse(content || '[]');
      } catch (parseError) {
        console.error('Error parsing local file, starting with empty array:', parseError);
        allCalls = [];
      }
    }

    // Use a Map for faster lookups during merging
    const callMap = new Map(allCalls.map(c => [c.callId, c]));
    
    // Add/Update new records
    newCallsArray.forEach(call => {
      if (call.callId) {
        callMap.set(call.callId, { ...(callMap.get(call.callId) || {}), ...call });
      }
    });

    const updatedCalls = Array.from(callMap.values());
    
    // Write once
    fs.writeFileSync(dataStorePath, JSON.stringify(updatedCalls, null, 2));
    console.log(`📁 Bulk data saved locally: ${newCallsArray.length} records processed.`);
    return true;
  } catch (error) {
    console.error('Error in bulk saving to local file:', error);
    return false;
  }
}

/**
 * Get all calls from MongoDB or local file if offline
 */
async function getAllCalls(Call, filters = {}) {
  if (process.env.DB_MODE !== 'offline' && Call) {
    try {
      return await Call.find(filters).sort({ date: -1 });
    } catch (error) {
      console.warn('⚠️  Failed to get calls from MongoDB, using local data:', error.message);
    }
  }
  
  return getCallsFromLocalFile(filters);
}

/**
 * Get calls from local file with filtering
 */
function getCallsFromLocalFile(filters = {}) {
  try {
    if (!fs.existsSync(dataStorePath)) {
      return [];
    }
    
    const content = fs.readFileSync(dataStorePath, 'utf8');
    let allCalls = JSON.parse(content || '[]');
    
    // Apply filters
    if (filters.agentName) {
      allCalls = allCalls.filter(c => 
        c.agentName?.toLowerCase().includes(filters.agentName.toLowerCase())
      );
    }
    
    if (filters.process) {
      allCalls = allCalls.filter(c => 
        c.process?.toLowerCase().includes(filters.process.toLowerCase())
      );
    }
    
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      allCalls = allCalls.filter(c => new Date(c.date) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      allCalls = allCalls.filter(c => new Date(c.date) <= toDate);
    }
    
    // Sort by date descending
    allCalls.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return allCalls;
  } catch (error) {
    console.error('Error reading local file:', error);
    return [];
  }
}

/**
 * Sync all local data to MongoDB (when connection is restored)
 */
async function syncLocalDataToMongoDB(Call) {
  try {
    if (!fs.existsSync(dataStorePath)) {
      return { synced: 0 };
    }
    
    const content = fs.readFileSync(dataStorePath, 'utf8');
    const allCalls = JSON.parse(content || '[]');
    
    if (allCalls.length === 0) {
      return { synced: 0 };
    }
    
    const bulkOps = allCalls.map(call => ({
      updateOne: {
        filter: { callId: call.callId },
        update: { $set: call },
        upsert: true
      }
    }));
    
    const result = await Call.bulkWrite(bulkOps, { ordered: false });
    console.log(`✅ Synced ${allCalls.length} records to MongoDB`);
    
    return { synced: allCalls.length };
  } catch (error) {
    console.error('Error syncing data to MongoDB:', error);
    return { synced: 0, error: error.message };
  }
}

module.exports = {
  saveCallData,
  getAllCalls,
  saveToLocalFile,
  saveManyToLocalFile,
  getCallsFromLocalFile,
  syncLocalDataToMongoDB,
  getDataStorePath: () => dataStorePath
};
