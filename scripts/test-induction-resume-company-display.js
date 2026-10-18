const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'screens', 'ContractorInductionScreen.js'),
  'utf8',
);

const resumeBlock = source.split("isNewContractor === 'choose-contractor-for-resume'")[1]?.split('// STEP 0: Choose incomplete')[0];
assert.ok(resumeBlock, 'resume block should exist');
assert.match(resumeBlock, /getContractorCompanyDisplayName\(contractor\)/);
assert.doesNotMatch(resumeBlock, /\{contractor\.email\}/);

console.log('induction resume company display tests passed');
