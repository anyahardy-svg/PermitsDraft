/**
 * Training record rows via `company-data` Edge (service role) after anon lock-down on `training_records`.
 */

import { supabase } from '../supabaseClient';
import { getRequestingAdminId, isAdminSessionActive } from './contractorData';

export { getRequestingAdminId, isAdminSessionActive };

export function preferTrainingRecordsEdgeForAdmin() {
  return Boolean(getRequestingAdminId() || isAdminSessionActive());
}

async function invokeCompanyData(payload) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase client is not configured' } };
  }

  const { data, error } = await supabase.functions.invoke('company-data', { body: payload });

  if (error) {
    let responseBody = data;
    if (!responseBody && error?.context && typeof error.context.json === 'function') {
      try {
        responseBody = await error.context.json();
      } catch (parseError) {
        console.warn('Could not parse company-data error body:', parseError);
      }
    }
    if (responseBody && typeof responseBody === 'object') {
      return { data: responseBody, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

async function invokeOrThrow(payload, fallbackMessage) {
  const { data: result, error: invokeError } = await invokeCompanyData(payload);
  if (invokeError) {
    throw new Error(invokeError.message || fallbackMessage);
  }
  if (!result?.success) {
    throw new Error(result?.error || fallbackMessage);
  }
  return result;
}

export async function trainingRecordsDataListByCompany(companyId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listTrainingRecordsByCompany', companyId, requestingAdminId: adminId },
    'Failed to load training records',
  );
  return result.data || [];
}

export async function trainingRecordsDataListByContractor(contractorId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listTrainingRecordsByContractor', contractorId, requestingAdminId: adminId },
    'Failed to load training records',
  );
  return result.data || [];
}

export async function trainingRecordsDataGet(recordId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'getTrainingRecord', recordId, requestingAdminId: adminId },
    'Failed to load training record',
  );
  return result.data || null;
}

export async function trainingRecordsDataUpdate(recordId, updates, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'updateTrainingRecord', recordId, updates, requestingAdminId: adminId },
    'Failed to update training record',
  );
  return result.data || null;
}

export async function trainingRecordsDataDelete(recordId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  await invokeOrThrow(
    { action: 'deleteTrainingRecord', recordId, requestingAdminId: adminId },
    'Failed to delete training record',
  );
}

export async function trainingRecordsDataApprove(
  recordId,
  approvedByName,
  businessUnitName,
  requestingAdminId,
) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    {
      action: 'approveTrainingRecord',
      recordId,
      approvedByName,
      businessUnitName,
      requestingAdminId: adminId,
    },
    'Failed to approve training record',
  );
  return result.data || null;
}

export async function trainingRecordsDataCreateSignedUrl(
  storagePath,
  expiresInSeconds = 3600,
  requestingAdminId,
) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    {
      action: 'createTrainingRecordsSignedUrl',
      storagePath,
      expiresInSeconds,
      requestingAdminId: adminId,
    },
    'Failed to create download link',
  );
  return result.signedUrl || result.data?.signedUrl || null;
}

export async function trainingRecordsDataApproveAllPending(
  companyId,
  approvedByName,
  businessUnitName = '',
  requestingAdminId,
) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    {
      action: 'approveAllPendingTrainingRecords',
      companyId,
      approvedByName,
      businessUnitName,
      requestingAdminId: adminId,
    },
    'Failed to approve training records',
  );
  return result;
}
