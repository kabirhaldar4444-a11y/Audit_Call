const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://xjlwamtwswhvgqvzplpt.supabase.co';
// Use Service Role Key for backend if available, otherwise fallback to Anon Key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqbHdhbXR3c3dodmdxdnpwbHB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Nzk2MDEsImV4cCI6MjA5NDE1NTYwMX0.ag25uh-P30c-vDr6RsjCKUtFEzwQX1sbXUszMhV1s80';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
