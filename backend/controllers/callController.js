const Call = require('../models/Call');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { saveToLocalFile, saveManyToLocalFile, getCallsFromLocalFile } = require('../utils/dataPersistence');

/**
 * Helpers for data processing
 */
const normalizeRow = (row) => {
  const normalized = {};
  Object.keys(row).forEach(key => {
    const lowerKey = key.toLowerCase().trim();
    const spaceNormalizedKey = lowerKey.replace(/_/g, ' ').replace(/\s+/g, ' ');
    const noSpaceKey = lowerKey.replace(/_/g, '').replace(/\s+/g, '');
    
    normalized[spaceNormalizedKey] = row[key];
    if (!normalized[noSpaceKey]) normalized[noSpaceKey] = row[key];
  });
  return normalized;
};

const getValFromRow = (normalizedRow, keys) => {
  for (const k of keys) {
    let val = normalizedRow[k];
    if (val !== undefined && val !== null) {
      let s = String(val).trim();
      if (s !== '' && s !== '--' && s !== '---' && s !== 'N/A' && s !== 'null' && s !== 'undefined') return s;
    }
  }
  return '';
};

const parseDate = (dateStr) => {
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  if (!dateStr) return new Date();

  let s = dateStr.toString().trim();
  const ddmm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
  if (ddmm) {
    let day = parseInt(ddmm[1]);
    let month = parseInt(ddmm[2]) - 1;
    const year = parseInt(ddmm[3]);
    const now = new Date();
    if (year === now.getFullYear()) {
      const date1 = new Date(year, month, day);
      const date2 = new Date(year, day - 1, month + 1);
      if (date1 > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && date2 <= now) {
        day = month + 1;
        month = parseInt(ddmm[1]) - 1;
      }
    }
    const timePart = ddmm[4].trim();
    if (timePart) {
      const parts = timePart.split(/[:\s]/).filter(x => x).map(Number);
      return new Date(year, month, day, ...parts);
    }
    return new Date(year, month, day);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
};

const getAllCalls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Built-in Filtering
    const filter = { isActive: true };
    if (req.query.callId) filter.callId = { $regex: req.query.callId, $options: 'i' };
    if (req.query.agentName) filter.agentName = { $regex: req.query.agentName, $options: 'i' };
    if (req.query.campaign) filter.campaign = { $regex: req.query.campaign, $options: 'i' };
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

    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    let total, calls;

    if (!isOffline) {
      try {
        [total, calls] = await Promise.all([
          Call.countDocuments(filter),
          Call.find(filter)
            .populate('uploadedBy', 'username email')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean()
        ]);
      } catch (dbError) {
        console.warn('⚠️  MongoDB Fetch failed, falling back to local:', dbError.message);
        const localData = getCallsFromLocalFile(req.query);
        total = localData.length;
        calls = localData.slice(skip, skip + limit);
      }
    } else {
      const localData = getCallsFromLocalFile(req.query);
      total = localData.length;
      calls = localData.slice(skip, skip + limit);
    }

    res.status(200).json({
      message: 'Calls retrieved successfully',
      data: calls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      databaseMode: isOffline ? 'offline' : 'online'
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
    const { callId, agentName, agentEmail, campaign, firstDispose, dispose, process, date, callTime, phoneNumber, duration, remarks, customerName } = req.body;

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
      agentEmail,
      campaign,
      firstDispose,
      dispose,
      process: process || 'General',
      date: new Date(date),
      callTime,
      phoneNumber,
      duration,
      remarks,
      customerName,
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

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
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
    const callsToSave = [];
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    console.log(`📡 Upload request received. Database state: ${mongoose.connection.readyState}, Mode: ${process.env.DB_MODE || 'online'}, Fallback: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
    const batchTimestamp = Date.now();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const normalizedRow = normalizeRow(row);
        const getVal = (keys) => getValFromRow(normalizedRow, keys);

        // Robust Call ID extraction
        let rawCallId = getVal(['call id', 'callid', 'sl no', 'serial no', 'slno', 'id', 'uid', 'record id', 'recordid', 'lead id', 'leadid']);
        
        // HIGHER PRIORITY: Look for a UUID-like string in any column FIRST
        const allValues = Object.values(row);
        let foundUuid = '';
        for (const val of allValues) {
          const s = String(val).trim();
          if (s.length > 15 && (s.includes('-') || /^[a-f0-9]{15,}$/i.test(s))) {
            foundUuid = s;
            break;
          }
        }
        
        if (foundUuid) {
          rawCallId = foundUuid;
        }

        // Map fields early to help with ID generation
        const agentName = String(getVal(['agent', 'agent name', 'agentname', 'agent full name', 'agentfullname', 'staff', 'caller', 'user']) || 'Unknown Agent').trim();
        const phoneNumber = String(getVal(['phone number', 'phonenumber', 'phone', 'customer number', 'customernumber', 'mobile', 'contact']) || '').trim();
        const dateStr = getVal(['date & time', 'date time', 'datetime', 'date', 'timestamp', 'time', 'date-time', 'call date', 'calldate', 'transaction date', 'transactiondate']);
        const finalDate = parseDate(dateStr);
        const datePart = finalDate.toISOString().split('T')[0];

        // Final fallback: If ID looks like a short number (Agent ID) or is missing, make it composite
        const idStr = String(rawCallId || '').trim();
        const isNumericAndShort = idStr.length > 0 && idStr.length < 10 && /^\d+$/.test(idStr);
        
        if (!idStr || isNumericAndShort) {
          const agentPart = agentName.toLowerCase().replace(/\s+/g, '');
          const phonePart = phoneNumber.replace(/\D/g, '') || '0000';
          // Include datePart to prevent cross-day collisions
          rawCallId = `COMP-${agentPart}-${phonePart}-${datePart}-${i}`;
        }

        let callId = String(rawCallId || '').trim();

        let uniqueCallId = callId;
        const globalIndex = i; // For single file upload, start index is always 0
        
        // Prevent collisions within this upload batch
        if (seenIdsInBatch.has(uniqueCallId)) {
          uniqueCallId = `${callId}_${globalIndex}`;
        }
        seenIdsInBatch.add(uniqueCallId);

        // Map remaining fields
        const agentEmail = String(getVal(['agent email', 'agentemail', 'email', 'email id', 'emailid']) || '').toLowerCase().trim();
        const firstDispose = String(getVal(['first dispose', 'first_dispose', 'firstdisposition', 'sub disposition', 'sub_disposition', 'subdisposition', 'reason', 'substatus', 'sub-status']) || '').trim();
        const dispose = String(getVal(['dispose', 'disposition', 'status', 'result', 'call result', 'callresult', 'resolution', 'terminating reason', 'disconnect reason', 'agent status', 'call status']) || '').trim();
        const campaign = String(getVal(['campaign', 'campaign name', 'campaign_name', 'campaign id', 'campaign_id', 'camp', 'campaignname', 'campaignid', 'queue', 'queue name']) || '').trim();
        const processName = String(getVal(['process', 'dept', 'department', 'department name', 'departmentname', 'campaign', 'project', 'client']) || 'General').trim();
        const callTime = String(getVal(['call time', 'calltime', 'time of call', 'timeofcall']) || '').trim();
        const duration = String(getVal(['duration', 'talktime', 'talk time', 'call duration', 'callduration', 'call time', 'calltime', 'length']) || '').trim();
        const remarks = String(getVal(['remarks', 'comment', 'notes', 'feedback']) || '').trim();
        const customerName = String(getVal(['customer name', 'customername', 'customer', 'client name', 'clientname']) || '').trim();
        const recordingPath = String(getVal(['recording path', 'recordingpath', 'audio link', 'audiolink', 'audio url', 'audiourl', 'recording link', 'recordinglink']) || '').trim();

        const callDoc = {
          callId: uniqueCallId,
          agentName,
          agentEmail,
          campaign,
          firstDispose,
          dispose,
          process: processName,
          date: finalDate,
          callTime,
          phoneNumber,
          duration,
          remarks,
          customerName,
          uploadedBy: req.userId,
          isActive: true,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (recordingPath) {
          callDoc.audioUrl = recordingPath;
        }

        callsToSave.push(callDoc);
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Data processing failed - ${err.message}`);
      }
    }

    // Perform Bulk Save
    if (callsToSave.length > 0) {
      if (!isOffline) {
        try {
          // Use insertOne to ensure every row becomes a new record (allowing duplicates)
          const bulkOps = callsToSave.map(call => ({
            insertOne: {
              document: call
            }
          }));

          const bulkResult = await Call.bulkWrite(bulkOps, { ordered: false });
          results.success = bulkResult.insertedCount || bulkResult.nInserted || callsToSave.length;
        } catch (dbErr) {
          console.error('❌ MongoDB Bulk Save failed:', dbErr.message);
          // Vercel fallback is impossible (read-only), so we report the REAL error
          results.failed += callsToSave.length;
          results.errors.push(`Database Error: ${dbErr.message || 'Connection refused'}. Please check your MongoDB IP whitelist settings.`);
        }
      } else {
        // Direct local save if already in offline mode
        results.failed += callsToSave.length;
        results.errors.push('System is in OFFLINE mode. Data cannot be saved to Vercel disk. Please ensure MongoDB is connected.');
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

const uploadCallDataBatch = async (req, res) => {
  try {
    const { data, startIndex = 0 } = req.body;
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ message: 'Please provide an array of data records' });
    }

    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: [],
      databaseMode: process.env.DB_MODE || 'online'
    };

    const seenIdsInBatch = new Set();
    const callsToSave = [];
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    const batchTimestamp = Date.now();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const normalizedRow = normalizeRow(row);
        const getVal = (keys) => getValFromRow(normalizedRow, keys);

        // Robust Call ID extraction
        let rawCallId = getVal(['call id', 'callid', 'sl no', 'serial no', 'slno', 'id', 'uid', 'record id', 'recordid', 'lead id', 'leadid']);
        
        // HIGHER PRIORITY: Look for a UUID-like string in any column FIRST
        const allValues = Object.values(row);
        let foundUuid = '';
        for (const val of allValues) {
          const s = String(val).trim();
          if (s.length > 15 && (s.includes('-') || /^[a-f0-9]{15,}$/i.test(s))) {
            foundUuid = s;
            break;
          }
        }
        
        if (foundUuid) {
          rawCallId = foundUuid;
        }

        // Map fields early to help with ID generation
        const agentName = String(getVal(['agent', 'agent name', 'agentname', 'agent full name', 'agentfullname', 'staff', 'caller', 'user']) || 'Unknown Agent').trim();
        const phoneNumber = String(getVal(['phone number', 'phonenumber', 'phone', 'customer number', 'customernumber', 'mobile', 'contact']) || '').trim();
        const dateStr = getVal(['date & time', 'date time', 'datetime', 'date', 'timestamp', 'time', 'date-time', 'call date', 'calldate', 'transaction date', 'transactiondate']);
        const finalDate = parseDate(dateStr);
        const datePart = finalDate.toISOString().split('T')[0];

        // Final fallback: If ID looks like a short number (Agent ID) or is missing, make it composite
        const idStr = String(rawCallId || '').trim();
        const isNumericAndShort = idStr.length > 0 && idStr.length < 10 && /^\d+$/.test(idStr);
        
        if (!idStr || isNumericAndShort) {
          const agentPart = agentName.toLowerCase().replace(/\s+/g, '');
          const phonePart = phoneNumber.replace(/\D/g, '') || '0000';
          // Include datePart to prevent cross-day collisions
          rawCallId = `COMP-${agentPart}-${phonePart}-${datePart}-${i}`;
        }
        
        let callId = String(rawCallId || '').trim();
        let uniqueCallId = callId;
        const globalIndex = startIndex + i;
        
        // Prevent collisions within or across batches
        if (seenIdsInBatch.has(uniqueCallId)) {
          uniqueCallId = `${callId}_${globalIndex}`;
        }
        seenIdsInBatch.add(uniqueCallId);

        const agentEmail = String(getVal(['agent email', 'agentemail', 'email', 'email id', 'emailid']) || '').toLowerCase().trim();
        const firstDispose = String(getVal(['first dispose', 'first_dispose', 'firstdisposition', 'sub disposition', 'sub_disposition', 'subdisposition', 'reason', 'substatus', 'sub-status']) || '').trim();
        const dispose = String(getVal(['dispose', 'disposition', 'status', 'result', 'call result', 'callresult', 'resolution', 'terminating reason', 'disconnect reason', 'agent status', 'call status']) || '').trim();
        const campaign = String(getVal(['campaign', 'campaign name', 'campaign_name', 'campaign id', 'campaign_id', 'camp', 'campaignname', 'campaignid', 'queue', 'queue name']) || '').trim();
        const processName = String(getVal(['process', 'dept', 'department', 'department name', 'departmentname', 'campaign', 'project', 'client']) || 'General').trim();
        const callTime = String(getVal(['call time', 'calltime', 'time of call', 'timeofcall']) || '').trim();
        const duration = String(getVal(['duration', 'talktime', 'talk time', 'call duration', 'callduration', 'call time', 'calltime', 'length']) || '').trim();
        const remarks = String(getVal(['remarks', 'comment', 'notes', 'feedback']) || '').trim();
        const customerName = String(getVal(['customer name', 'customername', 'customer', 'client name', 'clientname']) || '').trim();
        const recordingPath = String(getVal(['recording path', 'recordingpath', 'audio link', 'audiolink', 'audio url', 'audiourl', 'recording link', 'recordinglink']) || '').trim();

        const callDoc = {
          callId: uniqueCallId,
          agentName,
          agentEmail,
          campaign,
          firstDispose,
          dispose,
          process: processName,
          date: finalDate,
          callTime,
          phoneNumber,
          duration,
          remarks,
          customerName,
          uploadedBy: req.userId,
          isActive: true,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        };

        if (recordingPath) {
          callDoc.audioUrl = recordingPath;
        }

        callsToSave.push(callDoc);
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: Data processing failed - ${err.message}`);
      }
    }

    if (callsToSave.length > 0) {
      try {
        // 1. Try to save to MongoDB if connected
        if (!isOffline) {
          const bulkOps = callsToSave.map(call => ({
            insertOne: {
              document: call
            }
          }));

          const bulkResult = await Call.bulkWrite(bulkOps, { ordered: false });
          results.success = bulkResult.insertedCount || bulkResult.nInserted || callsToSave.length;
        }

        // 2. Always save to local storage as backup (or primary if offline)
        const localSaved = saveManyToLocalFile(callsToSave);

        // If we are offline, use the local save count as success
        if (isOffline) {
          if (localSaved) {
            results.success = callsToSave.length;
            results.databaseMode = 'offline';
          } else {
            results.failed += callsToSave.length;
            results.errors.push('Failed to save to local storage.');
          }
        }
      } catch (saveErr) {
        console.error('❌ Data Save failed:', saveErr.message);
        results.failed += callsToSave.length;
        results.errors.push(`Save Error: ${saveErr.message}`);
      }
    }

    res.status(200).json({
      message: 'Batch uploaded successfully',
      data: results,
    });
  } catch (error) {
    console.error('❌ BATCH UPLOAD ERROR:', error);
    res.status(500).json({ message: error.message, error: error.message, databaseMode: process.env.DB_MODE || 'online' });
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
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    let stats;

    if (!isOffline) {
      try {
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const [totalCalls, pendingCalls, auditedCalls, callsInLast7Days] = await Promise.all([
          Call.countDocuments({ isActive: true }),
          Call.countDocuments({ status: 'pending', isActive: true }),
          Call.countDocuments({ status: 'audited', isActive: true }),
          Call.countDocuments({
            date: { $gte: last7Days },
            isActive: true
          })
        ]);

        stats = { totalCalls, pendingCalls, auditedCalls, callsInLast7Days };
      } catch (dbError) {
        console.warn('⚠️  MongoDB Stats failed, falling back to local:', dbError.message);
        const localCalls = getCallsFromLocalFile();
        stats = {
          totalCalls: localCalls.length,
          pendingCalls: localCalls.filter(c => c.status === 'pending').length,
          auditedCalls: localCalls.filter(c => c.status === 'audited').length,
          callsInLast7Days: localCalls.filter(c => new Date(c.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
        };
      }
    } else {
      const localCalls = getCallsFromLocalFile();
      stats = {
        totalCalls: localCalls.length,
        pendingCalls: localCalls.filter(c => c.status === 'pending').length,
        auditedCalls: localCalls.filter(c => c.status === 'audited').length,
        callsInLast7Days: localCalls.filter(c => new Date(c.date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
      };
    }

    res.status(200).json({
      message: 'Dashboard stats retrieved successfully',
      data: {
        ...stats,
        databaseMode: isOffline ? 'offline' : 'online'
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
    if (req.query.campaign) {
      filter.campaign = { $regex: req.query.campaign, $options: 'i' };
    }

    if (req.query.process) {
      filter.process = { $regex: req.query.process, $options: 'i' };
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [total, calls] = await Promise.all([
      Call.countDocuments(filter),
      Call.find(filter)
        .populate('uploadedBy', 'username email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

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
  uploadCallDataBatch,
  uploadAudio,
  deleteCalls,
  deleteAllCalls,
  updateCallStatus,
  getCallsByDateRange
};
