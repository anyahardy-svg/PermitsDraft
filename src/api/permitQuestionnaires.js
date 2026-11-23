import { supabase } from '../supabaseClient';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../permitQuestionnaire/defaults';
import { mergeQuestionnaireMap, mergeQuestions } from '../permitQuestionnaire/merge';
import { SPECIALIZED_PERMIT_TYPE_KEYS, validateQuestion } from '../permitQuestionnaire/schema';

const isMissingTableError = (error) => {
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  return code === '42P01' || msg.includes('does not exist') || msg.includes('permit_questionnaire');
};

// ---------------------------------------------------------------------------
// Resolve (runtime)
// ---------------------------------------------------------------------------

async function fetchPublishedBaseByBu(businessUnitId) {
  const { data, error } = await supabase
    .from('permit_questionnaire_sets')
    .select('permit_type_key, questions')
    .eq('business_unit_id', businessUnitId)
    .eq('is_published', true);

  if (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
  const map = {};
  (data || []).forEach((row) => {
    map[row.permit_type_key] = Array.isArray(row.questions) ? row.questions : [];
  });
  return map;
}

async function fetchPublishedSiteAdditions(businessUnitId, siteId) {
  if (!siteId) return {};
  const { data, error } = await supabase
    .from('permit_questionnaire_site_questions')
    .select('permit_type_key, question, sort_order, insert_after_question_id')
    .eq('business_unit_id', businessUnitId)
    .eq('site_id', siteId)
    .eq('is_published', true)
    .order('sort_order', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return {};
    throw error;
  }
  const map = {};
  (data || []).forEach((row) => {
    if (!map[row.permit_type_key]) map[row.permit_type_key] = [];
    map[row.permit_type_key].push(row);
  });
  return map;
}

/**
 * Merge DB base + site extras with bundled defaults for missing types.
 */
export async function resolveQuestionnaires(businessUnitId, siteId = null) {
  if (!businessUnitId) {
    return { ...DEFAULT_PERMIT_QUESTIONNAIRES };
  }

  try {
    const [baseFromDb, siteExtras] = await Promise.all([
      fetchPublishedBaseByBu(businessUnitId),
      fetchPublishedSiteAdditions(businessUnitId, siteId),
    ]);

    const baseByType = {};
    SPECIALIZED_PERMIT_TYPE_KEYS.forEach((key) => {
      if (baseFromDb[key]?.length) {
        baseByType[key] = baseFromDb[key];
      } else {
        baseByType[key] = DEFAULT_PERMIT_QUESTIONNAIRES[key] || [];
      }
    });

    const merged = mergeQuestionnaireMap(baseByType, siteExtras);

    SPECIALIZED_PERMIT_TYPE_KEYS.forEach((key) => {
      if (!merged[key]?.length && DEFAULT_PERMIT_QUESTIONNAIRES[key]) {
        merged[key] = DEFAULT_PERMIT_QUESTIONNAIRES[key];
      }
    });

    return merged;
  } catch (err) {
    console.warn('[permitQuestionnaires] resolve failed, using defaults:', err?.message || err);
    return { ...DEFAULT_PERMIT_QUESTIONNAIRES };
  }
}

export async function resolveQuestionnaireForType(businessUnitId, siteId, permitTypeKey) {
  const all = await resolveQuestionnaires(businessUnitId, siteId);
  return all[permitTypeKey] || DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey] || [];
}

// ---------------------------------------------------------------------------
// Admin CRUD — base sets
// ---------------------------------------------------------------------------

export async function listBaseSets({ businessUnitId, permitTypeKey } = {}) {
  let query = supabase
    .from('permit_questionnaire_sets')
    .select('*')
    .order('permit_type_key', { ascending: true });

  if (businessUnitId) query = query.eq('business_unit_id', businessUnitId);
  if (permitTypeKey) query = query.eq('permit_type_key', permitTypeKey);

  const { data, error } = await query;
  if (error) throw error;
  return { success: true, data: data || [] };
}

export async function saveBaseSet({
  id,
  permitTypeKey,
  businessUnitId,
  questions,
  publish = false,
}) {
  const payload = {
    permit_type_key: permitTypeKey,
    business_unit_id: businessUnitId,
    questions: questions || [],
    is_published: Boolean(publish),
    updated_at: new Date().toISOString(),
  };

  if (publish) {
    await supabase
      .from('permit_questionnaire_sets')
      .update({ is_published: false })
      .eq('permit_type_key', permitTypeKey)
      .eq('business_unit_id', businessUnitId);
  }

  if (id) {
    const { data, error } = await supabase
      .from('permit_questionnaire_sets')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  }

  const { data, error } = await supabase
    .from('permit_questionnaire_sets')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
}

export async function publishBaseSet(id) {
  const { data: row, error: fetchErr } = await supabase
    .from('permit_questionnaire_sets')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  await supabase
    .from('permit_questionnaire_sets')
    .update({ is_published: false })
    .eq('permit_type_key', row.permit_type_key)
    .eq('business_unit_id', row.business_unit_id);

  const { data, error } = await supabase
    .from('permit_questionnaire_sets')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
}

// ---------------------------------------------------------------------------
// Admin CRUD — site additions
// ---------------------------------------------------------------------------

export async function listSiteAdditions({ businessUnitId, siteId, permitTypeKey } = {}) {
  let query = supabase
    .from('permit_questionnaire_site_questions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (businessUnitId) query = query.eq('business_unit_id', businessUnitId);
  if (siteId) query = query.eq('site_id', siteId);
  if (permitTypeKey) query = query.eq('permit_type_key', permitTypeKey);

  const { data, error } = await query;
  if (error) throw error;
  return { success: true, data: data || [] };
}

export async function saveSiteQuestion({
  id,
  permitTypeKey,
  businessUnitId,
  siteId,
  question,
  sortOrder,
  insertAfterQuestionId,
  publish = true,
}) {
  const qErrors = validateQuestion(question);
  if (qErrors.length) {
    return { success: false, error: qErrors.join('; ') };
  }

  const payload = {
    permit_type_key: permitTypeKey,
    business_unit_id: businessUnitId,
    site_id: siteId,
    question,
    sort_order: sortOrder != null ? sortOrder : 1000,
    insert_after_question_id: insertAfterQuestionId || null,
    is_published: Boolean(publish),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from('permit_questionnaire_site_questions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  }

  const { data, error } = await supabase
    .from('permit_questionnaire_site_questions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
}

export async function deleteSiteQuestion(id) {
  const { error } = await supabase.from('permit_questionnaire_site_questions').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

const CSV_HEADERS = [
  'permit_type_key',
  'business_unit_name',
  'site_name',
  'scope',
  'question_id',
  'sort_order',
  'insert_after_question_id',
  'text',
  'type',
  'required',
  'depends_on',
  'depends_on_value',
  'note',
  'controls_label',
  'controls_on',
  'no_controls',
  'blocking_question',
  'blocking_answer',
];

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function rowToQuestion(row) {
  const question = {
    id: row.question_id,
    text: row.text,
    type: row.type,
  };
  if (row.required === 'true' || row.required === '1' || row.required === 'yes') {
    question.required = true;
  }
  if (row.depends_on) question.dependsOn = row.depends_on;
  if (row.depends_on_value) question.dependsOnValue = row.depends_on_value;
  if (row.note) question.note = row.note;
  if (row.controls_label) question.controlsLabel = row.controls_label;
  if (row.controls_on) question.controlsOn = row.controls_on;
  if (row.no_controls === 'true' || row.no_controls === '1') question.noControls = true;
  if (row.blocking_question === 'true' || row.blocking_question === '1') {
    question.blockingQuestion = true;
  }
  if (row.blocking_answer) question.blockingAnswer = row.blocking_answer;
  return question;
}

/**
 * @param {object} maps - { businessUnitsByName, sitesByName }
 */
export async function importQuestionnaireCsv(csvText, maps, { dryRun = false } = {}) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { success: false, error: 'CSV must have a header and at least one row' };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const errors = [];
  const baseGroups = {};
  const siteRows = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });

    const bu = maps.businessUnitsByName[row.business_unit_name];
    if (!bu) {
      errors.push(`Line ${i + 1}: unknown business unit "${row.business_unit_name}"`);
      continue;
    }

    const scope = (row.scope || 'base').toLowerCase();
    const permitTypeKey = row.permit_type_key;
    if (!permitTypeKey) {
      errors.push(`Line ${i + 1}: missing permit_type_key`);
      continue;
    }

    if (scope === 'site_addition') {
      if (!row.site_name) {
        errors.push(`Line ${i + 1}: site_addition requires site_name`);
        continue;
      }
      const site = maps.sitesByName[row.site_name];
      if (!site) {
        errors.push(`Line ${i + 1}: unknown site "${row.site_name}"`);
        continue;
      }
      siteRows.push({
        businessUnitId: bu.id,
        siteId: site.id,
        permitTypeKey,
        question: rowToQuestion(row),
        sortOrder: row.sort_order ? Number(row.sort_order) : 1000,
        insertAfterQuestionId: row.insert_after_question_id || null,
      });
    } else {
      const key = `${bu.id}::${permitTypeKey}`;
      if (!baseGroups[key]) {
        baseGroups[key] = { businessUnitId: bu.id, permitTypeKey, questions: [] };
      }
      baseGroups[key].questions.push(rowToQuestion(row));
    }
  }

  if (errors.length) {
    return { success: false, errors };
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      baseSets: Object.values(baseGroups).length,
      siteAdditions: siteRows.length,
    };
  }

  for (const group of Object.values(baseGroups)) {
    await saveBaseSet({
      permitTypeKey: group.permitTypeKey,
      businessUnitId: group.businessUnitId,
      questions: group.questions,
      publish: true,
    });
  }

  for (const siteRow of siteRows) {
    await saveSiteQuestion({
      permitTypeKey: siteRow.permitTypeKey,
      businessUnitId: siteRow.businessUnitId,
      siteId: siteRow.siteId,
      question: siteRow.question,
      sortOrder: siteRow.sortOrder,
      insertAfterQuestionId: siteRow.insertAfterQuestionId,
      publish: true,
    });
  }

  return { success: true, baseSets: Object.values(baseGroups).length, siteAdditions: siteRows.length };
}

export function exportQuestionnaireCsv({ baseSets = [], siteRows = [], businessUnitsById = {}, sitesById = {} }) {
  const lines = [CSV_HEADERS.join(',')];

  baseSets.forEach((set) => {
    const buName = businessUnitsById[set.business_unit_id]?.name || set.business_unit_id;
    (set.questions || []).forEach((q, index) => {
      lines.push(
        [
          set.permit_type_key,
          buName,
          '',
          'base',
          q.id,
          index,
          '',
          q.text,
          q.type,
          q.required ? 'true' : '',
          q.dependsOn || '',
          q.dependsOnValue ?? '',
          q.note || '',
          q.controlsLabel || '',
          q.controlsOn || '',
          q.noControls ? 'true' : '',
          q.blockingQuestion ? 'true' : '',
          q.blockingAnswer || '',
        ].map(escapeCsv).join(','),
      );
    });
  });

  siteRows.forEach((row) => {
    const buName = businessUnitsById[row.business_unit_id]?.name || row.business_unit_id;
    const siteName = sitesById[row.site_id]?.name || row.site_id;
    const q = row.question || {};
    lines.push(
      [
        row.permit_type_key,
        buName,
        siteName,
        'site_addition',
        q.id,
        row.sort_order ?? '',
        row.insert_after_question_id || '',
        q.text,
        q.type,
        q.required ? 'true' : '',
        q.dependsOn || '',
        q.dependsOnValue ?? '',
        q.note || '',
        q.controlsLabel || '',
        q.controlsOn || '',
        q.noControls ? 'true' : '',
        q.blockingQuestion ? 'true' : '',
        q.blockingAnswer || '',
      ].map(escapeCsv).join(','),
    );
  });

  return lines.join('\n');
}

export async function previewMergedQuestionnaire(businessUnitId, siteId, permitTypeKey) {
  const questions = await resolveQuestionnaireForType(businessUnitId, siteId, permitTypeKey);
  return { success: true, questions };
}

export { mergeQuestions };