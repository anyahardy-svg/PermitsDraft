import {
  formatInductionExpiry,
  getOtherSiteNames,
  getSiteInductionStatus,
  isExpiringWithinDays,
  INDUCTION_EXPIRING_SOON_DAYS,
} from './siteInductionStatus';

export function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCsv(filename, headers, rows) {
  if (typeof document === 'undefined') {
    return false;
  }

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

function formatStatusLabel(status) {
  if (status === 'inducted') {
    return 'Inducted';
  }
  if (status === 'expired') {
    return 'Expired';
  }
  if (status === 'not_inducted') {
    return 'Not inducted';
  }
  return 'Not on site';
}

function filterContractorsForExport(contractors, siteId, filter) {
  return contractors.filter((contractor) => {
    const status = getSiteInductionStatus(contractor, siteId);
    if (filter === 'all_at_site') {
      return status === 'inducted' || status === 'expired' || status === 'not_inducted';
    }
    if (filter === 'inducted') {
      return status === 'inducted';
    }
    if (filter === 'expired') {
      return status === 'expired';
    }
    if (filter === 'expiring_soon') {
      return isExpiringWithinDays(contractor, siteId, INDUCTION_EXPIRING_SOON_DAYS);
    }
    return false;
  });
}

const CONTRACTOR_EXPORT_LABELS = {
  all_at_site: 'all-contractors',
  inducted: 'inducted-contractors',
  expired: 'expired-contractors',
  expiring_soon: 'due-in-30-days',
};

export function exportContractorsCsv({
  contractors,
  siteId,
  siteIdToName = {},
  siteName = 'site',
  filter = 'all_at_site',
}) {
  const rows = filterContractorsForExport(contractors, siteId, filter);

  if (rows.length === 0) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('No contractors to export for this filter.');
    }
    return false;
  }

  const headers = [
    'name',
    'email',
    'company',
    'induction_expiry',
    'status',
    'other_sites',
  ];

  const dataRows = rows.map((contractor) => {
    const status = getSiteInductionStatus(contractor, siteId);
    const otherSites = getOtherSiteNames(contractor, siteId, siteIdToName);
    return [
      contractor.name || '',
      contractor.email || '',
      contractor.company_name || contractor.companyName || '',
      formatInductionExpiry(contractor.induction_expiry || contractor.inductionExpiry),
      formatStatusLabel(status),
      otherSites.join('; '),
    ];
  });

  const safeSiteName = String(siteName).replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'site';
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeSiteName}-${CONTRACTOR_EXPORT_LABELS[filter] || 'contractors'}-${dateStamp}.csv`;

  return downloadCsv(filename, headers, dataRows);
}

function formatDateForCsv(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString('en-NZ');
}

export function exportCompaniesCsv({ companies, siteName = 'site' }) {
  if (!companies?.length) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('No companies to export.');
    }
    return false;
  }

  const headers = [
    'name',
    'accreditation_status',
    'accredited_date',
    'public_liability_expiry',
    'motor_vehicle_insurance_expiry',
    'email',
    'contact_name',
    'contact_phone',
  ];

  const dataRows = companies.map((company) => [
    company.name || '',
    company.accreditationStatusLabel || company.accreditation_status || company.accreditationStatus || '',
    formatDateForCsv(company.accreditedDate || company.accredited_date),
    formatDateForCsv(company.publicLiabilityExpiry || company.public_liability_expiry),
    formatDateForCsv(company.motorVehicleInsuranceExpiry || company.motor_vehicle_insurance_expiry),
    company.email || '',
    company.contactName || company.contact_name || '',
    company.contactPhone || company.contact_phone || '',
  ]);

  const safeSiteName = String(siteName).replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'site';
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `${safeSiteName}-companies-${dateStamp}.csv`;

  return downloadCsv(filename, headers, dataRows);
}
