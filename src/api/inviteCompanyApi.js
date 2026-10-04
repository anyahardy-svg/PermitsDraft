import { getRequestingAdminId } from './contractorData';

function parseDeadlineToIso(deadlineText) {
  const trimmed = String(deadlineText || '').trim();
  if (!trimmed) {
    return null;
  }

  const [day, month, year] = trimmed.split('/');
  if (day && month && year) {
    const parsed = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return null;
}

export async function fetchInviteCompanyApprovers(siteId) {
  if (!siteId) {
    return { approvers: [], siteName: null };
  }

  const response = await fetch('/api/invite-company-approvers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Failed to load approvers (${response.status})`);
  }

  return {
    approvers: body.approvers || [],
    siteName: body.siteName || null,
  };
}

export async function inviteNewCompany({
  companyName,
  email,
  contractor_type,
  deadline,
  siteId,
  contactName,
  assignedManagerId,
  assignedHsPersonId,
  includeAdminSession = true,
}) {
  const requestingAdminId = includeAdminSession ? getRequestingAdminId() : null;

  const response = await fetch('/api/invite-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: String(companyName || '').trim(),
      email: String(email || '').trim(),
      contractor_type: contractor_type || 'D',
      deadline: parseDeadlineToIso(deadline),
      siteId: siteId || null,
      contactName: contactName ? String(contactName).trim() : null,
      assignedManagerId: assignedManagerId || null,
      assignedHsPersonId: assignedHsPersonId || null,
      requestingAdminId: requestingAdminId || undefined,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Failed to invite company (${response.status})`);
  }

  return body;
}
