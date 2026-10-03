const assert = require('assert');

const INVITE_COMPANY_ROUTES = new Set(['/invite-company', '/invite-company/']);
const MANAGER_INVITE_COMPANY_ROUTES = new Set([
  '/manager/invite-company',
  '/manager/invite-company/',
]);

function isInviteCompanyRoute(pathname) {
  return INVITE_COMPANY_ROUTES.has(pathname);
}

function isManagerInviteCompanyRoute(pathname) {
  return MANAGER_INVITE_COMPANY_ROUTES.has(pathname);
}

function parseInviteCompanySiteId(search = '') {
  if (!search) {
    return null;
  }
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('siteId');
  return raw && String(raw).trim() ? String(raw).trim() : null;
}

assert.strictEqual(isInviteCompanyRoute('/invite-company'), true);
assert.strictEqual(isInviteCompanyRoute('/invite-company/'), true);
assert.strictEqual(isInviteCompanyRoute('/manager/invite-company/'), false);

assert.strictEqual(isManagerInviteCompanyRoute('/manager/invite-company/'), true);
assert.strictEqual(isManagerInviteCompanyRoute('/invite-company/'), false);

assert.strictEqual(parseInviteCompanySiteId('?siteId=site-abc'), 'site-abc');
assert.strictEqual(parseInviteCompanySiteId(''), null);

console.log('invite company route tests passed');
