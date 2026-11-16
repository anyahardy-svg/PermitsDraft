const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');

const manageCompaniesStart = source.indexOf('const renderManageCompanies = () =>');
assert.ok(manageCompaniesStart > 0, 'renderManageCompanies should exist');
const manageCompaniesEnd = source.indexOf('const renderManage', manageCompaniesStart + 1);
const manageCompanies = source.slice(
  manageCompaniesStart,
  manageCompaniesEnd > manageCompaniesStart ? manageCompaniesEnd : manageCompaniesStart + 40000
);

assert.match(source, /const \[companyFormExpanded, setCompanyFormExpanded\] = useState\(false\)/);
assert.match(source, /const \[companyContactDetailsExpanded, setCompanyContactDetailsExpanded\] = useState\(false\)/);

assert.match(manageCompanies, /\+ Add company/);
assert.match(manageCompanies, /companyFormExpanded && \(/);
assert.match(manageCompanies, /Contact &amp; insurance details/);
assert.match(manageCompanies, /companyContactDetailsExpanded && \(/);
assert.match(manageCompanies, /setCompanyFormExpanded\(false\)/);
assert.match(manageCompanies, /setCompanyContactDetailsExpanded\(false\)/);
assert.match(manageCompanies, /maxHeight: 180/);

// Edit path should still expand via shared editingCompany effect
assert.match(source, /if \(editingCompany\) \{\s*setCompanyFormExpanded\(true\);\s*setCompanyContactDetailsExpanded\(true\);/s);

console.log('manage companies form collapse tests passed');
