const assert = require('assert');
const {
  formatPhoneForDisplay,
  normalizePhoneForSave,
  validateContractorPhone,
  contractorPhoneNeedsUpdate,
} = require('../src/utils/contractorPhone.js');

assert.strictEqual(formatPhoneForDisplay('211234567'), '0211234567');
assert.strictEqual(formatPhoneForDisplay('0211234567'), '0211234567');
assert.strictEqual(formatPhoneForDisplay(''), '');
assert.strictEqual(normalizePhoneForSave('0211234567'), '211234567');
assert.strictEqual(normalizePhoneForSave('211234567'), '211234567');
assert.strictEqual(validateContractorPhone(''), 'Please enter your phone number');
assert.strictEqual(validateContractorPhone('123'), 'Please enter a valid phone number');
assert.strictEqual(validateContractorPhone('021 123 4567'), null);
assert.strictEqual(contractorPhoneNeedsUpdate(null, '0211234567'), true);
assert.strictEqual(contractorPhoneNeedsUpdate('211234567', '0211234567'), false);
assert.strictEqual(contractorPhoneNeedsUpdate('211234567', '0219999999'), true);

console.log('contractor phone helpers: ok');
