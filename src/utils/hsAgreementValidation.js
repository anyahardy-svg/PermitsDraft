export const HS_AGREEMENT_SECTION_LABEL = 'Section 26: Health & Safety Agreement';

export const HS_AGREEMENT_REVISION_MESSAGE =
  'Please complete and sign Section 26: Health & Safety Agreement before resubmitting.';

/** Legacy saves may set hs_agreement_accepted without hs_agreement_acknowledged. */
export function isHSAgreementAcknowledged(data = {}) {
  return Boolean(data.hs_agreement_acknowledged || data.hs_agreement_accepted);
}

/**
 * Returns an error message when the H&S agreement is incomplete, or null when signed.
 */
export function validateHSAgreementComplete(data = {}) {
  if (!data.hs_agreement_signature) {
    return `Please sign the Health & Safety Agreement in ${HS_AGREEMENT_SECTION_LABEL} before continuing.`;
  }

  if (!String(data.hs_agreement_accepted_by || '').trim()) {
    return `Please enter your name in ${HS_AGREEMENT_SECTION_LABEL} before continuing.`;
  }

  if (!isHSAgreementAcknowledged(data)) {
    return `Please acknowledge the Health & Safety Agreement in ${HS_AGREEMENT_SECTION_LABEL} before continuing.`;
  }

  return null;
}

export function isHSAgreementComplete(data = {}) {
  return validateHSAgreementComplete(data) === null;
}
