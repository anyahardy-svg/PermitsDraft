/**
 * Regression guard: React admin session must drive Edge requestingAdminId (not localStorage alone).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');

assert.match(
  appSource,
  /import \{ isAdminSessionActive, setRequestingAdminIdOverride \} from '\.\/src\/api\/contractorData'/,
);
assert.match(appSource, /setRequestingAdminIdOverride\(adminData\?\.id \|\| null\)/);
assert.match(appSource, /setRequestingAdminIdOverride\(null\)/);
assert.match(appSource, /listCompanies\(loggedInAdmin\.id\)/);
assert.match(appSource, /listContractors\(loggedInAdmin\.id\)/);
assert.match(appSource, /deleteCompany\(id, .*loggedInAdmin\?\.id\)/);
assert.match(appSource, /deleteContractor\(id, loggedInAdmin\?\.id\)/);
assert.match(
  appSource,
  /useState\(\(\) => \{\s*try \{\s*return isAdminSessionActive\(\)/s,
  'adminSessionActive should use isAdminSessionActive(), not raw localStorage keys',
);

console.log('test-app-admin-edge-auth-wiring: ok');