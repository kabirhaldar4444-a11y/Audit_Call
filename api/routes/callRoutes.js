const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { 
  getAllCalls, 
  getCallById, 
  createCall, 
  getDashboardStats, 
  uploadCallData, 
  uploadAudio,
  deleteCalls,
  updateCallStatus,
  getCallsByDateRange
} = require('../controllers/callController');
const { audioUpload, dataUpload } = require('../utils/upload');

const router = express.Router();

router.get('/stats', authenticate, adminOnly, getDashboardStats);
router.get('/by-date', authenticate, adminOnly, getCallsByDateRange);
router.get('/', authenticate, adminOnly, getAllCalls);
router.get('/:id', authenticate, adminOnly, getCallById);
router.post('/', authenticate, adminOnly, createCall);
router.post('/delete', authenticate, adminOnly, deleteCalls);
router.patch('/:id/status', authenticate, updateCallStatus);

// Upload routes
router.post('/upload-data', authenticate, adminOnly, dataUpload.single('file'), uploadCallData);
router.post('/upload-audio', authenticate, adminOnly, audioUpload.array('files', 50), uploadAudio);

module.exports = router;
