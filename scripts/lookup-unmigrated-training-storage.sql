-- Find training records still pointing at UUID storage folders
-- Run in Supabase SQL Editor

-- Records still on old UUID paths (should be empty after migration)
SELECT
  tr.id,
  co.name AS company_name,
  c.name AS contractor_name,
  tr.training_type,
  tr.file_name,
  tr.file_url,
  tr.uploaded_at
FROM training_records tr
JOIN contractors c ON c.id = tr.contractor_id
LEFT JOIN companies co ON co.id = c.company_id
WHERE tr.file_url IS NOT NULL
  AND tr.file_url ~ '/training-records/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
ORDER BY tr.uploaded_at DESC;

-- Records with no company linked (would move to unknown_company folder, not stay on UUID)
SELECT
  tr.id,
  c.name AS contractor_name,
  c.company_id,
  tr.file_name,
  tr.file_url
FROM training_records tr
JOIN contractors c ON c.id = tr.contractor_id
WHERE c.company_id IS NULL
  AND tr.file_url IS NOT NULL;
