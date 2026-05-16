const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
  try {
    console.log('📂 Listing files in accreditations/redbull_powder_company...\n');
    const { data: files, error } = await supabase.storage
      .from('accreditations')
      .list('redbull_powder_company', { limit: 100, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }

    console.log(`Found ${files.length} files:\n`);
    files.forEach(file => {
      console.log(`  📄 ${file.name}`);
    });

    // Now check database
    console.log('\n' + '='.repeat(80));
    console.log('Checking database URLs for redbull_powder_company...\n');

    const { data: company, error: dbError } = await supabase
      .from('companies')
      .select('*')
      .ilike('name', '%red%powder%')
      .single();

    if (dbError) {
      console.error('❌ Error fetching company:', dbError);
      return;
    }

    console.log(`Company: ${company.name} (ID: ${company.id})\n`);

    // Certificate URLs
    const certificates = [
      'aep_certificate_url',
      'iso_45001_certificate_url',
      'totika_certificate_url',
      'she_prequal_certificate_url',
      'impac_certificate_url',
      'sitewise_certificate_url',
      'rapid_certificate_url',
      'iso_9001_certificate_url',
      'iso_14001_certificate_url'
    ];

    console.log('Certificate URLs:');
    certificates.forEach(cert => {
      const url = company[cert];
      if (url) {
        console.log(`  ✓ ${cert}: ${url.split('/').pop()}`);
      }
    });

  } catch (error) {
    console.error('🔥 Error:', error);
  }
}

checkStorage();
