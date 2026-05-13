const supabase = require('../config/supabase');
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
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('calls')
      .select('*', { count: 'exact' });

    // Apply filters
    if (req.query.callId) query = query.ilike('call_id', `%${req.query.callId}%`);
    if (req.query.agentName) query = query.ilike('agent_name', `%${req.query.agentName}%`);
    if (req.query.campaign) query = query.ilike('campaign', `%${req.query.campaign}%`);
    if (req.query.process) query = query.ilike('process', `%${req.query.process}%`);
    if (req.query.status) query = query.eq('status', req.query.status);
    
    if (req.query.dateFrom) query = query.gte('call_date', req.query.dateFrom);
    if (req.query.dateTo) query = query.lte('call_date', req.query.dateTo);

    const sortField = req.query.sortField === 'date' ? 'call_date' : (req.query.sortField || 'call_date');
    const ascending = req.query.sortOrder === 'asc';
    
    query = query.order(sortField, { ascending }).range(from, to);

    const { data: calls, count: total, error } = await query;

    if (error) {
      console.error('Supabase Query Error:', error);
      throw error;
    }

    console.log(`Retrieved ${calls?.length || 0} calls, total count: ${total}`);

    res.status(200).json({
      message: 'Calls retrieved successfully',
      data: calls || [],
      pagination: {
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit)
      },
      databaseMode: 'supabase'
    });
  } catch (error) {
    console.error('Error in getAllCalls:', error);
    res.status(500).json({ message: 'Error retrieving calls', error: error.message });
  }
};

const getCallById = async (req, res) => {
  try {
    const { id } = req.params;
    const { data: call, error } = await supabase
      .from('calls')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
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

    const { data: newCall, error } = await supabase
      .from('calls')
      .insert([{
        call_id: callId,
        agent_name: agentName,
        agent_email: agentEmail,
        campaign,
        first_dispose: firstDispose,
        dispose,
        process: process || 'General',
        call_date: new Date(date),
        call_time: callTime,
        phone_number: phoneNumber,
        duration,
        remarks,
        customer_name: customerName,
        uploaded_by: String(req.userId || 'system'),
      }])
      .select()
      .single();

    if (error) throw error;
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

    const results = { total: data.length, success: 0, failed: 0, errors: [], databaseMode: 'supabase' };
    const seenIdsInBatch = new Set();
    const callsToSave = [];

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
          call_id: uniqueCallId,
          agent_name: String(getVal(['agent', 'agent name']) || 'Unknown Agent').trim(),
          agent_email: String(getVal(['agent email', 'email']) || '').toLowerCase().trim(),
          campaign: String(getVal(['campaign', 'campaign name']) || '').trim(),
          first_dispose: String(getVal(['first dispose', 'sub disposition']) || '').trim(),
          dispose: String(getVal(['dispose', 'disposition', 'status']) || '').trim(),
          process: String(getVal(['process', 'department']) || 'General').trim(),
          call_date: finalDate,
          call_time: String(getVal(['call time', 'time']) || '').trim(),
          phone_number: String(getVal(['phone number', 'phone']) || '').trim(),
          duration: String(getVal(['duration', 'talktime']) || '').trim(),
          remarks: String(getVal(['remarks', 'comment']) || '').trim(),
          customer_name: String(getVal(['customer name', 'customer']) || '').trim(),
          uploaded_by: String(req.userId || 'system'),
          is_active: true,
          status: 'pending',
          audio_url: String(getVal(['recording path', 'audio link']) || '').trim()
        });
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (callsToSave.length > 0) {
      const { data: inserted, error } = await supabase
        .from('calls')
        .insert(callsToSave);
      
      if (error) throw error;
      results.success = callsToSave.length;
    }

    res.status(200).json({ message: 'Upload complete', data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadCallDataBatch = async (req, res) => {
  try {
    const { data, startIndex = 0 } = req.body;
    if (!data || !Array.isArray(data)) return res.status(400).json({ message: 'Invalid data' });

    const results = { total: data.length, success: 0, failed: 0, errors: [], databaseMode: 'supabase' };
    const seenIdsInBatch = new Set();
    const callsToSave = [];

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
          call_id: uniqueCallId,
          agent_name: String(getVal(['agent', 'agent name']) || 'Unknown Agent').trim(),
          agent_email: String(getVal(['agent email', 'email']) || '').toLowerCase().trim(),
          campaign: String(getVal(['campaign', 'campaign name']) || '').trim(),
          first_dispose: String(getVal(['first dispose', 'sub disposition']) || '').trim(),
          dispose: String(getVal(['dispose', 'disposition', 'status']) || '').trim(),
          process: String(getVal(['process', 'department']) || 'General').trim(),
          call_date: finalDate,
          call_time: String(getVal(['call time', 'time']) || '').trim(),
          phone_number: String(getVal(['phone number', 'phone']) || '').trim(),
          duration: String(getVal(['duration', 'talktime']) || '').trim(),
          remarks: String(getVal(['remarks', 'comment']) || '').trim(),
          customer_name: String(getVal(['customer name', 'customer']) || '').trim(),
          uploaded_by: String(req.userId || 'system'),
          is_active: true,
          status: 'pending',
          audio_url: String(getVal(['recording path', 'audio link']) || '').trim()
        });
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    if (callsToSave.length > 0) {
      const { data: inserted, error } = await supabase
        .from('calls')
        .insert(callsToSave);
      
      if (error) throw error;
      results.success = callsToSave.length;
      saveManyToLocalFile(callsToSave);
    }

    res.status(200).json({ message: 'Batch uploaded successfully', data: results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCalls = async (req, res) => {
  try {
    const { ids } = req.body;
    const { error } = await supabase
      .from('calls')
      .delete()
      .in('id', ids);

    if (error) throw error;
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
      
      // Find by call_id string
      const { data: call, error: findError } = await supabase
        .from('calls')
        .select('id')
        .eq('call_id', callId)
        .limit(1)
        .single();

      if (call) {
        const { error: updateError } = await supabase
          .from('calls')
          .update({ audio_url: `/uploads/audio/${file.filename}` })
          .eq('id', call.id);

        if (!updateError) results.success++;
        else results.errors.push(`Update error for ${file.originalname}: ${updateError.message}`);
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
    console.log('Fetching dashboard stats from Supabase...');
    const [
      totalRes,
      pendingRes,
      auditedRes
    ] = await Promise.all([
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('is_active', true),
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'audited').eq('is_active', true)
    ]);

    // Check for errors
    if (totalRes.error) console.error('Total Calls Error:', totalRes.error);
    if (pendingRes.error) console.error('Pending Calls Error:', pendingRes.error);
    if (auditedRes.error) console.error('Audited Calls Error:', auditedRes.error);

    const stats = { 
      totalCalls: totalRes.count || 0, 
      pendingCalls: pendingRes.count || 0, 
      auditedCalls: auditedRes.count || 0 
    };

    console.log('Stats retrieved:', stats);
    res.status(200).json({ data: { ...stats, databaseMode: 'supabase' } });
  } catch (error) {
    console.error('Final Stats Error:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateCallStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { data: call, error } = await supabase
      .from('calls')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ status: 'success', data: call });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCallsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { data: calls, error } = await supabase
      .from('calls')
      .select('*')
      .eq('is_active', true)
      .gte('call_date', startDate)
      .lte('call_date', endDate)
      .order('call_date', { ascending: false });

    if (error) throw error;
    res.status(200).json({ data: calls });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAllCalls = async (req, res) => {
  try {
    const { error } = await supabase
      .from('calls')
      .delete()
      .neq('id', 0); // Delete everything where id != 0 (which is all)

    if (error) throw error;
    res.status(200).json({ message: 'All records deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting all records', error: error.message });
  }
};

module.exports = { 
  getAllCalls, getCallById, createCall, getDashboardStats, uploadCallData, 
  uploadCallDataBatch, uploadAudio, deleteCalls, deleteAllCalls, updateCallStatus, getCallsByDateRange 
};
