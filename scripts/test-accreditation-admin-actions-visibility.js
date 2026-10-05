const assert = require('assert');

function getAccreditationApprovalStage(status, isSuperAdmin) {
  if (status === 'pending_hs') return 'hs';
  if (status === 'pending_manager' || status === 'completed') return 'manager';
  if (isSuperAdmin && status === 'in-progress') return 'manager';
  return null;
}

function shouldShowFloatingApprovalBar(reviewStatus, isSuperAdmin) {
  return Boolean(getAccreditationApprovalStage(reviewStatus, isSuperAdmin));
}

assert.strictEqual(shouldShowFloatingApprovalBar('needs_revision', false), false);
assert.strictEqual(shouldShowFloatingApprovalBar('pending_manager', false), true);
assert.strictEqual(shouldShowFloatingApprovalBar('in-progress', false), false);
assert.strictEqual(shouldShowFloatingApprovalBar('in-progress', true), true);

console.log('test-accreditation-admin-actions-visibility: ok');
