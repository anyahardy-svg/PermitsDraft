/**
 * Writes migrations/seed-permit-questions-from-defaults.sql (run in Supabase SQL Editor).
 * Maintainer-only: node scripts/generate-permit-questions-seed-sql.mjs
 */
import { writeFileSync } from 'fs';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../src/permitQuestionnaire/defaults.js';
import { SPECIALIZED_PERMIT_TYPE_KEYS } from '../src/permitQuestionnaire/questionTypes.js';
import { runtimeQuestionToRow } from '../src/permitQuestionnaire/rowAdapter.js';

function sqlEscape(s) {
  if (s == null || s === '') return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function sqlBool(v) {
  return v ? 'true' : 'false';
}

const lines = [];
lines.push('-- Seed permit_questions from defaults.js for EVERY business unit (All Sites).');
lines.push('-- Run AFTER migrations/add-permit-questions-flat-table.sql');
lines.push('-- Safe to re-run: clears All Sites rows per BU then re-inserts.');
lines.push('');
lines.push('DELETE FROM permit_questions WHERE site_id IS NULL;');
lines.push('');

for (const permitTypeKey of SPECIALIZED_PERMIT_TYPE_KEYS) {
  const questions = DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey] || [];
  questions.forEach((q, index) => {
    const row = runtimeQuestionToRow(q, {
      permitTypeKey,
      questionNumber: index + 1,
      businessUnitId: 'placeholder',
      siteId: null,
    });

    lines.push(`INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  ${sqlEscape(row.permit_type_key)},
  ${row.question_number},
  ${sqlEscape(row.question_id)},
  bu.id,
  NULL,
  ${sqlEscape(row.question_text)},
  ${sqlEscape(row.question_type)},
  ${row.options ? sqlEscape(row.options) : 'NULL'},
  ${sqlBool(row.required)},
  ${row.depends_on_question_id ? sqlEscape(row.depends_on_question_id) : 'NULL'},
  ${row.depends_on_value ? sqlEscape(row.depends_on_value) : 'NULL'},
  ${row.note ? sqlEscape(row.note) : 'NULL'},
  ${row.controls_label ? sqlEscape(row.controls_label) : 'NULL'},
  ${row.controls_on ? sqlEscape(row.controls_on) : 'NULL'},
  ${sqlBool(row.no_controls)},
  ${sqlBool(row.blocking_question)},
  ${row.blocking_answer ? sqlEscape(row.blocking_answer) : 'NULL'},
  ${row.text_label ? sqlEscape(row.text_label) : 'NULL'},
  ${row.yes_label ? sqlEscape(row.yes_label) : 'NULL'},
  ${row.no_label ? sqlEscape(row.no_label) : 'NULL'},
  ${sqlBool(row.inline_only)},
  true
FROM business_units bu;
`);
  });
}

const outPath = new URL('../migrations/seed-permit-questions-from-defaults.sql', import.meta.url);
writeFileSync(outPath, lines.join('\n'));
console.log('Wrote', outPath.pathname, 'statements:', lines.filter((l) => l.startsWith('INSERT')).length);