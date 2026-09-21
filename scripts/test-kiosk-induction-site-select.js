const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'ContractorInductionScreen.js'),
  'utf8'
);

assert.match(source, /isNewContractorInduction/);
assert.match(source, /initialRoute === 'add-parts'/);
assert.doesNotMatch(source, /const isKioskSiteLocked = Boolean\(kioskSiteId\)/);
assert.match(source, /getEffectiveSelectedSiteIds/);

console.log('kiosk induction site select tests passed');
