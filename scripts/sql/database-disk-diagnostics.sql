-- ContractorHQ / PermitsDraft — database & storage disk diagnostics
-- Run in Supabase Dashboard → SQL Editor (service role / postgres role).
-- Safe to run anytime: read-only except the final optional VACUUM block.

-- =============================================================================
-- 1) Overall database size
-- =============================================================================
SELECT
  pg_size_pretty(pg_database_size(current_database())) AS database_size,
  current_database() AS database_name;

-- =============================================================================
-- 2) Largest tables (heap + indexes + TOAST)
-- =============================================================================
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
  pg_size_pretty(pg_relation_size(c.oid)) AS heap_size,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS indexes_toast_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 40;

-- =============================================================================
-- 3) Row counts for high-churn ContractorHQ tables
-- =============================================================================
SELECT 'sign_ins' AS table_name, COUNT(*) AS row_count FROM sign_ins
UNION ALL SELECT 'email_send_log', COUNT(*) FROM email_send_log
UNION ALL SELECT 'reminder_cron_runs', COUNT(*) FROM reminder_cron_runs
UNION ALL SELECT 'accreditation_approval_tokens', COUNT(*) FROM accreditation_approval_tokens
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'permits', COUNT(*) FROM permits
UNION ALL SELECT 'contractor_inductions', COUNT(*) FROM contractor_inductions
UNION ALL SELECT 'contractor_induction_progress', COUNT(*) FROM contractor_induction_progress
UNION ALL SELECT 'training_records', COUNT(*) FROM training_records
UNION ALL SELECT 'evidence_library_items', COUNT(*) FROM evidence_library_items
ORDER BY row_count DESC;

-- =============================================================================
-- 4) sign_ins — usually the fastest-growing table (every kiosk check-in)
-- =============================================================================
SELECT
  COUNT(*) AS total_sign_ins,
  COUNT(*) FILTER (WHERE check_out_time IS NOT NULL) AS checked_out,
  COUNT(*) FILTER (WHERE check_out_time IS NULL) AS still_on_site,
  MIN(check_in_time) AS oldest_check_in,
  MAX(check_in_time) AS newest_check_in
FROM sign_ins;

SELECT
  date_trunc('month', check_in_time) AS month,
  COUNT(*) AS sign_ins
FROM sign_ins
GROUP BY 1
ORDER BY 1 DESC
LIMIT 24;

-- =============================================================================
-- 5) Email & cron logs (safe cleanup candidates)
-- =============================================================================
SELECT
  email_type,
  COUNT(*) AS sends,
  MIN(sent_at) AS first_sent,
  MAX(sent_at) AS last_sent
FROM email_send_log
GROUP BY email_type
ORDER BY sends DESC;

SELECT
  COUNT(*) AS cron_run_rows,
  MIN(run_at) AS oldest_run,
  MAX(run_at) AS newest_run,
  pg_size_pretty(pg_total_relation_size('public.reminder_cron_runs'::regclass)) AS table_size
FROM reminder_cron_runs;

-- =============================================================================
-- 6) Expired / used accreditation approval tokens
-- =============================================================================
SELECT
  COUNT(*) AS total_tokens,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) AS used_tokens,
  COUNT(*) FILTER (WHERE expires_at < now() AND used_at IS NULL) AS expired_unused
FROM accreditation_approval_tokens;

-- =============================================================================
-- 7) Permits — large JSONB columns (attachments metadata, JSEA, etc.)
-- =============================================================================
SELECT
  id,
  status,
  pg_column_size(specialized_permits)
    + pg_column_size(single_hazards)
    + pg_column_size(jsea)
    + pg_column_size(sign_ons)
    + pg_column_size(COALESCE(attachments, '[]'::jsonb))
    + pg_column_size(COALESCE(permit_changes_log, ''::text)) AS approx_json_bytes,
  created_at
FROM permits
ORDER BY approx_json_bytes DESC NULLS LAST
LIMIT 20;

-- =============================================================================
-- 8) Storage buckets (files often use as much space as Postgres on Supabase)
-- =============================================================================
SELECT
  bucket_id,
  COUNT(*) AS object_count,
  pg_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0)) AS listed_metadata_size
FROM storage.objects
GROUP BY bucket_id
ORDER BY COALESCE(SUM((metadata->>'size')::bigint), 0) DESC;

-- Largest individual storage objects (top 30)
SELECT
  bucket_id,
  name,
  pg_size_pretty((metadata->>'size')::bigint) AS size,
  created_at
FROM storage.objects
ORDER BY (metadata->>'size')::bigint DESC NULLS LAST
LIMIT 30;

-- =============================================================================
-- 9) Dead tuple / bloat hint (needs free space to reclaim via VACUUM)
-- =============================================================================
SELECT
  schemaname,
  relname,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC
LIMIT 25;
