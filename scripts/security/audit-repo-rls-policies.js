#!/usr/bin/env node
/**
 * Step 1 (read-only): scan SQL in the repo for RLS enable + policies.
 * Does not connect to Supabase. Output is a baseline for comparison with live export.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'security', 'artifacts');

const SQL_GLOBS = [
  'supabase-schema.sql',
  'migrations',
  'setup-admin-rls.sql',
  'fix-admin-rls.sql',
  'fix-legal-documents-rls.sql',
  'fix-join-requests-rls.sql',
  'storage-policies.sql',
  'setup-accreditations-storage.sql',
  'setup-training-records-bucket.sql',
];

function collectSqlFiles() {
  const files = [];
  for (const entry of SQL_GLOBS) {
    const full = path.join(ROOT, entry);
    if (!fs.existsSync(full)) continue;
    const stat = fs.statSync(full);
    if (stat.isFile()) {
      files.push(full);
    } else if (stat.isDirectory()) {
      for (const name of fs.readdirSync(full)) {
        if (name.endsWith('.sql')) files.push(path.join(full, name));
      }
    }
  }
  return files.sort();
}

function stripComments(sql) {
  return sql.replace(/^\s*--.*$/gm, '');
}

function parsePolicies(sql, sourceFile) {
  const policies = [];
  const rlsEnabled = new Set();

  const enableRe =
    /ALTER\s+TABLE\s+(?:(\w+)\.)?(\w+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m;
  const body = stripComments(sql);
  while ((m = enableRe.exec(body)) !== null) {
    const table = m[2];
    rlsEnabled.add(table);
  }

  const policyRe =
    /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+(\w+)(?:\s+FOR\s+(\w+))?([\s\S]*?)(?=;|CREATE\s+POLICY|ALTER\s+TABLE|$)/gi;
  while ((m = policyRe.exec(body)) !== null) {
    const [, name, table, cmd, rest] = m;
    const fragment = (rest || '').replace(/\s+/g, ' ').trim();
    const toMatch = fragment.match(/\bTO\s+([a-z_,\s]+)/i);
    const roles = toMatch
      ? toMatch[1].split(',').map((r) => r.trim().toLowerCase())
      : ['public'];

    const usingTrue =
      /\bUSING\s*\(\s*true\s*\)/i.test(fragment) ||
      /\bFOR\s+ALL\s+USING\s*\(\s*true\s*\)/i.test(fragment);
    const checkTrue = /\bWITH\s+CHECK\s*\(\s*true\s*\)/i.test(fragment);

    policies.push({
      name,
      table,
      command: (cmd || 'ALL').toUpperCase(),
      roles,
      usingTrue,
      checkTrue,
      openAccess: usingTrue || checkTrue,
      sourceFile: path.relative(ROOT, sourceFile),
    });
  }

  return { rlsEnabled: [...rlsEnabled], policies };
}

function severityHint(policy) {
  const t = policy.table.toLowerCase();
  if (t === 'admin_users' || t.includes('token') || t.includes('password')) {
    return 'critical';
  }
  if (
    ['companies', 'contractors', 'sign_ins', 'suppliers', 'supplier_accreditations'].includes(
      t
    ) ||
    t.includes('training') ||
    t.includes('accreditation')
  ) {
    return 'high';
  }
  if (policy.table === 'storage.objects' || t === 'objects') {
    return 'high';
  }
  if (policy.openAccess && policy.roles.some((r) => r === 'anon' || r === 'public')) {
    return 'high';
  }
  if (policy.openAccess) return 'medium';
  return 'low';
}

function main() {
  const files = collectSqlFiles();
  const allPolicies = [];
  const rlsTables = new Set();

  for (const file of files) {
    const sql = fs.readFileSync(file, 'utf8');
    const { rlsEnabled, policies } = parsePolicies(sql, file);
    rlsEnabled.forEach((t) => rlsTables.add(t));
    allPolicies.push(...policies);
  }

  const byTable = {};
  for (const p of allPolicies) {
    if (!byTable[p.table]) byTable[p.table] = [];
    byTable[p.table].push(p);
  }

  const openPolicies = allPolicies.filter((p) => p.openAccess);
  const openAnon = openPolicies.filter((p) =>
    p.roles.some((r) => r === 'anon' || r === 'public')
  );

  const report = {
    generatedAt: new Date().toISOString(),
    sqlFilesScanned: files.length,
    tablesWithRlsMentioned: [...rlsTables].sort(),
    policyCount: allPolicies.length,
    openPolicyCount: openPolicies.length,
    openAnonOrPublicPolicyCount: openAnon.length,
    policies: allPolicies,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, 'repo-rls-inventory.json'),
    JSON.stringify(report, null, 2)
  );

  const lines = [
    '# Repo RLS inventory (from SQL files)',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `SQL files scanned: ${report.sqlFilesScanned}`,
    `Policies found (may duplicate across migrations): ${report.policyCount}`,
    `Policies with \`USING (true)\` or \`WITH CHECK (true)\`: ${report.openPolicyCount}`,
    `Open policies targeting anon/public: ${report.openAnonOrPublicPolicyCount}`,
    '',
    '> **Warning:** This is git history, not live Supabase. Run `export-live-rls-policies.sql` in the dashboard and compare.',
    '',
    '## Tables with open anon/public policies',
    '',
  ];

  const anonByTable = {};
  for (const p of openAnon) {
    if (!anonByTable[p.table]) anonByTable[p.table] = [];
    anonByTable[p.table].push(p);
  }

  for (const table of Object.keys(anonByTable).sort()) {
    lines.push(`### \`${table}\``);
    for (const p of anonByTable[table]) {
      lines.push(
        `- **${p.name}** (${p.command}, roles: ${p.roles.join(', ')}) — hint: ${severityHint(p)} — \`${p.sourceFile}\``
      );
    }
    lines.push('');
  }

  lines.push('## All policies with unconditional true');
  lines.push('');
  for (const p of openPolicies.sort((a, b) => a.table.localeCompare(b.table))) {
    lines.push(
      `- \`${p.table}\` / ${p.name} — ${p.command} — roles: ${p.roles.join(', ')} — ${p.sourceFile}`
    );
  }

  fs.writeFileSync(path.join(OUT_DIR, 'repo-rls-inventory.md'), lines.join('\n'));

  console.log(`Wrote ${path.join(OUT_DIR, 'repo-rls-inventory.json')}`);
  console.log(`Wrote ${path.join(OUT_DIR, 'repo-rls-inventory.md')}`);
  console.log(
    `Summary: ${report.policyCount} policies, ${report.openPolicyCount} open, ${report.openAnonOrPublicPolicyCount} open anon/public`
  );
}

main();
