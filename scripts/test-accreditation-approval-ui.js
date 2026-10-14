const assert = require('assert');
const {
  getAccreditationApprovalStageForAdmin,
  accreditationApprovalStageLabel,
} = require('../src/utils/accreditationApprovalUi');

assert.strictEqual(
  getAccreditationApprovalStageForAdmin(
    { accreditationStatus: 'pending_manager', assigned_manager_id: 'abc' },
    'ABC',
  ),
  'manager',
);
assert.strictEqual(
  getAccreditationApprovalStageForAdmin(
    { accreditationStatus: 'pending_hs', assigned_hs_person_id: 'hs-1' },
    'hs-1',
  ),
  'hs',
);
assert.strictEqual(
  getAccreditationApprovalStageForAdmin(
    { accreditationStatus: 'pending_manager', assigned_manager_id: 'other' },
    'me',
  ),
  null,
);
assert.strictEqual(accreditationApprovalStageLabel('manager'), 'Manager');
assert.strictEqual(accreditationApprovalStageLabel('hs'), 'Health & Safety');

console.log('accreditation approval UI tests passed');
