import { supabase } from '../supabaseClient';
import { fetchAllPaginated } from './pagination';
import { resolveAccreditationDisplayStatus } from '../utils/accreditation';
import { updateCompany } from './companies';

const COMPANY_MANAGER_COLUMNS =
  'id, name, accredited_date, accreditation_status, accreditation_invitation_sent_at, accreditation_last_updated, public_liability_expiry, motor_vehicle_insurance_expiry, site_ids, in_radar';

function isAccreditedCompany(company) {
  const status = resolveAccreditationDisplayStatus(company);
  return status === 'approved' || status === 'completed';
}

function transformManagerCompany(company) {
  const status = resolveAccreditationDisplayStatus(company);
  return {
    id: company.id,
    name: company.name,
    accreditationStatus: status,
    accreditedDate: company.accredited_date || '',
    siteIds: company.site_ids || [],
    site_ids: company.site_ids || [],
    publicLiabilityExpiry: company.public_liability_expiry || '',
    motorVehicleInsuranceExpiry: company.motor_vehicle_insurance_expiry || '',
    inRadar: company.in_radar !== false,
  };
}

export async function listAccreditedCompaniesAtSite(siteId) {
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

  return (data || []).filter(isAccreditedCompany).map(transformManagerCompany);
}

export async function searchAccreditedCompaniesNotAtSite(siteId, query = '', { limit = 50 } = {}) {
  if (!siteId) {
    return [];
  }

  const trimmed = String(query || '').trim();
  let request = supabase
    .from('companies')
    .select(COMPANY_MANAGER_COLUMNS)
    .order('name', { ascending: true })
    .limit(limit);

  if (trimmed) {
    request = request.ilike('name', `%${trimmed}%`);
  }

  const { data, error } = await request;
  if (error) {
    throw error;
  }

  return (data || [])
    .filter(isAccreditedCompany)
    .filter((company) => !(company.site_ids || []).includes(siteId))
    .map(transformManagerCompany);
}

export async function addSiteToAccreditedCompany(companyId, siteId) {
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

  if (!isAccreditedCompany(company)) {
    throw new Error('Only accredited companies can be linked to a site');
  }

  const existingSiteIds = company.site_ids || [];
  if (existingSiteIds.includes(siteId)) {
    return transformManagerCompany(company);
  }

  const updated = await updateCompany(companyId, {
    site_ids: [...existingSiteIds, siteId],
  });

  return updated;
}
