const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '../api/controllers/callController.js');
let content = fs.readFileSync(apiPath, 'utf8');

const oldBlock = /\/\/ Robust Call ID extraction[\s\S]+?\/\/ Final fallback: First column if it's not a date, otherwise generic ID[\s\S]+?\}\s+\}/;

const newBlock = `// Robust ID extraction (Prioritizes UUIDs to prevent Agent ID collision)
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

        if (!rawCallId || (typeof rawCallId === 'string' && rawCallId.length < 10 && /^\\d+$/.test(rawCallId))) {
          const agentPart = String(getVal(['agent', 'agent name']) || 'unknown').toLowerCase().replace(/\\s+/g, '');
          const phonePart = String(getVal(['phone number', 'phone']) || '0000').replace(/\\D/g, '');
          rawCallId = \`COMP-\${agentPart}-\${phonePart}-\${i}\`;
        }`;

if (oldBlock.test(content)) {
    fs.writeFileSync(apiPath, content.replace(oldBlock, newBlock));
    console.log('API Controller updated successfully.');
} else {
    console.error('Could not find the target block in API Controller.');
}
