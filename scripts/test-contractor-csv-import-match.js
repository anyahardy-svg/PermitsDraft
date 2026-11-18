const assert = require('assert');
const {
  findContractorInCompany,
  findContractorForCsvImport,
} = require('../src/utils/contractorCsvImportMatch.js');

const companyA = 'company-a-id';
const companyB = 'company-b-id';

const contractors = [
  {
    id: 'c1',
    name: 'Andrew Daviscon',
    email: 'andydavidson@mcintosh.net.nz',
    phone: '0211864888',
    company_id: null,
  },
  {
    id: 'c2',
    name: 'Benjamin Parsons',
    email: 'benparsons@mcintosh.net.nz',
    phone: '0223094476',
    company_id: companyA,
  },
];

assert.strictEqual(
  findContractorInCompany(contractors, {
    companyId: companyB,
    email: 'andydavidson@mcintosh.net.nz',
    name: 'Andrew Daviscon',
    phone: '0211864888',
  }),
  null,
  'company-scoped lookup should miss when contractor has no company yet',
);

assert.strictEqual(
  findContractorForCsvImport(contractors, {
    companyId: companyB,
    email: 'andydavidson@mcintosh.net.nz',
    name: 'Andrew Daviscon',
    phone: '0211864888',
  })?.id,
  'c1',
  're-import with company filled in should match by email',
);

assert.strictEqual(
  findContractorForCsvImport(contractors, {
    contractorId: 'c2',
    companyId: companyB,
    email: 'someone@example.com',
    name: 'Other Person',
    phone: null,
  })?.id,
  'c2',
  'id column should win when present',
);

console.log('✅ test-contractor-csv-import-match.js passed');