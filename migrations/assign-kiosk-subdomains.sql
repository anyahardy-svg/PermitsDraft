-- Migration: Assign kiosk subdomains to all sites
-- Pattern: [PREFIX]-[site-name]-kiosk
-- Prefixes: wa (Winstone), RAL (Rangitikei), RA (Roys Hill), RASL (Rodney), TUQ (The Urban Quarry)

-- ============================================================================
-- WINSTONE AGGREGATES (wa prefix)
-- ============================================================================
UPDATE sites SET kiosk_subdomain = 'wa-amisfield-quarry-kiosk' WHERE name = 'Amisfield Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-belmont-quarry-kiosk' WHERE name = 'Belmont Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-flat-top-quarry-kiosk' WHERE name = 'Flat Top Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-hunua-quarry-kiosk' WHERE name = 'Hunua Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-otaika-quarry-kiosk' WHERE name = 'Otaika Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-otaki-quarry-kiosk' WHERE name = 'Otaki Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-petone-quarry-kiosk' WHERE name = 'Petone Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-pukekawa-quarry-kiosk' WHERE name = 'Pukekawa Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-tamahere-quarry-kiosk' WHERE name = 'Tamahere Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-wheatsheaf-quarry-kiosk' WHERE name = 'Wheatsheaf Quarry';
UPDATE sites SET kiosk_subdomain = 'wa-whitehall-quarry-kiosk' WHERE name = 'Whitehall Quarry';

-- ============================================================================
-- RANGITIKEI AGGREGATES (RAL prefix)
-- ============================================================================
UPDATE sites SET kiosk_subdomain = 'ral-bulls-campion-kiosk' WHERE name = 'Bulls Quarry/Campion Rd';
UPDATE sites SET kiosk_subdomain = 'ral-kakariki-kiosk' WHERE name = 'Kakariki Quarry';

-- ============================================================================
-- ROYS HILL AGGREGATES (RA prefix)
-- ============================================================================
UPDATE sites SET kiosk_subdomain = 'ra-roys-hill-aggregates-kiosk' WHERE name = 'Roys Hill Aggregates';

-- ============================================================================
-- RODNEY AGGREGATES LTD (RASL prefix)
-- ============================================================================
UPDATE sites SET kiosk_subdomain = 'rasl-whangaripo-quarry-kiosk' WHERE name = 'Whangaripo Quarry';

-- ============================================================================
-- THE URBAN QUARRY (TUQ prefix)
-- ============================================================================
UPDATE sites SET kiosk_subdomain = 'tuq-henderson-kiosk' WHERE name = 'TUQ - Henderson';
UPDATE sites SET kiosk_subdomain = 'tuq-onehunga-kiosk' WHERE name = 'TUQ - Onehunga';
UPDATE sites SET kiosk_subdomain = 'tuq-tamahere-kiosk' WHERE name = 'TUQ - Tamahere';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT name, business_unit_id, kiosk_subdomain FROM sites ORDER BY name;
