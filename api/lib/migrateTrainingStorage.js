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

async function fetchRowsByIds(supabase, table, ids, select) {
  if (!ids.length) {
    return [];
  }

  const rows = [];
  const chunkSize = 100;

  for (let index = 0; index < ids.length; index += chunkSize) {
    const chunk = ids.slice(index, index + chunkSize);
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in('id', chunk);

    if (error) {
      throw new Error(`${table} lookup failed: ${error.message}`);
    }

    rows.push(...(data || []));
  }

  return rows;
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
    .select('id, training_type, file_url, contractor_id')
    .not('file_url', 'is', null);

  if (error) {
    throw new Error(`training_records lookup failed: ${error.message}`);
  }

  const contractorIds = [...new Set((records || []).map((record) => record.contractor_id).filter(Boolean))];
  const contractors = await fetchRowsByIds(supabase, 'contractors', contractorIds, 'id, name, company_id');
  const companyIds = [...new Set(contractors.map((contractor) => contractor.company_id).filter(Boolean))];
  const companies = await fetchRowsByIds(supabase, 'companies', companyIds, 'id, name');

  const contractorMap = new Map(contractors.map((contractor) => [contractor.id, contractor]));
  const companyMap = new Map(companies.map((company) => [company.id, company]));

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const record of records || []) {
    const oldPath = extractStoragePath(record.file_url);
    if (!needsMigration(oldPath)) {
      skipped += 1;
      continue;
    }

    const contractor = contractorMap.get(record.contractor_id);
    const company = contractor?.company_id ? companyMap.get(contractor.company_id) : null;
    const newPath = buildTrainingRecordPath({
      companyName: company?.name,
      contractorName: contractor?.name,
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
      console.error(`Training record ${record.id} failed:`, moveError.message || moveError);
    }
  }

  return { migrated, skipped, failed, total: (records || []).length };
}

async function migrateMatrices(supabase, { dryRun = false } = {}) {
  try {
    const { data: matrices, error } = await supabase
      .from('company_training_matrices')
      .select('id, file_url, company_id')
      .not('file_url', 'is', null);

    if (error) {
      throw error;
    }

    const companyIds = [...new Set((matrices || []).map((matrix) => matrix.company_id).filter(Boolean))];
    const companies = await fetchRowsByIds(supabase, 'companies', companyIds, 'id, name');
    const companyMap = new Map(companies.map((company) => [company.id, company]));

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const matrix of matrices || []) {
      const oldPath = extractStoragePath(matrix.file_url);
      if (!needsMigration(oldPath)) {
        skipped += 1;
        continue;
      }

      const company = matrix.company_id ? companyMap.get(matrix.company_id) : null;
      const newPath = buildMatrixPath({
        companyName: company?.name,
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
        console.error(`Training matrix ${matrix.id} failed:`, moveError.message || moveError);
      }
    }

    return { migrated, skipped, failed, total: (matrices || []).length };
  } catch (error) {
    console.error('Training matrices migration skipped:', error.message || error);
    return {
      migrated: 0,
      skipped: 0,
      failed: 0,
      total: 0,
      unavailable: true,
    };
  }
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
