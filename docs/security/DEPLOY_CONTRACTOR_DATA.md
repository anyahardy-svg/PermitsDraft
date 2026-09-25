# Deploy `contractor-data` (Step 2 Phase A — safe, no SQL yet)

Phase A wires the app to Edge **with PostgREST fallback**. Production keeps working even if Edge is not deployed yet. **Do not run** `migrations/lock-down-anon-contractors.sql` until Phase A is verified.

## 1. Deploy Edge Function

In Supabase Dashboard → Edge Functions → create **`contractor-data`** (or update), paste from GitHub raw:

`https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/security-step-one-anon-audit-8ffb/supabase/functions/contractor-data/index.ts`

Ensure secrets match `admin-auth` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

**Ping test** (Dashboard invoke or curl with anon key):

```json
{"action":"ping"}
```

Expect: `"version":"2026-03-23-v1"` (or newer), `"success":true`.

## 2. Deploy frontend

Merge PR and deploy **production** Vercel (not Preview-only).

## 3. Smoke tests (before SQL)

| Flow | What to check |
|------|----------------|
| Admin login → contractor list / import | Loads; network tab may show `contractor-data` `listAll` |
| Manager hub → site contractors | `listBySite` |
| Kiosk sign-in search | `listForKiosk` / `searchForKiosk` |
| Contractor hub → inductions roster | Still uses Supabase Auth + direct `contractors` (until SQL) |

If Edge is missing, console shows fallback warnings and PostgREST still serves data.

## 4. Phase B (later — weekend recommended)

Run `migrations/lock-down-anon-contractors.sql`, then `./scripts/security/probe-anon-rest.sh contractors 1` (must not return people).
