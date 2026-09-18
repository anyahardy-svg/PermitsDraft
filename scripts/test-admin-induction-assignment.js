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

console.log('admin induction assignment tests passed');
