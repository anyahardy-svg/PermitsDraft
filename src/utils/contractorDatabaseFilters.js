/** Sentinel value for Manage Contractors company dropdown — not a real company name. */
export const CONTRACTOR_FILTER_NO_COMPANY = 'No company assigned';

export function contractorHasAssignedCompany(contractor) {
  return Boolean(contractor?.company_id || contractor?.companyId);
}

export function contractorPassesAdminFilters(contractor, {
  searchText = '',
  companyFilter = 'All',
  businessUnitFilter = 'All',
  siteFilter = 'All',
} = {}) {
  const contractorEmail = contractor.email || '';
  const normalizedSearch = searchText.trim().toLowerCase();
  const matchesSearch = normalizedSearch === ''
    || contractor.name?.toLowerCase().includes(normalizedSearch)
    || contractorEmail.toLowerCase().includes(normalizedSearch);

  let matchesCompanyFilter = true;
  if (companyFilter === 'All') {
    matchesCompanyFilter = true;
  } else if (companyFilter === CONTRACTOR_FILTER_NO_COMPANY) {
    matchesCompanyFilter = !contractorHasAssignedCompany(contractor);
  } else {
    matchesCompanyFilter = (contractor.companyName || contractor.company) === companyFilter;
  }

  const businessUnitIds = contractor.businessUnitIds || contractor.business_unit_ids || [];
  const matchesBusinessUnitFilter = businessUnitFilter === 'All'
    || businessUnitIds.includes(businessUnitFilter);

  const siteIds = contractor.siteIds || contractor.site_ids || [];
  const matchesSiteFilter = siteFilter === 'All' || siteIds.includes(siteFilter);

  return matchesSearch && matchesCompanyFilter && matchesBusinessUnitFilter && matchesSiteFilter;
}
