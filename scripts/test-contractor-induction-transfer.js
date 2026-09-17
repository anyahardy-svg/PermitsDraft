const assert = require('assert');
const {
  mergeProgressRow,
  mergeSiteInductionRow,
  shouldPreferSourceProgress,
  normalizeEmail,
  normalizePhone,
} = require('../api/lib/contractorInductionTransfer');

assert.strictEqual(normalizeEmail(' Test@Example.com '), 'test@example.com');
assert.strictEqual(normalizePhone('021 123 4567'), '211234567');

assert.strictEqual(
  shouldPreferSourceProgress(
    { status: 'completed', completed_at: '2026-01-02T00:00:00.000Z' },
    { status: 'in_progress', completed_at: null }
  ),
  true
);

assert.strictEqual(
  shouldPreferSourceProgress(
    { status: 'completed', completed_at: '2026-01-01T00:00:00.000Z' },
    { status: 'completed', completed_at: '2026-01-03T00:00:00.000Z' }
  ),
  false
);

const mergedProgress = mergeProgressRow(
  { status: 'in_progress', completed_at: null, answers: { q1: 'target' }, signature_text: '', started_at: '2026-01-01T00:00:00.000Z' },
  { status: 'completed', completed_at: '2026-01-02T00:00:00.000Z', answers: { q1: 'source' }, signature_text: 'Signed', started_at: '2025-12-31T00:00:00.000Z' }
);

assert.strictEqual(mergedProgress.status, 'completed');
assert.strictEqual(mergedProgress.completed_at, '2026-01-02T00:00:00.000Z');
assert.deepStrictEqual(mergedProgress.answers, { q1: 'source' });
assert.strictEqual(mergedProgress.signature_text, 'Signed');

const mergedSite = mergeSiteInductionRow(
  { expires_at: '2026-06-01T00:00:00.000Z', inducted_at: '2025-06-01T00:00:00.000Z', status: 'completed', business_unit_id: 'bu-1', acknowledgment_signature_url: null },
  { expires_at: '2027-01-01T00:00:00.000Z', inducted_at: '2026-01-01T00:00:00.000Z', status: 'completed', business_unit_id: 'bu-2', acknowledgment_signature_url: 'sig.png' }
);

assert.strictEqual(mergedSite.expires_at, '2027-01-01T00:00:00.000Z');
assert.strictEqual(mergedSite.inducted_at, '2026-01-01T00:00:00.000Z');
assert.strictEqual(mergedSite.acknowledgment_signature_url, 'sig.png');

console.log('contractor induction transfer tests passed');
