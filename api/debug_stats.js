const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStats() {
  console.log('--- Raw Data Check ---');
  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Total rows:', data.length);
    data.forEach((row, i) => {
      console.log(`Row ${i + 1}:`, JSON.stringify(row, null, 2));
    });
  }
}

debugStats();
