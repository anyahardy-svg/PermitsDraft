/**
 * Sign-Ins API — kiosk and manager flows use Vercel service-role routes (no direct sign_ins PostgREST).
 */

import { getRequestingAdminId } from './contractorData';

function getKioskClientContext() {
  if (typeof window === 'undefined') {
    return { kioskSubdomain: null, hostname: null };
  }
  const hostname = window.location.hostname;
  const relaxed = hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('vercel.app');
  const kioskSubdomain = relaxed ? null : (hostname.split('.')[0] || null);
  return { kioskSubdomain, hostname };
}

async function kioskSignInsRequest(action, payload) {
  const { kioskSubdomain, hostname } = getKioskClientContext();
  const response = await fetch('/api/kiosk-sign-ins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      kioskSubdomain,
      hostname,
      ...payload,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Kiosk sign-in API failed (${response.status})`);
  }
  return body;
}

async function checkInContractorViaApi(payload) {
  const { kioskSubdomain, hostname } = getKioskClientContext();
  const response = await fetch('/api/kiosk-check-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      kioskSubdomain,
      hostname,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || 'Check-in failed');
  }
  return body;
}

function mapKioskCheckInApiResult(apiResult) {
  const expiryDate = apiResult.expiryDate || null;
  return {
    success: true,
    data: apiResult.data,
    inducted: apiResult.inducted,
    isExpired: apiResult.isExpired,
    expiryDate,
    message: apiResult.isExpired
      ? '⚠️ INDUCTION EXPIRED - renewal required before work'
      : apiResult.inducted
        ? 'Checked in successfully'
        : '⚠️ NOT INDUCTED - induction required before work',
  };
}

export async function checkInContractor(
  contractorId,
  siteId,
  businessUnitId,
  flagData = null,
  rtData = null,
  visitingPersonName = null,
  contractorPhone = null,
  visitingPersonEmail = null,
) {
  try {
    if (!contractorId || !siteId) {
      return { success: false, error: 'Contractor and site are required' };
    }

    const apiResult = await checkInContractorViaApi({
      contractorId,
      siteId,
      businessUnitId,
      flagData,
      rtData,
      visitingPersonName,
      visitingPersonEmail,
      contractorPhone,
    });

    if (apiResult?.success) {
      return mapKioskCheckInApiResult(apiResult);
    }

    return { success: false, error: apiResult?.error || 'Check-in failed' };
  } catch (error) {
    console.error('❌ Check-in error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function checkInVisitor(
  visitorName,
  company,
  siteId,
  businessUnitId,
  phone,
  visitingPersonName = null,
  visitingPersonEmail = null,
) {
  try {
    const result = await kioskSignInsRequest('checkInVisitor', {
      siteId,
      businessUnitId,
      visitorName,
      visitorCompany: company,
      phone,
      visitingPersonName,
      visitingPersonEmail,
    });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Visitor check-in error:', error);
    return { success: false, error: error.message };
  }
}

export async function checkOut(signInId, siteId, flagReturnData = null, rtReturnData = null) {
  try {
    if (!signInId || !siteId) {
      return { success: false, error: 'Sign-in and site are required' };
    }

    const result = await kioskSignInsRequest('checkOut', {
      siteId,
      signInId,
      flagReturnData,
      rtReturnData,
    });

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Check-out error:', error);
    return { success: false, error: error.message };
  }
}

export async function getSignedInPeople(siteId) {
  try {
    if (!siteId) {
      return { success: true, data: [] };
    }

    const result = await kioskSignInsRequest('listOnSite', { siteId });
    return { success: true, data: result.data || [] };
  } catch (error) {
    console.error('Get signed-in error:', error);
    return { success: false, error: error.message };
  }
}

function enrichSignInRecord(record) {
  const checkInTime = new Date(record.check_in_time);
  const checkOutTime = record.check_out_time ? new Date(record.check_out_time) : new Date();
  const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);
  const isContractor = Boolean(record.contractor_id);

  return {
    ...record,
    personType: isContractor ? 'Contractor' : 'Visitor',
    displayName: isContractor
      ? record.contractor_name || 'Unknown contractor'
      : record.visitor_name || 'Unknown visitor',
    displayCompany: isContractor ? record.contractor_company || '' : record.visitor_company || '',
    duration_minutes: durationMinutes,
  };
}

export async function getSignInHistory(siteId, startDate, endDate) {
  return searchSignInHistory(siteId, { startDate, endDate });
}

export async function searchSignInHistory(siteId, filters = {}) {
  try {
    if (!siteId) {
      return { success: true, data: [] };
    }

    const requestingAdminId = getRequestingAdminId();
    const response = await fetch('/api/manager-sign-in-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestingAdminId,
        siteId,
        startDate: filters.startDate,
        endDate: filters.endDate,
        personQuery: filters.personQuery,
        companyQuery: filters.companyQuery,
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `History search failed (${response.status})`);
    }

    return {
      success: true,
      data: (body.data || []).map(enrichSignInRecord),
    };
  } catch (error) {
    console.error('Search sign-in history error:', error);
    return { success: false, error: error.message };
  }
}

export async function getContractorHours(contractorId) {
  console.warn('getContractorHours is not available without a dedicated admin API');
  return { success: false, error: 'Not implemented' };
}

export default {
  checkInContractor,
  checkInVisitor,
  checkOut,
  getSignedInPeople,
  getSignInHistory,
  searchSignInHistory,
  getContractorHours,
};
