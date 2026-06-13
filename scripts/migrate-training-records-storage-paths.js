/**
 * Migrate training-records bucket files from UUID folders to readable company names.
 *
 * Before: {contractor_uuid}/{timestamp}.ext
 * After:  {company_name}/{contractor_name}/{training_type}/{timestamp}.ext
 *
 * Before (matrices): {company_uuid}/matrices/{timestamp}.ext
 * After:             {company_name}/matrices/{timestamp}.ext
 *
 * Run once after deploying readable storage paths:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-training-records-storage-paths.js
 *
 * Dry run (no changes):
 *   DRY_RUN=1 SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-training-records-storage-paths.js
 */

const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'training-records';
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function sanitizeStorageSegment(value, fallback = 'unknown') {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return sanitized || fallback;
}

function extractStoragePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return null;
  }

  const marker = `/${BUCKET}/`;
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return fileUrl.slice(markerIndex + marker.length).split('?')[0];
}

function buildPublicUrl(storagePath) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function needsMigration(storagePath) {
  if (!storagePath) {
    return false;
  }

  const topLevel = storagePath.split('/')[0];
  return UUID_SEGMENT.test(topLevel);
}

function buildTrainingRecordPath({ companyName, contractorName, trainingType, oldPath }) {
  const parts = oldPath.split('/');
  const fileName = parts[parts.length - 1];
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_company');
  const contractorSegment = sanitizeStorageSegment(contractorName, 'unknown_contractor');
  const trainingSegment = sanitizeStorageSegment(trainingType, 'training');

  return `${companySegment}/${contractorSegment}/${trainingSegment}/${fileName}`;
}

function buildMatrixPath({ companyName, oldPath }) {
  const parts = oldPath.split('/');
  const fileName = parts[parts.length - 1];
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_company');

  return `${companySegment}/matrices/${fileName}`;
}

async function moveStorageObject(oldPath, newPath) {
  if (oldPath === newPath) {
    return { skipped: true };
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] move ${oldPath} -> ${newPath}`);
    return { dryRun: true };
  }

  const { error } = await supabase.storage.from(BUCKET).move(oldPath, newPath);
  if (error) {
    throw error;
  }

  return { moved: true };
}

async function migrateTrainingRecords() {
  const { data: records, error } = await supabase
    .from('training_records')
    .select(`
      id,
      training_type,
      file_url,
      contractor:contractors(
        name,
        company:companies(name)
      )
    `)
    .not('file_url', 'is', null);

  if (error) {
    throw error;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records || []) {
    const oldPath = extractStoragePath(record.file_url);
    if (!needsMigration(oldPath)) {
      skipped += 1;
      continue;
    }

    const companyName = record.contractor?.company?.name;
    const contractorName = record.contractor?.name;
    const newPath = buildTrainingRecordPath({
      companyName,
      contractorName,
      trainingType: record.training_type,
      oldPath,
    });

    try {
      console.log(`Training record ${record.id}:`);
      await moveStorageObject(oldPath, newPath);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('training_records')
          .update({ file_url: buildPublicUrl(newPath) })
          .eq('id', record.id);

        if (updateError) {
          throw updateError;
        }
      }

      migrated += 1;
    } catch (moveError) {
      failed += 1;
      console.error(`  failed: ${moveError.message}`);
    }
  }

  return { migrated, skipped, failed, total: (records || []).length };
}

async function migrateMatrices() {
  const { data: matrices, error } = await supabase
    .from('company_training_matrices')
    .select(`
      id,
      file_url,
      company:companies(name)
    `)
    .not('file_url', 'is', null);

  if (error) {
    throw error;
  }

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const matrix of matrices || []) {
    const oldPath = extractStoragePath(matrix.file_url);
    if (!needsMigration(oldPath)) {
      skipped += 1;
      continue;
    }

    const newPath = buildMatrixPath({
      companyName: matrix.company?.name,
      oldPath,
    });

    try {
      console.log(`Training matrix ${matrix.id}:`);
      await moveStorageObject(oldPath, newPath);

      if (!DRY_RUN) {
        const { error: updateError } = await supabase
          .from('company_training_matrices')
          .update({ file_url: buildPublicUrl(newPath) })
          .eq('id', matrix.id);

        if (updateError) {
          throw updateError;
        }
      }

      migrated += 1;
    } catch (moveError) {
      failed += 1;
      console.error(`  failed: ${moveError.message}`);
    }
  }

  return { migrated, skipped, failed, total: (matrices || []).length };
}

async function main() {
  console.log(DRY_RUN ? 'Dry run — no files or database rows will change\n' : 'Migrating training-records storage paths...\n');

  const recordsResult = await migrateTrainingRecords();
  console.log('\nTraining records:', recordsResult);

  const matricesResult = await migrateMatrices();
  console.log('Training matrices:', matricesResult);

  const totalFailed = recordsResult.failed + matricesResult.failed;
  if (totalFailed > 0) {
    process.exit(1);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
