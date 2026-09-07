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
    { data: businessUnits, error: businessUnitsError },
    { data: sites, error: sitesError },
  ] = await Promise.all([
    fetchAllPaginated((from, to) =>
      supabase
        .from('companies')
        .select('id, name, business_unit_ids, accredited_date, public_liability_expiry, motor_vehicle_insurance_expiry, accreditation_status, accreditation_invitation_sent_at, accreditation_last_updated, in_radar, site_ids')
        .order('name', { ascending: true })
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

  const companies = (companiesData || [])
    .filter(isAccreditedCompany)
    .map((company) => {
      const businessUnitNames = (company.business_unit_ids || [])
        .map((id) => businessUnitMap[id])
        .filter(Boolean);

      const siteIds = company.site_ids || [];
      const siteNames = siteIds
        .map((siteId) => siteMap[siteId])
        .filter(Boolean)
        .sort();

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
