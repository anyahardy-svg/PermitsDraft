/**
 * Guards admin Manage Companies / Contractors UX: add/edit forms are not inline on the list view.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const appSource = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');

assert.match(appSource, /const \[showCompanyForm, setShowCompanyForm\] = useState\(false\)/);
assert.match(appSource, /const \[showContractorForm, setShowContractorForm\] = useState\(false\)/);
assert.match(appSource, /const companyFormVisible = editingCompany \|\| showCompanyForm/);
assert.match(appSource, /const contractorFormVisible = editingContractor \|\| showContractorForm/);
assert.match(appSource, /\{companyFormVisible && \(/);
assert.match(appSource, /\{!companyFormVisible && \(/);
assert.match(appSource, /\{contractorFormVisible && \(/);
assert.match(appSource, /\{!contractorFormVisible && \(/);
assert.match(appSource, /\+ Add Company/);
assert.match(appSource, /\+ Add Contractor/);

console.log('test-admin-add-form-visibility: ok');