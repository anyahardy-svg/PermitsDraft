-- Migration: Assign sites to correct business units

-- ============================================================================
-- WINSTONE AGGREGATES (11 sites)
-- ============================================================================
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
WHERE name IN (
  'Amisfield Quarry',
  'Belmont Quarry',
  'Flat Top Quarry',
  'Hunua Quarry',
  'Otaika Quarry',
  'Otaki Quarry',
  'Petone Quarry',
  'Pukekawa Quarry',
  'Tamahere Quarry',
  'Wheatsheaf Quarry',
  'Whitehall Quarry'
);

-- ============================================================================
-- RANGITIKEI AGGREGATES (2 sites)
-- ============================================================================
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Rangitikei Aggregates')
WHERE name IN (
  'Rangitikei Aggregates - Bull/Campion',
  'Rangitikei Aggregates - Kakariki'
);

-- ============================================================================
-- ROYS HILL AGGREGATES (1 site)
-- ============================================================================
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Roys Hill Aggregates')
WHERE name = 'Roys Hill Aggregates';

-- ============================================================================
-- RODNEY AGGREGATES LTD (1 site)
-- ============================================================================
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE name = 'Rodney Aggregates Ltd')
WHERE name = 'Whangaripo Quarry';

-- ============================================================================
-- THE URBAN QUARRY (3 sites)
-- ============================================================================
UPDATE sites SET business_unit_id = (SELECT id FROM business_units WHERE name = 'The Urban Quarry')
WHERE name IN (
  'TUQ - Henderson',
  'TUQ - Onehunga',
  'TUQ - Tamahere'
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT name, business_unit_id FROM sites ORDER BY name;
-- SELECT COUNT(*) as total_sites_assigned FROM sites WHERE business_unit_id IS NOT NULL;
