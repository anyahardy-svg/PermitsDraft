const assert = require('assert');
const {
  canAutoApproveTypeDAccreditation,
  getTypeDSubmitValidationError,
  isTypeDContractor,
} = require('../src/utils/contractorAccreditationRequirements');

assert.strictEqual(isTypeDContractor('D'), true);
assert.strictEqual(isTypeDContractor('A'), false);

assert.strictEqual(
  getTypeDSubmitValidationError({
    selectedBusinessUnits: { bu1: true },
    selectedServices: {},
  }),
  'Please select at least one service in Section 2 before submitting.',
);

assert.strictEqual(
  canAutoApproveTypeDAccreditation({
    contractorType: 'D',
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
  }),
  true,
);

assert.strictEqual(
  canAutoApproveTypeDAccreditation({
    contractorType: 'A',
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
  }),
  false,
);

console.log('contractorAccreditationRequirements tests passed');
