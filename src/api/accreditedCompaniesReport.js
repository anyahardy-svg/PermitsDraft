import { supabase } from '../supabaseClient';
import { resolveAccreditationDisplayStatus } from '../utils/accreditation';

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
    { data: companies, error: companiesError },
    { data: contractors, error: contractorsError },
    { data: businessUnits, error: businessUnitsError },
    { data: sites, error: sitesError },
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, business_unit_ids, accredited_date, public_liability_expiry, motor_vehicle_insurance_expiry, accreditation_status, accreditation_invitation_sent_at, accreditation_last_updated')
      .order('name', { ascending: true }),
    supabase
      .from('contractors')
      .select('company_id, site_ids')
      .not('company_id', 'is', null),
    supabase
      .from('business_units')
      .select('id, name')
      .order('name', { ascending: true }),
    supabase
      .from('sites')
      .select('id, name')
      .order('name', { ascending: true }),
  ]);

  if (companiesError) throw companiesError;
  if (contractorsError) throw contractorsError;
  if (businessUnitsError) throw businessUnitsError;
  if (sitesError) throw sitesError;

  const businessUnitMap = Object.fromEntries((businessUnits || []).map((bu) => [bu.id, bu.name]));
  const siteMap = Object.fromEntries((sites || []).map((site) => [site.id, site.name]));

  const companySitesMap = {};
  (contractors || []).forEach((contractor) => {
    if (!contractor.company_id) {
      return;
    }

    if (!companySitesMap[contractor.company_id]) {
      companySitesMap[contractor.company_id] = new Set();
    }

    (contractor.site_ids || []).forEach((siteId) => {
      const siteName = siteMap[siteId];
      if (siteName) {
        companySitesMap[contractor.company_id].add(siteName);
      }
    });
  });

  return (companies || [])
    .filter(isAccreditedCompany)
    .map((company) => {
      const businessUnitNames = (company.business_unit_ids || [])
        .map((id) => businessUnitMap[id])
        .filter(Boolean);

      const siteNames = Array.from(companySitesMap[company.id] || []).sort();

      return {
        id: company.id,
        companyName: company.name,
        accreditationDate: company.accredited_date || '',
        accreditationDateDisplay: formatDate(company.accredited_date),
        businessUnits: businessUnitNames.join('; '),
        sites: siteNames.join('; '),
        plInsuranceExpiry: company.public_liability_expiry || '',
        plInsuranceExpiryDisplay: formatDate(company.public_liability_expiry),
        vehicleInsuranceExpiry: company.motor_vehicle_insurance_expiry || '',
        vehicleInsuranceExpiryDisplay: formatDate(company.motor_vehicle_insurance_expiry),
      };
    });
}
