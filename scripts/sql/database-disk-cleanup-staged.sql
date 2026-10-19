-- ContractorHQ — staged disk cleanup (run sections one at a time in SQL Editor)
-- ALWAYS run scripts/sql/database-disk-diagnostics.sql first.
-- Replace retention intervals below if you need longer audit history.

-- =============================================================================
-- STEP 0 — Preview only (no deletes)
-- =============================================================================

-- Email log older than 90 days
SELECT COUNT(*) AS email_send_log_to_delete
FROM email_send_log
WHERE sent_at < now() - interval '90 days';

-- Cron run history older than 90 days
SELECT COUNT(*) AS reminder_cron_runs_to_delete
FROM reminder_cron_runs
WHERE run_at < now() - interval '90 days';

-- Expired or used approval tokens
SELECT COUNT(*) AS accreditation_tokens_to_delete
FROM accreditation_approval_tokens
WHERE used_at IS NOT NULL
   OR expires_at < now() - interval '30 days';

-- Checked-out sign-ins older than 24 months (adjust retention as needed)
SELECT COUNT(*) AS sign_ins_to_delete
FROM sign_ins
WHERE check_out_time IS NOT NULL
  AND check_out_time < now() - interval '24 months';

-- =============================================================================
-- STEP 1 — Low-risk log cleanup (recommended first after disk pressure)
-- Uncomment ONE block at a time, run, then proceed.

-- DELETE FROM email_send_log
-- WHERE sent_at < now() - interval '90 days';

-- DELETE FROM reminder_cron_runs
-- WHERE run_at < now() - interval '90 days';

-- DELETE FROM accreditation_approval_tokens
-- WHERE used_at IS NOT NULL
--    OR expires_at < now() - interval '30 days';

-- =============================================================================
-- STEP 2 — sign_ins retention (largest table for most deployments)
-- Keep at least 12–24 months for H&S audit unless legal advises otherwise.
-- Only deletes rows that are already checked out.

-- DELETE FROM sign_ins
-- WHERE check_out_time IS NOT NULL
--   AND check_out_time < now() - interval '24 months';

-- =============================================================================
-- STEP 3 — Reclaim space after large deletes
-- Requires some free disk headroom. If this errors, delete more rows or
-- temporarily increase disk size in Supabase → Project Settings → Database.

-- VACUUM (VERBOSE, ANALYZE) sign_ins;
-- VACUUM (VERBOSE, ANALYZE) email_send_log;
-- VACUUM (VERBOSE, ANALYZE) reminder_cron_runs;
-- VACUUM (VERBOSE, ANALYZE) permits;

-- =============================================================================
-- STEP 4 — Storage (run in Dashboard → Storage OR via SQL)
-- Deleting DB rows does NOT remove files in buckets: accreditations,
-- training-records, permit-attachments, suppliers, etc.
-- Use database-disk-diagnostics.sql section 8 to find large objects first.
--
-- Example: remove one object (replace bucket and path):
-- DELETE FROM storage.objects
-- WHERE bucket_id = 'permit-attachments'
--   AND name = 'path/to/file.pdf';
