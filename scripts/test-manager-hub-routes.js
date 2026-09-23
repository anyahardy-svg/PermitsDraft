const assert = require('assert');
const {
  getPostAdminLoginScreen,
  isAdminPanelPath,
} = require('../src/utils/managerHubRoutes');

const accredPath = '/admin/companies/abc-123/accreditation/';

assert.strictEqual(isAdminPanelPath(accredPath), true);
assert.strictEqual(
  getPostAdminLoginScreen({ role: 'manager' }, accredPath),
  'manage_companies',
);
assert.strictEqual(
  getPostAdminLoginScreen({ role: 'manager' }, '/admin/companies/'),
  'manager_hub',
);
assert.strictEqual(
  getPostAdminLoginScreen({ role: 'super_admin' }, accredPath),
  'admin',
);
assert.strictEqual(
  getPostAdminLoginScreen({ role: 'super_admin' }, '/manager/'),
  'admin',
);

console.log('manager hub route tests passed');
