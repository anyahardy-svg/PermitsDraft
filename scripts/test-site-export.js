const assert = require('assert');
const {
  SITE_CSV_HEADERS,
  buildSiteExportRows,
  exportSitesCsv,
} = require('../src/utils/siteExport');

assert.deepStrictEqual(SITE_CSV_HEADERS, [
  'Site Name',
  'Location',
  'Business Unit',
  'Kiosk Subdomain',
  'Site Manager',
  'Notifications',
]);

const rows = buildSiteExportRows({
  sites: [
    {
      name: 'Amisfield Quarry',
      location: 'West Auckland',
      businessUnitId: 'bu-1',
      kioskSubdomain: 'wa-amisfield-quarry-kiosk',
      defaultNotificationManagerId: 'admin-1',
      sendDefaultSignInNotifications: true,
    },
    {
      name: 'Closed Site',
      location: 'Hamilton',
      businessUnitId: 'bu-1',
      sendDefaultSignInNotifications: false,
    },
  ],
  businessUnits: [{ id: 'bu-1', name: 'Winstone Aggregates' }],
  adminUsers: [{ id: 'admin-1', name: 'Jane Manager', email: 'jane@example.com' }],
});

assert.deepStrictEqual(rows[0], [
  'Amisfield Quarry',
  'West Auckland',
  'Winstone Aggregates',
  'wa-amisfield-quarry-kiosk',
  'jane@example.com',
  'On',
]);
assert.deepStrictEqual(rows[1][4], '');
assert.strictEqual(rows[1][5], 'Off');

const result = exportSitesCsv({ sites: [] });
assert.strictEqual(result, false, 'exportSitesCsv should no-op without sites');

console.log('✅ site export tests passed');
