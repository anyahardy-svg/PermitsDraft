/**
 * Email branding assets hosted in Supabase Storage (email-assets bucket).
 *
 * Upload or refresh assets with:
 *   node scripts/upload-email-logos.js
 */

export const EMAIL_ASSETS_BUCKET = 'email-assets';

export const EMAIL_LOGO_PATHS = {
  firth: 'logos/firth-logo.png',
  winstone: 'logos/winstone-logo.svg',
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
