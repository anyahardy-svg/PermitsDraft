const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  try {
    // Get company data
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', '777c0bf9-ec9a-4065-b4e1-4e2ab6dcb821')
      .single();

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('\nColumns in companies table related to evidence/insurance:\n');
    
    Object.keys(company).forEach(key => {
      if (key.includes('quality') || key.includes('continuous') || key.includes('purchasing') || 
          key.includes('environmental') || key.includes('insurance') || key.includes('evidence')) {
        console.log(`  ${key}: ${company[key] ? '✓ HAS DATA' : '(empty)'}`);
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkColumns();
