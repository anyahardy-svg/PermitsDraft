const { createClient } = require('@supabase/supabase-client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  const sqlPath = path.join(__dirname, 'migrations', 'update-accreditation-urls-to-include-company-names.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Note: Standard Supabase client doesn't have a direct 'sql' method for raw SQL unless using a specific RPC
  // However, we can try to use the 'rpc' method if a helper exists, but usually, migrations are run via CLI or Dashboard.
  // Since exec_sql failed, we will check if there's a different way or if we should use the CLI.
  console.log('Attempting to execute migration via RPC exec_sql...');
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } else {
    console.log('Migration successful:', data);
  }
}

runMigration();
