/**
 * Question types for specialised permit rows (permit_questions table).
 *
 * CSV column "question_type" must be one of these keys.
 * CSV column "options" format depends on type (see OPTIONS_FORMAT).
 */

export const QUESTION_TYPES = [
  'yesno',
  'yesnona',
  'yesno_text',
  'text',
  'radio',
  'multi_checkbox',
  'attachment',
  'section',
  'contractor_lookup',
];

/** Human labels for admin UI and CSV reference sheet */
export const QUESTION_TYPE_LABELS = {
  yesno: 'Yes / No',
  yesnona: 'Yes / No / N/A',
  yesno_text: 'Yes or No, then text',
  text: 'Free text',
  radio: 'Single choice (list)',
  multi_checkbox: 'Multiple choice (checkboxes)',
  attachment: 'Photo / file attachment',
  section: 'Section heading (no answer)',
  contractor_lookup: 'Contractor lookup or type name',
};

/**
 * How to fill the "options" column in CSV / admin (empty = use default where noted).
 */
export const OPTIONS_FORMAT = {
  yesno: 'Optional. Default if empty: Yes; No',
  yesnona: 'Optional. Default if empty: Yes; No; N/A',
  yesno_text: 'Leave empty. Use text_label / yes_label / no_label columns.',
  text: 'Optional placeholder hint in text_label column, not in options.',
  radio: 'Required. Semicolon list, e.g. 30 min (low risk); 60 min (high risk)',
  multi_checkbox:
    'Required. JSON array: [{"label":"O2","value":"O2"},...] or use seed from defaults.',
  attachment: 'Leave empty.',
  section: 'Leave empty. Question text is the heading; note column for subtext.',
  contractor_lookup:
    'Optional label, e.g. Lookup Contractors or overwrite. Same runtime as text with contractor picker when question_id matches known ids (hw_safety_watch, competent_person, safety_watch_name).',
};

export const SPECIALIZED_PERMIT_LABELS = {
  blastingMarking: 'Blasting - 1 Marking',
  blastingDrilling: 'Blasting - 2 Drilling',
  blastingExecution: 'Blasting - 3 Execution',
  confinedSpace: 'Confined Space',
  electrical: 'Electrical',
  excavation: 'Excavation',
  hotWork: 'Hot Work',
  lifting: 'Lifting',
  mobilePlantServicing: 'Mobile Plant Servicing',
  plantServicing: 'Fixed Plant Servicing',
  stripping: 'Stripping',
  surveying: 'Surveying',
  workingAtHeight: 'Working at Height',
};

export const SPECIALIZED_PERMIT_TYPE_KEYS = Object.keys(SPECIALIZED_PERMIT_LABELS);

export function permitKeyFromLabel(label) {
  const trimmed = (label || '').trim();
  const entry = Object.entries(SPECIALIZED_PERMIT_LABELS).find(
    ([, v]) => v.toLowerCase() === trimmed.toLowerCase(),
  );
  if (entry) return entry[0];
  const byKey = SPECIALIZED_PERMIT_TYPE_KEYS.find((k) => k.toLowerCase() === trimmed.toLowerCase());
  return byKey || trimmed;
}

export function permitLabelFromKey(key) {
  return SPECIALIZED_PERMIT_LABELS[key] || key;
}

/** Reference rows for admin “cheat sheet” */
export const QUESTION_TYPE_EXAMPLES = [
  {
    question_type: 'yesno',
    options: 'Yes; No',
    example: 'Will work be done in the workshop?',
  },
  {
    question_type: 'yesnona',
    options: 'Yes; No; N/A',
    example: 'Are flashback arrestors fitted?',
  },
  {
    question_type: 'radio',
    options: '30 minutes (low risk); 60 minutes (high risk)',
    example: 'Safety watch period',
  },
  {
    question_type: 'contractor_lookup',
    options: 'Lookup Contractors or overwrite',
    example: 'Who is the safety watch?',
  },
  {
    question_type: 'multi_checkbox',
    options: '[{"label":"O2","value":"O2"},{"label":"CO","value":"CO"}]',
    example: 'Which gases will be tested?',
  },
  {
    question_type: 'text',
    options: '',
    example: 'How will you communicate?',
  },
];