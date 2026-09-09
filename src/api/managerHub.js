import { supabase } from '../supabaseClient';
import { fetchAllPaginated } from './pagination';
import { getAccreditationStatusDisplay, resolveAccreditationDisplayStatus } from '../utils/accreditation';
import { updateCompany } from './companies';

const COMPANY_MANAGER_COLUMNS =
  'id, name, accredited_date, accreditation_status, accreditation_invitation_sent_at, accreditation_last_updated, public_liability_expiry, motor_vehicle_insurance_expiry, site_ids, in_radar, assigned_manager_id, assigned_hs_person_id, accreditation_rejection_reason';

function transformManagerCompany(company) {
  const status = resolveAccreditationDisplayStatus(company);
  const statusDisplay = getAccreditationStatusDisplay(status);

  return {
    id: company.id,
    name: company.name,
    accreditationStatus: status,
    accreditationStatusLabel: statusDisplay.label,
    accreditedDate: company.accredited_date || '',
    siteIds: company.site_ids || [],
    site_ids: company.site_ids || [],
    publicLiabilityExpiry: company.public_liability_expiry || '',
    motorVehicleInsuranceExpiry: company.motor_vehicle_insurance_expiry || '',
    inRadar: company.in_radar !== false,
  };
}

export async function listCompaniesAtSite(siteId) {
  if (!siteId) {
    return [];
  }

  const data = await fetchAllPaginated((from, to) =>
    supabase
      .from('companies')
      .select(COMPANY_MANAGER_COLUMNS)
      .contains('site_ids', [siteId])
      .order('name', { ascending: true })
      .range(from, to)
  );

  return (data || []).map(transformManagerCompany);
}

// Backwards-compatible alias
export const listAccreditedCompaniesAtSite = listCompaniesAtSite;

export async function searchCompaniesNotAtSite(siteId, query = '') {
  if (!siteId) {
    return [];
  }

  const trimmed = String(query || '').trim();

  const data = await fetchAllPaginated((from, to) => {
    let request = supabase
      .from('companies')
      .select(COMPANY_MANAGER_COLUMNS)
      .order('name', { ascending: true })
      .range(from, to);

    if (trimmed) {
      request = request.ilike('name', `%${trimmed}%`);
    }

    return request;
  });

  return (data || [])
    .filter((company) => !(company.site_ids || []).includes(siteId))
    .map(transformManagerCompany);
}

// Backwards-compatible alias
export const searchAccreditedCompaniesNotAtSite = searchCompaniesNotAtSite;

export async function addSiteToCompany(companyId, siteId) {
  if (!companyId || !siteId) {
    throw new Error('Company and site are required');
  }

  const { data: company, error } = await supabase
    .from('companies')
    .select(COMPANY_MANAGER_COLUMNS)
    .eq('id', companyId)
    .single();

  if (error) {
    throw error;
  }

  const existingSiteIds = company.site_ids || [];
  if (existingSiteIds.includes(siteId)) {
    return transformManagerCompany(company);
  }

  const updated = await updateCompany(companyId, {
    site_ids: [...existingSiteIds, siteId],
  });

  if (!updated) {
    throw new Error('Failed to update company site list');
  }

  return updated;
}

// Backwards-compatible alias
export const addSiteToAccreditedCompany = addSiteToCompany;

export async function listPendingAccreditationApprovals(adminUserId) {
  if (!adminUserId) {
    return { managerApprovals: [], hsApprovals: [] };
  }

  const [managerData, hsData] = await Promise.all([
    fetchAllPaginated((from, to) =>
      supabase
        .from('companies')
        .select('id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id')
        .eq('assigned_manager_id', adminUserId)
        .eq('accreditation_status', 'pending_manager')
        .order('accreditation_last_updated', { ascending: false })
        .range(from, to)
    ),
    fetchAllPaginated((from, to) =>
      supabase
        .from('companies')
        .select('id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id')
        .eq('assigned_hs_person_id', adminUserId)
        .eq('accreditation_status', 'pending_hs')
        .order('accreditation_last_updated', { ascending: false })
        .range(from, to)
    ),
  ]);

  const mapApproval = (company, stage) => ({
    id: company.id,
    name: company.name,
    stage,
    stageLabel: stage === 'manager' ? 'Manager' : 'H&S',
    status: resolveAccreditationDisplayStatus(company),
    statusLabel: getAccreditationStatusDisplay(resolveAccreditationDisplayStatus(company)).label,
    lastUpdated: company.accreditation_last_updated || null,
  });

  return {
    managerApprovals: (managerData || []).map((company) => mapApproval(company, 'manager')),
    hsApprovals: (hsData || []).map((company) => mapApproval(company, 'hs')),
  };
}
