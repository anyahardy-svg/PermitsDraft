const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/utils/openDocumentInNewTab.js'),
  'utf8',
);
const accreditationStorage = fs.readFileSync(
  path.join(__dirname, '../src/api/accreditationsStorage.js'),
  'utf8',
);
const accreditationScreen = fs.readFileSync(
  path.join(__dirname, '../src/screens/CompanyAccreditationScreen.js'),
  'utf8',
);

assert.doesNotMatch(source, /window\.open\([^)]*noopener/);
assert.match(accreditationStorage, /openPlaceholderDocumentTab/);
assert.match(accreditationStorage, /openUrlViaAnchorClick/);
assert.doesNotMatch(
  accreditationScreen,
  /window\.open\('about:blank', '_blank', 'noopener,noreferrer'\)/,
);

console.log('open document in new tab tests passed');
