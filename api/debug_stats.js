const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStats() {
  console.log('--- Wide Open Query ---');
  const { data: allData, error: allDataError, count: totalCount } = await supabase
    .from('calls')
    .select('*', { count: 'exact' })
    .limit(5);

  if (allDataError) {
    console.error('Wide Open Error:', allDataError.message);
  } else {
    console.log('Total Count (No Filters):', totalCount);
    console.log('Sample Data:', JSON.stringify(allData, null, 2));
  }
}

debugStats();
