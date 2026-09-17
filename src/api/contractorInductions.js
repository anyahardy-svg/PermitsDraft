/**
 * Per-site contractor induction records (contractor_inductions table).
 * Tracks induction completion and expiry separately for each site.
 */

import { supabase } from '../supabaseClient';
import { fetchAllPaginated, IN_QUERY_BATCH_SIZE } from './pagination';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function normalizeRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    contractor_id: record.contractor_id,
    site_id: record.site_id,
    business_unit_id: record.business_unit_id,
    inducted_at: record.inducted_at,
    expires_at: record.expires_at,
    status: record.status,
    acknowledgment_signature_url: record.acknowledgment_signature_url,
  };
}

function groupByContractorId(records) {
  const grouped = {};
  for (const record of records || []) {
    const contractorId = record.contractor_id;
    if (!grouped[contractorId]) {
      grouped[contractorId] = [];
    }
    grouped[contractorId].push(normalizeRecord(record));
  }
  return grouped;
}

function toSiteInductionMap(records) {
  const map = {};
  for (const record of records || []) {
    if (record?.site_id) {
      map[record.site_id] = record;
    }
  }
  return map;
}

export function attachSiteInductionData(contractor, siteInductionRecords = []) {
  const siteInductions = toSiteInductionMap(siteInductionRecords);
  return {
    ...contractor,
    site_inductions: siteInductions,
    siteInductions,
    site_induction_records: siteInductionRecords,
    siteInductionRecords,
  };
}

export async function fetchSiteInductionsForContractors(contractorIds = []) {
  const uniqueIds = [...new Set((contractorIds || []).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return {};
  }

  const allRecords = [];

  try {
    for (let i = 0; i < uniqueIds.length; i += IN_QUERY_BATCH_SIZE) {
      const batch = uniqueIds.slice(i, i + IN_QUERY_BATCH_SIZE);
      const { data, error } = await supabase
        .from('contractor_inductions')
        .select('*')
        .in('contractor_id', batch);

      if (error) {
        console.warn('Could not fetch contractor_inductions:', error.message);
        return {};
      }

      allRecords.push(...(data || []));
    }
  } catch (error) {
    console.warn('Could not fetch contractor_inductions:', error.message);
    return {};
  }

  return groupByContractorId(allRecords.map(normalizeRecord));
}

export async function attachSiteInductionsToContractors(contractors = []) {
  const grouped = await fetchSiteInductionsForContractors(
    contractors.map((contractor) => contractor.id)
  );

  return contractors.map((contractor) =>
    attachSiteInductionData(contractor, grouped[contractor.id] || [])
  );
}

export async function getContractorSiteInduction(contractorId, siteId) {
  if (!contractorId || !siteId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('contractor_inductions')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('site_id', siteId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch contractor site induction:', error.message);
      return null;
    }

    return normalizeRecord(data);
  } catch (error) {
    console.warn('Could not fetch contractor site induction:', error.message);
    return null;
  }
}

export async function upsertContractorSiteInduction({
  contractorId,
  siteId,
  businessUnitId,
  expiresAt = null,
  signatureUrl = null,
}) {
  if (!contractorId || !siteId || !businessUnitId) {
    throw new Error('Contractor, site, and business unit are required');
  }

  const nowIso = new Date().toISOString();
  const expiryIso = expiresAt
    ? new Date(expiresAt).toISOString()
    : new Date(Date.now() + ONE_YEAR_MS).toISOString();

  const existing = await getContractorSiteInduction(contractorId, siteId);
  const payload = {
    contractor_id: contractorId,
    site_id: siteId,
    business_unit_id: businessUnitId,
    inducted_at: nowIso,
    expires_at: expiryIso,
    status: 'completed',
    acknowledgment_signature_url: signatureUrl,
    updated_at: nowIso,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('contractor_inductions')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return normalizeRecord(data);
  }

  const { data, error } = await supabase
    .from('contractor_inductions')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return normalizeRecord(data);
}

/**
 * Create missing per-site induction records from completed site-specific progress.
 * Mirrors migrations/backfill-contractor-site-inductions-from-progress.sql for one contractor.
 */
export async function syncSiteInductionRecordsFromProgress(contractorId) {
  if (!contractorId) {
    return [];
  }

  const { data: contractor, error: contractorError } = await supabase
    .from('contractors')
    .select('id, induction_expiry')
    .eq('id', contractorId)
    .maybeSingle();

  if (contractorError || !contractor) {
    return [];
  }

  const progressRows = await fetchAllPaginated((from, to) =>
    supabase
      .from('contractor_induction_progress')
      .select('completed_at, induction_id, inductions(id, site_id)')
      .eq('contractor_id', contractorId)
      .eq('status', 'completed')
      .range(from, to)
  );

  const siteCompletionMap = new Map();
  for (const row of progressRows || []) {
    const siteId = row?.inductions?.site_id;
    const completedAt = row?.completed_at;
    if (!siteId || !completedAt) {
      continue;
    }

    const existing = siteCompletionMap.get(siteId);
    if (!existing || new Date(completedAt) > new Date(existing.latestCompletedAt)) {
      siteCompletionMap.set(siteId, { latestCompletedAt: completedAt });
    }
  }

  if (siteCompletionMap.size === 0) {
    return [];
  }

  const siteIds = [...siteCompletionMap.keys()];
  const { data: sites, error: sitesError } = await supabase
    .from('sites')
    .select('id, business_unit_id')
    .in('id', siteIds);

  if (sitesError) {
    console.warn('Could not load sites for induction sync:', sitesError.message);
    return [];
  }

  const siteIdToBusinessUnitId = {};
  for (const site of sites || []) {
    if (site?.id && site?.business_unit_id) {
      siteIdToBusinessUnitId[site.id] = site.business_unit_id;
    }
  }

  const results = [];
  for (const [siteId, { latestCompletedAt }] of siteCompletionMap.entries()) {
    const businessUnitId = siteIdToBusinessUnitId[siteId];
    if (!businessUnitId) {
      console.warn(`Skipping induction sync for site ${siteId}: missing business unit`);
      continue;
    }

    const existing = await getContractorSiteInduction(contractorId, siteId);
    if (existing) {
      continue;
    }

    const contractorExpiry = contractor.induction_expiry
      ? new Date(contractor.induction_expiry).toISOString()
      : null;
    const completedExpiry = new Date(new Date(latestCompletedAt).getTime() + ONE_YEAR_MS).toISOString();
    const expiresAt = contractorExpiry || completedExpiry;

    try {
      const record = await upsertContractorSiteInduction({
        contractorId,
        siteId,
        businessUnitId,
        expiresAt,
      });
      results.push(record);
    } catch (error) {
      console.warn(`Could not sync site induction for contractor ${contractorId} at site ${siteId}:`, error.message);
    }
  }

  return results;
}

export async function upsertContractorSiteInductions({
  contractorId,
  siteIds = [],
  siteIdToBusinessUnitId = {},
  expiresAt = null,
  signatureUrl = null,
}) {
  const uniqueSiteIds = [...new Set((siteIds || []).filter(Boolean))];
  const results = [];

  for (const siteId of uniqueSiteIds) {
    const businessUnitId = siteIdToBusinessUnitId[siteId];
    if (!businessUnitId) {
      console.warn(`Skipping contractor induction upsert for site ${siteId}: missing business unit`);
      continue;
    }

    const record = await upsertContractorSiteInduction({
      contractorId,
      siteId,
      businessUnitId,
      expiresAt,
      signatureUrl,
    });
    results.push(record);
  }

  return results;
}
