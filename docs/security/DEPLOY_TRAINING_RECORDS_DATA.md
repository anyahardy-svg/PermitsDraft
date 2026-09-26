# Deploy `training-records-data` (Step 2c Phase A — safe, no SQL yet)

Phase A wires **admin** paths to Edge **with PostgREST fallback**. Contractor hub keeps using **Supabase Auth JWT** + RLS on `training_records` after SQL. **Do not run** `migrations/lock-down-anon-training-records.sql` until Phase A is verified.

## 1. Deploy Edge Function

Supabase Dashboard → **Edge Functions** → create or open **`training-records-data`** → paste `supabase/functions/training-records-data/index.ts` → **Deploy**.

Secrets: same as `company-data` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

**Ping test:**

```json
{"action":"ping"}
```

Expect: `"version":"2026-09-26-v1"`, `"success":true`.

## 2. Deploy frontend

Merge branch and deploy **production** Vercel.

## 3. Smoke tests (before SQL)

| Flow | What to check |
|------|----------------|
| Admin → company training records approve all | Network: `training-records-data` `approveAllPending` |
| Contractor HQ → Training Records tab | Upload + list (authenticated PostgREST) |
| Admin dashboard training status counters | Still via `company-data` counters |

## 4. Phase B (after smoke tests)

1. Run `migrations/lock-down-anon-training-records.sql` in SQL Editor.
2. Run `scripts/security/probe-training-records-anon-evidence.ps1` — expect **42501** / no row leak.
3. Re-smoke admin approve + contractor upload.

## Storage note (uploaded files)

The `training-records` **storage bucket** may still expose files via **public URLs** if the bucket is public. Locking the `training_records` **table** stops metadata dumps; tightening **storage policies** (private bucket + signed URLs) is a recommended follow-up.
