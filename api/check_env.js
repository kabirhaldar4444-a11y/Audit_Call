const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- Env Check ---');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 'MISSING');
console.log('SUPABASE_ANON_KEY length:', process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.length : 'MISSING');
