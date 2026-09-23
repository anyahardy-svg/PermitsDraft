# Step 1: Treat the anon key as compromised-by-design

This step is **read-only**. It does not change Supabase policies, app code, or runtime behavior. It produces evidence and an inventory so later RLS work is targeted.

## What you are proving

The Supabase **anon** key ships in the web client (`src/supabaseClient.js`). Anyone can call PostgREST with that key. Security for data in Postgres depends on **RLS** and **storage policies**, not on hiding the admin UI.

## Implementation checklist

### A. One REST probe (15 minutes)

Confirms the mental model on **production** (or staging only if it mirrors prod policies).

```bash
# From repo root — requires env vars, does not print the full key
./scripts/security/probe-anon-rest.sh contractors 1
```

Set in `.env` or the shell:

- `VITE_SUPABASE_URL` (or `SUPABASE_URL`)
- `VITE_SUPABASE_ANON_KEY` (or `SUPABASE_ANON_KEY`)

Interpretation:

| HTTP result | Likely meaning |
|-------------|----------------|
| `200` with JSON rows | **World-readable** to anon for that table (at least SELECT). |
| `200` with `[]` | RLS denied all rows, or table empty (try a table you know has rows). |
| `401` / `403` / permission error | Stronger gate for that request (still verify other verbs and `authenticated`). |

Repeat for `companies`, `admin_users` (select `id,email` only in tests), and one storage path if needed.

### B. Live policy export (source of truth)

Migrations in git **do not guarantee** what is deployed. Export from Supabase:

1. Open **SQL Editor** in the Supabase dashboard.
2. Run `scripts/security/export-live-rls-policies.sql`.
3. Download or copy results to `docs/security/artifacts/live-rls-export-<YYYY-MM-DD>.csv` (keep out of public repos if you prefer — `.gitignore` the `artifacts/` folder).

Compare live export to the repo inventory (step C). Note drift in the exposure note.

### C. Repo policy inventory (baseline from git)

```bash
node scripts/security/audit-repo-rls-policies.js
```

Writes:

- `docs/security/artifacts/repo-rls-inventory.json`
- `docs/security/artifacts/repo-rls-inventory.md`

Re-run after merging migration changes. This is a **lower bound** on what might exist in prod until you run step B.

### D. Severity tagging (1–2 hours)

Copy `docs/security/EXPOSURE_NOTE.template.md` to `docs/security/artifacts/EXPOSURE_NOTE.md` (gitignored) when you finish B + C, and record:

1. **Principle** — anon key is public; UI login is not a DB control.
2. **Probe results** — which tables returned data with anon only.
3. **Live vs repo drift** — policies only in prod or only in git.
4. **Top critical rows** — tables/policies tagged Critical (credentials, tokens, PII, cross-tenant writes).
5. **Team rule** — no new `USING (true)` / `WITH CHECK (true)` for `anon` on tenant data.

Suggested severity:

| Tag | Examples in this project |
|-----|---------------------------|
| **Critical** | `admin_users` (especially `password_hash`), approval/invitation tokens, broad anon UPDATE |
| **High** | `companies`, `contractors`, `sign_ins`, suppliers, accreditation fields, training records |
| **Medium** | Templates, services, email templates (operational leakage) |
| **Low / intentional** | Truly public reference data (document *why* it is public) |

### E. Optional: schedule re-audit

Re-run probe + live export when:

- A migration touches RLS or storage policies
- Before a release that adds admin or supplier flows

## What step 1 does **not** include

- Dropping or replacing policies (that is step 2+ and can break the app)
- Moving admin login server-side
- Enabling `FORCE ROW LEVEL SECURITY`

## Artifacts directory

`docs/security/artifacts/` is gitignored by default so live exports and probe notes are not committed accidentally. Commit the scripts, SQL, and this runbook; keep environment-specific exports local or in a private doc store.
