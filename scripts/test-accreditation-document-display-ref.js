const assert = require('assert');

/** Mirrors CompanyAccreditationScreen renderDocumentToggle file detection (regression guard). */
function accreditationDocumentFileRef(itemData) {
  return itemData?.certificateUrl || itemData?.evidence || itemData?.url || null;
}

assert.strictEqual(accreditationDocumentFileRef({ certificateUrl: 'a' }), 'a');
assert.strictEqual(accreditationDocumentFileRef({ evidence: 'b' }), 'b');
assert.strictEqual(accreditationDocumentFileRef({ url: 'policy-path' }), 'policy-path');
assert.strictEqual(accreditationDocumentFileRef({ url: 'p', certificateUrl: 'c' }), 'c');
assert.strictEqual(accreditationDocumentFileRef({}), null);

console.log('accreditation document display ref tests passed');
