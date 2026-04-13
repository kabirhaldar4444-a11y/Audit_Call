const Audit = require('../models/Audit');
const Call = require('../models/Call');

const submitAudit = async (req, res) => {
  try {
    const { callId, scores, remarks } = req.body;

    // Validate input
    if (!callId || !scores) {
      return res.status(400).json({ message: 'Please provide call ID and scores' });
    }

    // Check if call exists
    const call = await Call.findById(callId);
    if (!call) {
      return res.status(404).json({ message: 'Call not found' });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).filter(v => v);
    const overallScore = scoreValues.length > 0 
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2)
      : 0;

    // Create audit record
    const audit = new Audit({
      callId,
      auditorId: req.userId,
      scores,
      remarks,
      overallScore,
      status: 'completed',
    });

    await audit.save();

    // Update call status
    await Call.findByIdAndUpdate(callId, { status: 'audited' });

    res.status(201).json({
      message: 'Audit submitted successfully',
      data: audit,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting audit', error: error.message });
  }
};

const getAuditByCallId = async (req, res) => {
  try {
    const { callId } = req.params;
    const audit = await Audit.findOne({ callId })
      .populate('callId')
      .populate('auditorId', 'username email');

    if (!audit) {
      return res.status(404).json({ message: 'Audit not found' });
    }

    res.status(200).json({
      message: 'Audit retrieved successfully',
      data: audit,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving audit', error: error.message });
  }
};

const getAllAudits = async (req, res) => {
  try {
    const audits = await Audit.find()
      .populate('callId')
      .populate('auditorId', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: 'Audits retrieved successfully',
      data: audits,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving audits', error: error.message });
  }
};

module.exports = { submitAudit, getAuditByCallId, getAllAudits };
