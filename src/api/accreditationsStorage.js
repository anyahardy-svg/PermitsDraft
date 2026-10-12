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

function isLegacyPublicAccreditationUrl(fileRef) {
  return (
    typeof fileRef === 'string'
    && fileRef.includes('://')
    && fileRef.includes('/object/public/accreditations/')
  );
}

/**
 * Open an accreditation file in a new tab. Pass targetWindow from a synchronous click handler
 * (window.open('about:blank')) so pop-up blockers allow the tab after async signed-URL fetch.
 */
export async function openAccreditationFile(fileRef, targetWindow = null) {
  const legacyPublicUrl = isLegacyPublicAccreditationUrl(fileRef) ? fileRef.trim() : null;
  const { url, error } = await getSignedAccreditationsUrl(fileRef);
  const openUrl = url || legacyPublicUrl;

  if (!openUrl) {
    throw new Error(error || 'Could not open document');
  }

  if (typeof window !== 'undefined') {
    if (targetWindow && !targetWindow.closed) {
      targetWindow.location.href = openUrl;
    } else if (window.open) {
      const opened = window.open(openUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        throw new Error('Could not open document (allow pop-ups for this site)');
      }
    }
  }
  return openUrl;
}
