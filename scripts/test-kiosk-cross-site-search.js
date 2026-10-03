const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'api', 'contractors.js'),
  'utf8'
);
const kioskSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'KioskScreen.js'),
  'utf8'
);

assert.match(source, /isInductedAnywhere/);
assert.match(source, /globalNameMatches/);
assert.match(source, /contractor_inductions!inner/);
assert.match(
  fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'kioskContractorSearch.js'), 'utf8'),
  /isInductedAnywhere/,
);
assert.match(kioskSource, /searchContractorsForKiosk\(siteId, trimmed\)/);
assert.doesNotMatch(
  kioskSource,
  /if \(filtered\.length > 0 \|\| trimmed\.length < 2 \|\| !siteId\)/
);

console.log('kiosk cross-site search tests passed');
