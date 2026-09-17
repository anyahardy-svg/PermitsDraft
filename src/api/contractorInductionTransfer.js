/**
 * Client helpers for transferring contractor induction records between contractor rows.
 */

async function postTransferApi(payload) {
  const response = await fetch('/api/transfer-contractor-inductions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

export async function searchContractorsWithCompletedInductions({
  email,
  name,
  phone,
  excludeContractorId = null,
} = {}) {
  const data = await postTransferApi({
    action: 'search',
    email,
    name,
    phone,
    excludeContractorId,
  });

  return data.candidates || [];
}

export async function getContractorInductionTransferPreview(sourceContractorId) {
  const data = await postTransferApi({
    action: 'preview',
    sourceContractorId,
  });

  return data.preview;
}

export async function transferContractorInductions({
  sourceContractorId,
  targetContractorId,
  mergeProfileFields = true,
}) {
  return postTransferApi({
    action: 'transfer',
    sourceContractorId,
    targetContractorId,
    mergeProfileFields,
  });
}
