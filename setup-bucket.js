/**
 * Setup Supabase Storage Bucket for Training Records
 * Run this via: node setup-bucket.js
 * 
 * Requires environment variables:
 * SUPABASE_URL=your_supabase_url
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {
  try {
    console.log('📦 Setting up training-records storage bucket...');

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('training-records', {
      public: false, // Private bucket - uploads must be authenticated
      fileSizeLimit: 5242880, // 5MB limit
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Bucket "training-records" already exists');
      } else {
        throw error;
      }
    } else {
      console.log('✅ Created bucket "training-records"');
    }

    // Test that we can access the bucket
    const { data: listData, error: listError } = await supabase.storage.from('training-records').list();
    
    if (listError) {
      console.error('⚠️  Warning: Could not access bucket');
      console.error('Make sure RLS policies are configured correctly');
    } else {
      console.log('✅ Bucket is accessible');
    }

    console.log('\n✅ Training records bucket setup complete!');
    console.log('\nBucket Details:');
    console.log('  Name: training-records');
    console.log('  Public: false (private)');
    console.log('  Max file size: 5MB');
    console.log('  Allowed types: PDF, JPEG, PNG, GIF, WebP');

  } catch (error) {
    console.error('❌ Error setting up bucket:', error.message);
    process.exit(1);
  }
}

setupBucket();
