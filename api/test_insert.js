const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const testId = 'TEST-' + Date.now();
  console.log('Attempting to insert test record with call_id:', testId);
  
  const { data, error } = await supabase
    .from('calls')
    .insert([{
      call_id: testId,
      agent_name: 'Test Agent',
      process: 'Test Process',
      status: 'pending',
      is_active: true
    }])
    .select();

  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

testInsert();
