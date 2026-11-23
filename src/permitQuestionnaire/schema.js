export {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  OPTIONS_FORMAT,
  SPECIALIZED_PERMIT_LABELS,
  SPECIALIZED_PERMIT_TYPE_KEYS,
  QUESTION_TYPE_EXAMPLES,
  permitKeyFromLabel,
  permitLabelFromKey,
} from './questionTypes';

export function validateQuestionRow(row) {
  const errors = [];
  if (!row.question_id) errors.push('question_id required');
  if (!row.question_text) errors.push('question text required');
  if (!row.question_type) errors.push('question_type required');
  if (!row.permit_type_key && !row.specialised_permit) errors.push('permit type required');
  return errors;
}