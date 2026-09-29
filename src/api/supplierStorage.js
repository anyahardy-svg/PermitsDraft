/**
 * Private suppliers bucket: store object paths in form JSON, resolve signed URLs on read.
 */

import { extractSupplierDocumentStoragePath, SUPPLIER_DOCUMENTS_BUCKET } from '../utils/storagePaths';

export { SUPPLIER_DOCUMENTS_BUCKET };

const DEFAULT_EXPIRES_SECONDS = 3600;

export function resolveSupplierDocumentStoragePath(fileRef) {
  return extractSupplierDocumentStoragePath(fileRef);
}

export function supplierDocumentFileReference(storagePath) {
  return resolveSupplierDocumentStoragePath(storagePath) || storagePath;
}

export async function getSignedSupplierDocumentUrl(
  fileRef,
  { token = null, supplierId = null, expiresInSeconds = DEFAULT_EXPIRES_SECONDS } = {},
) {
  const storagePath = resolveSupplierDocumentStoragePath(fileRef);
  if (!storagePath) {
    return { url: null, error: 'Missing file path' };
  }

  if (!token && !supplierId) {
    return { url: null, error: 'token or supplierId is required to open this document' };
  }

  const response = await fetch('/api/create-supplier-document-signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      path: storagePath,
      token,
      supplierId,
      expiresIn: expiresInSeconds,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return { url: null, error: errorBody.error || `Could not sign URL (${response.status})` };
  }

  const data = await response.json();
  return { url: data.signedUrl || null, error: null };
}

export async function openSupplierDocument(
  fileRef,
  { token = null, supplierId = null, expiresInSeconds = DEFAULT_EXPIRES_SECONDS } = {},
) {
  const { url, error } = await getSignedSupplierDocumentUrl(fileRef, {
    token,
    supplierId,
    expiresInSeconds,
  });
  if (!url) {
    throw new Error(error || 'Could not open document');
  }
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}
