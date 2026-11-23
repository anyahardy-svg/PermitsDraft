export const QUESTION_TYPES = [
  'yesno',
  'yesnona',
  'yesno_text',
  'text',
  'radio',
  'multi_checkbox',
  'attachment',
  'section',
];

export const SPECIALIZED_PERMIT_TYPE_KEYS = [
  'blastingMarking',
  'blastingDrilling',
  'blastingExecution',
  'confinedSpace',
  'electrical',
  'excavation',
  'hotWork',
  'lifting',
  'mobilePlantServicing',
  'plantServicing',
  'stripping',
  'surveying',
  'workingAtHeight',
];

export function validateQuestion(question, { allowMissingId = false } = {}) {
  const errors = [];
  if (!question || typeof question !== 'object') {
    return ['Question must be an object'];
  }
  if (!allowMissingId && !question.id) {
    errors.push('Missing question id');
  }
  if (!question.text && question.type !== 'section') {
    errors.push('Missing question text');
  }
  if (question.type && !QUESTION_TYPES.includes(question.type)) {
    errors.push(`Invalid type: ${question.type}`);
  }
  return errors;
}

export function validateMergedQuestions(questions) {
  const errors = [];
  const ids = new Set();
  (questions || []).forEach((q) => {
    validateQuestion(q).forEach((e) => errors.push(e));
    if (q.id) {
      if (ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
      ids.add(q.id);
    }
  });
  return errors;
}