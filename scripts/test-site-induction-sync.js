const assert = require('assert');

// Mirrors syncSiteInductionRecordsFromProgress grouping logic.
function groupCompletedSiteInductions(progressRows = []) {
  const siteCompletionMap = new Map();

  for (const row of progressRows) {
    const siteId = row?.inductions?.site_id;
    const completedAt = row?.completed_at;
    if (!siteId || !completedAt) {
      continue;
    }

    const existing = siteCompletionMap.get(siteId);
    if (!existing || new Date(completedAt) > new Date(existing.latestCompletedAt)) {
      siteCompletionMap.set(siteId, { latestCompletedAt: completedAt });
    }
  }

  return siteCompletionMap;
}

const hendersonId = 'henderson-site-id';
const hunuaId = 'hunua-site-id';

const lauraProgress = [
  {
    completed_at: '2026-09-16T10:00:00.000Z',
    inductions: { site_id: hendersonId },
  },
  {
    completed_at: '2026-09-17T01:00:00.000Z',
    inductions: { site_id: hunuaId },
  },
  {
    completed_at: '2026-09-15T12:00:00.000Z',
    inductions: { site_id: null },
  },
];

const grouped = groupCompletedSiteInductions(lauraProgress);
assert.strictEqual(grouped.size, 2);
assert.ok(grouped.has(hendersonId));
assert.ok(grouped.has(hunuaId));
assert.strictEqual(grouped.get(hunuaId).latestCompletedAt, '2026-09-17T01:00:00.000Z');

console.log('site induction sync tests passed');
