# Training records lock-down (Step 2c — uses existing `company-data`)

There is **no** separate `training-records-data` Edge function. Admin training-record CRUD is on **`company-data`** (version **2026-09-26-v5+**).

Phase A wires the app to Edge **with PostgREST fallback**. Contractor hub keeps **Supabase Auth JWT** + RLS after SQL. **Do not run** `migrations/lock-down-anon-training-records.sql` until Phase A is verified.

## 1. Redeploy `company-data` (not a new function)

Supabase Dashboard → **Edge Functions** → open **`company-data`** → paste the full file from:

`https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/training-records-lock-down-8ffb/supabase/functions/company-data/index.ts`

(or your merged branch raw URL) → **Deploy**.

**Ping test:**

```json
{"action":"ping"}
```

Expect: `"version":"2026-09-26-v5"` (or newer), `"success":true`.

## 2. Deploy frontend

Merge PR and deploy **production** Vercel.

## 3. Smoke tests (before SQL)

| Flow | What to check |
|------|----------------|
| Admin → approve all training records | Network: **`company-data`** action `approveAllPendingTrainingRecords` |
| Contractor HQ → Training Records | Upload + list (authenticated PostgREST) |
| Admin dashboard counters | Still `company-data` `listTrainingCounters` |

## 4. Phase B (after smoke tests)

1. Run `migrations/lock-down-anon-training-records.sql`.
2. Run `scripts/security/probe-training-records-anon-evidence.ps1` — expect **42501** / no row leak.
3. Re-smoke admin approve + contractor upload.

## Storage note

Table lock-down does not make the **`training-records` storage bucket** private if URLs are public. Plan signed URLs / private bucket separately.
