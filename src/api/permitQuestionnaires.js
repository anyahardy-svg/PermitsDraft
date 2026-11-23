import { supabase } from '../supabaseClient';
import { DEFAULT_PERMIT_QUESTIONNAIRES } from '../permitQuestionnaire/defaults';
import { rowToRuntimeQuestion, runtimeQuestionToRow } from '../permitQuestionnaire/rowAdapter';
import {
  SPECIALIZED_PERMIT_TYPE_KEYS,
  permitKeyFromLabel,
  permitLabelFromKey,
} from '../permitQuestionnaire/questionTypes';

const isMissingTableError = (error) => {
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  return code === '42P01' || msg.includes('does not exist') || msg.includes('permit_questions');
};

/** CSV / spreadsheet column order */
export const SHEET_COLUMNS = [
  'specialised_permit',
  'question_number',
  'question_id',
  'business_unit',
  'sites',
  'question',
  'question_type',
  'options',
  'required',
  'depends_on_question_id',
  'depends_on_value',
  'note',
  'controls_label',
  'controls_on',
  'no_controls',
  'blocking_question',
  'blocking_answer',
  'text_label',
  'yes_label',
  'no_label',
  'inline_only',
];

/**
 * Load questions: All Sites rows + site-specific rows for current site, merged and sorted.
 */
export async function resolveQuestionnaires(businessUnitId, siteId = null) {
  if (!businessUnitId) {
    return { ...DEFAULT_PERMIT_QUESTIONNAIRES };
  }

  try {
    let query = supabase
      .from('permit_questions')
      .select('*')
      .eq('business_unit_id', businessUnitId)
      .eq('is_published', true)
      .order('question_number', { ascending: true });

    if (siteId) {
      query = query.or(`site_id.is.null,site_id.eq.${siteId}`);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        return { ...DEFAULT_PERMIT_QUESTIONNAIRES };
      }
      throw error;
    }

  const rows = data || [];
    if (rows.length === 0) {
      return { ...DEFAULT_PERMIT_QUESTIONNAIRES };
    }

    const byType = {};
    rows.forEach((row) => {
      if (!byType[row.permit_type_key]) byType[row.permit_type_key] = [];
      byType[row.permit_type_key].push(row);
    });

    const result = {};
    SPECIALIZED_PERMIT_TYPE_KEYS.forEach((key) => {
      if (byType[key]?.length) {
        const sorted = [...byType[key]].sort(
          (a, b) => Number(a.question_number) - Number(b.question_number),
        );
        result[key] = sorted.map(rowToRuntimeQuestion);
      } else {
        result[key] = DEFAULT_PERMIT_QUESTIONNAIRES[key] || [];
      }
    });

    return result;
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
// Admin — flat rows
// ---------------------------------------------------------------------------

export async function listQuestionRows({ businessUnitId, permitTypeKey, siteId } = {}) {
  let query = supabase
    .from('permit_questions')
    .select('*')
    .order('permit_type_key')
    .order('question_number', { ascending: true });

  if (businessUnitId) query = query.eq('business_unit_id', businessUnitId);
  if (permitTypeKey) query = query.eq('permit_type_key', permitTypeKey);
  if (siteId === 'all') {
    query = query.is('site_id', null);
  } else if (siteId) {
    query = query.eq('site_id', siteId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return { success: true, data: data || [] };
}

export async function upsertQuestionRow(row) {
  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };
  delete payload.id;

  if (row.id) {
    const { data, error } = await supabase
      .from('permit_questions')
      .update(payload)
      .eq('id', row.id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  }

  const { data, error } = await supabase
    .from('permit_questions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
}

export async function deleteQuestionRow(id) {
  const { error } = await supabase.from('permit_questions').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}

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

function rowToSheetCells(row, businessUnitsById, sitesById) {
  const buName = businessUnitsById[row.business_unit_id]?.name || '';
  const siteName = row.site_id ? sitesById[row.site_id]?.name || '' : 'All Sites';
  return {
    specialised_permit: permitLabelFromKey(row.permit_type_key),
    question_number: row.question_number,
    question_id: row.question_id,
    business_unit: buName,
    sites: siteName,
    question: row.question_text,
    question_type: row.question_type,
    options: row.options || '',
    required: row.required ? 'true' : '',
    depends_on_question_id: row.depends_on_question_id || '',
    depends_on_value: row.depends_on_value ?? '',
    note: row.note || '',
    controls_label: row.controls_label || '',
    controls_on: row.controls_on || '',
    no_controls: row.no_controls ? 'true' : '',
    blocking_question: row.blocking_question ? 'true' : '',
    blocking_answer: row.blocking_answer || '',
    text_label: row.text_label || '',
    yes_label: row.yes_label || '',
    no_label: row.no_label || '',
    inline_only: row.inline_only ? 'true' : '',
  };
}

export function exportQuestionsSheet(rows, businessUnitsById = {}, sitesById = {}) {
  const lines = [SHEET_COLUMNS.join(',')];
  rows.forEach((row) => {
    const cells = rowToSheetCells(row, businessUnitsById, sitesById);
    lines.push(SHEET_COLUMNS.map((h) => escapeCsv(cells[h])).join(','));
  });
  return lines.join('\n');
}

export async function importQuestionsSheet(csvText, maps, { dryRun = false } = {}) {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { success: false, error: 'CSV must have a header and at least one row' };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const errors = [];
  const payloads = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').trim();
    });

    const bu = maps.businessUnitsByName[row.business_unit];
    if (!bu) {
      errors.push(`Line ${i + 1}: unknown business unit "${row.business_unit}"`);
      continue;
    }

    let siteId = null;
    const sitesLabel = (row.sites || 'All Sites').trim();
    if (sitesLabel.toLowerCase() !== 'all sites' && sitesLabel !== '') {
      const site = maps.sitesByName[sitesLabel];
      if (!site) {
        errors.push(`Line ${i + 1}: unknown site "${sitesLabel}"`);
        continue;
      }
      siteId = site.id;
    }

    const permitKey = permitKeyFromLabel(row.specialised_permit);

    payloads.push({
      permit_type_key: permitKey,
      question_number: Number(row.question_number),
      question_id: row.question_id,
      business_unit_id: bu.id,
      site_id: siteId,
      question_text: row.question,
      question_type: row.question_type,
      options: row.options || null,
      required: row.required === 'true' || row.required === '1',
      depends_on_question_id: row.depends_on_question_id || null,
      depends_on_value: row.depends_on_value || null,
      note: row.note || null,
      controls_label: row.controls_label || null,
      controls_on: row.controls_on || null,
      no_controls: row.no_controls === 'true',
      blocking_question: row.blocking_question === 'true',
      blocking_answer: row.blocking_answer || null,
      text_label: row.text_label || null,
      yes_label: row.yes_label || null,
      no_label: row.no_label || null,
      inline_only: row.inline_only === 'true',
      is_published: true,
    });
  }

  if (errors.length) {
    return { success: false, errors };
  }

  if (dryRun) {
    return { success: true, dryRun: true, rowCount: payloads.length };
  }

  for (const payload of payloads) {
    let lookup = supabase
      .from('permit_questions')
      .select('id')
      .eq('permit_type_key', payload.permit_type_key)
      .eq('business_unit_id', payload.business_unit_id)
      .eq('question_id', payload.question_id);

    lookup = payload.site_id
      ? lookup.eq('site_id', payload.site_id)
      : lookup.is('site_id', null);

    const { data: existing } = await lookup.maybeSingle();

    if (existing?.id) {
      const { error } = await supabase
        .from('permit_questions')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('permit_questions').insert(payload);
      if (error) throw error;
    }
  }

  return { success: true, rowCount: payloads.length };
}

/** Build rows from defaults.js for seeding (one BU, All Sites). */
export function defaultQuestionsAsRows(businessUnitId, siteId = null) {
  const rows = [];
  SPECIALIZED_PERMIT_TYPE_KEYS.forEach((permitTypeKey) => {
    const questions = DEFAULT_PERMIT_QUESTIONNAIRES[permitTypeKey] || [];
    questions.forEach((q, index) => {
      rows.push(
        runtimeQuestionToRow(q, {
          permitTypeKey,
          questionNumber: index + 1,
          businessUnitId,
          siteId,
        }),
      );
    });
  });
  return rows;
}

export { permitLabelFromKey, permitKeyFromLabel };