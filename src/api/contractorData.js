/**
 * Contractor roster access via Edge Function (service role).
 * Replaces direct anon/authenticated PostgREST reads on `contractors` after RLS lock-down.
 */

import { supabase } from '../supabaseClient';

export function getRequestingAdminId() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem('adminData');
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

export function isAdminSessionActive() {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const session = localStorage.getItem('adminSession');
    const adminData = localStorage.getItem('adminData');
    if (!session || !adminData) {
      return false;
    }
    const parsed = JSON.parse(session);
    return Boolean(parsed?.active);
  } catch {
    return false;
  }
}

async function invokeContractorData(payload) {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase client is not configured' } };
  }

  const { data, error } = await supabase.functions.invoke('contractor-data', { body: payload });

  if (error) {
    let responseBody = data;
    if (!responseBody && error?.context && typeof error.context.json === 'function') {
      try {
        responseBody = await error.context.json();
      } catch (parseError) {
        console.warn('Could not parse contractor-data error body:', parseError);
      }
    }
    if (responseBody && typeof responseBody === 'object') {
      return { data: responseBody, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

export async function contractorDataListAll(requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'listAll',
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractors');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractors');
  }
  return result.data || [];
}

export async function contractorDataListBySite(siteId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'listBySite',
    siteId,
    requestingAdminId: adminId || undefined,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractors for site');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractors for site');
  }
  return result.data || [];
}

export async function contractorDataListForKiosk(siteId) {
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'listForKiosk',
    siteId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load kiosk contractors');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load kiosk contractors');
  }
  return result.data || [];
}

export async function contractorDataSearchForKiosk(siteId, searchText, limit = 40) {
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'searchForKiosk',
    siteId,
    searchText,
    limit,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to search contractors');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to search contractors');
  }
  return result.data || [];
}

export async function contractorDataListByCompany(companyId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'listByCompany',
    companyId,
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractors for company');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractors for company');
  }
  return result.data || [];
}

export async function contractorDataGetForKiosk(contractorId) {
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'getForKiosk',
    contractorId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractor');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractor');
  }
  return result.data || null;
}

export async function contractorDataGet(contractorId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'get',
    contractorId,
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractor');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractor');
  }
  return result.data || null;
}

export async function contractorDataCreate(contractorData, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'create',
    contractorData,
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to create contractor');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to create contractor');
  }
  return result.data || null;
}

export async function contractorDataUpdate(contractorId, updates, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'update',
    contractorId,
    updates,
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to update contractor');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to update contractor');
  }
  return result.data || null;
}

export async function contractorDataDelete(contractorId, requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'delete',
    contractorId,
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to delete contractor');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to delete contractor');
  }
  return true;
}

export async function contractorDataListExpiredInductions(requestingAdminId) {
  const adminId = requestingAdminId || getRequestingAdminId();
  const { data: result, error: invokeError } = await invokeContractorData({
    action: 'listExpiredInductions',
    requestingAdminId: adminId,
  });

  if (invokeError) {
    throw new Error(invokeError.message || 'Failed to load contractors');
  }
  if (!result?.success) {
    throw new Error(result?.error || 'Failed to load contractors');
  }
  return result.data || [];
}
