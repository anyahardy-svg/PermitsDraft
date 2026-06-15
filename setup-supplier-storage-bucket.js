/**
 * Setup Supabase Storage bucket for supplier form uploads.
 * Run via: node setup-supplier-storage-bucket.js
 *
 * Requires environment variables:
 * SUPABASE_URL=your_supabase_url
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'suppliers';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
  try {
    console.log(`📦 Setting up ${BUCKET_NAME} storage bucket...`);

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      throw listError;
    }

    const bucketExists = buckets.some((bucket) => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 52428800,
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (error) {
        throw error;
      }

      console.log(`✅ Created bucket "${BUCKET_NAME}"`);
    } else {
      console.log(`✅ Bucket "${BUCKET_NAME}" already exists`);
    }

    const { error: accessError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 1 });
    if (accessError) {
      console.error('⚠️  Warning: Could not access bucket');
      console.error(accessError.message);
    } else {
      console.log('✅ Bucket is accessible');
    }

    console.log('\n✅ Supplier storage bucket setup complete!');
    console.log('\nBucket details:');
    console.log(`  Name: ${BUCKET_NAME}`);
    console.log('  Public: true');
    console.log('  Path pattern: {company_name}/{document_type}/{timestamp}.{ext}');
  } catch (error) {
    console.error('❌ Error setting up bucket:', error.message);
    process.exit(1);
  }
}

setupBucket();
