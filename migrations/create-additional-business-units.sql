-- Migration: Create additional business units
-- Creates: Rangitikei Aggregates, Roys Hill Aggregates, Rodney Aggregates Ltd, The Urban Quarry

INSERT INTO business_units (name, description) VALUES 
  ('Rangitikei Aggregates', 'Rangitikei region quarry operations'),
  ('Roys Hill Aggregates', 'Roys Hill quarry operations'),
  ('Rodney Aggregates Ltd', 'Rodney region quarry operations'),
  ('The Urban Quarry', 'Urban and suburban quarry operations')
ON CONFLICT (name) DO NOTHING;

-- Verification:
-- SELECT id, name FROM business_units ORDER BY name;
