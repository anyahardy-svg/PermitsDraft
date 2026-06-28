import { supabase } from '../supabaseClient';
import { resolveAccreditationDisplayStatus } from '../utils/accreditation';
import { fetchAllPaginated } from './pagination';

function formatDate(dateValue) {
  if (!dateValue) {
    return '';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function isAccreditedCompany(company) {
  const status = resolveAccreditationDisplayStatus(company);
  return status === 'approved' || status === 'completed';
}

export async function listAccreditedCompaniesReport() {
  const [
    companiesData,
    contractors,
    { data: businessUnits, error: businessUnitsError },
    { data: sites, error: sitesError },
  ] = await Promise.all([
    fetchAllPaginated((from, to) =>
      supabase
        .from('companies')
        .select('id, name, business_unit_ids, accredited_date, public_liability_expiry, motor_vehicle_insurance_expiry, accreditation_status, accreditation_invitation_sent_at, accreditation_last_updated, in_radar')
        .order('name', { ascending: true })
        .range(from, to)
    ),
    fetchAllPaginated((from, to) =>
      supabase
        .from('contractors')
        .select('company_id, site_ids')
        .not('company_id', 'is', null)
        .range(from, to)
    ),
    supabase
      .from('business_units')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('sites')
      .select('id, name')
      .order('name', { ascending: true }),
  ]);

  if (businessUnitsError) throw businessUnitsError;
  if (sitesError) throw sitesError;

  const businessUnitMap = Object.fromEntries((businessUnits || []).map((bu) => [bu.id, bu.name]));
  const siteMap = Object.fromEntries((sites || []).map((site) => [site.id, site.name]));

  const companySitesMap = {};
  const companySiteIdsMap = {};
  (contractors || []).forEach((contractor) => {
    if (!contractor.company_id) {
      return;
    }

    if (!companySitesMap[contractor.company_id]) {
      companySitesMap[contractor.company_id] = new Set();
      companySiteIdsMap[contractor.company_id] = new Set();
    }

    (contractor.site_ids || []).forEach((siteId) => {
      const siteName = siteMap[siteId];
      if (siteName) {
        companySitesMap[contractor.company_id].add(siteName);
        companySiteIdsMap[contractor.company_id].add(siteId);
      }
    });
  });

  const companies = (companiesData || [])
    .filter(isAccreditedCompany)
    .map((company) => {
      const businessUnitNames = (company.business_unit_ids || [])
        .map((id) => businessUnitMap[id])
        .filter(Boolean);

      const siteNames = Array.from(companySitesMap[company.id] || []).sort();
      const siteIds = Array.from(companySiteIdsMap[company.id] || []);

      return {
        id: company.id,
        companyName: company.name,
        accreditationDate: company.accredited_date || '',
        accreditationDateDisplay: formatDate(company.accredited_date),
        businessUnitIds: company.business_unit_ids || [],
        businessUnits: businessUnitNames.join('; '),
        siteIds,
        sites: siteNames.join('; '),
        plInsuranceExpiry: company.public_liability_expiry || '',
        plInsuranceExpiryDisplay: formatDate(company.public_liability_expiry),
        vehicleInsuranceExpiry: company.motor_vehicle_insurance_expiry || '',
        vehicleInsuranceExpiryDisplay: formatDate(company.motor_vehicle_insurance_expiry),
        inRadar: company.in_radar !== false,
        inRadarDisplay: company.in_radar !== false ? 'Yes' : 'No',
      };
    });

  return {
    companies,
    businessUnits: businessUnits || [],
    sites: sites || [],
  };
}
