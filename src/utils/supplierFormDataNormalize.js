import { createEmptyProduct } from '../schemas/supplierSchema';
import { extractSupplierDocumentStoragePath } from './storagePaths';

const SAFETY_DOC_SLOTS = ['TDS', 'SDS'];

function isUploadMeta(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return Boolean(value.url || value.path || value.fileName);
}

function uploadLooksLikeSupplierFile(upload) {
  const hint = `${upload.path || ''}${upload.url || ''}`.toLowerCase();
  return hint.includes('suppliers') || hint.includes('safety_docs') || Boolean(extractSupplierDocumentStoragePath(upload.url || upload.path));
}

function inferSafetyDocSlot(upload, keyHint = '') {
  const hint = `${keyHint}${upload.path || ''}${upload.url || ''}`.toLowerCase();
  if (hint.includes('tds') && !hint.includes('sds')) {
    return 'TDS';
  }
  if (hint.includes('sds') || hint.includes('safety')) {
    return 'SDS';
  }
  return 'SDS';
}

/**
 * Normalise safety_docs for document-group UI (TDS / SDS slots).
 */
export function normalizeSafetyDocs(raw) {
  if (!raw) {
    return {};
  }

  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim();
    return {
      SDS: {
        url: trimmed,
        path: extractSupplierDocumentStoragePath(trimmed) || undefined,
        fileName: 'Safety document',
      },
    };
  }

  if (isUploadMeta(raw)) {
    return { SDS: { ...raw } };
  }

  if (typeof raw !== 'object') {
    return {};
  }

  const out = {};

  SAFETY_DOC_SLOTS.forEach((slot) => {
    const lower = slot.toLowerCase();
    const entry = raw[slot] || raw[lower];
    if (isUploadMeta(entry)) {
      out[slot] = { ...entry };
    }
  });

  Object.entries(raw).forEach(([key, entry]) => {
    if (!isUploadMeta(entry)) {
      return;
    }
    const slot = inferSafetyDocSlot(entry, key);
    if (!out[slot]) {
      out[slot] = { ...entry };
    }
  });

  return out;
}

function normalizeDocumentEvidence(raw) {
  if (!raw) {
    return raw;
  }
  if (typeof raw === 'string' && raw.trim()) {
    return {
      url: raw.trim(),
      path: extractSupplierDocumentStoragePath(raw.trim()) || undefined,
      fileName: 'Document',
    };
  }
  return raw;
}

/**
 * Find uploaded file metadata anywhere in saved accreditation JSON (legacy shapes).
 */
export function findSupplierDocumentUploads(node, found = []) {
  if (!node) {
    return found;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => findSupplierDocumentUploads(item, found));
    return found;
  }

  if (typeof node !== 'object') {
    return found;
  }

  if (isUploadMeta(node) && uploadLooksLikeSupplierFile(node)) {
    found.push(node);
  }

  Object.values(node).forEach((value) => findSupplierDocumentUploads(value, found));
  return found;
}

/**
 * Merge each product with defaults and recover safety docs from legacy / orphan uploads.
 */
export function normalizeSupplierFormProducts(products, entireSavedData = {}) {
  const sourceProducts = Array.isArray(products) && products.length
    ? products
    : [createEmptyProduct(0)];

  let normalized = sourceProducts.map((product, index) => ({
    ...createEmptyProduct(index),
    ...product,
    safety_docs: normalizeSafetyDocs(product?.safety_docs),
    coa_provided: normalizeDocumentEvidence(product?.coa_provided),
  }));

  const rootSafetyDocs = normalizeSafetyDocs(entireSavedData.safety_docs);
  if (Object.keys(rootSafetyDocs).length) {
    normalized[0] = {
      ...normalized[0],
      safety_docs: {
        ...normalized[0].safety_docs,
        ...rootSafetyDocs,
      },
    };
  }

  const orphans = findSupplierDocumentUploads(entireSavedData);
  orphans.forEach((upload) => {
    const slot = inferSafetyDocSlot(upload);
    const target = normalized[0];
    if (!target.safety_docs[slot]) {
      target.safety_docs = {
        ...target.safety_docs,
        [slot]: { ...upload },
      };
    }
  });

  return normalized;
}
