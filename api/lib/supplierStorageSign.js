import { createClient } from '@supabase/supabase-js';
import { getSupplierByAccreditationToken } from './supplierToken.js';
import {
  SUPPLIER_DOCUMENTS_BUCKET,
  buildSupplierDocumentStoragePath,
  extractSupplierDocumentStoragePath,
  sanitizeStorageSegment,
} from '../../src/utils/storagePaths.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

function getServiceSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service role is not configured on the server');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function resolveSupplierStoragePath(fileRef) {
  return extractSupplierDocumentStoragePath(fileRef);
}

export function supplierOwnsStoragePath(supplier, storagePath) {
  if (!supplier?.company_name || !storagePath) {
    return false;
  }
  const prefix = `${sanitizeStorageSegment(supplier.company_name, 'unknown_supplier')}/`;
  return storagePath === prefix.slice(0, -1) || storagePath.startsWith(prefix);
}

export async function authorizeSupplierStorageAccess({ token, supplierId, storagePath }) {
  if (!storagePath || storagePath.includes('..')) {
    return { error: 'Invalid storage path', status: 400 };
  }

  if (token) {
    const result = await getSupplierByAccreditationToken(token);
    if (result.error) {
      return { error: result.error, status: result.status || 401 };
    }
    if (!supplierOwnsStoragePath(result.supplier, storagePath)) {
      return { error: 'Access denied for this document', status: 403 };
    }
    return { supplier: result.supplier };
  }

  if (supplierId) {
    const supabase = getServiceSupabase();
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('id', supplierId)
      .maybeSingle();

    if (error) {
      return { error: error.message, status: 500 };
    }
    if (!supplier) {
      return { error: 'Supplier not found', status: 404 };
    }
    if (!supplierOwnsStoragePath(supplier, storagePath)) {
      return { error: 'Access denied for this document', status: 403 };
    }
    return { supplier };
  }

  return { error: 'token or supplierId is required', status: 400 };
}

export async function createSupplierDocumentSignedUrl(storagePath, expiresInSeconds = 3600) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage
    .from(SUPPLIER_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    throw new Error(error.message || 'Failed to create signed URL');
  }

  return data?.signedUrl || null;
}

export { SUPPLIER_DOCUMENTS_BUCKET, buildSupplierDocumentStoragePath };
