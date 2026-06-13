const BUCKET = 'training-records';
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function buildPublicUrl(supabase, storagePath) {
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

async function moveStorageObject(supabase, oldPath, newPath, dryRun) {
  if (oldPath === newPath) {
    return { skipped: true };
  }

  if (dryRun) {
    return { dryRun: true, oldPath, newPath };
  }

  const { error } = await supabase.storage.from(BUCKET).move(oldPath, newPath);
  if (error) {
    throw error;
  }

  return { moved: true };
}

async function migrateTrainingRecords(supabase, { dryRun = false } = {}) {
  const { data: records, error } = await supabase
    .from('training_records')
    .select(`
      id,
      training_type,
      file_url,
      contractor:contractors(
        name,
        companies(name)
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

    const companyName = record.contractor?.companies?.name;
    const contractorName = record.contractor?.name;
    const newPath = buildTrainingRecordPath({
      companyName,
      contractorName,
      trainingType: record.training_type,
      oldPath,
    });

    try {
      await moveStorageObject(supabase, oldPath, newPath, dryRun);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('training_records')
          .update({ file_url: buildPublicUrl(supabase, newPath) })
          .eq('id', record.id);

        if (updateError) {
          throw updateError;
        }
      }

      migrated += 1;
    } catch (moveError) {
      failed += 1;
      console.error(`Training record ${record.id} failed:`, moveError.message);
    }
  }

  return { migrated, skipped, failed, total: (records || []).length };
}

async function migrateMatrices(supabase, { dryRun = false } = {}) {
  const { data: matrices, error } = await supabase
    .from('company_training_matrices')
    .select(`
      id,
      file_url,
      companies(name)
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
      companyName: matrix.companies?.name,
      oldPath,
    });

    try {
      await moveStorageObject(supabase, oldPath, newPath, dryRun);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('company_training_matrices')
          .update({ file_url: buildPublicUrl(supabase, newPath) })
          .eq('id', matrix.id);

        if (updateError) {
          throw updateError;
        }
      }

      migrated += 1;
    } catch (moveError) {
      failed += 1;
      console.error(`Training matrix ${matrix.id} failed:`, moveError.message);
    }
  }

  return { migrated, skipped, failed, total: (matrices || []).length };
}

async function migrateTrainingStorage(supabase, { dryRun = false } = {}) {
  const records = await migrateTrainingRecords(supabase, { dryRun });
  const matrices = await migrateMatrices(supabase, { dryRun });

  return {
    dryRun,
    records,
    matrices,
    success: records.failed + matrices.failed === 0,
  };
}

module.exports = {
  migrateTrainingStorage,
};
