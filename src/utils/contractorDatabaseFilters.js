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

  const matchesCompanyFilter = companyFilter === 'All'
    || (contractor.companyName || contractor.company) === companyFilter;

  const businessUnitIds = contractor.businessUnitIds || contractor.business_unit_ids || [];
  const matchesBusinessUnitFilter = businessUnitFilter === 'All'
    || businessUnitIds.includes(businessUnitFilter);

  const siteIds = contractor.siteIds || contractor.site_ids || [];
  const matchesSiteFilter = siteFilter === 'All' || siteIds.includes(siteFilter);

  return matchesSearch && matchesCompanyFilter && matchesBusinessUnitFilter && matchesSiteFilter;
}
