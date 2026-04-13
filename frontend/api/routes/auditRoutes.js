const express = require('express');
const { authenticate, adminOnly } = require('../middleware/auth');
const { submitAudit, getAuditByCallId, getAllAudits } = require('../controllers/auditController');

const router = express.Router();

router.post('/submit', authenticate, adminOnly, submitAudit);
router.get('/call/:callId', authenticate, adminOnly, getAuditByCallId);
router.get('/', authenticate, adminOnly, getAllAudits);

module.exports = router;
