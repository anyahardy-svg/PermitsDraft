export function normalizeContractorAttachments(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .filter((item) => item && typeof item === 'object' && item.path)
    .map((item) => ({
      id: String(item.id || item.path),
      label: item.label ? String(item.label) : '',
      name: item.name ? String(item.name) : 'Attachment',
      path: String(item.path),
      uploadedAt: item.uploadedAt || item.uploaded_at || null,
    }));
}

export function countCompanyContractorAttachments(groups) {
  if (!Array.isArray(groups)) {
    return 0;
  }
  return groups.reduce((sum, group) => sum + (group.attachments?.length || 0), 0);
}
