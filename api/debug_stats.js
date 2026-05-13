const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStats() {
  console.log('Checking tables...');
  
  // Try to query schema information
  const { data: tables, error: tableError } = await supabase
    .rpc('get_tables'); // This might not work if RPC not defined
    const { count: usersCount, error: usersError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (usersError) {
    console.error('Error on users table:', usersError.message);
  } else {
    console.log('Total rows in users table:', usersCount);
  }
    
  if (tableError) {
    console.log('Could not list tables via RPC, trying direct count on calls...');
  } else {
    console.log('Tables:', tables);
  }

  const { count, error } = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error on calls table:', error.message);
  } else {
    console.log('Total rows in calls table:', count);
  }
}

debugStats();
