/**
 * Build human-readable Supabase Storage paths.
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

export function buildContractorAttachmentStoragePath({
  companyName,
  contractorName,
  fileExt,
}) {
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_company');
  const contractorSegment = sanitizeStorageSegment(contractorName, 'unknown_contractor');
  const extension = (fileExt || 'pdf').replace(/^\./, '');

  return `${companySegment}/${contractorSegment}/other_attachments/${Date.now()}.${extension}`;
}

export const SUPPLIER_DOCUMENTS_BUCKET = 'suppliers';

export function buildSupplierDocumentStoragePath({ companyName, documentType, fileExt }) {
  const companySegment = sanitizeStorageSegment(companyName, 'unknown_supplier');
  const documentSegment = sanitizeStorageSegment(documentType, 'document');
  const extension = (fileExt || 'bin').replace(/^\./, '');

  return `${companySegment}/${documentSegment}/${Date.now()}.${extension}`;
}

export function extractSupplierDocumentStoragePath(fileRef) {
  if (!fileRef || typeof fileRef !== 'string') {
    return null;
  }

  const trimmed = fileRef.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.includes('://') && !trimmed.startsWith('/')) {
    return trimmed.split('?')[0];
  }

  const markers = [
    `/object/public/${SUPPLIER_DOCUMENTS_BUCKET}/`,
    `/object/sign/${SUPPLIER_DOCUMENTS_BUCKET}/`,
    `/${SUPPLIER_DOCUMENTS_BUCKET}/`,
    '/accreditations/suppliers/',
  ];
  for (const marker of markers) {
    const markerIndex = trimmed.indexOf(marker);
    if (markerIndex !== -1) {
      return trimmed.slice(markerIndex + marker.length).split('?')[0];
    }
  }

  return null;
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

export function extractAccreditationsStoragePath(fileRef) {
  if (!fileRef || typeof fileRef !== 'string') {
    return null;
  }
  const trimmed = fileRef.trim();
  if (!trimmed) {
    return null;
  }
  if (!trimmed.includes('://') && !trimmed.startsWith('/')) {
    return trimmed.split('?')[0];
  }
  const markers = [
    '/object/public/accreditations/',
    '/object/sign/accreditations/',
    '/accreditations/',
  ];
  for (const marker of markers) {
    const idx = trimmed.indexOf(marker);
    if (idx !== -1) {
      return trimmed.slice(idx + marker.length).split('?')[0];
    }
  }
  return null;
}
