-- =============================================================================
-- VERIFY after running repair-from-companies-APPLY.sql
-- =============================================================================

-- Key users (expect status = OK for all four)
SELECT
  u.email,
  u.raw_user_meta_data->>'name' AS auth_name,
  co.name AS auth_company,
  c.name AS contractor_name,
  co_c.name AS contractor_company,
  CASE
    WHEN lower(u.email) = 'angie@nzelectricalsolutions.nz'
      AND co_c.id = '89ab75a6-7a99-42f6-91db-329af3577426' THEN 'OK'
    WHEN lower(u.email) = 'angela.g@nes.nz'
      AND co_c.id = '89ab75a6-7a99-42f6-91db-329af3577426' THEN 'OK'
    WHEN lower(u.email) = 'conrad.klaasen@winstoneaggregates.co.nz'
      AND co_c.id = 'faf93bef-1f88-4920-9b0d-bb72ccf8b7c7' THEN 'OK'
    WHEN lower(u.email) = 'graze.engineering@xtra.co.nz'
      AND co_c.id = 'df48cfb1-c490-4b02-bea3-2cc568186eb2' THEN 'OK'
    ELSE 'CHECK'
  END AS status
FROM auth.users u
LEFT JOIN contractors c ON lower(c.email) = lower(u.email)
LEFT JOIN companies co ON co.id = (u.raw_user_meta_data->>'company_id')::uuid
LEFT JOIN companies co_c ON co_c.id = c.company_id
WHERE lower(u.email) IN (
  'angie@nzelectricalsolutions.nz',
  'angela.g@nes.nz',
  'conrad.klaasen@winstoneaggregates.co.nz',
  'graze.engineering@xtra.co.nz'
)
ORDER BY u.email;


-- Wrong-person + broken links (expect 0 rows)
SELECT
  u.email AS auth_email,
  u.raw_user_meta_data->>'name' AS meta_name,
  c.name AS linked_name,
  c.email AS linked_email,
  co.name AS company_name,
  'WRONG PERSON' AS issue
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
LEFT JOIN companies co ON co.id = c.company_id
WHERE lower(c.email) IS DISTINCT FROM lower(u.email)

UNION ALL

SELECT u.email, u.raw_user_meta_data->>'name', NULL, NULL, NULL, 'BROKEN contractor_id'
FROM auth.users u
WHERE u.raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  )

ORDER BY issue, auth_email;
