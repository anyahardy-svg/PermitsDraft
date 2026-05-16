const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    const sql = fs.readFileSync('./migrations/fix-redbull-certificate-urls.sql', 'utf-8');
    
    console.log('📝 Executing migration...\n');
    const { data, error } = await supabase.rpc('execute_sql', { query: sql });
    
    if (error) {
      // Try alternative approach - execute statements one by one
      console.log('⚠️ RPC approach not available, executing via query...');
      
      // Use direct SQL execution
      const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
      
      for (const stmt of statements) {
        if (stmt.trim()) {
          const trimmed = stmt.trim();
          if (trimmed.startsWith('UPDATE') || trimmed.startsWith('SELECT')) {
            console.log('Executing:', trimmed.substring(0, 80) + '...');
            // Direct execution not available in JS client
          }
        }
      }
      
      console.log('⚠️ Direct SQL execution not available through JS client');
      console.log('Please run the migration directly in Supabase SQL Editor');
    } else {
      console.log('✅ Migration executed successfully');
      console.log(data);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

executeMigration();
