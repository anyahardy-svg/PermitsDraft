const assert = require('assert');
const {
  isSupabaseConnectivityFailure,
  SUPABASE_UNAVAILABLE_MESSAGE,
} = require('../src/utils/supabaseErrors');

assert.strictEqual(isSupabaseConnectivityFailure(new Error('Failed to fetch')), true);
assert.strictEqual(isSupabaseConnectivityFailure({ message: 'DatabaseTimeout', statusCode: '544' }), true);
assert.strictEqual(isSupabaseConnectivityFailure(new Error('permission denied')), false);
assert.ok(SUPABASE_UNAVAILABLE_MESSAGE.includes('Supabase'));

console.log('supabaseErrors tests passed');
