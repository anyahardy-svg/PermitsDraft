const assert = require('assert');
const { mergeSiteIds } = require('../src/utils/siteIds');

assert.deepStrictEqual(mergeSiteIds(['site-1'], ['site-2', 'site-1']), ['site-1', 'site-2']);
assert.deepStrictEqual(mergeSiteIds(null, undefined, []), []);

console.log('siteIds tests passed');
