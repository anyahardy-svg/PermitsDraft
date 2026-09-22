const assert = require('assert');
const fs = require('fs');
const path = require('path');

const contractorsSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'api', 'contractors.js'),
  'utf8'
);
const kioskScreenSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'KioskScreen.js'),
  'utf8'
);

assert.match(contractorsSource, /export const listContractorsBySite/);
const listBySiteStart = contractorsSource.indexOf('export const listContractorsBySite');
const listBySiteEnd = contractorsSource.indexOf('};', listBySiteStart);
const listBySiteBlock = contractorsSource.slice(listBySiteStart, listBySiteEnd);
assert.match(listBySiteBlock, /fetchContractorIdsWithSiteInductionRecord\(siteId\)/);
assert.match(kioskScreenSource, /listContractorsBySite/);
assert.match(kioskScreenSource, /loadContractorsForSite/);
assert.match(kioskScreenSource, /searchContractorsForKiosk/);
assert.doesNotMatch(kioskScreenSource, /listContractorsForKiosk/);

console.log('kiosk contractor roster tests passed');
