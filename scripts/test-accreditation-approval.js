const assert = require('assert');
const {
  buildDefaultApproverAssignmentPatch,
  canActAsApprover,
  expectedStatusForStage,
  validateApproverAssignments,
} = require('../api/lib/accreditationApproval');

const company = {
  assigned_manager_id: 'manager-1',
  assigned_hs_person_id: 'hs-1',
};

assert.strictEqual(
  canActAsApprover({ company, stage: 'manager', adminUser: { id: 'manager-1', role: 'manager' } }),
  true,
);
assert.strictEqual(
  canActAsApprover({ company, stage: 'manager', adminUser: { id: 'other', role: 'manager' } }),
  false,
);
assert.strictEqual(
  canActAsApprover({ company, stage: 'hs', adminUser: { id: 'hs-1', role: 'manager' } }),
  true,
);
assert.strictEqual(
  canActAsApprover({ company, stage: 'hs', adminUser: { id: 'admin-1', role: 'super_admin' } }),
  true,
);

assert.strictEqual(expectedStatusForStage('manager'), 'pending_manager');
assert.strictEqual(expectedStatusForStage('hs'), 'pending_hs');

assert.ok(validateApproverAssignments({ assigned_manager_id: null, assigned_hs_person_id: 'hs-1' }));
assert.ok(validateApproverAssignments({ assigned_manager_id: 'm', assigned_hs_person_id: null }));
assert.strictEqual(
  validateApproverAssignments({ assigned_manager_id: 'm', assigned_hs_person_id: 'h' }),
  null,
);

assert.deepStrictEqual(
  buildDefaultApproverAssignmentPatch(
    { assigned_manager_id: null, assigned_hs_person_id: null },
    'default-admin-id',
  ),
  {
    assigned_manager_id: 'default-admin-id',
    assigned_hs_person_id: 'default-admin-id',
  },
);

assert.deepStrictEqual(
  buildDefaultApproverAssignmentPatch(
    { assigned_manager_id: 'mgr-1', assigned_hs_person_id: null },
    'default-admin-id',
  ),
  { assigned_hs_person_id: 'default-admin-id' },
);

assert.deepStrictEqual(
  buildDefaultApproverAssignmentPatch(
    { assigned_manager_id: 'mgr-1', assigned_hs_person_id: 'hs-1' },
    'default-admin-id',
  ),
  {},
);

console.log('accreditation approval tests passed');
