const assert = require('assert');
const {
  DEFAULT_CONTRACTOR_TYPE,
  getContractorTypeLabel,
  hasSafetyAccreditationSystemSelected,
  isTypeDContractor,
  normalizeContractorType,
} = require('../src/utils/contractorAccreditationRequirements');

assert.strictEqual(DEFAULT_CONTRACTOR_TYPE, 'B');
assert.strictEqual(normalizeContractorType(undefined), 'B');
assert.strictEqual(normalizeContractorType(''), 'B');

assert.strictEqual(getContractorTypeLabel('C'), 'C - Medium Risk');
assert.strictEqual(getContractorTypeLabel('D'), 'D - Low Risk');
assert.strictEqual(isTypeDContractor('c'), false);
assert.strictEqual(
  hasSafetyAccreditationSystemSelected({ totika_prequalified: { checked: true } }),
  true,
);
assert.strictEqual(hasSafetyAccreditationSystemSelected({}), false);

console.log('contractor type label tests passed');
