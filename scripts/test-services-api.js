const assert = require('assert');
const {
  filterServicesForBusinessUnits,
  isServiceApplicableToBusinessUnits,
  getApplicableBusinessUnitIds,
} = require('../src/utils/serviceApplicability');

const services = [
  { id: 'svc-hot', name: 'Hot Work', applicable_business_unit_ids: ['bu-1', 'bu-2'] },
  { id: 'svc-firth', name: 'Firth Only', applicable_business_unit_ids: ['bu-2'] },
  { id: 'svc-all', name: 'General', applicable_business_unit_ids: [] },
];

assert.deepStrictEqual(getApplicableBusinessUnitIds(services[0]), ['bu-1', 'bu-2']);
assert.strictEqual(isServiceApplicableToBusinessUnits(services[0], ['bu-1']), true);
assert.strictEqual(isServiceApplicableToBusinessUnits(services[1], ['bu-1']), false);
assert.strictEqual(isServiceApplicableToBusinessUnits(services[2], ['bu-1']), true);

const filtered = filterServicesForBusinessUnits(services, ['bu-1']);
assert.deepStrictEqual(filtered.map((service) => service.id), ['svc-hot', 'svc-all']);

console.log('✅ services API helper tests passed');
