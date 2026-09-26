# Step 2 — Auditor evidence pack (anon REST + training files)

Use this with probe **output files** and **screenshots** (store locally; do not commit anon keys or PII).

## Principle

The Supabase **anon key** is in the web client. Security is **RLS + REVOKE** on tables and **private storage + policies**, not hiding the admin UI. Admin uses **Edge Functions** (`admin-auth`, `contractor-data`, `company-data`) with `requestingAdminId`, not anonymous PostgREST on PII tables.

## Controls by area

| Area | Mechanism | SQL / deploy reference |
|------|-----------|-------------------------|
| **Admin users** | `admin-auth` Edge; no anon on table | `lock-down-anon-admin-users.sql` |
| **Contractors** | `contractor-data` Edge; REVOKE anon | `lock-down-anon-contractors.sql` |
| **Companies** | `company-data` Edge; REVOKE anon | `lock-down-anon-companies.sql` |
| **Training record rows** | `company-data` (metadata); REVOKE anon | `lock-down-anon-training-records.sql` |
| **Training record files** | Private bucket; signed URLs | `lock-down-training-records-storage.sql` + `company-data` v6+ |

Contractor HQ uses **Supabase Auth JWT** + RLS for their company’s training rows and storage uploads.

## Evidence A — Table probes (anon PostgREST)

Run in PowerShell from a machine with the probe scripts (or copy script from GitHub `main`). Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only in the session; **do not** attach the key.

| Table | Script |
|-------|--------|
| contractors | `probe-contractors-anon-evidence.ps1` |
| companies | `probe-companies-anon-evidence.ps1` |
| training_records | `probe-training-records-anon-evidence.ps1` |

**PASS:** `OVERALL: PASS`, `permission denied`, and/or PostgreSQL **42501** — not JSON arrays with `id` / names / `file_url` bulk export.

**Without a local clone:** use the same REST pattern as contractors (GET `/rest/v1/<table>?select=id&limit=1` with anon headers); see `CONTRACTOR_EXTERNAL_ACCESS_EVIDENCE.md`.

Attach: dated `.txt` output (`Tee-Object`) per table after lock-down SQL is applied.

## Evidence B — Training files (storage)

### What we protect

- **Before:** files under `training-records` were reachable at  
  `.../storage/v1/object/public/training-records/<path>` with **no login**.
- **After:** bucket **private**; app uses **signed URLs**:  
  `.../storage/v1/object/sign/training-records/<path>?token=...`

### Test 1 — Public URL must fail (incognito)

Open in a **private/incognito** window **without** logging in:

```text
https://<project>.supabase.co/storage/v1/object/public/training-records/<company>/matrices/<file>.pdf
```

Use a path you previously confirmed was world-readable. **PASS:** 404 / not found / access denied. **FAIL:** document still downloads.

### Test 2 — Signed URL may still work in incognito (not a failure)

If you copy a **sign** URL from the app (includes `?token=`) into incognito, it will usually **still open until the token expires** (~1 hour). That is **normal** for signed URLs (temporary capability in the link). Auditors should treat leaked signed links like temporary passwords.

**Do not** use Test 2 to prove lock-down. Use Test 1.

### Test 3 — App still works

Contractor HQ → Training Records → open matrix or individual file. Network should show **`sign`** or `company-data` action `createTrainingRecordsSignedUrl`, then load via `object/sign/...?token=`.

## Evidence C — Screenshots (optional)

1. Supabase **Storage** → `training-records` → **Public = OFF**.
2. SQL: `pg_policies` on `storage.objects` for training-records — **no `anon`** SELECT; **authenticated** only (after storage migration).
3. Production **Network**: `company-data` `listTrainingRecordsByCompany` (metadata), not `rest/v1/training_records` for admin.

## Limitations to disclose

1. **Signed URLs** — anyone with the full URL + valid token can download until expiry; mitigate with short TTL and user training not to share links.
2. **Edge Functions** — invokable with the public anon key; they return **scoped** data per action, not full table dumps (see `CONTRACTOR_EXTERNAL_ACCESS_EVIDENCE.md`).
3. **Other buckets** (e.g. permit-attachments, accreditations) may still need the same treatment as `training-records`.
4. **Legacy `file_url` values** may still store full HTTPS strings; the app resolves the object path for signing. New uploads store path-only.

## One-line statements (reports)

**Training record metadata (table):**

> As of [date], unauthenticated `GET /rest/v1/training_records` with the public API key is denied (42501) or returns no rows. Admin access uses the `company-data` Edge Function with an admin session identifier, not anonymous PostgREST.

**Training record files (storage):**

> As of [date], the `training-records` storage bucket is private. Direct public object URLs no longer serve files. Authorized users receive time-limited signed URLs via the application or Edge Function.

## Related docs

- `CONTRACTOR_EXTERNAL_ACCESS_EVIDENCE.md` — contractors table + Edge model
- `DEPLOY_TRAINING_RECORDS_STORAGE.md` — rollout order for private bucket
- `STEP_TWO_ROLLOUT.md` — sequencing (Edge before SQL)
