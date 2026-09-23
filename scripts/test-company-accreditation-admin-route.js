const assert = require('assert');

function parseCompanyAccreditationAdminRoute(pathname) {
  if (!pathname) return null;
  const match = pathname.match(/^\/admin\/companies\/([^/]+)\/accreditation\/?$/);
  return match ? { companyId: match[1] } : null;
}

assert.deepStrictEqual(
  parseCompanyAccreditationAdminRoute('/admin/companies/abc-123/accreditation/'),
  { companyId: 'abc-123' },
);

assert.strictEqual(parseCompanyAccreditationAdminRoute('/admin/companies/'), null);
assert.strictEqual(parseCompanyAccreditationAdminRoute('/approve-accreditation'), null);

console.log('company accreditation admin route tests passed');
