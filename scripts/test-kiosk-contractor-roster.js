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
assert.match(kioskScreenSource, /listContractorsForKiosk/);
assert.match(kioskScreenSource, /loadContractorsForSite/);
assert.match(kioskScreenSource, /searchContractorsForKiosk/);
assert.match(contractorsSource, /contractor_inductions!inner/);

console.log('kiosk contractor roster tests passed');
