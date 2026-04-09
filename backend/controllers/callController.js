const Call = require('../models/Call');
const fs = require('fs');
const path = require('path');

const xlsx = require('xlsx');

const getAllCalls = async (req, res) => {
  try {
    const calls = await Call.find({ isActive: true })
      .populate('uploadedBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Calls retrieved successfully',
      data: calls,
    });
  } catch (error) {
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

    // Validate input
    if (!callId || !agentName || !date) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if call already exists
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
    };

    if (data.length > 0) {
      console.log('📊 Detected Excel Data (First Row):', data[0]);
    }

    for (const row of data) {
      try {
        // Normalize keys for robust matching
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          const normalizedKey = key.toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
          normalizedRow[normalizedKey] = row[key];
        });

        // Mapping with normalized keys
        const callId = String(
          normalizedRow['call id'] || 
          normalizedRow['callid'] || 
          normalizedRow['id'] || 
          normalizedRow['s no'] || 
          normalizedRow['serial number'] || 
          Object.values(row)[0] || 
          ''
        );

        const agentName = 
          normalizedRow['agent full name'] || 
          normalizedRow['agent name'] || 
          normalizedRow['agent'] || 
          normalizedRow['agentname'] || 
          normalizedRow['staff'] ||
          'Unknown Agent';

        const agentEmail = 
          normalizedRow['agent email'] || 
          normalizedRow['email'] || 
          normalizedRow['agentemail'] || 
          '';

        const processName = 
          normalizedRow['process'] || 
          normalizedRow['dept'] || 
          normalizedRow['department'] || 
          'General';

        const dateStr = 

          normalizedRow['date'] || 
          normalizedRow['date time'] || 
          normalizedRow['date & time'] || 
          normalizedRow['timestamp'] || 
          normalizedRow['time'] ||
          new Date().toISOString(); 

        const phoneNumber = String(normalizedRow['phone number'] || normalizedRow['phone'] || normalizedRow['customer number'] || normalizedRow['mobile'] || '');
        const duration = normalizedRow['duration'] || normalizedRow['call duration'] || normalizedRow['length'] || '';
        const remarks = normalizedRow['remarks'] || normalizedRow['comment'] || '';
        const customerName = normalizedRow['customer name'] || normalizedRow['customer'] || '';
        const recordingPath = normalizedRow['recording path'] || normalizedRow['audio link'] || normalizedRow['audio url'] || normalizedRow['recording link'] || '';

        if (!callId) {
          results.failed++;
          results.errors.push(`Row missing a primary identifier (Call ID). Available keys: ${Object.keys(normalizedRow).join(', ')}`);
          continue;
        }

        const date = new Date(dateStr);
        const finalDate = isNaN(date.getTime()) ? new Date() : date;

        // Upsert call data
        await Call.findOneAndUpdate(
          { callId },
          {
            agentName,
            agentEmail,
            process: processName,
            date: finalDate,
            phoneNumber,
            duration,
            remarks,
            customerName,
            audioUrl: recordingPath || '', // Use path from Excel if provided
            uploadedBy: req.userId,
            isActive: true,
          },
          { upsert: true, new: true }
        );


        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing row: ${err.message}`);
        console.error('Row processing error:', err);
      }
    }


    if (results.success === 0 && results.total > 0) {
      console.warn('⚠️ No records were successfully processed. Errors:', results.errors);
    }


    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.status(200).json({
      message: 'Call data uploaded successfully',
      data: results,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error uploading call data', error: error.message });
  }
};

const deleteCalls = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of call IDs to delete' });
    }

    // Soft delete or hard delete based on requirements. Here using hard delete as requested.
    await Call.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      message: `${ids.length} records deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting records', error: error.message });
  }
};

const uploadAudio = async (req, res) => {

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload audio files' });
    }

    const results = {
      total: req.files.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const file of req.files) {
      try {
        // Extract call ID from filename (e.g., "CALL001.mp3" -> "CALL001")
        const callId = path.basename(file.originalname, path.extname(file.originalname));
        
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

    res.status(200).json({
      message: 'Audio files processed successfully',
      data: results,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading audio files', error: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalCalls = await Call.countDocuments({ isActive: true });
    const pendingCalls = await Call.countDocuments({ status: 'pending', isActive: true });
    const auditedCalls = await Call.countDocuments({ status: 'audited', isActive: true });

    res.status(200).json({
      message: 'Dashboard stats retrieved successfully',
      data: {
        totalCalls,
        pendingCalls,
        auditedCalls,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
  }
};

// Update call status
const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'audited'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    const call = await Call.findByIdAndUpdate(id, { status }, { new: true });
    
    if (!call) {
      return res.status(404).json({ status: 'error', message: 'Call not found' });
    }

    res.json({ status: 'success', data: call });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
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
  updateCallStatus
};
