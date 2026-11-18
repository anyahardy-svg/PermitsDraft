const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
const start = source.indexOf('const renderManageCompanies = () =>');
assert.ok(start > 0);
const end = source.indexOf('const renderManage', start + 1);
const block = source.slice(start, end > start ? end : start + 45000);

assert.match(block, /Assigned Manager/);
assert.match(block, /Assigned H&amp;S/);
assert.match(block, /renderAssignedAdminCell/);
assert.match(block, /Not assigned/);
assert.match(block, /assigned_manager_id \|\| company\.assignedManagerId/);
assert.match(block, /assigned_hs_person_id \|\| company\.assignedHsPersonId/);

console.log('companies table assignee columns tests passed');