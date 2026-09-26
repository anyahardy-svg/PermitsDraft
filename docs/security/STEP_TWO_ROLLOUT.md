# Step 2 — Contractor PII (do not break production)

## Your instinct is right

**Running `migrations/lock-down-anon-contractors.sql` before the replacements below are live will break the app** for:

| Area | Why it breaks |
|------|----------------|
| **Admin / manager UI** | Admin login is **not** a Supabase Auth JWT. The browser uses the **anon** key + `localStorage` admin session. Revoking anon on `contractors` removes every `supabase.from('contractors')` call in `App.js`, `contractors.js`, imports, etc. |
| **Kiosk sign-in** | Same anon client; site roster and search currently read `contractors` directly. |
| **Vercel API routes** | `api/kiosk-check-in.js`, `api/supabaseAdmin.js`, etc. use service role or anon — audit each path before lock-down. |

**What keeps working after SQL (if policies are correct):**

| Area | Mechanism |
|------|-----------|
| **Contractor hub** (Supabase Auth) | `authenticated` RLS: own row + same `company_id` roster (see migration). Still needs every screen to use JWT client, not anon. |
| **Admin + kiosk lists** | **`contractor-data` Edge Function** (service role) after frontend calls it instead of PostgREST. |

Step 1 (`admin_users`) already taught this lesson: **SQL lock-down last**, after Edge + app paths work.

---

## Go / no-go checklist (all must be YES before SQL)

1. **`contractor-data` deployed** in Supabase → `{"action":"ping"}` returns `version` `2026-03-23-v1` (or newer).
2. **`src/api/contractors.js`** (and kiosk/manager callers) use `src/api/contractorData.js` for:
   - `listContractors`, `getContractor`, create/update/delete
   - `listContractorsBySite`, `listContractorsForKiosk`, `searchContractorsForKiosk`
   - `listContractorsByCompany`, `listContractorsWithExpiredInductions`
3. **Production frontend merged and deployed** (not Preview-only).
4. **Smoke test on production** (admin list, one kiosk site, contractor hub roster) **while anon can still read** (optional: compare Edge vs direct).
5. **`./scripts/security/probe-anon-rest.sh contractors 1`** — after SQL, expect **non-200 or empty** (not a JSON array of people).
6. **Secondary callers audited** — at minimum:
   - `src/api/inductions.js` (company roster)
   - `src/api/contractorAuth.js` (login profile)
   - `src/screens/ContractorAdminScreen.js` (direct updates/deletes)
   - `api/kiosk-check-in.js`, `api/supabaseAdmin.js`

---

## Current repo state (branch work in progress)

- **Done:** Edge function, `contractorData.js`, **`contractors.js` wired with Edge-first + PostgREST fallback** (Phase A).
- **Not done:** SQL lock-down; audit secondary `from('contractors')` callers; remove fallback after SQL is stable (optional).
- **Deploy:** see `docs/security/DEPLOY_CONTRACTOR_DATA.md`.

---

## Safer sequencing (recommended)

```text
1. Finish wiring + deploy contractor-data Edge
2. Deploy frontend → verify admin + kiosk + contractor hub
3. Run lock-down-anon-contractors.sql in SQL Editor
4. Re-run anon probe + quick smoke tests
```

## Auditor pack

Consolidated evidence wording, storage vs table tests, and probe list: **`docs/security/AUDITOR_STEP_TWO_EVIDENCE.md`**. Attach local probe output under `docs/security/artifacts/` (gitignored) or your compliance store.

## What Step 2 does *not* fix by itself

- **`companies`** — see `docs/security/DEPLOY_COMPANY_DATA.md` and `migrations/lock-down-anon-companies.sql` (deploy Edge + frontend before SQL).
- **Kiosk Edge actions** (`listForKiosk`, `searchForKiosk`) are still invokable with the public anon key — they only remove **bulk table dump** via REST. Tightening kiosk (shared secret, rate limits) is optional Step 2b.

---

## If something breaks after SQL

1. **Do not panic-revert app only** — the DB will still deny anon.
2. Temporarily **re-grant is not recommended**; prefer **fix forward** (Edge + frontend) or restore from a known migration rollback script discussed with your DBA.
3. For emergency read access, use **Supabase dashboard / service role** only, not re-opening anon policies.
