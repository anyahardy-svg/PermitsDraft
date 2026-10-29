const assert = require('assert');

/** Mirrors CompanyAccreditationScreen policyHasUploadedFile (regression guard). */
function policyHasUploadedFile(policyData) {
  const url = policyData?.url;
  return typeof url === 'string' ? url.trim().length > 0 : !!url;
}

assert.strictEqual(policyHasUploadedFile({ url: 'path/to.pdf' }), true);
assert.strictEqual(policyHasUploadedFile({ url: '  ' }), false);
assert.strictEqual(policyHasUploadedFile({ url: null }), false);
assert.strictEqual(policyHasUploadedFile({ url: '' }), false);
assert.strictEqual(policyHasUploadedFile({ exists: true }), false);

console.log('policy document row tests passed');
