export const SITE_CSV_HEADERS = [
  'Site Name',
  'Location',
  'Business Unit',
  'Kiosk Subdomain',
  'Site Manager',
  'Notifications',
];

function escapeCsvValue(value) {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename, headers, rows) {
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

export function buildSiteExportRows({ sites = [], businessUnits = [], adminUsers = [] }) {
  return sites.map((site) => {
    const businessUnitName = businessUnits.find(
      (unit) => unit.id === (site.businessUnitId || site.business_unit_id)
    )?.name || '';

    const manager = adminUsers.find(
      (admin) => admin.id === (site.defaultNotificationManagerId || site.default_notification_manager_id)
    );

    const notificationsEnabled = site.sendDefaultSignInNotifications !== false
      && site.send_default_sign_in_notifications !== false;

    return [
      site.name || '',
      site.location || '',
      businessUnitName,
      site.kioskSubdomain || site.kiosk_subdomain || '',
      manager?.email || manager?.name || '',
      notificationsEnabled ? 'On' : 'Off',
    ];
  });
}

export function exportSitesCsv({ sites = [], businessUnits = [], adminUsers = [] }) {
  if (!sites.length) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('No sites to export. Adjust your filters or add sites first.');
    }
    return false;
  }

  const dateStamp = new Date().toISOString().slice(0, 10);
  return downloadCsv(
    `sites-${dateStamp}.csv`,
    SITE_CSV_HEADERS,
    buildSiteExportRows({ sites, businessUnits, adminUsers })
  );
}
