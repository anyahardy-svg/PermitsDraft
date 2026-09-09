export async function startAccreditationApproval(companyId) {
  const response = await fetch('/api/start-accreditation-approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to start accreditation approval');
  }
  return data;
}

export async function notifyAccreditationApproved(companyId) {
  const response = await fetch('/api/notify-accreditation-approved', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send accreditation approved email');
  }
  return data;
}

export async function getAccreditationApprovalByToken(token) {
  const response = await fetch(`/api/get-accreditation-approval-by-token?token=${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Invalid approval link');
  }
  return data;
}

export async function submitAccreditationApprovalAction({
  token,
  companyId,
  stage,
  action,
  notes,
  adminUserId,
}) {
  const response = await fetch('/api/accreditation-approval-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token,
      companyId,
      stage,
      action,
      notes,
      adminUserId,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Failed to process approval action');
  }
  return data;
}
