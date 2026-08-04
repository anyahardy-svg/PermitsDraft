-- Allow kiosk and standalone induction flows to read services for business units.
-- Matches the open read policy used for business_units in phase-0.5-multi-unit-kiosk.sql.

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to services" ON services;

CREATE POLICY "Allow all access to services" ON services FOR ALL USING (true);
