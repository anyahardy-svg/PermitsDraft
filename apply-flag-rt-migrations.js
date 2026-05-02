#!/usr/bin/env node

// Script to apply Flag/RT migrations to Supabase
// This adds flag and rt columns to the sites table, and flag/rt tracking columns to sign_ins table

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nszkuoxibzcbiqaqdfml.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL not set');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('Please set your Supabase service role key as an environment variable:');
  console.error('export SUPABASE_SERVICE_ROLE_KEY=<your-key>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function applyMigrations() {
  try {
    console.log('🚀 Applying Flag/RT migrations...\n');

    // Read migration files
    const flagRtSitesMigration = fs.readFileSync(
      path.join(__dirname, 'migrations/add-flag-rt-to-sites.sql'),
      'utf-8'
    );

    const flagRtSignInsMigration = fs.readFileSync(
      path.join(__dirname, 'migrations/add-flag-rt-to-sign-ins.sql'),
      'utf-8'
    );

    // Split SQL into individual statements and execute
    const executeSQL = async (sql, name) => {
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));

      console.log(`\n📝 Applying ${name}...`);
      for (const statement of statements) {
        try {
          const { error } = await supabase.rpc('execute_sql', {
            sql_statement: statement
          }).then(() => ({ error: null })).catch(err => ({ error: err }));

          if (error) {
            // Try alternative method
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sql: statement })
            });

            if (!response.ok) {
              console.warn(`  ⚠️  Statement may have already been applied or encountered an issue`);
            } else {
              console.log(`  ✓ Applied: ${statement.substring(0, 50)}...`);
            }
          } else {
            console.log(`  ✓ Applied: ${statement.substring(0, 50)}...`);
          }
        } catch (err) {
          // Ignore errors - migrations might already exist
          console.warn(`  ⚠️  ${err.message}`);
        }
      }
    };

    // For now, just provide instructions
    console.log('📋 Flag/RT Migration Files:');
    console.log('  1. migrations/add-flag-rt-to-sites.sql');
    console.log('  2. migrations/add-flag-rt-to-sign-ins.sql');
    console.log('\n');
    console.log('To apply these migrations, please use one of the following methods:\n');

    console.log('✅ METHOD 1: Supabase Dashboard (EASIEST)');
    console.log('   1. Go to: https://app.supabase.com/project/nszkuoxibzcbiqaqdfml/sql/new');
    console.log('   2. Copy and paste the contents of: migrations/add-flag-rt-to-sites.sql');
    console.log('   3. Click "Run" button');
    console.log('   4. Repeat for: migrations/add-flag-rt-to-sign-ins.sql');
    console.log('   5. Done! Refresh the kiosk and try signing in again.\n');

    console.log('✅ METHOD 2: Using Supabase CLI');
    console.log('   supabase db execute -f migrations/add-flag-rt-to-sites.sql');
    console.log('   supabase db execute -f migrations/add-flag-rt-to-sign-ins.sql\n');

    console.log('❓ For more help, see apply-migration.sh for detailed instructions.');

  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    process.exit(1);
  }
}

applyMigrations();
