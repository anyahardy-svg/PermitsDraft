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

assert.match(contractorsSource, /export const listContractorsForKiosk/);
const listForKioskStart = contractorsSource.indexOf('export const listContractorsForKiosk');
const listForKioskEnd = contractorsSource.indexOf('};', listForKioskStart);
const listForKioskBlock = contractorsSource.slice(listForKioskStart, listForKioskEnd);
assert.match(listForKioskBlock, /fetchContractorIdsWithSiteInductionRecord\(siteId\)/);
assert.match(kioskScreenSource, /listContractorsForKiosk/);
assert.match(kioskScreenSource, /loadContractorsForSite/);
assert.doesNotMatch(kioskScreenSource, /searchContractorsForKiosk/);

console.log('kiosk contractor roster tests passed');
