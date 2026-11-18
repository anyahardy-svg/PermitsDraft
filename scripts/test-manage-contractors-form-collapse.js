const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');

const manageContractorsStart = source.indexOf('const renderManageContractors = () =>');
assert.ok(manageContractorsStart > 0, 'renderManageContractors should exist');
const manageContractorsEnd = source.indexOf('const renderManage', manageContractorsStart + 1);
const manageContractors = source.slice(
  manageContractorsStart,
  manageContractorsEnd > manageContractorsStart ? manageContractorsEnd : manageContractorsStart + 50000
);

assert.match(source, /const \[contractorFormExpanded, setContractorFormExpanded\] = useState\(false\)/);
assert.match(manageContractors, /\+ Add contractor/);
assert.match(manageContractors, /styles\.adminDatabaseAddHeader/);
assert.match(manageContractors, /contractorFormExpanded && \(/);
assert.match(manageContractors, /setContractorFormExpanded\(false\)/);
assert.match(
  source,
  /if \(editingContractor\) \{\s*setContractorFormExpanded\(true\);/s,
);

console.log('manage contractors form collapse tests passed');