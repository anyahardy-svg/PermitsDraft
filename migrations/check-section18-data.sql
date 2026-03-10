-- Safe check: Verify the new columns exist and have data
-- This query will show if the renamed columns have data

SELECT 
  COUNT(*) as total_companies,
  SUM(CASE WHEN injury_management_exists IS NOT NULL THEN 1 ELSE 0 END) as companies_with_injury_management,
  SUM(CASE WHEN early_intervention_exists IS NOT NULL THEN 1 ELSE 0 END) as companies_with_early_intervention
FROM companies;
