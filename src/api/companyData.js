/**
 * Company data via Edge Function (service role) after anon lock-down on `companies`.
 */

import { supabase } from '../supabaseClient';
import { getRequestingAdminId, isAdminSessionActive } from './contractorData';

export { getRequestingAdminId, isAdminSessionActive };

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

export async function companyDataListAll(requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listAll', requestingAdminId: adminId },
    'Failed to load companies',
  );
  return result.data || [];
}

export async function companyDataListTrainingCounters(requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listTrainingCounters', requestingAdminId: adminId },
    'Failed to load company training counters',
  );
  return result.data || [];
}

export async function companyDataSearch(query, limit = 50, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'search', query, limit, requestingAdminId: adminId },
    'Failed to search companies',
  );
  return result.data || [];
}

export async function companyDataSearchForKiosk(query, limit = 50) {
  const result = await invokeOrThrow(
    { action: 'searchForKiosk', query, limit },
    'Failed to search companies',
  );
  return result.data || [];
}

export async function companyDataGet(companyId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'get', companyId, requestingAdminId: adminId },
    'Failed to load company',
  );
  return result.data || null;
}

export async function companyDataGetForKiosk(companyId) {
  const result = await invokeOrThrow(
    { action: 'getForKiosk', companyId },
    'Failed to load company',
  );
  return result.data || null;
}

export async function companyDataListNamesByIds(companyIds) {
  const result = await invokeOrThrow(
    { action: 'listNamesByIds', companyIds },
    'Failed to load company names',
  );
  return result.data || [];
}

export async function companyDataListAtSite(siteId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'listAtSite', siteId, requestingAdminId: adminId || undefined },
    'Failed to load companies for site',
  );
  return result.data || [];
}

export async function companyDataSearchNotAtSite(siteId, query, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'searchNotAtSite', siteId, query, requestingAdminId: adminId || undefined },
    'Failed to search companies',
  );
  return result.data || [];
}

export async function companyDataListPendingApprovals(adminUserId) {
  const result = await invokeOrThrow(
    { action: 'listPendingApprovals', adminUserId },
    'Failed to load pending approvals',
  );
  return result.data || { managerApprovals: [], hsApprovals: [] };
}

export async function companyDataLookupByEmail(email) {
  const result = await invokeOrThrow(
    { action: 'lookupByEmail', email },
    'Failed to lookup company by email',
  );
  return result.data || [];
}

export async function companyDataGetByName(name) {
  const result = await invokeOrThrow(
    { action: 'getByName', name },
    'Failed to lookup company by name',
  );
  return result.data || null;
}

export async function companyDataCreate(companyData, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'create', companyData, requestingAdminId: adminId },
    'Failed to create company',
  );
  return result.data || null;
}

export async function companyDataCreateForKiosk(companyData) {
  const result = await invokeOrThrow(
    { action: 'createForKiosk', companyData },
    'Failed to create company',
  );
  return result.data || null;
}

export async function companyDataUpdateAccreditation(companyId, updates, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'updateAccreditation', companyId, updates, requestingAdminId: adminId },
    'Failed to update company accreditation',
  );
  return result.data || null;
}

export async function companyDataUpdate(companyId, updates, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'update', companyId, updates, requestingAdminId: adminId },
    'Failed to update company',
  );
  return result.data || null;
}

export async function companyDataUpdateForKiosk(companyId, updates) {
  const result = await invokeOrThrow(
    { action: 'updateForKiosk', companyId, updates },
    'Failed to update company',
  );
  return result.data || null;
}

export async function companyDataDelete(companyId, options, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'delete', companyId, options, requestingAdminId: adminId },
    'Failed to delete company',
  );
  return true;
}

export async function companyDataApproveAccreditation(companyId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'approveAccreditation', companyId, requestingAdminId: adminId },
    'Failed to approve accreditation',
  );
  return result.data || null;
}

export async function companyDataRejectAccreditation(companyId, reason, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const result = await invokeOrThrow(
    { action: 'rejectAccreditation', companyId, reason, requestingAdminId: adminId },
    'Failed to reject accreditation',
  );
  return result.data || null;
}
