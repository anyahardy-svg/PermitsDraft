import assert from 'node:assert/strict';
import { mergeSiteIds } from '../src/utils/siteIds.js';

assert.deepEqual(mergeSiteIds(['site-1'], ['site-2', 'site-1']), ['site-1', 'site-2']);
assert.deepEqual(mergeSiteIds(null, undefined, []), []);

console.log('siteIds tests passed');
