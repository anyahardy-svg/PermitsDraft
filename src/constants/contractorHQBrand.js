/**
 * Contractor HQ product branding for public-facing pages.
 */

import { CONTRACTOR_HQ_CONTACT } from './emailBrandAssets';

/** Bundled logos (SVG) — resolved at build time on web. */
export const CONTRACTOR_HQ_LOGO = require('../../assets/contractorhq-logo.svg');
export const CONTRACTOR_HQ_LOGO_LIGHT = require('../../assets/contractorhq-logo-light.svg');

export { CONTRACTOR_HQ_CONTACT };

export const PUBLIC_PAGE_THEME = {
  pageBackground: '#EEF2FF',
  heroGradientWeb: 'linear-gradient(135deg, #1E3A8A 0%, #4338CA 45%, #7C3AED 100%)',
  cardBackground: '#FFFFFF',
  cardBorder: '#E2E8F0',
  accent: '#4F46E5',
  accentMuted: '#6366F1',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
};
