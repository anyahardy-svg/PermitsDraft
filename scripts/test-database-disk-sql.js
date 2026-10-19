const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const diagnostics = fs.readFileSync(
  path.join(root, 'scripts/sql/database-disk-diagnostics.sql'),
  'utf8',
);
const cleanup = fs.readFileSync(
  path.join(root, 'scripts/sql/database-disk-cleanup-staged.sql'),
  'utf8',
);

assert.match(diagnostics, /pg_database_size/);
assert.match(diagnostics, /sign_ins/);
assert.match(diagnostics, /storage\.objects/);
assert.match(cleanup, /email_send_log/);
assert.match(cleanup, /VACUUM/);

console.log('database disk SQL scripts: ok');
