const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'InductionAdminScreen.js'),
  'utf8'
);

const requiredHeaders = ['Induction', 'Applies to', 'Service', 'Media', 'Status', 'Actions'];
for (const header of requiredHeaders) {
  assert.match(source, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

assert.match(source, /TABLE_MIN_WIDTH/);
assert.match(source, /getInductionBusinessUnitLabel/);
assert.match(source, /showsHorizontalScrollIndicator/);
assert.doesNotMatch(source, /borderLeftWidth: 4, borderLeftColor: '#3B82F6'/);

console.log('OK: InductionAdminScreen uses table layout with side actions');