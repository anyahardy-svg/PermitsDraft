/**
 * Migrate training-records bucket files from UUID folders to readable company names.
 *
 * Prefer the Admin Panel: Admin → Training Storage (no terminal needed).
 *
 * CLI fallback (from project folder after npm install):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate-training-storage
 *
 * Dry run:
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run migrate-training-storage
 */

const { createClient } = require('@supabase/supabase-js');
const { migrateTrainingStorage } = require('../api/lib/migrateTrainingStorage');

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log(DRY_RUN ? 'Dry run — no files or database rows will change\n' : 'Migrating training-records storage paths...\n');

  const result = await migrateTrainingStorage(supabase, { dryRun: DRY_RUN });

  console.log('\nTraining records:', result.records);
  console.log('Training matrices:', result.matrices);

  if (!result.success) {
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
