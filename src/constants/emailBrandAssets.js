/**
 * Branding assets hosted in Supabase Storage (email-assets bucket).
 */

export const EMAIL_ASSETS_BUCKET = 'email-assets';

export const PARTNER_LOGOS = [
  { name: 'Firth Industries', file: 'Firth-logo.jpg' },
  { name: 'Winstone Aggregates', file: 'WA-logo.jpg' },
  { name: 'Rodney Aggregates Ltd', file: 'RAL-logo.jpg' },
  { name: 'Rangitikei Aggregates', file: 'RASL-logo.jpg' },
  { name: 'The Urban Quarry', file: 'TUQ-logo.jpg' },
];

export const EMAIL_LOGO_PATHS = {
  firth: 'Firth-logo.jpg',
  winstone: 'WA-logo.jpg',
  rodney: 'RAL-logo.jpg',
  rangitikei: 'RASL-logo.jpg',
  urbanQuarry: 'TUQ-logo.jpg',
};

export const CONTRACTOR_HQ_CONTACT = {
  addressLine1: '810 Great South Road',
  addressLine2: 'Penrose, Auckland 1061',
  email: 'support@contractorhq.co.nz',
  contactName: 'Anya Hardy',
  phone: '021 223 8677',
  phoneTel: '0212238677',
};

/**
 * Build a public Supabase Storage URL for an email asset path.
 * @param {string} storagePath - Path inside the email-assets bucket
 * @param {string} [supabaseUrl] - Defaults to VITE_SUPABASE_URL
 * @returns {string|null}
 */
export function getEmailAssetPublicUrl(storagePath, supabaseUrl = process.env.VITE_SUPABASE_URL) {
  if (!storagePath || !supabaseUrl) {
    return null;
  }

  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const normalizedPath = storagePath.replace(/^\//, '');
  return `${baseUrl}/storage/v1/object/public/${EMAIL_ASSETS_BUCKET}/${normalizedPath}`;
}

export function getEmailLogoUrl(brandKey, supabaseUrl = process.env.VITE_SUPABASE_URL) {
  const storagePath = EMAIL_LOGO_PATHS[brandKey];
  return storagePath ? getEmailAssetPublicUrl(storagePath, supabaseUrl) : null;
}

export function getPartnerLogoUrls(supabaseUrl = process.env.VITE_SUPABASE_URL) {
  return PARTNER_LOGOS.map((logo) => ({
    ...logo,
    url: getEmailAssetPublicUrl(logo.file, supabaseUrl),
  })).filter((logo) => logo.url);
}
