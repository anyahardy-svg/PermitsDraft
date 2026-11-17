const assert = require('assert');

/** Mirrors src/api/contractorData.js (regression guard for admin Edge auth). */
let requestingAdminIdOverride = null;

function setRequestingAdminIdOverride(adminId) {
  requestingAdminIdOverride = adminId ? String(adminId) : null;
}

function readAdminIdFromLocalStorage(sessionRaw, adminDataRaw) {
  if (!sessionRaw || !adminDataRaw) {
    return null;
  }
  try {
    const parsed = JSON.parse(sessionRaw);
    if (parsed?.active === false) {
      return null;
    }
    const admin = JSON.parse(adminDataRaw);
    return admin?.id ? String(admin.id) : null;
  } catch {
    return null;
  }
}

function getRequestingAdminId(sessionRaw, adminDataRaw) {
  if (requestingAdminIdOverride) {
    return requestingAdminIdOverride;
  }
  return readAdminIdFromLocalStorage(sessionRaw, adminDataRaw);
}

function isAdminSessionActive(sessionRaw, adminDataRaw) {
  if (requestingAdminIdOverride) {
    return true;
  }
  return Boolean(readAdminIdFromLocalStorage(sessionRaw, adminDataRaw));
}

setRequestingAdminIdOverride(null);
assert.strictEqual(
  getRequestingAdminId(null, null),
  null,
  'no override and no storage',
);

setRequestingAdminIdOverride('super-admin-uuid');
assert.strictEqual(getRequestingAdminId(null, null), 'super-admin-uuid');
assert.strictEqual(isAdminSessionActive(null, null), true);

setRequestingAdminIdOverride(null);
const session = JSON.stringify({ active: true });
const adminData = JSON.stringify({ id: 'from-storage' });
assert.strictEqual(getRequestingAdminId(session, adminData), 'from-storage');

setRequestingAdminIdOverride('react-state-id');
assert.strictEqual(
  getRequestingAdminId(session, adminData),
  'react-state-id',
  'override wins when React session outlives cleared localStorage',
);

console.log('requesting admin id override tests passed');