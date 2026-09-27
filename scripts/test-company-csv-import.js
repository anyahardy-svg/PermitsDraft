const assert = require('assert');
const {
  findCompanyEmailColumnIndex,
  findAssignedManagerEmailColumnIndex,
  findAssignedHsEmailColumnIndex,
  isApproverEmailHeader,
} = require('../src/utils/companyCsvImport');

assert.strictEqual(isApproverEmailHeader('assigned_manager_email'), true);
assert.strictEqual(isApproverEmailHeader('assigned_hs_email'), true);
assert.strictEqual(isApproverEmailHeader('email'), false);

const exportHeaders = [
  'name',
  'email',
  'business_units',
  'contact_name',
  'contact_surname',
  'contact_email',
  'contact_phone',
  'contractor_type',
  'public_liability_expiry',
  'motor_vehicle_insurance_expiry',
  'review_date',
  'accredited_date',
  'nzbn',
  'address_1',
  'address_city',
  'address_postcode',
  'assigned_manager_email',
  'assigned_hs_email',
];

assert.strictEqual(findCompanyEmailColumnIndex(exportHeaders), 1);
assert.strictEqual(findAssignedManagerEmailColumnIndex(exportHeaders), 16);
assert.strictEqual(findAssignedHsEmailColumnIndex(exportHeaders), 17);

const approverOnlyHeaders = ['name', 'assigned_manager_email', 'assigned_hs_email'];
assert.strictEqual(
  findCompanyEmailColumnIndex(approverOnlyHeaders),
  -1,
  'approver-only import must not map manager email to company email',
);
assert.strictEqual(findAssignedManagerEmailColumnIndex(approverOnlyHeaders), 1);
assert.strictEqual(findAssignedHsEmailColumnIndex(approverOnlyHeaders), 2);

const reorderedHeaders = ['name', 'assigned_manager_email', 'email', 'assigned_hs_email'];
assert.strictEqual(findCompanyEmailColumnIndex(reorderedHeaders), 2);

console.log('companyCsvImport tests passed');
