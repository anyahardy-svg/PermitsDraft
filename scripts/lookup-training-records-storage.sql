-- Lookup training-records storage folders by contractor/company name
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)
--
-- Storage paths (from June 2026 onwards):
--   {company_name}/{contractor_name}/{training_type}/{timestamp}.ext
--   {company_name}/matrices/{timestamp}.ext
-- Older uploads may still use contractor/company UUID folders.

SELECT
  tr.id AS record_id,
  c.name AS contractor_name,
  co.name AS company_name,
  tr.training_type,
  tr.file_name,
  tr.status,
  tr.uploaded_at,
  tr.file_url
FROM training_records tr
JOIN contractors c ON c.id = tr.contractor_id
JOIN companies co ON co.id = c.company_id
ORDER BY co.name, c.name, tr.uploaded_at DESC;
