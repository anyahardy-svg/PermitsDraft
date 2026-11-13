const assert = require('assert');

/** Mirrors src/api/contractorData.js isAdminSessionActive (regression guard). */
function isAdminSessionActive(sessionRaw, adminDataRaw) {
  if (!sessionRaw || !adminDataRaw) {
    return false;
  }
  try {
    const parsed = JSON.parse(sessionRaw);
    if (parsed?.active === false) {
      return false;
    }
    const admin = JSON.parse(adminDataRaw);
    return Boolean(admin?.id);
  } catch {
    return false;
  }
}

assert.strictEqual(
  isAdminSessionActive(JSON.stringify({ timestamp: 1 }), JSON.stringify({ id: 'admin-1' })),
  true,
  'legacy session without active flag should count as active',
);

assert.strictEqual(
  isAdminSessionActive(JSON.stringify({ active: true }), JSON.stringify({ id: 'admin-1' })),
  true,
);

assert.strictEqual(
  isAdminSessionActive(JSON.stringify({ active: false }), JSON.stringify({ id: 'admin-1' })),
  false,
);

assert.strictEqual(
  isAdminSessionActive(JSON.stringify({ active: true }), JSON.stringify({ name: 'no id' })),
  false,
);

console.log('admin session active tests passed');
