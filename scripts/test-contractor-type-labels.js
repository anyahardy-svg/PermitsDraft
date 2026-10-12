const assert = require('assert');
const {
  getContractorTypeLabel,
  hasSafetyAccreditationSystemSelected,
  isTypeDContractor,
} = require('../src/utils/contractorAccreditationRequirements');

assert.strictEqual(getContractorTypeLabel('C'), 'C - Medium Risk');
assert.strictEqual(getContractorTypeLabel('D'), 'D - Low Risk');
assert.strictEqual(isTypeDContractor('c'), false);
assert.strictEqual(
  hasSafetyAccreditationSystemSelected({ totika_prequalified: { checked: true } }),
  true,
);
assert.strictEqual(hasSafetyAccreditationSystemSelected({}), false);

console.log('contractor type label tests passed');
