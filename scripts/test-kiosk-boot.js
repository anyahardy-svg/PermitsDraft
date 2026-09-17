const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const kioskBootSource = fs.readFileSync(
  path.join(__dirname, '../src/utils/kioskBoot.js'),
  'utf8'
).replace(/^export /gm, '');

function evaluateWithWindow(hostname, pathname, search, expression) {
  const context = { window: null };
  vm.createContext(context);
  vm.runInContext(`${kioskBootSource}`, context);
  context.window = {
    location: {
      hostname,
      pathname,
      search,
      href: `https://${hostname}${pathname}${search}`,
    },
  };
  return vm.runInContext(expression, context);
}

assert.strictEqual(
  evaluateWithWindow('wa-hunua-quarry-kiosk.contractorhq.co.nz', '/', '', 'shouldBootKioskApp()'),
  true
);
assert.strictEqual(
  evaluateWithWindow('wa-hunua-quarry-kiosk.contractorhq.co.nz', '/', '', 'getKioskInitialRoute()'),
  null
);
assert.strictEqual(
  evaluateWithWindow('wa-hunua-quarry-kiosk.contractorhq.co.nz', '/sign-in-contractor/', '', 'shouldBootKioskApp()'),
  true
);
assert.strictEqual(
  evaluateWithWindow('wa-hunua-quarry-kiosk.contractorhq.co.nz', '/sign-in-contractor/', '', 'getKioskInitialRoute()'),
  'contractor-signin'
);
assert.strictEqual(
  evaluateWithWindow('contractorhq.co.nz', '/admin/', '', 'shouldBootKioskApp()'),
  false
);
assert.strictEqual(
  evaluateWithWindow('contractorhq.co.nz', '/inductions/new/', '', 'shouldBootKioskApp()'),
  false
);

console.log('kiosk boot tests passed');
