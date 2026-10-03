const assert = require('assert');
const fs = require('fs');
const path = require('path');

const kioskCheckIn = fs.readFileSync(path.join(__dirname, '..', 'api', 'kiosk-check-in.js'), 'utf8');
const kioskSignIns = fs.readFileSync(path.join(__dirname, '..', 'api', 'kiosk-sign-ins.js'), 'utf8');
const emailLib = fs.readFileSync(path.join(__dirname, '..', 'api', 'lib', 'signInNotificationEmail.js'), 'utf8');

assert.match(kioskCheckIn, /await runSignInNotification/);
assert.doesNotMatch(kioskCheckIn, /notifySignIn\(data\.id\)\.catch/);
assert.match(kioskSignIns, /await runSignInNotification/);
assert.match(emailLib, /fetchSiteScopedContacts/);
assert.doesNotMatch(emailLib, /admin_users\?select=id,name,email,site_ids`;/);

console.log('sign-in notification delivery tests passed');
