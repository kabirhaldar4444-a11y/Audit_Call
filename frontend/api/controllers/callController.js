const Call = require('../models/Call');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { saveToLocalFile } = require('../utils/dataPersistence');

const getAllCalls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Built-in Filtering
    const filter = { isActive: true };
    if (req.query.callId) filter.callId = { $regex: req.query.callId, $options: 'i' };
    if (req.query.agentName) filter.agentName = { $regex: req.query.agentName, $options: 'i' };
    if (req.query.process) filter.process = { $regex: req.query.process, $options: 'i' };
    if (req.query.status) filter.status = req.query.status;
    
    // Date range filtering
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) {
        filter.date.$gte = new Date(req.query.dateFrom);
      }
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filter.date.$lte = toDate;
      }
    }

    // Sorting
    const sortField = req.query.sortField || 'date';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortField]: sortOrder };

    const total = await Call.countDocuments(filter);
    const calls = await Call.find(filter)
      .populate('uploadedBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: 'Calls retrieved successfully',
      data: calls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      databaseMode: process.env.DB_MODE || 'online'
    });
  } catch (error) {
    console.error('Error in getAllCalls:', error);
    res.status(500).json({ message: 'Error retrieving calls', error: error.message });
  }
};

const getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await Call.findById(id).populate('uploadedBy', 'username email');

    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    res.status(200).json({
      message: 'Call retrieved successfully',
      data: call,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving call', error: error.message });
  }
};

const createCall = async (req, res) => {
  try {
    const { callId, agentName, date, phoneNumber, duration, remarks } = req.body;

    if (!callId || !agentName || !date) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingCall = await Call.findOne({ callId });
    if (existingCall) {
      return res.status(400).json({ message: 'Call with this ID already exists' });
    }

    const newCall = new Call({
      callId,
      agentName,
      date: new Date(date),
      phoneNumber,
      duration,
      remarks,
      audioUrl: '', 
      uploadedBy: req.userId,
    });

    await newCall.save();

    res.status(201).json({
      message: 'Call created successfully',
      data: newCall,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating call', error: error.message });
  }
};

const uploadCallData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel or CSV file' });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      databaseMode: process.env.DB_MODE || 'online'
    };

    const seenIdsInBatch = new Set();

    for (const row of data) {
      try {
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
          normalizedRow[normalizedKey] = row[key];
        });

        const rawCallId = 
          normalizedRow['call id'] || 
          normalizedRow['callid'] || 
          normalizedRow['id'] || 
          normalizedRow['s no'] || 
          normalizedRow['serial number'] || 
          normalizedRow['lead id'] ||
          Object.values(row)[0];

        let callId = String(rawCallId || '').trim();

        if (!callId) {
          callId = `GEN-${Date.now()}`;
        }

        let uniqueCallId = callId;
        let counter = 1;
        while (seenIdsInBatch.has(uniqueCallId)) {
          uniqueCallId = `${callId}_${counter}`;
          counter++;
        }
        seenIdsInBatch.add(uniqueCallId);

        const agentName = String(normalizedRow['agent full name'] || normalizedRow['agent name'] || normalizedRow['agent'] || normalizedRow['agentname'] || normalizedRow['staff'] || 'Unknown Agent').trim();
        const agentEmail = String(normalizedRow['agent email'] || normalizedRow['email'] || normalizedRow['agentemail'] || '').toLowerCase().trim();
        const processName = String(normalizedRow['process'] || normalizedRow['dept'] || normalizedRow['department'] || 'General').trim();
        
        const dateStr = (normalizedRow['date'] || normalizedRow['date time'] || normalizedRow['date & time'] || normalizedRow['timestamp'] || normalizedRow['time'] || normalizedRow['date-time'] || new Date().toISOString()).toString().trim();
        const date = new Date(dateStr);
        const finalDate = isNaN(date.getTime()) ? new Date() : date;

        const phoneNumber = String(normalizedRow['phone number'] || normalizedRow['phone'] || normalizedRow['customer number'] || normalizedRow['mobile'] || '').trim();
        const duration = String(normalizedRow['talktime'] || normalizedRow['talk time'] || normalizedRow['duration'] || normalizedRow['call duration'] || normalizedRow['call time'] || normalizedRow['length'] || '').trim();
        const remarks = String(normalizedRow['remarks'] || normalizedRow['comment'] || normalizedRow['comment'] || '').trim();
        const customerName = String(normalizedRow['customer name'] || normalizedRow['customer'] || '').trim();
        const recordingPath = String(normalizedRow['recording path'] || normalizedRow['audio link'] || normalizedRow['audio url'] || normalizedRow['recording link'] || '').trim();

        const updateData = {
          callId: uniqueCallId,
          agentName,
          agentEmail,
          process: processName,
          date: finalDate,
          phoneNumber,
          duration,
          remarks,
          customerName,
          uploadedBy: req.userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (recordingPath) {
          updateData.audioUrl = recordingPath;
        }

        // Try to save to MongoDB
        try {
          const newCall = new Call(updateData);
          await newCall.save();
          results.success++;
        } catch (saveErr) {
          // If MongoDB fails, save locally
          if (process.env.DB_MODE === 'offline') {
            saveToLocalFile(updateData);
            results.success++;
          } else {
            throw saveErr;
          }
        }
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${results.success + results.failed}: ${err.message}`);
      }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    console.log(`✅ Upload complete: ${results.success} success, ${results.failed} failed`);
    res.status(200).json({
      message: 'Call data uploaded successfully',
      data: results,
    });
  } catch (error) {
    console.error('❌ UPLOAD ERROR:', error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    
    let errorMessage = 'Error uploading data';
    if (error.code === 11000) errorMessage = 'Duplicate Call IDs detected in the system.';
    else if (error.name === 'ValidationError') errorMessage = `Data validation failed: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    else if (error.message) errorMessage = error.message;

    res.status(500).json({ message: errorMessage, error: error.message, databaseMode: process.env.DB_MODE || 'online' });
  }
};

const deleteCalls = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of call IDs to delete' });
    }
    await Call.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: `${ids.length} records deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting records', error: error.message });
  }
};

const uploadAudio = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload audio files' });
    }
    const results = { total: req.files.length, success: 0, failed: 0, errors: [] };
    for (const file of req.files) {
      try {
        const callId = path.basename(file.originalname, path.extname(file.originalname)).trim();
        const call = await Call.findOne({ callId });
        if (!call) {
          results.failed++;
          results.errors.push(`No call record found matching filename: ${file.originalname}`);
          continue;
        }
        call.audioUrl = `/uploads/audio/${file.filename}`;
        call.audioFilename = file.filename;
        await call.save();
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing file ${file.originalname}: ${err.message}`);
      }
    }
    res.status(200).json({ message: 'Audio files processed successfully', data: results });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading audio files', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalCalls = await Call.countDocuments({ isActive: true });
    const pendingCalls = await Call.countDocuments({ status: 'pending', isActive: true });
    const auditedCalls = await Call.countDocuments({ status: 'audited', isActive: true });
    
    // Get recent calls grouped by date
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const callsInLast7Days = await Call.countDocuments({ 
      date: { $gte: last7Days },
      isActive: true 
    });
    
    res.status(200).json({ 
      message: 'Dashboard stats retrieved successfully', 
      data: { 
        totalCalls, 
        pendingCalls, 
        auditedCalls,
        callsInLast7Days,
        databaseMode: process.env.DB_MODE || 'online'
      } 
    });
  } catch (error) {
    console.error('Error retrieving dashboard stats:', error);
    res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
  }
};

const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'audited'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }
    const call = await Call.findByIdAndUpdate(id, { status }, { new: true });
    if (!call) return res.status(404).json({ status: 'error', message: 'Call not found' });
    res.json({ status: 'success', data: call });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const getCallsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Please provide startDate and endDate in query parameters' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      date: {
        $gte: start,
        $lte: end
      }
    };

    if (req.query.agentName) {
      filter.agentName = { $regex: req.query.agentName, $options: 'i' };
    }

    if (req.query.process) {
      filter.process = { $regex: req.query.process, $options: 'i' };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await Call.countDocuments(filter);
    const calls = await Call.find(filter)
      .populate('uploadedBy', 'username email')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      message: 'Calls retrieved by date range successfully',
      data: calls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        }
      },
      databaseMode: process.env.DB_MODE || 'online'
    });
  } catch (error) {
    console.error('Error in getCallsByDateRange:', error);
    res.status(500).json({ 
      message: 'Error retrieving calls by date range', 
      error: error.message 
    });
  }
};

module.exports = { 
  getAllCalls, 
  getCallById, 
  createCall, 
  getDashboardStats, 
  uploadCallData, 
  uploadAudio,
  deleteCalls,
  updateCallStatus,
  getCallsByDateRange
};
