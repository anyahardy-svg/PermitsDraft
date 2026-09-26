/**
 * Read/update company training counter fields via Edge when admin session is active
 * (companies table is locked down for anon PostgREST).
 */

import {
  companyDataGet,
  companyDataListTrainingCounters,
  getRequestingAdminId,
  isAdminSessionActive,
} from './companyData';

const COUNTER_CACHE_MS = 90_000;
let counterRowsCache = null;
let counterRowsCacheAt = 0;

export function preferCompanyEdgeForAdmin() {
  return Boolean(getRequestingAdminId() || isAdminSessionActive());
}

export function trainingRecordsStatusFromRow(company) {
  const total = company?.training_records_total || 0;
  const approved = company?.training_records_approved || 0;
  let status = 'none';
  if (total > 0) {
    status = approved === total ? 'approved' : 'added';
  }
  return {
    success: true,
    status,
    total,
    approved,
    pending: total - approved,
  };
}

export function trainingMatricesStatusFromRow(company) {
  const total = company?.training_matrices_total || 0;
  const approved = company?.training_matrices_approved || 0;
  let status = 'none';
  if (total > 0) {
    status = approved === total ? 'approved' : 'added';
  }
  return {
    success: true,
    status,
    total,
    approved,
    pending: total - approved,
  };
}

async function loadAllTrainingCounterRows() {
  const now = Date.now();
  if (counterRowsCache && now - counterRowsCacheAt < COUNTER_CACHE_MS) {
    return counterRowsCache;
  }
  const rows = await companyDataListTrainingCounters();
  counterRowsCache = rows || [];
  counterRowsCacheAt = now;
  return counterRowsCache;
}

export function clearTrainingCounterCache() {
  counterRowsCache = null;
  counterRowsCacheAt = 0;
}

export async function fetchCompanyRowsByIdsViaEdge(companyIds) {
  const idSet = new Set((companyIds || []).filter(Boolean));
  if (idSet.size === 0) {
    return [];
  }
  const all = await loadAllTrainingCounterRows();
  return all.filter((row) => idSet.has(row.id));
}

export async function fetchCompanyRowViaEdge(companyId) {
  if (!companyId) {
    return null;
  }
  return companyDataGet(companyId);
}
