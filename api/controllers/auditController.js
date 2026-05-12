const supabase = require('../config/supabase');

const submitAudit = async (req, res) => {
  try {
    const { callId, scores, remarks } = req.body;

    if (!callId || !scores) {
      return res.status(400).json({ message: 'Please provide call ID and scores' });
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).filter(v => v);
    const overallScore = scoreValues.length > 0 
      ? (scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length).toFixed(2)
      : 0;

    // Create audit record in Supabase
    const { data: audit, error: auditError } = await supabase
      .from('audits')
      .insert([{
        call_record_id: callId,
        auditor_id: req.userId,
        greeting_quality: scores.greetingQuality,
        communication_clarity: scores.communicationClarity,
        compliance_adherence: scores.complianceAdherence,
        resolution_quality: scores.resolutionQuality,
        customer_satisfaction: scores.customerSatisfaction,
        remarks,
        overall_score: parseFloat(overallScore),
        status: 'completed'
      }])
      .select()
      .single();

    if (auditError) throw auditError;

    // Update call status to 'audited'
    const { error: callError } = await supabase
      .from('calls')
      .update({ status: 'audited' })
      .eq('id', callId);

    if (callError) throw callError;

    res.status(201).json({
      message: 'Audit submitted successfully',
      data: audit,
    });
  } catch (error) {
    console.error('❌ Audit submission error:', error.message);
    res.status(500).json({ message: 'Error submitting audit', error: error.message });
  }
};

const getAuditByCallId = async (req, res) => {
  try {
    const { callId } = req.params;
    const { data: audit, error } = await supabase
      .from('audits')
      .select(`
        *,
        call_record:calls(*),
        auditor:users(username, email)
      `)
      .eq('call_record_id', callId)
      .maybeSingle();

    if (error) throw error;
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
    const { data: audits, error } = await supabase
      .from('audits')
      .select(`
        *,
        call_record:calls(*),
        auditor:users(username, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      message: 'Audits retrieved successfully',
      data: audits,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving audits', error: error.message });
  }
};

module.exports = { submitAudit, getAuditByCallId, getAllAudits };
