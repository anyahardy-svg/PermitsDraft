const LOCALE_COMPARE = { sensitivity: 'base', numeric: true };

export function compareTrainingRecordsAlphabetically(a, b) {
  const contractorCmp = (a.contractor_name || a.contractor?.name || '').localeCompare(
    b.contractor_name || b.contractor?.name || '',
    undefined,
    LOCALE_COMPARE,
  );
  if (contractorCmp !== 0) return contractorCmp;
  return (a.training_type || '').localeCompare(b.training_type || '', undefined, LOCALE_COMPARE);
}

export function sortTrainingRecordsAlphabetically(records) {
  return [...(records || [])].sort(compareTrainingRecordsAlphabetically);
}

export function filterTrainingRecords(records, { search = '', status = 'all', contractorId = 'all' } = {}) {
  const normalizedSearch = search.trim().toLowerCase();
  return (records || []).filter((record) => {
    const recordStatus = record.status || 'pending';
    if (status !== 'all' && recordStatus !== status) return false;

    const recordContractorId = record.contractor_id || record.contractor?.id;
    if (contractorId !== 'all' && recordContractorId !== contractorId) return false;

    if (!normalizedSearch) return true;
    const haystack = [
      record.contractor_name,
      record.contractor?.name,
      record.training_type,
      record.file_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}

export function compareTrainingMatricesAlphabetically(a, b) {
  return (a.name || '').localeCompare(b.name || '', undefined, LOCALE_COMPARE);
}

export function sortTrainingMatricesAlphabetically(matrices) {
  return [...(matrices || [])].sort(compareTrainingMatricesAlphabetically);
}

export function filterTrainingMatrices(matrices, { search = '', status = 'all' } = {}) {
  const normalizedSearch = search.trim().toLowerCase();
  return (matrices || []).filter((matrix) => {
    const matrixStatus = matrix.status || 'pending';
    if (status !== 'all' && matrixStatus !== status) return false;

    if (!normalizedSearch) return true;
    const people = (matrix.contractors || []).map((c) => c.name).join(' ');
    const haystack = [matrix.name, matrix.file_name, people].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(normalizedSearch);
  });
}
