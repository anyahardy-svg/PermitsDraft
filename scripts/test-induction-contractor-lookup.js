const assert = require('assert');
const fs = require('fs');
const path = require('path');

const contractorsSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'api', 'contractors.js'),
  'utf8',
);
const contractorDataSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'api', 'contractorData.js'),
  'utf8',
);
const inductionsSource = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'api', 'inductions.js'),
  'utf8',
);
const edgeSource = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'functions', 'contractor-data', 'index.ts'),
  'utf8',
);
const apiSource = fs.readFileSync(
  path.join(__dirname, '..', 'api', 'induction-contractors.js'),
  'utf8',
);

assert.match(contractorsSource, /contractorDataListForInduction/);
assert.match(contractorsSource, /listInductionContractorsViaApi/);
assert.match(contractorsSource, /listContractors-induction/);
assert.match(apiSource, /from\('contractors'\)/);
assert.match(contractorDataSource, /listForInduction/);
assert.match(contractorDataSource, /Authorization: `Bearer \$\{anonKey\}`/);
assert.match(inductionsSource, /contractorDataListIncompleteInductions\(\)/);
assert.doesNotMatch(
  inductionsSource,
  /if \(!getRequestingAdminId\(\)\) \{\s*try \{\s*return await contractorDataListIncompleteInductions/s,
);
assert.match(edgeSource, /action === "listForInduction"/);

console.log('induction contractor lookup tests passed');
