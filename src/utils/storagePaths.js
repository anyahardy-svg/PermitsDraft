/**
 * Build human-readable Supabase Storage paths (same pattern as accreditations bucket).
 */

export function sanitizeStorageSegment(value, fallback = 'unknown') {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return sanitized || fallback;
}

export function buildTrainingRecordStoragePath({
  companyName,
  contractorName,
  trainingType,
  fileExt,
}) {
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_company');
  const contractorSegment = sanitizeStorageSegment(contractorName, 'unknown_contractor');
  const trainingSegment = sanitizeStorageSegment(trainingType, 'training');
  const extension = (fileExt || 'pdf').replace(/^\./, '');

  return `${companySegment}/${contractorSegment}/${trainingSegment}/${Date.now()}.${extension}`;
}

export function buildCompanyTrainingMatrixStoragePath({ companyName, fileExt }) {
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_company');
  const extension = (fileExt || 'pdf').replace(/^\./, '');

  return `${companySegment}/matrices/${Date.now()}.${extension}`;
}

export function extractTrainingRecordsStoragePath(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    return null;
  }

  const marker = '/training-records/';
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return fileUrl.slice(markerIndex + marker.length).split('?')[0];
}
