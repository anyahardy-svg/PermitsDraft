/**
 * Transfer contractor induction progress and per-site records from one contractor row to another.
 * Mirrors migrations/merge-laura-mckay-inductions-lumacz86-to-firth.sql for reuse in the app.
 */

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^0+/, '') || digits;
}

function normalizeName(name) {
  return String(name || '').trim().toLowerCase();
}

function uniqueUuidArray(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function maxDateString(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return new Date(a) >= new Date(b) ? a : b;
}

function maxDateOnly(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return a >= b ? a : b;
}

function isCompletedProgress(row) {
  return row?.status === 'completed';
}

function shouldPreferSourceProgress(sourceRow, targetRow) {
  if (!isCompletedProgress(sourceRow)) {
    return false;
  }
  if (!isCompletedProgress(targetRow)) {
    return true;
  }
  const sourceCompletedAt = sourceRow.completed_at ? new Date(sourceRow.completed_at).getTime() : 0;
  const targetCompletedAt = targetRow.completed_at ? new Date(targetRow.completed_at).getTime() : 0;
  return sourceCompletedAt > targetCompletedAt;
}

function mergeProgressRow(targetRow, sourceRow) {
  const preferSource = shouldPreferSourceProgress(sourceRow, targetRow);
  const nowIso = new Date().toISOString();

  return {
    status: preferSource ? 'completed' : targetRow.status || sourceRow.status,
    completed_at: preferSource
      ? sourceRow.completed_at || targetRow.completed_at
      : targetRow.completed_at || sourceRow.completed_at,
    answers: preferSource
      ? sourceRow.answers || targetRow.answers || {}
      : targetRow.answers || sourceRow.answers || {},
    signature_text: targetRow.signature_text || sourceRow.signature_text || null,
    started_at: [targetRow.started_at, sourceRow.started_at]
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0] || null,
    updated_at: nowIso,
  };
}

function mergeSiteInductionRow(targetRow, sourceRow) {
  const nowIso = new Date().toISOString();
  const targetExpires = targetRow.expires_at ? new Date(targetRow.expires_at).getTime() : 0;
  const sourceExpires = sourceRow.expires_at ? new Date(sourceRow.expires_at).getTime() : 0;
  const latestExpiresAt = targetExpires >= sourceExpires ? targetRow.expires_at : sourceRow.expires_at;
  const inductedAt = sourceExpires > targetExpires ? sourceRow.inducted_at : targetRow.inducted_at;
  const isExpired = latestExpiresAt && new Date(latestExpiresAt) < new Date();

  return {
    inducted_at: inductedAt || targetRow.inducted_at || sourceRow.inducted_at,
    expires_at: latestExpiresAt,
    status: isExpired ? 'expired' : 'completed',
    business_unit_id: targetRow.business_unit_id || sourceRow.business_unit_id,
    acknowledgment_signature_url:
      targetRow.acknowledgment_signature_url || sourceRow.acknowledgment_signature_url || null,
    updated_at: nowIso,
  };
}

async function fetchContractor(adminClient, contractorId) {
  const { data, error } = await adminClient
    .from('contractors')
    .select('*')
    .eq('id', contractorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load contractor');
  }

  return data;
}

async function fetchProgressRows(adminClient, contractorId) {
  const { data, error } = await adminClient
    .from('contractor_induction_progress')
    .select('*')
    .eq('contractor_id', contractorId);

  if (error) {
    throw new Error(error.message || 'Failed to load induction progress');
  }

  return data || [];
}

async function fetchSiteInductionRows(adminClient, contractorId) {
  const { data, error } = await adminClient
    .from('contractor_inductions')
    .select('*')
    .eq('contractor_id', contractorId);

  if (error) {
    throw new Error(error.message || 'Failed to load site induction records');
  }

  return data || [];
}

async function countCompletedProgress(adminClient, contractorId) {
  const { count, error } = await adminClient
    .from('contractor_induction_progress')
    .select('id', { count: 'exact', head: true })
    .eq('contractor_id', contractorId)
    .eq('status', 'completed');

  if (error) {
    throw new Error(error.message || 'Failed to count completed inductions');
  }

  return count || 0;
}

async function findContractorsByEmail(adminClient, email, excludeContractorId = null) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return [];
  }

  const { data, error } = await adminClient
    .from('contractors')
    .select('id, name, email, phone, company_id, induction_expiry, companies(name)')
    .ilike('email', normalizedEmail);

  if (error) {
    throw new Error(error.message || 'Failed to search contractors by email');
  }

  return (data || []).filter((row) => row.id !== excludeContractorId);
}

async function findContractorsByName(adminClient, name, excludeContractorId = null) {
  const normalizedName = normalizeName(name);
  if (!normalizedName) {
    return [];
  }

  const { data, error } = await adminClient
    .from('contractors')
    .select('id, name, email, phone, company_id, induction_expiry, companies(name)')
    .ilike('name', name.trim());

  if (error) {
    throw new Error(error.message || 'Failed to search contractors by name');
  }

  return (data || []).filter(
    (row) => row.id !== excludeContractorId && normalizeName(row.name) === normalizedName
  );
}

async function findContractorsByPhone(adminClient, phone, excludeContractorId = null) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return [];
  }

  const { data, error } = await adminClient
    .from('contractors')
    .select('id, name, email, phone, company_id, induction_expiry, companies(name)')
    .not('phone', 'is', null);

  if (error) {
    throw new Error(error.message || 'Failed to search contractors by phone');
  }

  return (data || []).filter(
    (row) =>
      row.id !== excludeContractorId && normalizePhone(row.phone) === normalizedPhone
  );
}

function dedupeContractors(rows = []) {
  const byId = new Map();
  for (const row of rows) {
    if (!row?.id) continue;
    byId.set(row.id, row);
  }
  return [...byId.values()];
}

function formatCandidate(contractor, completedCount) {
  const companyName =
    contractor?.companies?.name ||
    contractor?.company_name ||
    contractor?.companyName ||
    'Unknown company';

  return {
    id: contractor.id,
    name: contractor.name,
    email: contractor.email,
    phone: contractor.phone,
    company_id: contractor.company_id,
    company_name: companyName,
    induction_expiry: contractor.induction_expiry,
    completed_induction_count: completedCount,
  };
}

async function findContractorsWithCompletedInductions(adminClient, {
  email,
  name,
  phone,
  excludeContractorId = null,
} = {}) {
  const matches = dedupeContractors([
    ...(await findContractorsByEmail(adminClient, email, excludeContractorId)),
    ...(await findContractorsByPhone(adminClient, phone, excludeContractorId)),
    ...(await findContractorsByName(adminClient, name, excludeContractorId)),
  ]);

  const candidates = [];
  for (const contractor of matches) {
    const completedCount = await countCompletedProgress(adminClient, contractor.id);
    if (completedCount > 0) {
      candidates.push(formatCandidate(contractor, completedCount));
    }
  }

  candidates.sort((a, b) => {
    const emailMatchA = normalizeEmail(email) && normalizeEmail(a.email) === normalizeEmail(email);
    const emailMatchB = normalizeEmail(email) && normalizeEmail(b.email) === normalizeEmail(email);
    if (emailMatchA !== emailMatchB) {
      return emailMatchA ? -1 : 1;
    }
    return b.completed_induction_count - a.completed_induction_count;
  });

  return candidates;
}

async function getTransferPreview(adminClient, sourceContractorId) {
  const contractor = await fetchContractor(adminClient, sourceContractorId);
  if (!contractor) {
    throw new Error('Source contractor not found');
  }

  const [progressRows, siteRows] = await Promise.all([
    fetchProgressRows(adminClient, sourceContractorId),
    fetchSiteInductionRows(adminClient, sourceContractorId),
  ]);

  const completedProgress = progressRows.filter(isCompletedProgress);

  const { data: inductions, error } = await adminClient
    .from('inductions')
    .select('id, induction_name')
    .in('id', completedProgress.map((row) => row.induction_id));

  if (error) {
    throw new Error(error.message || 'Failed to load induction names');
  }

  const inductionNameById = new Map((inductions || []).map((row) => [row.id, row.induction_name]));

  return {
    source_contractor_id: sourceContractorId,
    completed_induction_count: completedProgress.length,
    site_induction_count: siteRows.length,
    completed_inductions: completedProgress.map((row) => ({
      induction_id: row.induction_id,
      induction_name: inductionNameById.get(row.induction_id) || 'Induction',
      completed_at: row.completed_at,
    })),
    site_inductions: siteRows.map((row) => ({
      site_id: row.site_id,
      expires_at: row.expires_at,
      status: row.status,
    })),
  };
}

async function mergeContractorProfileFields(adminClient, sourceContractorId, targetContractorId) {
  const [source, target] = await Promise.all([
    fetchContractor(adminClient, sourceContractorId),
    fetchContractor(adminClient, targetContractorId),
  ]);

  if (!source || !target) {
    throw new Error('Source or target contractor not found while merging profile fields');
  }

  const payload = {
    site_ids: uniqueUuidArray([...(target.site_ids || []), ...(source.site_ids || [])]),
    business_unit_ids: uniqueUuidArray([
      ...(target.business_unit_ids || []),
      ...(source.business_unit_ids || []),
    ]),
    service_ids: uniqueUuidArray([...(target.service_ids || []), ...(source.service_ids || [])]),
    induction_expiry: maxDateOnly(target.induction_expiry, source.induction_expiry),
    signature: target.signature || source.signature || null,
    phone: target.phone || source.phone || null,
  };

  const { error } = await adminClient
    .from('contractors')
    .update(payload)
    .eq('id', targetContractorId);

  if (error) {
    throw new Error(error.message || 'Failed to merge contractor profile fields');
  }

  return payload;
}

async function backfillSiteInductionsFromProgress(adminClient, targetContractorId) {
  const [target, progressRows] = await Promise.all([
    fetchContractor(adminClient, targetContractorId),
    fetchProgressRows(adminClient, targetContractorId),
  ]);

  if (!target) {
    return [];
  }

  const completedRows = progressRows.filter(isCompletedProgress);
  if (completedRows.length === 0) {
    return [];
  }

  const inductionIds = completedRows.map((row) => row.induction_id);
  const { data: inductions, error: inductionError } = await adminClient
    .from('inductions')
    .select('id, site_id')
    .in('id', inductionIds);

  if (inductionError) {
    throw new Error(inductionError.message || 'Failed to load induction site mappings');
  }

  const inductionSiteById = new Map(
    (inductions || []).map((row) => [row.id, row.site_id]).filter(([, siteId]) => siteId)
  );

  const siteCompletionMap = new Map();
  for (const row of completedRows) {
    const siteId = inductionSiteById.get(row.induction_id);
    if (!siteId || !row.completed_at) continue;

    const existing = siteCompletionMap.get(siteId);
    if (!existing || new Date(row.completed_at) > new Date(existing.latestCompletedAt)) {
      siteCompletionMap.set(siteId, { latestCompletedAt: row.completed_at });
    }
  }

  if (siteCompletionMap.size === 0) {
    return [];
  }

  const siteIds = [...siteCompletionMap.keys()];
  const { data: sites, error: sitesError } = await adminClient
    .from('sites')
    .select('id, business_unit_id')
    .in('id', siteIds);

  if (sitesError) {
    throw new Error(sitesError.message || 'Failed to load sites for induction backfill');
  }

  const existingSiteRows = await fetchSiteInductionRows(adminClient, targetContractorId);
  const existingSiteIds = new Set(existingSiteRows.map((row) => row.site_id));
  const inserted = [];

  for (const site of sites || []) {
    if (!site?.id || existingSiteIds.has(site.id)) {
      continue;
    }

    const latestCompletedAt = siteCompletionMap.get(site.id)?.latestCompletedAt;
    if (!latestCompletedAt) continue;

    const contractorExpiry = target.induction_expiry
      ? new Date(target.induction_expiry).toISOString()
      : null;
    const completedExpiry = new Date(new Date(latestCompletedAt).getTime() + ONE_YEAR_MS).toISOString();
    const expiresAt = contractorExpiry || completedExpiry;
    const isExpired = new Date(expiresAt) < new Date();

    const { data, error } = await adminClient
      .from('contractor_inductions')
      .insert({
        contractor_id: targetContractorId,
        site_id: site.id,
        business_unit_id: site.business_unit_id,
        inducted_at: latestCompletedAt,
        expires_at: expiresAt,
        status: isExpired ? 'expired' : 'completed',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || `Failed to backfill site induction for site ${site.id}`);
    }

    inserted.push(data);
  }

  return inserted;
}

async function transferContractorInductions(adminClient, {
  sourceContractorId,
  targetContractorId,
  mergeProfileFields = true,
  reassignSignIns = true,
} = {}) {
  if (!sourceContractorId || !targetContractorId) {
    throw new Error('Source and target contractor IDs are required');
  }

  if (sourceContractorId === targetContractorId) {
    throw new Error('Source and target contractor must be different');
  }

  const [sourceProgress, targetProgress, sourceSiteRows, targetSiteRows] = await Promise.all([
    fetchProgressRows(adminClient, sourceContractorId),
    fetchProgressRows(adminClient, targetContractorId),
    fetchSiteInductionRows(adminClient, sourceContractorId),
    fetchSiteInductionRows(adminClient, targetContractorId),
  ]);

  const targetProgressByInductionId = new Map(
    targetProgress.map((row) => [row.induction_id, row])
  );
  const sourceProgressByInductionId = new Map(
    sourceProgress.map((row) => [row.induction_id, row])
  );

  let mergedProgressCount = 0;
  let movedProgressCount = 0;

  for (const [inductionId, sourceRow] of sourceProgressByInductionId.entries()) {
    const targetRow = targetProgressByInductionId.get(inductionId);
    if (targetRow) {
      const merged = mergeProgressRow(targetRow, sourceRow);
      const { error } = await adminClient
        .from('contractor_induction_progress')
        .update(merged)
        .eq('id', targetRow.id);

      if (error) {
        throw new Error(error.message || `Failed to merge induction progress for ${inductionId}`);
      }

      const { error: deleteError } = await adminClient
        .from('contractor_induction_progress')
        .delete()
        .eq('id', sourceRow.id);

      if (deleteError) {
        throw new Error(deleteError.message || `Failed to remove source induction progress for ${inductionId}`);
      }

      mergedProgressCount += 1;
      continue;
    }

    const { error } = await adminClient
      .from('contractor_induction_progress')
      .update({
        contractor_id: targetContractorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceRow.id);

    if (error) {
      throw new Error(error.message || `Failed to move induction progress for ${inductionId}`);
    }

    movedProgressCount += 1;
  }

  const targetSiteBySiteId = new Map(targetSiteRows.map((row) => [row.site_id, row]));
  let mergedSiteCount = 0;
  let movedSiteCount = 0;

  for (const sourceRow of sourceSiteRows) {
    const targetRow = targetSiteBySiteId.get(sourceRow.site_id);
    if (targetRow) {
      const merged = mergeSiteInductionRow(targetRow, sourceRow);
      const { error } = await adminClient
        .from('contractor_inductions')
        .update(merged)
        .eq('id', targetRow.id);

      if (error) {
        throw new Error(error.message || `Failed to merge site induction for site ${sourceRow.site_id}`);
      }

      const { error: deleteError } = await adminClient
        .from('contractor_inductions')
        .delete()
        .eq('id', sourceRow.id);

      if (deleteError) {
        throw new Error(deleteError.message || `Failed to remove source site induction for site ${sourceRow.site_id}`);
      }

      mergedSiteCount += 1;
      continue;
    }

    const { error } = await adminClient
      .from('contractor_inductions')
      .update({
        contractor_id: targetContractorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sourceRow.id);

    if (error) {
      throw new Error(error.message || `Failed to move site induction for site ${sourceRow.site_id}`);
    }

    movedSiteCount += 1;
  }

  if (mergeProfileFields) {
    await mergeContractorProfileFields(adminClient, sourceContractorId, targetContractorId);
  }

  const backfilledSiteRows = await backfillSiteInductionsFromProgress(adminClient, targetContractorId);

  if (reassignSignIns) {
    const { error } = await adminClient
      .from('sign_ins')
      .update({
        contractor_id: targetContractorId,
        updated_at: new Date().toISOString(),
      })
      .eq('contractor_id', sourceContractorId);

    if (error) {
      throw new Error(error.message || 'Failed to reassign sign-ins to target contractor');
    }
  }

  return {
    success: true,
    source_contractor_id: sourceContractorId,
    target_contractor_id: targetContractorId,
    merged_progress_count: mergedProgressCount,
    moved_progress_count: movedProgressCount,
    merged_site_induction_count: mergedSiteCount,
    moved_site_induction_count: movedSiteCount,
    backfilled_site_induction_count: backfilledSiteRows.length,
  };
}

module.exports = {
  findContractorsWithCompletedInductions,
  getTransferPreview,
  transferContractorInductions,
  normalizeEmail,
  normalizePhone,
  normalizeName,
  mergeProgressRow,
  mergeSiteInductionRow,
  shouldPreferSourceProgress,
};
