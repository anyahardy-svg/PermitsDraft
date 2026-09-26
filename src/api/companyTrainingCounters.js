/**
 * Read/update company training counter fields via Edge when admin session is active
 * (companies table is locked down for anon PostgREST).
 */

import { companyDataGet, companyDataListAll, getRequestingAdminId, isAdminSessionActive } from './companyData';

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

export async function fetchCompanyRowsByIdsViaEdge(companyIds) {
  const idSet = new Set((companyIds || []).filter(Boolean));
  if (idSet.size === 0) {
    return [];
  }
  const all = await companyDataListAll();
  return (all || []).filter((row) => idSet.has(row.id));
}

export async function fetchCompanyRowViaEdge(companyId) {
  if (!companyId) {
    return null;
  }
  return companyDataGet(companyId);
}
