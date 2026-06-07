#!/usr/bin/env node
/**
 * Apply RLS policy fix so the admin panel can read suppliers with the anon key.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<key> node apply-supplier-rls-fix.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Run the SQL in migrations/fix-suppliers-anon-read-rls.sql manually if needed.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function applyFix() {
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations/fix-suppliers-anon-read-rls.sql'),
    'utf-8'
  );

  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement && !statement.startsWith('--'));

  for (const statement of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: `${statement};` });

    if (error && !error.message?.includes('already exists')) {
      console.error('Failed to apply supplier RLS fix:', error.message);
      console.error('Please run migrations/fix-suppliers-anon-read-rls.sql in the Supabase SQL editor.');
      process.exit(1);
    }
  }

  console.log('Supplier RLS fix applied successfully.');
}

applyFix();
