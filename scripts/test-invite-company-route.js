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

function trimParam(value) {
  const text = value != null ? String(value).trim() : '';
  return text || null;
}

function parseInviteCompanyLinkParams(search = '') {
  if (!search) {
    return {
      siteId: null,
      assignedManagerId: null,
      assignedHsPersonId: null,
      assignedManagerName: null,
      assignedHsPersonName: null,
    };
  }

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);

  return {
    siteId: trimParam(params.get('siteId')),
    assignedManagerId: trimParam(params.get('managerId') || params.get('assignedManagerId')),
    assignedHsPersonId: trimParam(params.get('hsPersonId') || params.get('assignedHsPersonId')),
    assignedManagerName: trimParam(params.get('managerName') || params.get('assignedManagerName')),
    assignedHsPersonName: trimParam(params.get('hsPersonName') || params.get('assignedHsPersonName')),
  };
}

function buildInviteCompanyUrl({
  siteId,
  assignedManagerId,
  assignedHsPersonId,
  assignedManagerName,
  assignedHsPersonName,
  baseUrl = 'https://contractorhq.co.nz',
} = {}) {
  const params = new URLSearchParams();
  if (siteId) {
    params.set('siteId', siteId);
  }
  if (assignedManagerId) {
    params.set('managerId', assignedManagerId);
    if (assignedManagerName) {
      params.set('managerName', assignedManagerName);
    }
  }
  if (assignedHsPersonId) {
    params.set('hsPersonId', assignedHsPersonId);
    if (assignedHsPersonName) {
      params.set('hsPersonName', assignedHsPersonName);
    }
  }
  const query = params.toString();
  return `${baseUrl}/invite-company/${query ? `?${query}` : ''}`;
}

assert.strictEqual(isInviteCompanyRoute('/invite-company'), true);
assert.strictEqual(isManagerInviteCompanyRoute('/manager/invite-company/'), true);

assert.deepStrictEqual(parseInviteCompanyLinkParams(''), {
  siteId: null,
  assignedManagerId: null,
  assignedHsPersonId: null,
  assignedManagerName: null,
  assignedHsPersonName: null,
});

assert.deepStrictEqual(
  parseInviteCompanyLinkParams(
    '?siteId=site-abc&managerId=m-1&managerName=Jane%20Manager&hsPersonId=hs-2&hsPersonName=Sam%20Safety',
  ),
  {
    siteId: 'site-abc',
    assignedManagerId: 'm-1',
    assignedHsPersonId: 'hs-2',
    assignedManagerName: 'Jane Manager',
    assignedHsPersonName: 'Sam Safety',
  },
);

assert.strictEqual(
  buildInviteCompanyUrl({
    siteId: 'site-abc',
    assignedManagerId: 'm-1',
    assignedManagerName: 'Jane Manager',
    assignedHsPersonId: 'hs-2',
    assignedHsPersonName: 'Sam Safety',
  }),
  'https://contractorhq.co.nz/invite-company/?siteId=site-abc&managerId=m-1&managerName=Jane+Manager&hsPersonId=hs-2&hsPersonName=Sam+Safety',
);

console.log('invite company route tests passed');
