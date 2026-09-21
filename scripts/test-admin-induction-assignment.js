const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mirror formatInductionDisplayName without ESM import issues.
function formatInductionDisplayName(induction) {
  if (!induction) return '';
  return (induction.induction_name || '').trim();
}

assert.strictEqual(
  formatInductionDisplayName({ induction_name: 'Roys Hill Induction' }),
  'Roys Hill Induction'
);
assert.strictEqual(
  formatInductionDisplayName({ induction_name: 'Site Induction' }),
  'Site Induction'
);

const appSource = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
assert.match(
  appSource,
  /setContractorCompletedInductions as saveContractorCompletedInductions/
);
assert.match(appSource, /await saveContractorCompletedInductions\(/);
assert.doesNotMatch(
  appSource,
  /await setContractorCompletedInductions\(/
);

function findColumnIndex(headers, matchers) {
  for (const matcher of matchers) {
    const idx = headers.findIndex(matcher);
    if (idx >= 0) return idx;
  }
  return -1;
}

const userExportHeaders = [
  'name',
  'company',
  'services',
  'completed_inductions',
  'induction_expiry',
  'business_units',
];

const completedInductionsIdx = findColumnIndex(userExportHeaders, [
  (h) => h === 'completed_inductions',
  (h) => h === 'completed_induction',
  (h) => h === 'inductions_completed',
  (h) => h.includes('completed') && h.includes('induction'),
]);
const inductionIdx = findColumnIndex(userExportHeaders, [
  (h) => h === 'induction_expiry',
  (h) => h === 'induction_exp',
  (h) => h.includes('induction') && h.includes('expiry'),
  (h) => h === 'expiry',
  (h) => h === 'date',
]);

assert.strictEqual(completedInductionsIdx, 3);
assert.strictEqual(inductionIdx, 4);
assert.notStrictEqual(completedInductionsIdx, inductionIdx);

function normalizeInductionLookupKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function buildInductionNameLookup(inductions = []) {
  const lookup = new Map();
  const addKey = (key, inductionId) => {
    const normalized = normalizeInductionLookupKey(key);
    if (normalized && inductionId) {
      lookup.set(normalized, inductionId);
    }
  };
  for (const induction of inductions) {
    if (!induction?.id) continue;
    addKey(formatInductionDisplayName(induction), induction.id);
    addKey(induction.induction_name, induction.id);
  }
  return lookup;
}

function resolveInductionIdFromImportName(name, lookup) {
  const normalized = normalizeInductionLookupKey(name);
  if (!normalized || !lookup) return null;
  if (lookup.has(normalized)) return lookup.get(normalized);
  if (normalized.endsWith('s') && lookup.has(normalized.slice(0, -1))) {
    return lookup.get(normalized.slice(0, -1));
  }
  if (lookup.has(`${normalized}s`)) return lookup.get(`${normalized}s`);
  const colonIdx = normalized.lastIndexOf(':');
  if (colonIdx >= 0) {
    const suffix = normalizeInductionLookupKey(normalized.slice(colonIdx + 1));
    if (suffix) {
      const suffixMatch = resolveInductionIdFromImportName(suffix, lookup);
      if (suffixMatch) return suffixMatch;
    }
  }
  return null;
}

const sampleInductions = [
  { id: 'rha-id', induction_name: 'Roys Hill Aggregates' },
  { id: 'hot-work-id', induction_name: 'Hot Work' },
  { id: 'wah-id', induction_name: 'Working at Heights' },
  { id: 'electrical-id', induction_name: 'Electrical ' },
];
const lookup = buildInductionNameLookup(sampleInductions);

assert.strictEqual(resolveInductionIdFromImportName('Roys Hill Aggregates', lookup), 'rha-id');
assert.strictEqual(resolveInductionIdFromImportName('Hot Work', lookup), 'hot-work-id');
assert.strictEqual(resolveInductionIdFromImportName('Working at Height', lookup), 'wah-id');
assert.strictEqual(resolveInductionIdFromImportName('Roys Hill Aggregates: Electrical', lookup), 'electrical-id');

console.log('admin induction assignment tests passed');
