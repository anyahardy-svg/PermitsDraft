-- Backfill per-site contractor induction records from completed site-specific induction progress.
-- Safe to re-run: skips contractors/sites that already have a contractor_inductions row.
--
-- Why: kiosk sign-in now uses contractor_inductions for per-site status. Contractors who
-- completed induction at one site (e.g. Henderson) should not appear inducted at another
-- site (e.g. Albany) unless they have a matching per-site record.

INSERT INTO contractor_inductions (
  contractor_id,
  site_id,
  business_unit_id,
  inducted_at,
  expires_at,
  status
)
SELECT
  source.contractor_id,
  source.site_id,
  source.business_unit_id,
  source.inducted_at,
  source.expires_at,
  source.status
FROM (
  SELECT
    cip.contractor_id,
    i.site_id,
    s.business_unit_id,
    MAX(cip.completed_at) AS inducted_at,
    COALESCE(
      c.induction_expiry::timestamptz,
      MAX(cip.completed_at) + INTERVAL '1 year'
    ) AS expires_at,
    CASE
      WHEN COALESCE(c.induction_expiry::timestamptz, MAX(cip.completed_at) + INTERVAL '1 year') < NOW()
        THEN 'expired'
      ELSE 'completed'
    END AS status
  FROM contractor_induction_progress cip
  JOIN inductions i ON i.id = cip.induction_id
  JOIN contractors c ON c.id = cip.contractor_id
  JOIN sites s ON s.id = i.site_id
  WHERE cip.status = 'completed'
    AND i.site_id IS NOT NULL
  GROUP BY cip.contractor_id, i.site_id, s.business_unit_id, c.induction_expiry
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM contractor_inductions existing
  WHERE existing.contractor_id = source.contractor_id
    AND existing.site_id = source.site_id
);

-- Verify a contractor (replace name filter as needed):
-- SELECT c.name, ci.site_id, s.name AS site_name, ci.expires_at, ci.status
-- FROM contractor_inductions ci
-- JOIN contractors c ON c.id = ci.contractor_id
-- JOIN sites s ON s.id = ci.site_id
-- WHERE c.name ILIKE '%Laura McKay%';
