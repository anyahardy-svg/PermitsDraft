# Evidence: external users cannot read contractor data via Supabase REST

Use this pack when you need to show auditors, insurers, or leadership that **anonymous / unauthenticated API clients** cannot bulk-read the `contractors` table after Step 2 lock-down.

## What “external user” means here

| Actor | Typical access | After Step 2 |
|--------|----------------|--------------|
| **Anonymous internet client** | Browser or script with only the **public (anon) API key**, no Supabase Auth login | **Cannot** `SELECT` from `public.contractors` via PostgREST |
| **Logged-in contractor** | Supabase Auth JWT | **Only** own row + same `company_id` roster (RLS) |
| **Admin / manager app** | Custom admin session + **`contractor-data` Edge** (service role) | Full roster via controlled server path, not open REST |
| **Kiosk** | Anon key + **`contractor-data`** / **`/api/kiosk-check-in`** | Site-scoped operations, not table dump |

The **anon key is public** (it ships in the web app). Security is **not** “hide the key” — it is **no table policy + REVOKE** so that key cannot read rows.

## Controls implemented (contractors)

1. **`REVOKE ALL ON public.contractors FROM anon`**
2. **RLS enabled and forced** on `contractors`
3. **No permissive anon policies** on `contractors`
4. **Authenticated-only** policies: own email + company roster (`migrations/lock-down-anon-contractors.sql`)
5. **Application** uses Edge / Vercel service role for admin and kiosk paths (PRs #234, #236, #237+)

## Evidence to collect (recommended packet)

### A. Automated probe (attach output file)

On your PC in **PowerShell** (not Command Prompt):

```powershell
$env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "..."   # from Supabase -> Project Settings -> API -> anon public

cd C:\path\to\PermitsDraft
.\scripts\security\probe-contractors-anon-evidence.ps1 | Tee-Object -FilePath "contractor-anon-probe-$(Get-Date -Format yyyy-MM-dd).txt"
```

**Expected:** each test **PASS** with `permission denied` / `42501` / 401 / 403, or empty `[]` — **not** a JSON array containing contractor `id` / `name` / `email`.

Do **not** attach files that contain the anon key; the script above does not print the key.

### B. Screenshot — Supabase SQL (policies)

Run in **SQL Editor** (read-only):

```sql
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'contractors'
ORDER BY policyname;
```

Screenshot showing **no policy for `anon`** and policies only for **`authenticated`**.

### C. Screenshot — grants (anon has no table privileges)

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'contractors'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY grantee, privilege_type;
```

Screenshot: **`anon` should have no privileges** on `contractors` (exact rows depend on Postgres version; empty for anon is good).

### D. Screenshot — production app still works

After lock-down, capture:

- Admin contractor list loads (Network: `contractor-data` **200**)
- Kiosk sign-in completes (Network: `kiosk-check-in` **200**)
- Your PowerShell probe showing **PASS** (section A)

### E. One-line statement you can paste in a report

> As of [date], unauthenticated requests to `GET /rest/v1/contractors` using the project’s public API key are denied (PostgreSQL error 42501 / HTTP 401–403) or return no rows. Contractor PII in the admin and kiosk applications is loaded via Supabase Edge Functions and server-side APIs using the service role, not via anonymous direct table access. Row-level security limits authenticated contractors to their own organisation’s roster.

## Is this aligned with best practice?

**Yes, for a Supabase + public web/kiosk app**, this pattern matches what security guidance usually recommends:

| Practice | How this project does it |
|----------|---------------------------|
| Treat the **anon key as public** | Lock-down does not rely on keeping the key secret. |
| **RLS + revoke** direct table access for `anon` | `REVOKE` on `contractors` + no anon policies; authenticated scoped by company. |
| **Never expose service role** in the client | Service role only on Edge Functions and Vercel `api/*` routes. |
| **Backend mediation** for privileged reads/writes | Admin/kiosk use `contractor-data` and `kiosk-check-in`, not `supabase.from('contractors')` with anon. |
| **Defence in depth** | Database denies bulk REST; app layer enforces site/admin flows. |

It is **not** “maximum isolation” (e.g. kiosk with no public API surface at all). That would require extra controls (device registration, mutual TLS, kiosk shared secret, IP allow lists). For many permit/kiosk products, **block open PostgREST + server-mediated access** is the expected baseline and is auditable.

**UUIDs in the browser console are normal** and are **not** treated as secrets in industry practice. They are internal record identifiers. Security should not assume “if someone learns one id, the database is public.” After Step 2, what matters is **what that id lets them fetch**:

| Attack | With public anon key + a known contractor UUID |
|--------|-----------------------------------------------|
| `GET /rest/v1/contractors?id=eq.<uuid>` | **Denied** (`42501` / no row) — attach probe output as proof. |
| Enumerate **all** contractors via REST | **Denied** (same lock-down). |
| Call **`contractor-data`** (e.g. `getForKiosk`) with that id | **Can return that one row** — same class as “using the kiosk app.” Not a table export. Optional hardening: Step 2b (kiosk secret, rate limits, WAF). |
| **Logged-in contractor** JWT, another company’s id | **Denied by RLS** (if policies are correct). |

For auditors, distinguish **“open data warehouse”** (failed before Step 2) from **“identifier seen on a controlled kiosk session”** (expected; direct REST by id is blocked).

## Honest limitations (disclose if asked)

1. **`companies`** lock-down is Step 2b (`migrations/lock-down-anon-companies.sql`, `company-data` Edge). Run `probe-companies-anon-evidence.ps1` after that SQL. Other tables may still need review.
2. **`contractor-data`** can be **invoked** with the anon key (same as any public Edge function). It returns **scoped** data for kiosk/admin actions, not an unfiltered export of the whole table. A caller who already has a contractor UUID could request that row through Edge actions designed for kiosk flows — analogous to using the product UI, not to downloading the full table. Tightening (shared kiosk secret, rate limits, abuse monitoring) is optional Step 2b.
3. **Service role** must never appear in the browser; it is only on Supabase Edge and Vercel server env.
4. **Console logs** (e.g. contractor id at check-in) are for support/debug on site devices; they do not re-open PostgREST. Reducing production logging is optional hygiene, not a substitute for RLS.

## Before vs after (your own test)

You already observed:

- **Before SQL:** anon `GET contractors?select=id&limit=1` returned a real **id**.
- **After SQL:** same call returned **`permission denied for table contractors` (`42501`)**.

Save that PowerShell error output or re-run the evidence script — that pair is strong proof.

## Related files

- Migration: `migrations/lock-down-anon-contractors.sql`
- Bash probe: `scripts/security/probe-anon-rest.sh contractors 1`
- PowerShell evidence: `scripts/security/probe-contractors-anon-evidence.ps1`
- Rollout: `docs/security/STEP_TWO_ROLLOUT.md`
