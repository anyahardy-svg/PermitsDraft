const assert = require('assert');
const {
  formatInductionExpiryForCsv,
  resolveContractorInductionExpiryForExport,
} = require('../src/utils/siteInductionStatus');

assert.strictEqual(formatInductionExpiryForCsv(null), '');
assert.strictEqual(formatInductionExpiryForCsv(''), '');
assert.strictEqual(formatInductionExpiryForCsv('2026-09-23'), '23/09/2026');
const isoExpiry = formatInductionExpiryForCsv('2026-09-23T00:00:00.000Z');
assert.match(isoExpiry, /^23\/09\/2026$/);

const belmontId = 'belmont-site-id';
const contractor = {
  induction_expiry: '2026-09-23',
  site_inductions: {
    [belmontId]: {
      site_id: belmontId,
      expires_at: '2027-01-15T00:00:00.000Z',
    },
  },
};

assert.strictEqual(
  resolveContractorInductionExpiryForExport(contractor, belmontId),
  '2027-01-15T00:00:00.000Z',
);
assert.strictEqual(
  resolveContractorInductionExpiryForExport(contractor, 'All'),
  '2026-09-23',
);

console.log('✅ test-contractor-export-csv.js passed');
