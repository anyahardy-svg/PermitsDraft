import { supabase } from '../supabaseClient';
import { fetchAllPaginated } from './pagination';
import { getAccreditationStatusDisplay, resolveAccreditationDisplayStatus } from '../utils/accreditation';
import { getCompany, updateCompany } from './companies';
import {
  companyDataListAtSite,
  companyDataListPendingApprovals,
  companyDataSearchNotAtSite,
} from './companyData';
import { getRequestingAdminId, isAdminSessionActive } from './contractorData';

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

  const useEdge = Boolean(getRequestingAdminId() || isAdminSessionActive());
  if (useEdge) {
    try {
      const data = await companyDataListAtSite(siteId);
      return (data || []).map(transformManagerCompany);
    } catch (edgeError) {
      console.warn('listCompaniesAtSite edge failed, fallback:', edgeError?.message);
    }
  }

  const data = await fetchAllPaginated((from, to) =>
    supabase
      .from('companies')
      .select(COMPANY_MANAGER_COLUMNS)
      .contains('site_ids', [siteId])
      .order('name', { ascending: true })
      .range(from, to),
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

  const useEdge = Boolean(getRequestingAdminId() || isAdminSessionActive());
  if (useEdge) {
    try {
      const data = await companyDataSearchNotAtSite(siteId, trimmed);
      return (data || []).map(transformManagerCompany);
    } catch (edgeError) {
      console.warn('searchCompaniesNotAtSite edge failed, fallback:', edgeError?.message);
    }
  }

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

  const companyRow = await getCompany(companyId);
  if (!companyRow) {
    throw new Error('Company not found');
  }
  const company = {
    id: companyRow.id,
    name: companyRow.name,
    accredited_date: companyRow.accredited_date || companyRow.accreditedDate,
    accreditation_status: companyRow.accreditation_status || companyRow.accreditationStatus,
    site_ids: companyRow.site_ids || companyRow.siteIds || [],
    in_radar: companyRow.in_radar ?? companyRow.inRadar,
  };

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

  return transformManagerCompany({
    id: updated.id,
    name: updated.name,
    accredited_date: updated.accredited_date || updated.accreditedDate,
    accreditation_status: updated.accreditation_status || updated.accreditationStatus,
    site_ids: updated.site_ids || updated.siteIds || [],
    in_radar: updated.in_radar ?? updated.inRadar,
    public_liability_expiry: updated.public_liability_expiry || updated.publicLiabilityExpiry,
    motor_vehicle_insurance_expiry:
      updated.motor_vehicle_insurance_expiry || updated.motorVehicleInsuranceExpiry,
  });
}

// Backwards-compatible alias
export const addSiteToAccreditedCompany = addSiteToCompany;

export async function listPendingAccreditationApprovals(adminUserId) {
  if (!adminUserId) {
    return { managerApprovals: [], hsApprovals: [] };
  }

  let managerData = [];
  let hsData = [];
  try {
    const pending = await companyDataListPendingApprovals(adminUserId);
    managerData = pending.managerApprovals || [];
    hsData = pending.hsApprovals || [];
  } catch (edgeError) {
    console.warn('listPendingAccreditationApprovals edge failed, fallback:', edgeError?.message);
    [managerData, hsData] = await Promise.all([
      fetchAllPaginated((from, to) =>
        supabase
          .from('companies')
          .select(
            'id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id',
          )
          .eq('assigned_manager_id', adminUserId)
          .eq('accreditation_status', 'pending_manager')
          .order('accreditation_last_updated', { ascending: false })
          .range(from, to),
      ),
      fetchAllPaginated((from, to) =>
        supabase
          .from('companies')
          .select(
            'id, name, accreditation_status, accreditation_last_updated, assigned_manager_id, assigned_hs_person_id',
          )
          .eq('assigned_hs_person_id', adminUserId)
          .eq('accreditation_status', 'pending_hs')
          .order('accreditation_last_updated', { ascending: false })
          .range(from, to),
      ),
    ]);
  }

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
