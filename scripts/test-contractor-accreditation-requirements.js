const assert = require('assert');
const {
  canAutoApproveTypeDAccreditation,
  getSiteSelectionValidationError,
  getTypeDSubmitValidationError,
  isTypeDContractor,
} = require('../src/utils/contractorAccreditationRequirements');
const { mergeSiteIds } = require('../src/utils/siteIds');

assert.strictEqual(isTypeDContractor('D'), true);
assert.strictEqual(isTypeDContractor('A'), false);

assert.strictEqual(
  getTypeDSubmitValidationError({
    selectedBusinessUnits: { bu1: true },
    selectedServices: {},
    selectedSiteIds: ['site1'],
  }),
  'Please select at least one service in Section 2 before submitting.',
);

assert.strictEqual(
  getTypeDSubmitValidationError({
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
    selectedSiteIds: [],
    publicLiabilityInsurance: { has_document: true, expiry_date: '01/01/2027' },
  }),
  'Please select at least one site in Section 1 before submitting.',
);

assert.strictEqual(
  getTypeDSubmitValidationError({
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
    selectedSiteIds: ['site1'],
    publicLiabilityInsurance: { has_document: false, expiry_date: '' },
  }),
  'Please upload your public liability insurance certificate and expiry date in Section 24 before submitting.',
);

assert.strictEqual(
  getSiteSelectionValidationError({
    selectedBusinessUnits: {},
    selectedSiteIds: [],
  }),
  null,
);

assert.strictEqual(
  canAutoApproveTypeDAccreditation({
    contractorType: 'D',
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
    publicLiabilityInsurance: { has_document: true, expiry_date: '01/01/2027' },
  }),
  true,
);

assert.strictEqual(
  canAutoApproveTypeDAccreditation({
    contractorType: 'D',
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
    publicLiabilityInsurance: { has_document: false, expiry_date: '' },
  }),
  false,
);

assert.strictEqual(
  canAutoApproveTypeDAccreditation({
    contractorType: 'A',
    selectedBusinessUnits: { bu1: true },
    selectedServices: { svc1: true },
  }),
  false,
);

assert.deepStrictEqual(
  mergeSiteIds(['a', 'b'], ['b', 'c'], null, undefined),
  ['a', 'b', 'c'],
);

console.log('contractorAccreditationRequirements tests passed');
