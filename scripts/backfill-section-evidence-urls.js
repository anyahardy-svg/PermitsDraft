#!/usr/bin/env node

/**
 * Backfill accreditation evidence URLs from storage when files were uploaded
 * but the companies table evidence_url columns were not updated.
 *
 * Targets section 21/22 folders like:
 *   {company_slug}/section22_environmental_aspects_assessment_evidence/{timestamp}.pdf
 *
 * Usage:
 *   node scripts/backfill-section-evidence-urls.js
 *   node scripts/backfill-section-evidence-urls.js --company-id <uuid>
 *   node scripts/backfill-section-evidence-urls.js --dry-run
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or Supabase key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const companyIdArgIndex = args.indexOf('--company-id');
const targetCompanyId = companyIdArgIndex >= 0 ? args[companyIdArgIndex + 1] : null;

const SECTION_EVIDENCE_PREFIXES = [
  'section21_',
  'section22_',
];

function sanitizeCompanyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function folderNameToColumn(folderName) {
  if (!folderName.endsWith('_evidence')) {
    return null;
  }

  const withoutEvidenceSuffix = folderName.slice(0, -'_evidence'.length);
  const matchedPrefix = SECTION_EVIDENCE_PREFIXES.find((prefix) => withoutEvidenceSuffix.startsWith(prefix));
  if (!matchedPrefix) {
    return null;
  }

  const itemKey = withoutEvidenceSuffix.slice(matchedPrefix.length);
  return `${itemKey}_evidence_url`;
}

async function listAllFiles(prefix = '') {
  const results = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from('accreditations')
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const entry of data) {
      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFile = entry.id && entry.metadata;

      if (isFile) {
        results.push(entryPath);
      } else {
        const nested = await listAllFiles(entryPath);
        results.push(...nested);
      }
    }

    if (data.length < limit) {
      break;
    }

    offset += limit;
  }

  return results;
}

async function main() {
  console.log(dryRun ? 'Dry run: no database updates will be made\n' : 'Backfilling section evidence URLs...\n');

  let companiesQuery = supabase.from('companies').select('id, name');
  if (targetCompanyId) {
    companiesQuery = companiesQuery.eq('id', targetCompanyId);
  }

  const { data: companies, error: companiesError } = await companiesQuery;
  if (companiesError) {
    throw companiesError;
  }

  const updatesByCompany = new Map();

  for (const company of companies || []) {
    const companySlug = sanitizeCompanyName(company.name);
    const allFiles = await listAllFiles(companySlug);
    const sectionEvidenceFiles = allFiles.filter((filePath) =>
      SECTION_EVIDENCE_PREFIXES.some((prefix) => filePath.includes(`/${prefix}`))
    );

    for (const filePath of sectionEvidenceFiles) {
      const parts = filePath.split('/');
      if (parts.length < 3) {
        continue;
      }

      const folderName = parts[parts.length - 2];
      const column = folderNameToColumn(folderName);
      if (!column) {
        continue;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/accreditations/${filePath}`;
      const companyUpdates = updatesByCompany.get(company.id) || {};
      const existing = companyUpdates[column];

      if (!existing || filePath > existing.filePath) {
        companyUpdates[column] = { publicUrl, filePath, companyName: company.name };
        updatesByCompany.set(company.id, companyUpdates);
      }
    }
  }

  let updatedCount = 0;

  for (const [companyId, columnUpdates] of updatesByCompany.entries()) {
    const { data: companyRow, error: rowError } = await supabase
      .from('companies')
      .select(Object.keys(columnUpdates).join(','))
      .eq('id', companyId)
      .single();

    if (rowError) {
      console.warn(`Skipping ${companyId}: ${rowError.message}`);
      continue;
    }

    const patch = {};
    for (const [column, value] of Object.entries(columnUpdates)) {
      if (!companyRow[column]) {
        patch[column] = value.publicUrl;
        console.log(`${dryRun ? '[dry-run] ' : ''}${value.companyName}: ${column} <- ${value.filePath}`);
      }
    }

    if (Object.keys(patch).length === 0) {
      continue;
    }

    if (!dryRun) {
      const { error: updateError } = await supabase
        .from('companies')
        .update(patch)
        .eq('id', companyId);

      if (updateError) {
        console.warn(`Failed to update ${companyId}: ${updateError.message}`);
        continue;
      }
    }

    updatedCount += Object.keys(patch).length;
  }

  console.log(`\n${dryRun ? 'Would update' : 'Updated'} ${updatedCount} evidence URL column(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
