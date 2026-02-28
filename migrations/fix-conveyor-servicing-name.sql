-- Migration: Fix Conveyor Service Name
-- Purpose: Update "Conveyor Belt Servicing" to "Conveyor Servicing" to match contractor data
-- Date: February 28, 2026

UPDATE services
SET name = 'Conveyor Servicing'
WHERE name = 'Conveyor Belt Servicing'
AND business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates');

-- Verify the change
-- SELECT name FROM services WHERE business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates') AND name LIKE '%Conveyor%';
