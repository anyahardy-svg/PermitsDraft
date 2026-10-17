const assert = require('assert');
const fs = require('fs');
const path = require('path');

const joinRequestsSource = fs.readFileSync(
  path.join(__dirname, '../src/api/joinRequests.js'),
  'utf8',
);

assert.ok(
  joinRequestsSource.includes("export const ADMIN_JOIN_REQUESTS_URL = 'https://contractorhq.co.nz/admin/join-requests/'"),
  'support email must link to super admin join-requests route',
);
assert.ok(
  !joinRequestsSource.includes('contractor-admin?tab=join-requests'),
  'support email must not link to contractor admin login',
);
assert.ok(
  joinRequestsSource.includes('contractorDataCreate'),
  'approval must create contractors via admin edge when super admin is signed in',
);

const appSource = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
assert.ok(
  appSource.includes("'join-requests': 'join-requests'"),
  'App.js must map /admin/join-requests/ to join-requests screen',
);
assert.ok(
  appSource.includes("'join-requests': '/admin/join-requests/'"),
  'App.js must push /admin/join-requests/ when on join-requests screen',
);

console.log('join request admin link tests passed');
