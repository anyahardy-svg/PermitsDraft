# Deploy `company-data` (Step 2b Phase A — safe, no SQL yet)

Phase A wires the app to Edge **with PostgREST fallback**. Production keeps working even if Edge is not deployed yet. **Do not run** `migrations/lock-down-anon-companies.sql` until Phase A is verified.

## 1. Deploy Edge Function

In Supabase Dashboard → Edge Functions → create **`company-data`** (or update), paste from GitHub raw:

`https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/security-step-one-anon-audit-8ffb/supabase/functions/company-data/index.ts`

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
