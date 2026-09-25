# Deploy `company-data` (Step 2b Phase A — safe, no SQL yet)

Phase A wires the app to Edge **with PostgREST fallback**. Production keeps working even if Edge is not deployed yet. **Do not run** `migrations/lock-down-anon-companies.sql` until Phase A is verified.

## 1. Deploy Edge Function (before or after merge — branch is fine)

Supabase **does not show your GitHub files** in the Edge UI. You create a function named `company-data` and **paste the full `index.ts` yourself**. You do **not** need `main` merged first.

### Get the code (pick one)

1. **Raw file (easiest)** — open in a browser, select all, copy:
   - https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/security-step-one-anon-audit-8ffb/supabase/functions/company-data/index.ts
2. **GitHub branch folder** (if raw is blocked):
   - https://github.com/anyahardy-svg/PermitsDraft/tree/cursor/security-step-one-anon-audit-8ffb/supabase/functions/company-data
   - Open `index.ts` → click the **Raw** button → copy.
3. **PR #239** → **Files changed** → `supabase/functions/company-data/index.ts` → view file → Raw.

If you only browse **`main`**, you will **not** see `company-data` until the PR merges — use the branch links above.

### Paste in Supabase

Dashboard → **Edge Functions** → **Deploy a new function** (or open existing `company-data`) → name **`company-data`** → replace the editor contents with the copied `index.ts` → **Deploy**.

Ensure secrets match `admin-auth` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

**Ping test** (Dashboard invoke or PowerShell with anon key):

```json
{"action":"ping"}
```

Expect: `"version":"2026-09-26-v2"` (or newer), `"success":true`.

## 2. Deploy frontend

Merge PR and deploy **production** Vercel (not Preview-only).

## 3. Smoke tests (before SQL)

| Flow | What to check |
|------|----------------|
| Admin login → companies list / search | Network: `company-data` `listAll` / `search` |
| Manager hub → companies at site | `listAtSite` |
| Kiosk → company search / create | `searchForKiosk`, `createForKiosk` |
| Contractor login (email lookup) | `lookupByEmail` |
| Contractor HQ accreditation save | Direct PostgREST with **authenticated** JWT (until SQL); after SQL, RLS on own company |

If Edge is missing, console shows fallback warnings and PostgREST still serves data.

## 4. Phase B (after smoke tests)

Run `migrations/lock-down-anon-companies.sql`, then:

```powershell
.\scripts\security\probe-companies-anon-evidence.ps1
```

Expect **PASS** (permission denied / empty), not a JSON array of company rows.
