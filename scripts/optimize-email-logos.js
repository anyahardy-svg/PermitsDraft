#!/usr/bin/env node

/**
 * Create Outlook-friendly email logo files in public/email-assets.
 *
 * Requires: npm install sharp --no-save
 * Usage: node scripts/optimize-email-logos.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_BASE = (process.env.REACT_APP_BASE_URL || 'https://contractorhq.co.nz').replace(/\/$/, '');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'email-assets');
const FILES = ['Firth-logo.jpg', 'WA-logo.jpg', 'RAL-logo.jpg', 'RASL-logo.jpg', 'TUQ-logo.jpg'];
const MAX_HEIGHT = 48;

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (error) {
    console.error('Install sharp first: npm install sharp --no-save');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest = [];

  for (const file of FILES) {
    const response = await fetch(`${SOURCE_BASE}/email-assets/${file}`);
    if (!response.ok) {
      throw new Error(`Failed to download ${file}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const width = Math.max(1, Math.round((metadata.width / metadata.height) * MAX_HEIGHT));
    const outputPath = path.join(OUTPUT_DIR, file);

    await image
      .resize({ height: MAX_HEIGHT, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    manifest.push({ file, width, height: MAX_HEIGHT, bytes: stats.size });
    console.log(`Optimized ${file}: ${width}x${MAX_HEIGHT}, ${stats.size} bytes`);
  }

  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
