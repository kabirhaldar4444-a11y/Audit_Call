const Call = require('../models/Call');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { saveToLocalFile, saveManyToLocalFile, getCallsFromLocalFile } = require('../utils/dataPersistence');

// Helper to normalize row keys
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

// Helper to get values from normalized row
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

const getAllCalls = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.callId) filter.callId = { $regex: req.query.callId, $options: 'i' };
    if (req.query.agentName) filter.agentName = { $regex: req.query.agentName, $options: 'i' };
    if (req.query.campaign) filter.campaign = { $regex: req.query.campaign, $options: 'i' };
    if (req.query.process) filter.process = { $regex: req.query.process, $options: 'i' };
    if (req.query.status) filter.status = req.query.status;
    
    if (req.query.dateFrom || req.query.dateTo) {
      filter.date = {};
      if (req.query.dateFrom) filter.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const toDate = new Date(req.query.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

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
    if (!call) return res.status(404).json({ message: 'Call not found' });
    res.status(200).json({ message: 'Call retrieved successfully', data: call });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving call', error: error.message });
  }
};

const createCall = async (req, res) => {
  try {
    const { callId, agentName, agentEmail, campaign, firstDispose, dispose, process, date, callTime, phoneNumber, duration, remarks, customerName } = req.body;
    if (!callId || !agentName || !date) return res.status(400).json({ message: 'Please provide all required fields' });

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
    res.status(201).json({ message: 'Call created successfully', data: newCall });
  } catch (error) {
    res.status(500).json({ message: 'Error creating call', error: error.message });
  }
};

const uploadCallData = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Please upload an Excel or CSV file' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const results = { total: data.length, success: 0, failed: 0, errors: [], databaseMode: process.env.DB_MODE || 'online' };
    const seenIdsInBatch = new Set();
    const callsToSave = [];
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    console.log(`📡 [Root API] Upload request received. Rows: ${data.length}, DB: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const normalizedRow = normalizeRow(row);
        const getVal = (keys) => getValFromRow(normalizedRow, keys);

        let rawCallId = getVal(['call id', 'callid', 'sl no', 'serial no', 'slno', 'id', 'uid', 'record id', 'recordid', 'lead id', 'leadid']);
        const allValsForUuid = Object.values(row);
        let foundUuid = '';
        for (const val of allValsForUuid) {
          const s = String(val).trim();
          if (s.length > 15 && (s.includes('-') || /^[a-f0-9]{15,}$/i.test(s))) {
            foundUuid = s;
            break;
          }
        }
        if (foundUuid) rawCallId = foundUuid;

        if (!rawCallId || (typeof rawCallId === 'string' && rawCallId.length < 10 && /^\d+$/.test(rawCallId))) {
          const agentPart = String(getVal(['agent', 'agent name']) || 'unknown').toLowerCase().replace(/\s+/g, '');
          const phonePart = String(getVal(['phone number', 'phone']) || '0000').replace(/\D/g, '');
          rawCallId = `COMP-${agentPart}-${phonePart}-${i}`;
        }

        let callId = String(rawCallId || '').trim();
        let uniqueCallId = callId;
        if (seenIdsInBatch.has(uniqueCallId)) {
          uniqueCallId = `${callId}_${i}`;
        }
        seenIdsInBatch.add(uniqueCallId);

        const dateStr = getVal(['date & time', 'date time', 'datetime', 'date', 'timestamp', 'time', 'date-time', 'call date', 'calldate', 'transaction date', 'transactiondate']);
        let date;
        if (dateStr instanceof Date) date = dateStr;
        else if (typeof dateStr === 'number') date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
        else if (dateStr) {
          let s = dateStr.toString().trim();
          const ddmm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
          if (ddmm) {
            let day = parseInt(ddmm[1]), month = parseInt(ddmm[2]) - 1, year = parseInt(ddmm[3]);
            const now = new Date();
            if (year === now.getFullYear()) {
              const date1 = new Date(year, month, day), date2 = new Date(year, day - 1, month + 1);
              if (date1 > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && date2 <= now) {
                day = month + 1; month = parseInt(ddmm[1]) - 1;
              }
            }
            const timePart = ddmm[4].trim();
            date = timePart ? new Date(year, month, day, ...timePart.split(/[:\s]/).filter(x => x).map(Number)) : new Date(year, month, day);
          } else date = new Date(s);
        }
        const finalDate = (date && !isNaN(date.getTime())) ? date : new Date();

        callsToSave.push({
          callId: uniqueCallId,
          agentName: String(getVal(['agent', 'agent name']) || 'Unknown Agent').trim(),
          agentEmail: String(getVal(['agent email', 'email']) || '').toLowerCase().trim(),
          campaign: String(getVal(['campaign', 'campaign name']) || '').trim(),
          firstDispose: String(getVal(['first dispose', 'sub disposition']) || '').trim(),
          dispose: String(getVal(['dispose', 'disposition', 'status']) || '').trim(),
          process: String(getVal(['process', 'department']) || 'General').trim(),
          date: finalDate,
          callTime: String(getVal(['call time', 'time']) || '').trim(),
          phoneNumber: String(getVal(['phone number', 'phone']) || '').trim(),
          duration: String(getVal(['duration', 'talktime']) || '').trim(),
          remarks: String(getVal(['remarks', 'comment']) || '').trim(),
          customerName: String(getVal(['customer name', 'customer']) || '').trim(),
          uploadedBy: req.userId,
          isActive: true,
          status: 'pending',
          audioUrl: String(getVal(['recording path', 'audio link']) || '').trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (callsToSave.length > 0) {
      if (!isOffline) {
        const bulkOps = callsToSave.map(call => ({ insertOne: { document: call } }));
        const bulkResult = await Call.bulkWrite(bulkOps, { ordered: false });
        results.success = bulkResult.insertedCount || bulkResult.nInserted || callsToSave.length;
      } else {
        results.failed += callsToSave.length;
        results.errors.push('System is in OFFLINE mode.');
      }
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(200).json({ message: 'Upload complete', data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadCallDataBatch = async (req, res) => {
  try {
    const { data, startIndex = 0 } = req.body;
    if (!data || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid data' });

    const results = { total: data.length, success: 0, failed: 0, errors: [], databaseMode: process.env.DB_MODE || 'online' };
    const seenIdsInBatch = new Set();
    const callsToSave = [];
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const normalizedRow = normalizeRow(row);
        const getVal = (keys) => getValFromRow(normalizedRow, keys);

        let rawCallId = getVal(['call id', 'callid', 'sl no', 'serial no', 'slno', 'id', 'uid', 'record id', 'recordid', 'lead id', 'leadid']);
        const allVals = Object.values(row);
        let foundUuid = '';
        for (const v of allVals) {
          const s = String(v).trim();
          if (s.length > 15 && (s.includes('-') || /^[a-f0-9]{15,}$/i.test(s))) {
            foundUuid = s; break;
          }
        }
        if (foundUuid) rawCallId = foundUuid;
        if (!rawCallId) rawCallId = `GEN-${Date.now()}-${startIndex + i}`;

        let callId = String(rawCallId || '').trim();
        let uniqueCallId = callId;
        if (seenIdsInBatch.has(uniqueCallId)) {
          uniqueCallId = `${callId}_${startIndex + i}`;
        }
        seenIdsInBatch.add(uniqueCallId);

        const dateStr = getVal(['date & time', 'date time', 'datetime', 'date', 'timestamp', 'time', 'date-time', 'call date', 'calldate', 'transaction date', 'transactiondate']);
        let date;
        if (dateStr instanceof Date) date = dateStr;
        else if (typeof dateStr === 'number') date = new Date(Math.round((dateStr - 25569) * 86400 * 1000));
        else if (dateStr) {
          let s = dateStr.toString().trim();
          const ddmm = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
          if (ddmm) {
            let day = parseInt(ddmm[1]), month = parseInt(ddmm[2]) - 1, year = parseInt(ddmm[3]);
            const now = new Date();
            if (year === now.getFullYear()) {
              const date1 = new Date(year, month, day), date2 = new Date(year, day - 1, month + 1);
              if (date1 > new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && date2 <= now) {
                day = month + 1; month = parseInt(ddmm[1]) - 1;
              }
            }
            const timePart = ddmm[4].trim();
            date = timePart ? new Date(year, month, day, ...timePart.split(/[:\s]/).filter(x => x).map(Number)) : new Date(year, month, day);
          } else date = new Date(s);
        }
        const finalDate = (date && !isNaN(date.getTime())) ? date : new Date();

        callsToSave.push({
          callId: uniqueCallId,
          agentName: String(getVal(['agent', 'agent name']) || 'Unknown Agent').trim(),
          agentEmail: String(getVal(['agent email', 'email']) || '').toLowerCase().trim(),
          campaign: String(getVal(['campaign', 'campaign name']) || '').trim(),
          firstDispose: String(getVal(['first dispose', 'sub disposition']) || '').trim(),
          dispose: String(getVal(['dispose', 'disposition', 'status']) || '').trim(),
          process: String(getVal(['process', 'department']) || 'General').trim(),
          date: finalDate,
          callTime: String(getVal(['call time', 'time']) || '').trim(),
          phoneNumber: String(getVal(['phone number', 'phone']) || '').trim(),
          duration: String(getVal(['duration', 'talktime']) || '').trim(),
          remarks: String(getVal(['remarks', 'comment']) || '').trim(),
          customerName: String(getVal(['customer name', 'customer']) || '').trim(),
          uploadedBy: req.userId,
          isActive: true,
          status: 'pending',
          audioUrl: String(getVal(['recording path', 'audio link']) || '').trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (callsToSave.length > 0) {
      if (!isOffline) {
        const bulkOps = callsToSave.map(call => ({ insertOne: { document: call } }));
        const bulkResult = await Call.bulkWrite(bulkOps, { ordered: false });
        results.success = bulkResult.insertedCount || bulkResult.nInserted || callsToSave.length;
        saveManyToLocalFile(callsToSave);
      } else {
        if (saveManyToLocalFile(callsToSave)) {
          results.success = callsToSave.length;
          results.databaseMode = 'offline';
        }
      }
    }

    res.status(200).json({ message: 'Batch uploaded successfully', data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCalls = async (req, res) => {
  try {
    const { ids } = req.body;
    await Call.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: 'Records deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadAudio = async (req, res) => {
  try {
    const results = { total: req.files.length, success: 0, failed: 0, errors: [] };
    for (const file of req.files) {
      const callId = path.basename(file.originalname, path.extname(file.originalname)).trim();
      const call = await Call.findOne({ callId });
      if (call) {
        call.audioUrl = `/uploads/audio/${file.filename}`;
        await call.save();
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`No match for ${file.originalname}`);
      }
    }
    res.status(200).json({ message: 'Audio processed', data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const isOffline = process.env.DB_MODE === 'offline' || mongoose.connection.readyState !== 1;
    let stats;
    if (!isOffline) {
      const [totalCalls, pendingCalls, auditedCalls] = await Promise.all([
        Call.countDocuments({ isActive: true }),
        Call.countDocuments({ status: 'pending', isActive: true }),
        Call.countDocuments({ status: 'audited', isActive: true })
      ]);
      stats = { totalCalls, pendingCalls, auditedCalls };
    } else {
      const localCalls = getCallsFromLocalFile();
      stats = {
        totalCalls: localCalls.length,
        pendingCalls: localCalls.filter(c => c.status === 'pending').length,
        auditedCalls: localCalls.filter(c => c.status === 'audited').length
      };
    }
    res.status(200).json({ data: { ...stats, databaseMode: isOffline ? 'offline' : 'online' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const call = await Call.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ status: 'success', data: call });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCallsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const filter = { isActive: true, date: { $gte: start, $lte: end } };
    const calls = await Call.find(filter).sort({ date: -1 }).lean();
    res.status(200).json({ data: calls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getAllCalls, getCallById, createCall, getDashboardStats, uploadCallData, 
  uploadCallDataBatch, uploadAudio, deleteCalls, updateCallStatus, getCallsByDateRange 
};
