const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'ContractorInductionScreen.js'),
  'utf8',
);

assert.match(source, /limitToSelectedSites: false/);
assert.match(source, /limitToSelectedSites = true/);
assert.match(source, /setAddPartsFilterSiteId\(''\)/);
assert.match(source, /siteIdsFromSelection/);
assert.match(source, /siteLabel\.toLowerCase\(\)\.includes\(normalizedName\)/);
assert.match(source, /getAddPartsCatalogBusinessUnitIds/);
assert.match(source, /setStep\('info-add-parts'\)/);
assert.match(source, /const addPartsSiteOptions = getSitesForBUFilter\(addPartsFilterBUId\)/);

console.log('add-parts induction catalog tests passed');
