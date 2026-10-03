const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'kiosk-check-in.js'), 'utf8');
const signInsSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'api', 'signIns.js'), 'utf8');
const kioskSignInsApi = fs.readFileSync(path.join(__dirname, '..', 'api', 'kiosk-sign-ins.js'), 'utf8');

assert.match(apiSource, /sign_ins/);
assert.match(apiSource, /assertKioskSiteAccess/);
assert.match(signInsSource, /kiosk-check-in/);
assert.match(signInsSource, /kiosk-sign-ins/);
assert.match(signInsSource, /manager-sign-in-history/);
assert.match(kioskSignInsApi, /listOnSite/);
assert.match(kioskSignInsApi, /checkInVisitor/);

console.log('kiosk check-in api tests passed');
