const assert = require('assert');

const storage = new Map();
global.sessionStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};

const {
  consumeKioskReloadResume,
  reloadKioskToSignIn,
} = require('../src/utils/kioskReload');

let assignedHref = null;
global.window = {
  location: {
    get href() {
      return assignedHref;
    },
    set href(value) {
      assignedHref = value;
    },
  },
};

storage.clear();
assignedHref = '/';

reloadKioskToSignIn({
  contractorId: 'contractor-1',
  contractorName: 'Laura McKay',
});

assert.strictEqual(assignedHref, '/sign-in-contractor/');
assert.ok(storage.has('kiosk_reload_resume'));

const resume = consumeKioskReloadResume();
assert.deepStrictEqual(resume, {
  returnScreen: 'contractor-signin',
  contractorId: 'contractor-1',
  contractorName: 'Laura McKay',
  fromInduction: true,
});
assert.strictEqual(consumeKioskReloadResume(), null);

console.log('kiosk reload tests passed');
