const assert = require('assert');
const {
  buildSignInDetails,
  resolveVisitingPersonRecipient,
  resolveDefaultManagerRecipient,
  resolveSignInNotificationRecipient,
} = require('../api/lib/signInNotificationEmail');

const SITE_ID = 'site-123';
const adminUsers = [
  { id: 'admin-1', name: 'Jane Manager', email: 'jane@example.com', site_ids: [SITE_ID] },
  { id: 'admin-2', name: 'Bob Site Lead', email: 'bob@example.com', site_ids: ['other-site'] },
];
const permitIssuers = [
  { id: 'issuer-1', name: 'Pat Issuer', email: 'pat@example.com', site_ids: [SITE_ID] },
];

function run() {
  const contractorSignIn = {
    contractor_id: 'contractor-1',
    contractor_name: 'Alex Worker',
    contractor_company: 'Build Co',
    contractor_phone: '021123456',
    check_in_time: '2026-09-17T08:30:00.000Z',
    visiting_person_name: 'Jane Manager',
  };

  const details = buildSignInDetails(contractorSignIn, 'Amisfield Quarry');
  assert.strictEqual(details.personType, 'contractor');
  assert.strictEqual(details.personName, 'Alex Worker');
  assert.strictEqual(details.personCompany, 'Build Co');
  assert.ok(details.checkInTime.includes('2026'));

  const visitingRecipient = resolveVisitingPersonRecipient('Jane Manager', SITE_ID, adminUsers, permitIssuers);
  assert.strictEqual(visitingRecipient.email, 'jane@example.com');
  assert.strictEqual(visitingRecipient.source, 'admin');

  const issuerRecipient = resolveVisitingPersonRecipient('Pat Issuer', SITE_ID, adminUsers, permitIssuers);
  assert.strictEqual(issuerRecipient.email, 'pat@example.com');
  assert.strictEqual(issuerRecipient.source, 'permit_issuer');

  const siteWithManager = {
    id: SITE_ID,
    send_default_sign_in_notifications: true,
    default_notification_manager: { id: 'admin-1', name: 'Jane Manager', email: 'jane@example.com' },
  };

  const defaultRecipient = resolveDefaultManagerRecipient(siteWithManager);
  assert.strictEqual(defaultRecipient.email, 'jane@example.com');

  const disabledSite = {
    ...siteWithManager,
    send_default_sign_in_notifications: false,
  };
  assert.strictEqual(resolveDefaultManagerRecipient(disabledSite), null);

  const visitingSignInRecipient = resolveSignInNotificationRecipient({
    signInRecord: contractorSignIn,
    site: siteWithManager,
    adminUsers,
    permitIssuers,
  });
  assert.strictEqual(visitingSignInRecipient.email, 'jane@example.com');
  assert.strictEqual(visitingSignInRecipient.source, 'admin');

  const fallbackRecipient = resolveSignInNotificationRecipient({
    signInRecord: { ...contractorSignIn, visiting_person_name: null },
    site: siteWithManager,
    adminUsers,
    permitIssuers,
  });
  assert.strictEqual(fallbackRecipient.email, 'jane@example.com');
  assert.strictEqual(fallbackRecipient.source, 'default_manager');

  const noRecipient = resolveSignInNotificationRecipient({
    signInRecord: { ...contractorSignIn, visiting_person_name: null },
    site: { ...disabledSite, default_notification_manager: null },
    adminUsers,
    permitIssuers,
  });
  assert.strictEqual(noRecipient, null);

  console.log('✅ sign-in notification tests passed');
}

run();
