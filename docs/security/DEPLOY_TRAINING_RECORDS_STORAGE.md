# Private `training-records` storage bucket (Step 2d)

Stops world-readable `/storage/v1/object/public/training-records/...` links. Files open via **signed URLs** (1 hour).

## 1. Deploy `company-data` v6

Paste `supabase/functions/company-data/index.ts` → Deploy.

Ping: `{"action":"ping"}` → **`2026-09-26-v6`**.

New action: `createTrainingRecordsSignedUrl` (admin session + `storagePath`).

## 2. Deploy production frontend

Merge PR with `trainingRecordsStorage.js` + Training Records screen changes.

## 3. Smoke (before SQL)

| Flow | Check |
|------|--------|
| Contractor HQ → Training Records → open matrix / file | File opens (signed URL in network tab) |
| Admin (if you add file links later) | `company-data` signed URL |

## 4. Run SQL

`migrations/lock-down-training-records-storage.sql` in SQL Editor.

Or Dashboard: Storage → **training-records** → **Public = OFF**, then run the policy section of the migration if needed.

## 5. Verify lock-down

1. Old public URL in incognito → **should not** download (404 / not found).
2. App → open same file → still works via signed URL.

## Note on existing rows

`file_url` may still be a full `https://.../public/training-records/...` string from before; the app resolves the **object path** from that for signing. New uploads store the path only.
