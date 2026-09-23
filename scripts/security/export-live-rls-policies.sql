-- Step 1 (read-only): export RLS policies as deployed in THIS Supabase project.
-- Run in Supabase Dashboard → SQL Editor. Save results as CSV.

-- Public tables: RLS enabled + policies
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pol.polname AS policy_name,
  CASE pol.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
  pol.polcmd AS command,
  pg_catalog.array_to_string(pol.polroles::name[], ', ') AS roles,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;

-- Tables in public with no policies (RLS on but no policy = deny all for non-owner;
-- RLS off = grants may allow access — review grants separately)
SELECT
  n.nspname AS schema,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- Storage policies (compliance files often leak here)
SELECT
  pol.polname AS policy_name,
  pol.polcmd AS command,
  pg_catalog.array_to_string(pol.polroles::name[], ', ') AS roles,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'storage'
  AND c.relname = 'objects'
ORDER BY pol.polname;

-- Quick count: policies that are unconditionally open (heuristic)
SELECT
  c.relname AS table_name,
  pol.polname AS policy_name,
  pg_catalog.array_to_string(pol.polroles::name[], ', ') AS roles,
  pol.polcmd AS command
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'storage')
  AND (
    pg_get_expr(pol.polqual, pol.polrelid) = 'true'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'
  )
ORDER BY n.nspname, c.relname, pol.polname;
