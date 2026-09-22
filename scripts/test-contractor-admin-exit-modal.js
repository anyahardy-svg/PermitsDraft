const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/screens/ContractorAdminScreen.js'),
  'utf8'
);

assert.doesNotMatch(source, /Back to Kiosk/);
assert.doesNotMatch(source, /Back to Admin/);
assert.match(source, /You will be logged out\./);
assert.match(source, /onContractorAdminLogout/);

console.log('contractor admin exit modal tests passed');
