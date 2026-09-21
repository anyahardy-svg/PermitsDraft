const { getSupabaseAdmin } = require('../supabaseAdmin');

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

function formatInductionDisplayName(induction) {
  if (!induction) return '';
  return (induction.induction_name || '').trim();
}

async function fetchAllPaginated(admin, table, select, filters = {}) {
  const allRows = [];
  let from = 0;

  while (true) {
    let query = admin.from(table).select(select).range(from, from + PAGE_SIZE - 1);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) {
      throw error;
    }
    if (!data?.length) {
      break;
    }
    allRows.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return allRows;
}

async function upsertCompletedProgress(admin, contractorId, inductionId, signatureText = 'Admin assigned') {
  const nowIso = new Date().toISOString();
  const { data: existing, error: existingError } = await admin
    .from('contractor_induction_progress')
    .select('id')
    .eq('contractor_id', contractorId)
    .eq('induction_id', inductionId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    status: 'completed',
    completed_at: nowIso,
    updated_at: nowIso,
    signature_text: signatureText,
  };

  if (existing?.id) {
    const { error } = await admin
      .from('contractor_induction_progress')
      .update(payload)
      .eq('id', existing.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await admin.from('contractor_induction_progress').insert({
    contractor_id: contractorId,
    induction_id: inductionId,
    started_at: nowIso,
    ...payload,
  });
  if (error) {
    throw error;
  }
}

async function syncSiteRecordsForInductions(admin, contractorId, inductionIds) {
  if (!inductionIds.length) {
    return;
  }

  const { data: inductionDetails, error: inductionError } = await admin
    .from('inductions')
    .select('id, site_id')
    .in('id', inductionIds);

  if (inductionError) {
    throw inductionError;
  }

  const siteIds = [...new Set((inductionDetails || []).map((row) => row.site_id).filter(Boolean))];
  if (!siteIds.length) {
    return;
  }

  const { data: sites, error: sitesError } = await admin
    .from('sites')
    .select('id, business_unit_id')
    .in('id', siteIds);

  if (sitesError) {
    throw sitesError;
  }

  const expiresAt = new Date(Date.now() + ONE_YEAR_MS).toISOString();
  for (const site of sites || []) {
    if (!site?.id || !site?.business_unit_id) {
      continue;
    }

    const { data: existing } = await admin
      .from('contractor_inductions')
      .select('id')
      .eq('contractor_id', contractorId)
      .eq('site_id', site.id)
      .maybeSingle();

    const payload = {
      contractor_id: contractorId,
      site_id: site.id,
      business_unit_id: site.business_unit_id,
      inducted_at: new Date().toISOString(),
      expires_at: expiresAt,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await admin.from('contractor_inductions').update(payload).eq('id', existing.id);
    } else {
      await admin.from('contractor_inductions').insert(payload);
    }
  }
}

async function ensureContractorExpiry(admin, contractorId) {
  const { data: contractor, error } = await admin
    .from('contractors')
    .select('induction_expiry')
    .eq('id', contractorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (contractor?.induction_expiry) {
    return;
  }

  const expiryDate = new Date(Date.now() + ONE_YEAR_MS);
  const { error: expiryError } = await admin
    .from('contractors')
    .update({ induction_expiry: expiryDate.toISOString().split('T')[0] })
    .eq('id', contractorId);

  if (expiryError) {
    throw expiryError;
  }
}

async function setContractorCompletedInductionsAdmin(contractorId, inductionIds = [], { mode = 'replace' } = {}) {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase service role is not configured');
  }

  const uniqueTargetIds = [...new Set((inductionIds || []).filter(Boolean))];

  const { data: existingRows, error: existingError } = await admin
    .from('contractor_induction_progress')
    .select('induction_id')
    .eq('contractor_id', contractorId)
    .eq('status', 'completed');

  if (existingError) {
    throw existingError;
  }

  const targetIds = new Set(uniqueTargetIds);

  for (const inductionId of uniqueTargetIds) {
    await upsertCompletedProgress(admin, contractorId, inductionId);
  }

  if (mode === 'replace') {
    for (const row of existingRows || []) {
      if (targetIds.has(row.induction_id)) {
        continue;
      }
      const { error } = await admin
        .from('contractor_induction_progress')
        .delete()
        .eq('contractor_id', contractorId)
        .eq('induction_id', row.induction_id);
      if (error) {
        throw error;
      }
    }
  }

  if (uniqueTargetIds.length > 0) {
    await syncSiteRecordsForInductions(admin, contractorId, uniqueTargetIds);
    await ensureContractorExpiry(admin, contractorId);
  }

  return uniqueTargetIds;
}

async function getCompletedInductionsByContractorAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error('Supabase service role is not configured');
  }

  const progressRows = await fetchAllPaginated(
    admin,
    'contractor_induction_progress',
    'contractor_id, induction_id, completed_at',
    { status: 'completed' }
  );

  const inductionIds = [...new Set(progressRows.map((row) => row.induction_id).filter(Boolean))];
  const inductionNameById = new Map();

  if (inductionIds.length > 0) {
    const { data: inductions, error: inductionError } = await admin
      .from('inductions')
      .select('id, induction_name')
      .in('id', inductionIds);

    if (inductionError) {
      throw inductionError;
    }

    for (const induction of inductions || []) {
      inductionNameById.set(induction.id, formatInductionDisplayName(induction));
    }
  }

  const completedByContractor = {};
  for (const row of progressRows) {
    const inductionName = inductionNameById.get(row.induction_id);
    if (!row.contractor_id || !inductionName) {
      continue;
    }
    if (!completedByContractor[row.contractor_id]) {
      completedByContractor[row.contractor_id] = [];
    }
    if (!completedByContractor[row.contractor_id].includes(inductionName)) {
      completedByContractor[row.contractor_id].push(inductionName);
    }
  }

  const { data: siteRecords, error: siteRecordsError } = await admin
    .from('contractor_inductions')
    .select('contractor_id, site_id, status, expires_at')
    .eq('status', 'completed');

  if (siteRecordsError) {
    throw siteRecordsError;
  }

  const activeSiteRecords = (siteRecords || []).filter((record) => {
    if (!record?.contractor_id || !record?.site_id) {
      return false;
    }
    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return false;
    }
    return true;
  });

  const activeSiteIds = [...new Set(activeSiteRecords.map((record) => record.site_id).filter(Boolean))];
  if (activeSiteIds.length > 0) {
    const [{ data: siteInductions }, { data: sites }] = await Promise.all([
      admin.from('inductions').select('id, induction_name, site_id').in('site_id', activeSiteIds),
      admin.from('sites').select('id, name').in('id', activeSiteIds),
    ]);

    const siteIdToInductionName = new Map(
      (siteInductions || []).map((induction) => [induction.site_id, formatInductionDisplayName(induction)])
    );
    const siteIdToName = new Map((sites || []).map((site) => [site.id, site.name]));

    for (const record of activeSiteRecords) {
      const inductionName =
        siteIdToInductionName.get(record.site_id) ||
        (siteIdToName.get(record.site_id) ? `${siteIdToName.get(record.site_id)} Induction` : 'Site Induction');

      if (!completedByContractor[record.contractor_id]) {
        completedByContractor[record.contractor_id] = [];
      }
      if (!completedByContractor[record.contractor_id].includes(inductionName)) {
        completedByContractor[record.contractor_id].push(inductionName);
      }
    }
  }

  return completedByContractor;
}

module.exports = {
  setContractorCompletedInductionsAdmin,
  getCompletedInductionsByContractorAdmin,
};
