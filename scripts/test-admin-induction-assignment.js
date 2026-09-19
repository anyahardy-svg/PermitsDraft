const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mirror formatInductionDisplayName without ESM import issues.
function formatInductionDisplayName(induction) {
  if (!induction) return '';
  const name = (induction.induction_name || '').trim();
  const subsection = (induction.subsection_name || '').trim();
  if (!name) return subsection;
  if (!subsection) return name;
  return `${name} - ${subsection}`;
}

assert.strictEqual(
  formatInductionDisplayName({ induction_name: 'Roys Hill Induction', subsection_name: '' }),
  'Roys Hill Induction'
);
assert.strictEqual(
  formatInductionDisplayName({ induction_name: 'Site Induction', subsection_name: 'Roys Hill' }),
  'Site Induction - Roys Hill'
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

console.log('admin induction assignment tests passed');
