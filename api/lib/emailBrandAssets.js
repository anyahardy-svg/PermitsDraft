const EMAIL_ASSETS_BUCKET = 'email-assets';
const DEFAULT_SUPABASE_URL = 'https://nszkuoxibzcbiqaqdfml.supabase.co';

const PARTNER_LOGOS = [
  { name: 'Firth Industries', file: 'Firth-logo.jpg' },
  { name: 'Winstone Aggregates', file: 'WA-logo.jpg' },
  { name: 'Rodney Aggregates Ltd', file: 'RAL-logo.jpg' },
  { name: 'Rangitikei Aggregates', file: 'RASL-logo.jpg' },
  { name: 'The Urban Quarry', file: 'TUQ-logo.jpg' },
];

const CONTRACTOR_HQ_CONTACT = {
  addressLine1: '810 Great South Road',
  addressLine2: 'Penrose, Auckland 1061',
  email: 'support@contractorhq.co.nz',
  contactName: 'Anya Hardy',
  phone: '021 223 8677',
  phoneTel: '0212238677',
};

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  ).replace(/\/$/, '');
}

function getEmailAssetPublicUrl(storagePath, supabaseUrl = getSupabaseUrl()) {
  if (!storagePath || !supabaseUrl) {
    return null;
  }

  const normalizedPath = storagePath.replace(/^\//, '');
  return `${supabaseUrl}/storage/v1/object/public/${EMAIL_ASSETS_BUCKET}/${normalizedPath}`;
}

function getPartnerLogoUrls(supabaseUrl = getSupabaseUrl()) {
  return PARTNER_LOGOS.map((logo) => ({
    ...logo,
    url: getEmailAssetPublicUrl(logo.file, supabaseUrl),
  })).filter((logo) => logo.url);
}

module.exports = {
  EMAIL_ASSETS_BUCKET,
  PARTNER_LOGOS,
  CONTRACTOR_HQ_CONTACT,
  getSupabaseUrl,
  getEmailAssetPublicUrl,
  getPartnerLogoUrls,
};
