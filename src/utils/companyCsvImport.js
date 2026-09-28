/**
 * Column detection for company CSV import/export.
 * Approver email columns must not be treated as the company email column.
 */

export function isApproverEmailHeader(header) {
  const h = String(header || '').toLowerCase();
  return (
    h === 'assigned_manager_email'
    || h === 'operational_approver_email'
    || h === 'assigned_hs_email'
    || h === 'regional_hs_email'
    || (h.includes('assigned') && h.includes('manager') && h.includes('email'))
    || (h.includes('operational') && h.includes('approver') && h.includes('email'))
    || (h.includes('assigned') && (h.includes('hs') || h.includes('h&s')) && h.includes('email'))
    || (h.includes('regional') && (h.includes('hs') || h.includes('h&s')) && h.includes('email'))
  );
}

export function findCompanyEmailColumnIndex(headerValues) {
  const headers = (headerValues || []).map((value) => String(value || '').toLowerCase());

  const explicitIdx = headers.findIndex((header) => (
    header === 'email'
    || header === 'company_email'
    || header === 'company email'
  ));
  if (explicitIdx >= 0) {
    return explicitIdx;
  }

  return headers.findIndex((header) => (
    header.includes('email')
    && !header.includes('contact')
    && !isApproverEmailHeader(header)
  ));
}

export function findAssignedManagerEmailColumnIndex(headerValues) {
  const headers = (headerValues || []).map((value) => String(value || '').toLowerCase());
  return headers.findIndex((header) => (
    header === 'assigned_manager_email'
    || header === 'assigned_manager-email'
    || header === 'operational_approver_email'
    || (header.includes('assigned') && header.includes('manager') && header.includes('email'))
    || (header.includes('operational') && header.includes('approver') && header.includes('email'))
  ));
}

export function findCompanyNameColumnIndex(headerValues) {
  const headers = (headerValues || []).map((value) => String(value || '').toLowerCase());
  const explicitIdx = headers.findIndex((header) => (
    header === 'name'
    || header === 'company_name'
    || header === 'company name'
  ));
  if (explicitIdx >= 0) {
    return explicitIdx;
  }
  return headers.findIndex((header) => (
    header.includes('name')
    && !header.includes('contact')
    && !header.includes('surname')
    && !header.includes('business')
  ));
}

/** CSV has only company name + contact_email (safe partial restore). */
export function isContactEmailOnlyCompanyImport(headerValues) {
  const headers = (headerValues || [])
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
  if (!headers.length || !headers.includes('contact_email')) {
    return false;
  }
  const allowed = new Set(['name', 'company_name', 'company name', 'contact_email']);
  return headers.every((header) => allowed.has(header));
}

export function normalizeImportEmailCell(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function findAssignedHsEmailColumnIndex(headerValues) {
  const headers = (headerValues || []).map((value) => String(value || '').toLowerCase());
  return headers.findIndex((header) => (
    header === 'assigned_hs_email'
    || header === 'assigned_hs-email'
    || header === 'assigned_hs_manager'
    || header === 'regional_hs_email'
    || (header.includes('assigned') && (header.includes('hs') || header.includes('h&s')) && header.includes('email'))
    || (header.includes('assigned') && (header.includes('hs') || header.includes('h&s')) && header.includes('manager'))
    || (header.includes('regional') && (header.includes('hs') || header.includes('h&s')) && header.includes('email'))
  ));
}
