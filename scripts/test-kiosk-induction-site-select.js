const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'ContractorInductionScreen.js'),
  'utf8'
);

assert.match(source, /getEffectiveSelectedSiteIds/);
assert.match(source, /mergeSitesWithKioskSite/);
assert.match(
  source,
  /selectedSiteIds:\s*isKioskSiteLocked\s*\?\s*getKioskLockedSiteIds\(\)\s*:\s*\[\]/
);
assert.match(source, /getEffectiveSelectedSiteIds\(contractorInfo\.selectedSiteIds\)/);

console.log('kiosk induction site select tests passed');
