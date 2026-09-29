/**
 * Issue a short-lived signed URL for a supplier technical document (private bucket).
 *
 * POST /api/create-supplier-document-signed-url
 * Body: { path | fileRef, token?, supplierId?, expiresIn? }
 */

import {
  authorizeSupplierStorageAccess,
  createSupplierDocumentSignedUrl,
  resolveSupplierStoragePath,
} from './lib/supplierStorageSign.js';

const MAX_EXPIRES_SECONDS = 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const storagePath = resolveSupplierStoragePath(body.path || body.fileRef || body.url);
  const token = body.token;
  const supplierId = body.supplierId;
  const expiresIn = Math.min(
    Math.max(Number(body.expiresIn) || 3600, 60),
    MAX_EXPIRES_SECONDS,
  );

  if (!storagePath) {
    return res.status(400).json({ error: 'path or fileRef is required' });
  }

  try {
    const auth = await authorizeSupplierStorageAccess({ token, supplierId, storagePath });
    if (auth.error) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const signedUrl = await createSupplierDocumentSignedUrl(storagePath, expiresIn);
    if (!signedUrl) {
      return res.status(500).json({ error: 'Failed to create signed URL' });
    }

    return res.status(200).json({ signedUrl, path: storagePath, expiresIn });
  } catch (error) {
    console.error('create-supplier-document-signed-url error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create signed URL' });
  }
}
