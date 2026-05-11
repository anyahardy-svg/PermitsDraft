#!/usr/bin/env node
/**
 * Apply RLS policy fix to contractor_join_requests table
 * Allows system admins (via unauthenticated anon key + session) to update requests
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set these environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyFix() {
  try {
    console.log('📋 Applying RLS policy fix...');
    
    const sql = `
      CREATE POLICY contractor_join_requests_update_system_admin
        ON contractor_join_requests FOR UPDATE
        TO public
        USING (true)
        WITH CHECK (true);
    `;

    // Use rpc to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // It's OK if the policy already exists - that's the expected error
      if (error.message && error.message.includes('already exists')) {
        console.log('✅ Policy already exists - no action needed');
        return;
      }
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ RLS policy applied successfully!');
    console.log('📝 Now system admins can update join requests.');
    
  } catch (err) {
    console.error('❌ Exception:', err.message);
    process.exit(1);
  }
}

applyFix();
