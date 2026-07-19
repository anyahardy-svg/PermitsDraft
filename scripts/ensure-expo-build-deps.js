#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_PACKAGES = [
  {
    name: '@urql/core',
    version: '5.2.0',
    file: 'node_modules/@urql/core/dist/urql-core.js',
  },
  {
    name: '@0no-co/graphql.web',
    version: '1.2.0',
    file: 'node_modules/@0no-co/graphql.web/dist/graphql.web.js',
  },
];

const rootDir = path.join(__dirname, '..');
const missing = REQUIRED_PACKAGES.filter(({ file }) => !fs.existsSync(path.join(rootDir, file)));

if (missing.length === 0) {
  process.exit(0);
}

console.warn('Expo build dependencies are incomplete. Reinstalling required packages...');
missing.forEach(({ name, file }) => console.warn(`  missing: ${file}`));

for (const { name, version } of missing) {
  const packageDir = path.join(rootDir, 'node_modules', ...name.split('/'));
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true });
  }

  execSync(`npm install ${name}@${version} --no-save`, {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
