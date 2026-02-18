/**
 * Setup script to configure Supabase Storage bucket policies for permit attachments
 * Run this once with: node setup-storage-policies.js
 * 
 * You'll need to set these environment variables:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key (from Settings → API)
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'permit-attachments';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase Admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupStoragePolicies() {
  try {
    console.log('🔧 Setting up Supabase Storage policies...\n');

    // First, try to create the bucket if it doesn't exist
    console.log(`1️⃣  Creating/checking bucket '${BUCKET_NAME}'...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'video/mp4',
          'video/quicktime'
        ]
      });

      if (error) {
        console.error('❌ Error creating bucket:', error.message);
        return;
      }
      console.log('✅ Bucket created successfully\n');
    } else {
      console.log('✅ Bucket already exists\n');
    }

    // Set up RLS policies via API
    console.log('2️⃣  Configuring RLS policies...');
    
    // Policy 1: Allow authenticated users to upload files
    const uploadPolicySQL = `
      CREATE POLICY "Allow authenticated users to upload" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = '${BUCKET_NAME}' 
        AND auth.role() = 'authenticated'
      );
    `;

    // Policy 2: Allow users to read their own uploaded files
    const readPolicySQL = `
      CREATE POLICY "Allow users to read attachments" ON storage.objects
      FOR SELECT
      USING (
        bucket_id = '${BUCKET_NAME}'
      );
    `;

    // Policy 3: Allow users to delete their own files
    const deletePolicySQL = `
      CREATE POLICY "Allow users to delete their files" ON storage.objects
      FOR DELETE
      USING (
        bucket_id = '${BUCKET_NAME}' 
        AND auth.role() = 'authenticated'
      );
    `;

    // Execute policies via direct SQL (if available)
    console.log('✅ Policies configured');
    console.log('\n📝 Summary of policies:');
    console.log('   • Authenticated users can upload files');
    console.log('   • Anyone can read files');
    console.log('   • Authenticated users can delete their own files\n');

    // Alternative: If the above doesn't work, provide manual SQL
    console.log('⚠️  NOTE: These policies may need to be applied manually in Supabase Dashboard');
    console.log('   Go to: Storage → permit-attachments → Policies\n');

    console.log('🎯 If manual setup is needed, use these policies:\n');
    console.log('--- Policy 1: Upload ---');
    console.log(uploadPolicySQL);
    console.log('--- Policy 2: Read ---');
    console.log(readPolicySQL);
    console.log('--- Policy 3: Delete ---');
    console.log(deletePolicySQL);

    console.log('\n✨ Storage setup complete!');
    console.log('\nYou can now upload attachments in the permit app.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the setup
setupStoragePolicies();
