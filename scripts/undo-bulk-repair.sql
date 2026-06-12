-- =============================================================================
-- UNDO bulk repair (Step 1B contractor INSERT + Step 2B auth metadata sync)
--
-- ⚠️  READ BEFORE RUNNING
-- - This does NOT restore exact previous auth metadata (no backup was taken).
-- - It removes bulk-created contractor rows and clears contractor links on auth.
-- - company_id / name on auth.users are LEFT AS-IS (may still be wrong).
-- - For a full restore, use Supabase: Project Settings → Database → Backups (PITR).
--
-- Run each section in order. Preview sections before APPLY sections.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0: Set the time you started the bulk repair (UTC).
-- Everything created at or after this time is treated as bulk repair.
-- Example: '2026-06-12 00:00:00+00'
-- -----------------------------------------------------------------------------
-- Adjust this timestamp to just BEFORE you ran Step 1B:
\set bulk_started_at '2026-06-12 00:00:00+00'

-- If your SQL editor does not support \set, replace :bulk_started_at manually below
-- with your timestamp, e.g. '2026-06-12 00:00:00+00'


-- -----------------------------------------------------------------------------
-- STEP 1: PREVIEW — contractor rows that will be deleted
-- -----------------------------------------------------------------------------
SELECT id, name, email, company_id, created_at
FROM contractors
WHERE created_at >= '2026-06-12 00:00:00+00'   -- ← change to your bulk start time
ORDER BY email, created_at;

SELECT count(*) AS contractors_to_delete
FROM contractors
WHERE created_at >= '2026-06-12 00:00:00+00';   -- ← change to your bulk start time


-- -----------------------------------------------------------------------------
-- STEP 2: PREVIEW — auth users linked to those contractor rows
-- -----------------------------------------------------------------------------
SELECT
  u.email,
  u.raw_user_meta_data->>'contractor_id' AS contractor_id,
  u.raw_user_meta_data->>'company_id' AS company_id,
  u.raw_user_meta_data->>'name' AS name,
  c.created_at AS contractor_created_at
FROM auth.users u
JOIN contractors c ON c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
WHERE c.created_at >= '2026-06-12 00:00:00+00';   -- ← change to your bulk start time


-- -----------------------------------------------------------------------------
-- STEP 3: PREVIEW — FK blockers (permits / inductions referencing these contractors)
-- -----------------------------------------------------------------------------
SELECT 'permits' AS ref_table, count(*) AS refs
FROM permits p
JOIN contractors c ON c.id = p.contractor_id
WHERE c.created_at >= '2026-06-12 00:00:00+00'

UNION ALL

SELECT 'contractor_inductions', count(*)
FROM contractor_inductions ci
JOIN contractors c ON c.id = ci.contractor_id
WHERE c.created_at >= '2026-06-12 00:00:00+00';


-- -----------------------------------------------------------------------------
-- STEP 4A: APPLY — clear auth link to bulk-created contractors FIRST
-- (Removes contractor_id / contractor_name / company_name added by sync)
-- Keeps company_id and name on auth as they were after sync.
-- -----------------------------------------------------------------------------
UPDATE auth.users u
SET raw_user_meta_data =
  raw_user_meta_data
  - 'contractor_id'
  - 'contractor_name'
  - 'company_name'
FROM contractors c
WHERE c.id = (u.raw_user_meta_data->>'contractor_id')::uuid
  AND c.created_at >= '2026-06-12 00:00:00+00';   -- ← change to your bulk start time


-- -----------------------------------------------------------------------------
-- STEP 4B: APPLY — delete bulk-created contractor rows
-- Will FAIL if permits/inductions reference them — resolve STEP 3 first.
--
-- OPTIONAL: Keep a manually-fixed row (e.g. Angie before bulk duplicate):
--   AND id NOT IN ('94ff3306-ef60-4df8-98d1-df0a7770d3bb')
-- -----------------------------------------------------------------------------
DELETE FROM contractors
WHERE created_at >= '2026-06-12 00:00:00+00';   -- ← change to your bulk start time


-- -----------------------------------------------------------------------------
-- STEP 5: OPTIONAL — also clear contractor_id on auth users who still point
-- at deleted rows (if any remain)
-- -----------------------------------------------------------------------------
UPDATE auth.users
SET raw_user_meta_data =
  raw_user_meta_data
  - 'contractor_id'
  - 'contractor_name'
WHERE raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = (raw_user_meta_data->>'contractor_id')::uuid
  );


-- -----------------------------------------------------------------------------
-- STEP 6: VERIFY — should match pre-bulk state (no contractor rows for bulk emails)
-- -----------------------------------------------------------------------------
SELECT count(*) AS bulk_contractors_remaining
FROM contractors
WHERE created_at >= '2026-06-12 00:00:00+00';

SELECT count(*) AS auth_with_orphan_contractor_id
FROM auth.users
WHERE raw_user_meta_data->>'contractor_id' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contractors c
    WHERE c.id = (raw_user_meta_data->>'contractor_id')::uuid
  );

-- Re-run your consistency check — expect many NO CONTRACTOR ROW again
-- (same as before bulk repair)
