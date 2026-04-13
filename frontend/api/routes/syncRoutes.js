const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const Call = require('../models/Call');
const { syncLocalDataToMongoDB } = require('../utils/dataPersistence');

const router = express.Router();

/**
 * Sync local file data to MongoDB (when connection is restored)
 */
router.post('/sync-local-data', authenticate, adminOnly, async (req, res) => {
  try {
    if (process.env.DB_MODE !== 'offline') {
      return res.status(400).json({
        message: 'System is already connected to MongoDB. Sync not needed.',
        databaseMode: 'online'
      });
    }

    const result = await syncLocalDataToMongoDB(Call);

    res.status(200).json({
      message: 'Data sync completed',
      data: result,
      databaseMode: 'offline'
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({
      message: 'Error syncing local data',
      error: error.message
    });
  }
});

/**
 * Get current database status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    res.status(200).json({
      message: 'Database status',
      data: {
        mode: process.env.DB_MODE || 'online',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error getting database status',
      error: error.message
    });
  }
});

module.exports = router;
