const assert = require('assert');
const {
  getOtherInductedSites,
  getSiteInductionExpiry,
  getSiteInductionStatus,
  getOtherSiteNames,
} = require('../src/utils/siteInductionStatus');

const hendersonId = 'henderson-site-id';
const albanyId = 'albany-site-id';

const laura = {
  name: 'Laura McKay',
  site_ids: [hendersonId, albanyId],
  induction_expiry: '2027-01-15T00:00:00.000Z',
  site_inductions: {
    [hendersonId]: {
      site_id: hendersonId,
      expires_at: '2027-01-15T00:00:00.000Z',
      status: 'completed',
    },
  },
};

assert.strictEqual(getSiteInductionStatus(laura, hendersonId), 'inducted');
assert.strictEqual(getSiteInductionStatus(laura, albanyId), 'not_inducted');
assert.strictEqual(getSiteInductionExpiry(laura, albanyId), null);
assert.deepStrictEqual(
  getOtherSiteNames(laura, albanyId, { [hendersonId]: 'Henderson' }),
  ['Henderson']
);

const otherSitesAtAlbany = getOtherInductedSites(laura, albanyId);
assert.strictEqual(otherSitesAtAlbany.length, 1);
assert.strictEqual(otherSitesAtAlbany[0].site_id, hendersonId);
assert.strictEqual(otherSitesAtAlbany[0].status, 'inducted');
assert.strictEqual(getOtherInductedSites(laura, hendersonId).length, 0);

const legacyContractor = {
  site_ids: [hendersonId, albanyId],
  induction_expiry: '2027-01-15T00:00:00.000Z',
};

assert.strictEqual(getSiteInductionStatus(legacyContractor, hendersonId), 'inducted');
assert.strictEqual(getSiteInductionStatus(legacyContractor, albanyId), 'inducted');

const expiredAtSite = {
  site_ids: [hendersonId],
  site_inductions: {
    [hendersonId]: {
      site_id: hendersonId,
      expires_at: '2020-01-01T00:00:00.000Z',
    },
  },
};

assert.strictEqual(getSiteInductionStatus(expiredAtSite, hendersonId), 'expired');

console.log('site induction status tests passed');
