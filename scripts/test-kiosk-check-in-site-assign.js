const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiSource = fs.readFileSync(path.join(__dirname, '..', 'api', 'kiosk-check-in.js'), 'utf8');

assert.match(apiSource, /site_ids: \[\.\.\.contractorSiteIds, siteId\]/);

console.log('kiosk check-in site assign tests passed');
