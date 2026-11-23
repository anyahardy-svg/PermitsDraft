/**
 * Convert flat permit_questions rows ↔ runtime objects used by renderQuestionnaire.
 */

const DEFAULT_OPTIONS = {
  yesno: ['yes', 'no'],
  yesnona: ['yes', 'no', 'na'],
};

export function parseOptionsColumn(questionType, optionsRaw) {
  const raw = (optionsRaw || '').trim();
  if (!raw) {
    if (questionType === 'yesno') return DEFAULT_OPTIONS.yesno;
    if (questionType === 'yesnona') return DEFAULT_OPTIONS.yesnona;
    return undefined;
  }
  if (questionType === 'multi_checkbox' || raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* fall through */
    }
  }
  if (questionType === 'radio') {
    return raw.split(';').map((s) => s.trim()).filter(Boolean);
  }
  return raw;
}

export function formatOptionsColumn(question) {
  const type = question.type || question.question_type;
  if (type === 'multi_checkbox' && Array.isArray(question.options)) {
    return JSON.stringify(question.options);
  }
  if (type === 'multi_checkbox' && !question.options) {
    return '';
  }
  if (type === 'radio' && Array.isArray(question.options)) {
    return question.options.join('; ');
  }
  if (type === 'yesno') return 'Yes; No';
  if (type === 'yesnona') return 'Yes; No; N/A';
  if (type === 'contractor_lookup') {
    return question.optionsColumn || 'Lookup Contractors or overwrite';
  }
  return '';
}

/**
 * @param {object} row - permit_questions table row
 */
export function rowToRuntimeQuestion(row) {
  let type = row.question_type;
  if (type === 'contractor_lookup') {
    type = 'text';
  }

  const q = {
    id: row.question_id,
    text: row.question_text,
    type,
  };

  if (row.required != null) q.required = Boolean(row.required);
  if (row.note) q.note = row.note;
  if (row.controls_label) q.controlsLabel = row.controls_label;
  if (row.controls_on) q.controlsOn = row.controls_on;
  if (row.no_controls) q.noControls = true;
  if (row.blocking_question) q.blockingQuestion = true;
  if (row.blocking_answer) q.blockingAnswer = row.blocking_answer;
  if (row.text_label) q.textLabel = row.text_label;
  if (row.yes_label) q.yesLabel = row.yes_label;
  if (row.no_label) q.noLabel = row.no_label;
  if (row.inline_only) q.inlineOnly = true;
  if (row.depends_on_question_id) q.dependsOn = row.depends_on_question_id;
  if (row.depends_on_value != null && row.depends_on_value !== '') {
    q.dependsOnValue = row.depends_on_value;
  }

  const opts = parseOptionsColumn(row.question_type, row.options);
  if (type === 'radio' && Array.isArray(opts)) {
    q.options = opts;
  } else if (type === 'multi_checkbox' && Array.isArray(opts)) {
    q.options = opts;
  }

  if (row.question_type === 'section') {
    q.type = 'section';
  }
  if (row.question_type === 'attachment') {
    q.type = 'attachment';
  }
  if (row.question_type === 'yesno_text') {
    q.type = 'yesno_text';
  }

  return q;
}

/**
 * @param {object} q - runtime question from defaults.js
 * @param {object} ctx - { permitTypeKey, questionNumber, businessUnitId, siteId }
 */
export function runtimeQuestionToRow(q, ctx) {
  const type =
    q.id === 'hw_safety_watch' || q.id === 'competent_person' || q.id === 'safety_watch_name'
      ? 'contractor_lookup'
      : q.type;

  return {
    permit_type_key: ctx.permitTypeKey,
    question_number: ctx.questionNumber,
    question_id: q.id,
    business_unit_id: ctx.businessUnitId,
    site_id: ctx.siteId ?? null,
    question_text: q.text,
    question_type: type,
    options: formatOptionsColumn({ ...q, type, optionsColumn: undefined }),
    required: q.required ?? false,
    depends_on_question_id: q.dependsOn || null,
    depends_on_value:
      q.dependsOnValue != null ? String(q.dependsOnValue) : null,
    note: q.note || null,
    controls_label: q.controlsLabel || null,
    controls_on: q.controlsOn || null,
    no_controls: q.noControls ?? false,
    blocking_question: q.blockingQuestion ?? false,
    blocking_answer: q.blockingAnswer || null,
    text_label: q.textLabel || null,
    yes_label: q.yesLabel || null,
    no_label: q.noLabel || null,
    inline_only: q.inlineOnly ?? false,
    is_published: true,
  };
}

export function rowsToQuestionnaireMap(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (!map[row.permit_type_key]) map[row.permit_type_key] = [];
    map[row.permit_type_key].push(rowToRuntimeQuestion(row));
  });
  return map;
}