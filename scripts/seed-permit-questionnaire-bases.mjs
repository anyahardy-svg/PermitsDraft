/**
 * Seed published BU base questionnaires from defaults.js for each business unit.
 * Usage: node scripts/seed-permit-questionnaire-bases.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in env.
 */
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../src/permitQuestionnaire/defaults.js';
import { SPECIALIZED_PERMIT_TYPE_KEYS } from '../src/permitQuestionnaire/schema.js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: bus, error: buErr } = await supabase.from('business_units').select('id, name');
if (buErr) {
  console.error(buErr);
  process.exit(1);
}

for (const bu of bus || []) {
  for (const permitTypeKey of SPECIALIZED_PERMIT_TYPE_KEYS) {
    const questions = DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey];
    if (!questions?.length) continue;

    await supabase
      .from('permit_questionnaire_sets')
      .update({ is_published: false })
      .eq('business_unit_id', bu.id)
      .eq('permit_type_key', permitTypeKey);

    const { error } = await supabase.from('permit_questionnaire_sets').insert({
      permit_type_key: permitTypeKey,
      business_unit_id: bu.id,
      questions,
      is_published: true,
    });

    if (error) {
      console.warn(`Skip ${bu.name} / ${permitTypeKey}:`, error.message);
    } else {
      console.log(`Seeded ${bu.name} / ${permitTypeKey} (${questions.length} questions)`);
    }
  }
}

console.log('Done.');