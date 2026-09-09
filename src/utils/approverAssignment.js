export function normalizeApproverEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function resolveAdminUserIdFromList(adminUsers, email) {
  const normalized = normalizeApproverEmail(email);
  if (!normalized) {
    return null;
  }

  const match = (adminUsers || []).find(
    (user) => normalizeApproverEmail(user.email) === normalized
  );
  return match?.id || null;
}

export function getAdminUserEmailById(adminUsers, adminUserId) {
  if (!adminUserId) {
    return '';
  }

  const match = (adminUsers || []).find((user) => user.id === adminUserId);
  return match?.email || '';
}

export function formatAdminUserOptionLabel(adminUser) {
  if (!adminUser) {
    return '';
  }
  return `${adminUser.name} (${adminUser.email})`;
}
