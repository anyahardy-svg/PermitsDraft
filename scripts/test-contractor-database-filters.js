const assert = require('assert');
const { contractorPassesAdminFilters } = require('../src/utils/contractorDatabaseFilters');

const baseContractor = {
  id: '1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  companyName: 'Acme',
  businessUnitIds: ['bu-1'],
  siteIds: ['site-a', 'site-b'],
};

assert.strictEqual(
  contractorPassesAdminFilters(baseContractor, { siteFilter: 'site-a' }),
  true,
);
assert.strictEqual(
  contractorPassesAdminFilters(baseContractor, { siteFilter: 'site-c' }),
  false,
);
assert.strictEqual(
  contractorPassesAdminFilters(baseContractor, {
    businessUnitFilter: 'bu-1',
    siteFilter: 'site-b',
    searchText: 'jane',
  }),
  true,
);
assert.strictEqual(
  contractorPassesAdminFilters(baseContractor, {
    companyFilter: 'Other Co',
    siteFilter: 'site-a',
  }),
  false,
);

console.log('contractor database filter tests passed');
