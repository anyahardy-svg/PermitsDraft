/**
 * Training record rows via Edge Function (service role) after anon lock-down on `training_records`.
 */

import { supabase } from '../supabaseClient';
import { getRequestingAdminId, isAdminSessionActive } from './contractorData';

export { getRequestingAdminId, isAdminSessionActive };

export function preferTrainingRecordsEdgeForAdmin() {
  return Boolean(getRequestingAdminId() || isAdminSessionActive());
}

async function invokeTrainingRecordsData(payload) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase client is not configured' } };
  }

  const { data, error } = await supabase.functions.invoke('training-records-data', {
    body: payload,
  });

  if (error) {
    let responseBody = data;
    if (!responseBody && error?.context && typeof error.context.json === 'function') {
      try {
        responseBody = await error.context.json();
      } catch (parseError) {
        console.warn('Could not parse training-records-data error body:', parseError);
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
  const { data: result, error: invokeError } = await invokeTrainingRecordsData(payload);
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
    { action: 'listByCompany', companyId, requestingAdminId: adminId },
    'Failed to load training records',
  );
  return result.data || [];
}

export async function trainingRecordsDataListByContractor(contractorId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listByContractor', contractorId, requestingAdminId: adminId },
    'Failed to load training records',
  );
  return result.data || [];
}

export async function trainingRecordsDataGet(recordId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'get', recordId, requestingAdminId: adminId },
    'Failed to load training record',
  );
  return result.data || null;
}

export async function trainingRecordsDataUpdate(recordId, updates, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'update', recordId, updates, requestingAdminId: adminId },
    'Failed to update training record',
  );
  return result.data || null;
}

export async function trainingRecordsDataDelete(recordId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  await invokeOrThrow(
    { action: 'delete', recordId, requestingAdminId: adminId },
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
      action: 'approve',
      recordId,
      approvedByName,
      businessUnitName,
      requestingAdminId: adminId,
    },
    'Failed to approve training record',
  );
  return result.data || null;
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
      action: 'approveAllPending',
      companyId,
      approvedByName,
      businessUnitName,
      requestingAdminId: adminId,
    },
    'Failed to approve training records',
  );
  return result;
}
