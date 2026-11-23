-- Run this ONLY if the full seed failed on fall_prevention with question_type NULL.
-- Then re-run migrations/seed-permit-questions-from-defaults.sql (latest from repo: must show 'text' under fall_prevention).

DELETE FROM permit_questions WHERE site_id IS NULL;