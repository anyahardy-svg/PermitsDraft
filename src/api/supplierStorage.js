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

/**
 * @param {Window|null} targetWindow - Optional window opened synchronously from a click handler (avoids popup blockers).
 */
export async function openSupplierDocument(
  fileRef,
  { token = null, supplierId = null, expiresInSeconds = DEFAULT_EXPIRES_SECONDS, targetWindow = null } = {},
) {
  const trimmed = typeof fileRef === 'string' ? fileRef.trim() : '';
  const isLegacyPublicUrl = trimmed.includes('://') && trimmed.includes('/object/public/');

  const { url, error } = await getSignedSupplierDocumentUrl(fileRef, {
    token,
    supplierId,
    expiresInSeconds,
  });

  let openUrl = url;
  if (!openUrl && isLegacyPublicUrl) {
    openUrl = trimmed;
  }

  if (!openUrl) {
    throw new Error(error || 'Could not open document');
  }

  if (typeof window !== 'undefined') {
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = openUrl;
    } else if (window.open) {
      window.open(openUrl, '_blank', 'noopener,noreferrer');
    }
  }
  return openUrl;
}
