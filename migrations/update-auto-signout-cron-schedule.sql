-- Update auto sign-out scheduling to 5am, 9am, 1pm, and 4pm NZ time.
-- Vercel cron now calls /api/cron/auto-signout at the matching UTC hours.
-- This migration removes legacy Supabase pg_cron jobs that ran at midnight/noon UTC.

DO $$
DECLARE
  job_record RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    FOR job_record IN
      SELECT jobid
      FROM cron.job
      WHERE command ILIKE '%auto_signout_inactive_workers%'
    LOOP
      PERFORM cron.unschedule(job_record.jobid);
    END LOOP;
  END IF;
END $$;
