# Deploy `company-data` v12 (training record uploads + signed upload URLs)

Training records admin uploads need Edge actions added in **v12**:

- `createTrainingRecordsUploadSignedUrl`
- `createTrainingRecord`

## Why Dashboard deploy sometimes fails

If `index.ts` contains:

```ts
import { getNzYmd } from "../_shared/nzDates.ts";
```

Supabase Dashboard **paste deploy** only uploads that one file — **`../_shared` is not included**, so deploy fails with module not found.

**Fix (in repo):** `company-data/index.ts` now **inlines** the small shared helpers (same pattern as `contractor-data`). Copy/deploy the current file from **`main`** (or your release branch).

## Option A — Supabase Dashboard (paste)

1. Open **Edge Functions** → **`company-data`** (create if missing; name must be exactly `company-data`).
2. Copy the full contents of `supabase/functions/company-data/index.ts` from GitHub (**Raw** view on `main`).
3. Replace the editor contents → **Deploy**.
4. Confirm secrets exist (same as `admin-auth` / `contractor-data`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`  
   (Usually auto-injected; if deploy succeeds but invocations 500, check **Project Settings → Edge Functions**.)

## Option B — Supabase CLI (recommended)

From a clone of this repo (with `supabase/` linked to your project):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy company-data --no-verify-jwt
```

CLI uploads the function folder and avoids paste mistakes.

## Verify (ping)

Dashboard → **Edge Functions** → `company-data` → **Test**, body:

```json
{"action":"ping"}
```

Expect JSON including:

```json
"success": true,
"version": "2026-09-28-v12"
```

Or from a terminal (replace URL and anon key):

```bash
curl -sS "https://YOUR_PROJECT.supabase.co/functions/v1/company-data" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"ping"}'
```

## After Edge is live

1. Deploy **ContractorHQ** frontend (PR #329 session fix + merged upload work).
2. Hard refresh browser; **sign out/in** admin once.
3. Retry training record upload (8MB PDF should pass client checks after frontend deploy).

Optional SQL if storage rejects size: `migrations/increase-training-records-bucket-size.sql`.
