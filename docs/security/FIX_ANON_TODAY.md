# Fix the anon key problem today (start here)

## What you are **not** fixing

You **do not** remove or rotate the anon key from the kiosk/admin app. Supabase needs it in the browser.

## What you **are** fixing

You stop the database from answering **anonymous** requests for sensitive tables.

You proved anyone with the anon key could read `admin_users` including `password_hash`.  
**Part 1** closes that hole. **Part 2** (later today or next) does the same for `companies` and `contractors`.

---

## Part 1 — Stop `admin_users` leaks (do in this order)

### Step A — Deploy the `admin-auth` Edge Function

On a machine with [Supabase CLI](https://supabase.com/docs/guides/cli) logged into your project:

```bash
cd your-repo-folder
supabase functions deploy admin-auth --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` is the id in your URL (e.g. `nszkuoxibzcbiqaqdfml`).

Supabase automatically injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into Edge Functions. You do not put the service role key in the website.

**Test (PowerShell)** — use your real anon key in the header (same as before), not the service role:

```powershell
$body = '{"action":"login","email":"YOUR_ADMIN_EMAIL","password":"YOUR_PASSWORD"}'
curl.exe -sS -X POST `
  -H "apikey: $env:VITE_SUPABASE_ANON_KEY" `
  -H "Authorization: Bearer $env:VITE_SUPABASE_ANON_KEY" `
  -H "Content-Type: application/json" `
  -d $body `
  "$env:VITE_SUPABASE_URL/functions/v1/admin-auth"
```

You want `"success":true` and admin fields **without** `password_hash`.

### Step B — Ship the app update

Deploy/pull the version of the app that calls `admin-auth` for login (not `admin_users` from the browser).

### Step C — Run the SQL lock-down

Supabase Dashboard → **SQL Editor** → paste and run:

`migrations/lock-down-anon-admin-users.sql`

### Step D — Verify the leak is closed

Same probe as before (anon only):

```powershell
curl.exe -sS -H "apikey: $env:VITE_SUPABASE_ANON_KEY" -H "Authorization: Bearer $env:VITE_SUPABASE_ANON_KEY" "$env:VITE_SUPABASE_URL/rest/v1/admin_users?select=email,password_hash&limit=1"
```

You want **permission denied** or `[]` / error — **not** a password hash.

Admin login in the app should still work (via the Edge Function).

---

## Part 2 — `companies` and `contractors` (after Part 1 works)

Same idea: remove `USING (true)` policies for `anon`, add proper rules (or move admin lists to Edge Functions).

**Warning:** The admin panel loads companies/contractors with the anon key today. Locking those tables without other changes will empty those screens until you add RLS per role or a backend API.

Do Part 1 first; it fixes the **critical** credential leak.

---

## If something breaks

- **Admin cannot log in** — Edge Function not deployed or app not updated; SQL ran too early.
- **Kiosk visiting-person admin list empty** — app must use `listForKioskSite` via `admin-auth` (included in the app update).

Rollback SQL (emergency only — re-opens the leak): re-add a restrictive policy only after consulting your team; prefer fixing the Edge Function instead.
