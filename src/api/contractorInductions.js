/**
 * Per-site contractor induction records (contractor_inductions table).
 * Tracks induction completion and expiry separately for each site.
 */

import { supabase } from '../supabaseClient';
import { IN_QUERY_BATCH_SIZE } from './pagination';

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
