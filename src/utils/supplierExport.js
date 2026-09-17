import { downloadCsv } from './managerHubExport';
import { formatPhoneForDisplay } from './contractorPhone';
import {
  getSupplierAccreditationStatusDisplay,
  resolveSupplierAccreditationDisplayStatus,
} from './supplierAccreditation';

export const SUPPLIER_CSV_HEADERS = [
  'company_name',
  'contact_email',
  'tech_contact_name',
  'contact_phone',
  'risk_classification',
  'accreditation_status',
  'status',
  'accreditation_deadline',
];

function formatDeadlineForCsv(dateString) {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

export function exportSuppliersCsv({ suppliers = [] }) {
  if (!suppliers.length) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('No suppliers to export.');
    }
    return false;
  }

  const rows = suppliers.map((supplier) => {
    const accreditationStatus = resolveSupplierAccreditationDisplayStatus(supplier);
    const statusDisplay = getSupplierAccreditationStatusDisplay(accreditationStatus);

    return [
      supplier.company_name || '',
      supplier.contact_email || '',
      supplier.tech_contact_name || '',
      supplier.contact_phone ? formatPhoneForDisplay(supplier.contact_phone) : '',
      supplier.risk_classification || '',
      statusDisplay.label || '',
      supplier.status || '',
      formatDeadlineForCsv(supplier.accreditation_deadline),
    ];
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  return downloadCsv(`suppliers-${dateStamp}.csv`, SUPPLIER_CSV_HEADERS, rows);
}
