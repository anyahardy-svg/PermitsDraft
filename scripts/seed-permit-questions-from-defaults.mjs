/**
 * Seed permit_questions (flat rows) from defaults.js for each business unit (All Sites).
 * Usage: VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-permit-questions-from-defaults.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../src/permitQuestionnaire/defaults.js';
import { SPECIALIZED_PERMIT_TYPE_KEYS } from '../src/permitQuestionnaire/questionTypes.js';
import { runtimeQuestionToRow } from '../src/permitQuestionnaire/rowAdapter.js';

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
  const rows = [];
  for (const permitTypeKey of SPECIALIZED_PERMIT_TYPE_KEYS) {
    const questions = DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey] || [];
    questions.forEach((q, index) => {
      rows.push(
        runtimeQuestionToRow(q, {
          permitTypeKey,
          questionNumber: index + 1,
          businessUnitId: bu.id,
          siteId: null,
        }),
      );
    });
  }

  const { error: delErr } = await supabase
    .from('permit_questions')
    .delete()
    .eq('business_unit_id', bu.id)
    .is('site_id', null);

  if (delErr && !delErr.message.includes('does not exist')) {
    console.warn(`Clear ${bu.name}:`, delErr.message);
  }

  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const { error } = await supabase.from('permit_questions').insert(rows.slice(i, i + chunk));
    if (error) {
      console.error(`Seed failed ${bu.name}:`, error.message);
      break;
    }
  }
  console.log(`Seeded ${rows.length} rows for ${bu.name}`);
}

console.log('Done.');