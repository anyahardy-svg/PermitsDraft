/**
 * Company delete must remove contractor_join_requests (FK has no cascade until migration applied).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const edgeSource = fs.readFileSync(
  path.join(__dirname, '../supabase/functions/company-data/index.ts'),
  'utf8',
);
const companiesSource = fs.readFileSync(path.join(__dirname, '../src/api/companies.js'), 'utf8');

assert.match(
  edgeSource,
  /from\("contractor_join_requests"\)[\s\S]*\.delete\(\)[\s\S]*\.eq\("company_id", companyId\)/,
  'company-data delete action should delete join requests for the company',
);
assert.match(
  companiesSource,
  /from\('contractor_join_requests'\)[\s\S]*\.delete\(\)[\s\S]*\.eq\('company_id', companyId\)/,
  'deleteCompanyDirect should delete join requests for the company',
);

console.log('test-company-delete-join-requests-wiring: ok');