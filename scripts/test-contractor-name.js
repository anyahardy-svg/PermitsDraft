const assert = require('assert');
const { validateContractorFullName } = require('../src/utils/contractorName.js');

assert.strictEqual(validateContractorFullName(''), 'Full name is required');
assert.strictEqual(validateContractorFullName('   '), 'Full name is required');
assert.strictEqual(validateContractorFullName('John'), 'Please enter your first and last name');
assert.strictEqual(validateContractorFullName('John Smith'), null);
assert.strictEqual(validateContractorFullName('  John   Smith  '), null);

console.log('contractor name helpers: ok');
