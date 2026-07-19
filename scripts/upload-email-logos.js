#!/usr/bin/env node

/**
 * Upload email logo assets to Supabase Storage (email-assets bucket).
 *
 * Prerequisites:
 *   1. Run migrations/create-email-assets-storage-bucket.sql in Supabase
 *   2. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *
 * Usage:
 *   node scripts/upload-email-logos.js
 *   node scripts/upload-email-logos.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BUCKET = 'email-assets';
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'email-logos');

const LOGO_FILES = [
  {
    localFile: 'firth-logo.png',
    storagePath: 'logos/firth-logo.png',
    contentType: 'image/png',
    businessUnitName: null,
  },
  {
    localFile: 'winstone-logo.svg',
    storagePath: 'logos/winstone-logo.svg',
    contentType: 'image/svg+xml',
    businessUnitName: 'Winstone Aggregates',
  },
];

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');

function getPublicUrl(storagePath) {
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function supabaseRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function ensureBucketExists() {
  const buckets = await supabaseRequest(`${supabaseUrl}/storage/v1/bucket`);
  const exists = Array.isArray(buckets) && buckets.some((bucket) => bucket.id === BUCKET || bucket.name === BUCKET);

  if (exists) {
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] Would create bucket: ${BUCKET}`);
    return;
  }

  await supabaseRequest(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      file_size_limit: 5 * 1024 * 1024,
      allowed_mime_types: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
    }),
  });

  console.log(`Created bucket: ${BUCKET}`);
}

async function uploadLogo({ localFile, storagePath, contentType, businessUnitName }) {
  const localPath = path.join(ASSETS_DIR, localFile);

  if (!fs.existsSync(localPath)) {
    throw new Error(`Missing local asset: ${localPath}`);
  }

  const fileBuffer = fs.readFileSync(localPath);
  const publicUrl = getPublicUrl(storagePath);

  if (dryRun) {
    console.log(`[dry-run] Would upload ${localFile} -> ${storagePath}`);
    console.log(`          Public URL: ${publicUrl}`);
    return publicUrl;
  }

  await supabaseRequest(
    `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'x-upsert': 'true',
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: fileBuffer,
    }
  );

  console.log(`Uploaded ${localFile}`);
  console.log(`  Storage path: ${storagePath}`);
  console.log(`  Public URL:   ${publicUrl}`);

  if (businessUnitName) {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/business_units?name=eq.${encodeURIComponent(businessUnitName)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ logo_storage_path: storagePath }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.warn(`  Warning: could not update business_units for ${businessUnitName}: ${body}`);
    } else {
      console.log(`  Linked to business unit: ${businessUnitName}`);
    }
  }

  return publicUrl;
}

async function main() {
  console.log(`Uploading email logos to Supabase bucket "${BUCKET}"${dryRun ? ' (dry run)' : ''}...`);
  console.log('');

  await ensureBucketExists();

  const urls = {};
  for (const logo of LOGO_FILES) {
    urls[logo.localFile] = await uploadLogo(logo);
    console.log('');
  }

  console.log('Done. Use these URLs in email templates:');
  for (const [fileName, url] of Object.entries(urls)) {
    console.log(`  ${fileName}: ${url}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
