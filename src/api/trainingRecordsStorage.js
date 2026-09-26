/**
 * Private training-records bucket: store object paths, resolve signed URLs on read.
 */

import { supabase } from '../supabaseClient';
import { extractTrainingRecordsStoragePath } from '../utils/storagePaths';
import { preferTrainingRecordsEdgeForAdmin, trainingRecordsDataCreateSignedUrl } from './trainingRecordsData';

export const TRAINING_RECORDS_BUCKET = 'training-records';

const DEFAULT_EXPIRES_SECONDS = 3600;

export function resolveTrainingRecordsStoragePath(fileRef) {
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
  return extractTrainingRecordsStoragePath(trimmed);
}

/** Value to persist in file_url (storage object path, not a public URL). */
export function trainingRecordsFileReference(storagePath) {
  return resolveTrainingRecordsStoragePath(storagePath) || storagePath;
}

export async function getSignedTrainingRecordsUrl(fileRef, expiresInSeconds = DEFAULT_EXPIRES_SECONDS) {
  const storagePath = resolveTrainingRecordsStoragePath(fileRef);
  if (!storagePath) {
    return { url: null, error: 'Missing file path' };
  }

  if (preferTrainingRecordsEdgeForAdmin()) {
    try {
      const url = await trainingRecordsDataCreateSignedUrl(storagePath, expiresInSeconds);
      if (url) {
        return { url, error: null };
      }
    } catch (edgeError) {
      console.warn('getSignedTrainingRecordsUrl edge failed:', edgeError?.message);
    }
  }

  if (!supabase) {
    return { url: null, error: 'Supabase client is not configured' };
  }

  const { data, error } = await supabase.storage
    .from(TRAINING_RECORDS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    return { url: null, error: error.message };
  }
  return { url: data?.signedUrl || null, error: null };
}

export async function openTrainingRecordsFile(fileRef) {
  const { url, error } = await getSignedTrainingRecordsUrl(fileRef);
  if (!url) {
    throw new Error(error || 'Could not open file');
  }
  if (typeof window !== 'undefined' && window.open) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return url;
}
