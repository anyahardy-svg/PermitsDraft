/**
 * Private accreditations bucket: store object paths, resolve signed URLs on read.
 */

import { supabase } from '../supabaseClient';
import { extractAccreditationsStoragePath } from '../utils/storagePaths';
import { getRequestingAdminId, isAdminSessionActive } from './contractorData';
import { companyDataCreateAccreditationsSignedUrl } from './companyData';

export const ACCREDITATIONS_BUCKET = 'accreditations';

const DEFAULT_EXPIRES_SECONDS = 3600;

export function preferAccreditationEdgeForAdmin() {
  return Boolean(getRequestingAdminId() || isAdminSessionActive());
}

export function resolveAccreditationsStoragePath(fileRef) {
  return extractAccreditationsStoragePath(fileRef);
}

/** Value to persist in certificate / evidence URL columns (path, not public URL). */
export function accreditationsFileReference(storagePath) {
  return resolveAccreditationsStoragePath(storagePath) || storagePath;
}

export async function getSignedAccreditationsUrl(
  fileRef,
  expiresInSeconds = DEFAULT_EXPIRES_SECONDS,
) {
  const storagePath = resolveAccreditationsStoragePath(fileRef);
  if (!storagePath) {
    return { url: null, error: 'Missing file path' };
  }

  if (preferAccreditationEdgeForAdmin()) {
    try {
      const url = await companyDataCreateAccreditationsSignedUrl(storagePath, expiresInSeconds);
      if (url) {
        return { url, error: null };
      }
    } catch (edgeError) {
      console.warn('getSignedAccreditationsUrl edge failed:', edgeError?.message);
    }
  }

  if (!supabase) {
    return { url: null, error: 'Supabase client is not configured' };
  }

  const { data, error } = await supabase.storage
    .from(ACCREDITATIONS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    return { url: null, error: error.message };
  }
  return { url: data?.signedUrl || null, error: null };
}

export async function openAccreditationFile(fileRef) {
  const { url, error } = await getSignedAccreditationsUrl(fileRef);
  if (!url) {
    throw new Error(error || 'Could not open document');
  }
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}
