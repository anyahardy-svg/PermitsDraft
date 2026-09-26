const assert = require('assert');

function sanitizeCompanyStorageFolderName(name) {
  if (!name || typeof name !== 'string') {
    return null;
  }
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return sanitized || null;
}

assert.strictEqual(sanitizeCompanyStorageFolderName('Baxter Engineering Ltd'), 'baxter_engineering_ltd');
assert.strictEqual(sanitizeCompanyStorageFolderName('AC Palmer'), 'ac_palmer');
assert.strictEqual(sanitizeCompanyStorageFolderName(''), null);
assert.strictEqual(sanitizeCompanyStorageFolderName('___'), null);

console.log('accreditation storage folder name tests passed');
