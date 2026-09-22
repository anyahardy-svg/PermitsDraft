const assert = require('assert');
const {
  normalizeApproverEmail,
  resolveAdminUserIdFromList,
  getAdminUserEmailById,
  formatAdminUserOptionLabel,
} = require('../src/utils/approverAssignment');

const admins = [
  { id: 'mgr-1', name: 'Alice Manager', email: 'alice@example.com' },
  { id: 'hs-1', name: 'Bob HS', email: 'bob@example.com' },
];

assert.strictEqual(normalizeApproverEmail(' Alice@Example.com '), 'alice@example.com');
assert.strictEqual(resolveAdminUserIdFromList(admins, 'alice@example.com'), 'mgr-1');
assert.strictEqual(resolveAdminUserIdFromList(admins, 'unknown@example.com'), null);
assert.strictEqual(getAdminUserEmailById(admins, 'hs-1'), 'bob@example.com');
assert.strictEqual(
  formatAdminUserOptionLabel(admins[0]),
  'Alice Manager (alice@example.com)'
);

console.log('approverAssignment tests passed');
