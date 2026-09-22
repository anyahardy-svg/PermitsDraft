const assert = require('assert');
const {
  buildKioskOrigin,
  pickKioskSubdomain,
} = require('../api/lib/accreditationApprovalLinks');

assert.strictEqual(
  buildKioskOrigin('wa-hunua-quarry-kiosk'),
  'https://wa-hunua-quarry-kiosk.contractorhq.co.nz',
);

assert.strictEqual(
  pickKioskSubdomain(
    [
      { id: 'site-a', kiosk_subdomain: 'wa-hunua-quarry-kiosk' },
      { id: 'site-b', kiosk_subdomain: 'wa-petone-quarry-kiosk' },
    ],
    ['site-b'],
  ),
  'wa-petone-quarry-kiosk',
);

assert.strictEqual(
  pickKioskSubdomain(
    [{ id: 'site-a', kiosk_subdomain: 'wa-hunua-quarry-kiosk' }],
    [],
  ),
  'wa-hunua-quarry-kiosk',
);

console.log('accreditation approval link tests passed');
