const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFolders() {
  try {
    const folders = [
      'insurance_mvi',
      'insurance_pli',
      'section21_continuous_improvement_evidence',
      'section21_purchasing_procedures_evidence',
      'section21_quality_manager_and_plan_evidence',
      'section22_environmental_aspects_assessment_evidence',
      'sitewise_prequalified',
      'totika_prequalified'
    ];

    for (const folder of folders) {
      console.log(`\n📂 ${folder}:`);
      const { data: files } = await supabase.storage
        .from('accreditations')
        .list(`redbull_powder_company/${folder}`, { limit: 10 });
      
      if (files && files.length > 0) {
        files.forEach(f => console.log(`   📄 ${f.name}`));
      } else {
        console.log('   (empty or not a folder)');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkFolders();
