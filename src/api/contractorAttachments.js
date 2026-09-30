/**
 * General contractor document attachments (e.g. traffic management plans).
 * Stored in the private training-records bucket; metadata on contractors.attachments.
 */

import { supabase } from '../supabaseClient';
import { validateFile } from '../utils/fileValidation';
import { buildContractorAttachmentStoragePath } from '../utils/storagePaths';
import { getContractor, listContractorsByCompany, updateContractor } from './contractors';
import {
  TRAINING_RECORDS_BUCKET,
  openTrainingRecordsFile,
  trainingRecordsFileReference,
} from './trainingRecordsStorage';
import {
  countCompanyContractorAttachments,
  normalizeContractorAttachments,
} from '../utils/contractorAttachmentsUtils';

export { normalizeContractorAttachments, countCompanyContractorAttachments };

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

async function persistAttachments(contractorId, attachments) {
  const updated = await updateContractor(contractorId, { attachments });
  return normalizeContractorAttachments(updated?.attachments ?? attachments);
}

export async function loadContractorAttachments(contractorId) {
  const contractor = await getContractor(contractorId);
  return normalizeContractorAttachments(contractor?.attachments);
}

/** All contractor-uploaded attachments for every person linked to a company. */
export async function loadCompanyContractorAttachments(companyId) {
  if (!companyId) {
    return [];
  }

  const contractors = await listContractorsByCompany(companyId);
  const groups = [];

  for (const contractor of contractors || []) {
    const attachments = normalizeContractorAttachments(contractor.attachments);
    if (attachments.length === 0) {
      continue;
    }
    groups.push({
      contractorId: contractor.id,
      contractorName: contractor.name || 'Unknown contractor',
      contractorEmail: contractor.email || '',
      attachments,
    });
  }

  return groups.sort((a, b) => a.contractorName.localeCompare(b.contractorName));
}

export async function uploadContractorAttachment({
  contractorId,
  companyName,
  contractorName,
  file,
  label = '',
}) {
  if (!contractorId) {
    throw new Error('Save the contractor before uploading attachments');
  }
  if (!file) {
    throw new Error('No file selected');
  }

  const validation = validateFile(file, 50);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const ext = (file.name || '').split('.').pop() || 'pdf';
  const storagePath = buildContractorAttachmentStoragePath({
    companyName,
    contractorName,
    fileExt: ext,
  });

  const contentType = file.type || 'application/octet-stream';
  const { error: uploadError } = await supabase.storage
    .from(TRAINING_RECORDS_BUCKET)
    .upload(storagePath, file, { contentType, upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || 'Upload failed');
  }

  const existing = await loadContractorAttachments(contractorId);
  const entry = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: label.trim(),
    name: file.name || 'Attachment',
    path: trainingRecordsFileReference(storagePath),
    uploadedAt: new Date().toISOString(),
  };

  return persistAttachments(contractorId, [...existing, entry]);
}

export async function deleteContractorAttachment(contractorId, attachmentId) {
  const existing = await loadContractorAttachments(contractorId);
  const target = existing.find((item) => item.id === attachmentId);
  if (!target) {
    return existing;
  }

  if (target.path) {
    const { error } = await supabase.storage.from(TRAINING_RECORDS_BUCKET).remove([target.path]);
    if (error) {
      console.warn('Could not delete attachment file from storage:', error.message);
    }
  }

  return persistAttachments(
    contractorId,
    existing.filter((item) => item.id !== attachmentId),
  );
}

export async function openContractorAttachment(fileRef) {
  return openTrainingRecordsFile(fileRef);
}

export function isAllowedContractorAttachmentFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
