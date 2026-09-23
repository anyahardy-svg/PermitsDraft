# Deploy admin-auth v10 (Supabase Edge)

You do **not** need to merge the GitHub PR to deploy the Edge Function. Copy the file from GitHub and paste it into Supabase.

## 1. Get the v10 code

**Option A — Raw file in browser (easiest)**

Open this link (branch with all security fixes):

https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/security-step-one-anon-audit-8ffb/supabase/functions/admin-auth/index.ts

Select all (Ctrl+A) → Copy (Ctrl+C).

**Option B — From the PR**

1. Open PR #230 on GitHub.
2. Go to **Files changed**.
3. Open `supabase/functions/admin-auth/index.ts`.
4. Use the “…” menu → **View file** on the branch, then copy the full file.

The first lines must include:

```ts
const VERSION = "2026-03-23-v10";
```

## 2. Paste into Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project (`nszkuoxibzcbiqaqdfml`).
2. **Edge Functions** → **admin-auth** (create it if missing).
3. Replace **all** editor contents with the copied file.
4. Click **Deploy**.

## 3. Confirm v10 is live

In PowerShell (same env vars you used before):

```powershell
Invoke-RestMethod -Method Post -Uri "$env:VITE_SUPABASE_URL/functions/v1/admin-auth" `
  -Headers @{ Authorization = "Bearer $env:VITE_SUPABASE_ANON_KEY"; apikey = $env:VITE_SUPABASE_ANON_KEY } `
  -ContentType "application/json" -Body '{"action":"ping"}'
```

Look for **`version : 2026-03-23-v10`**.

## 4. Frontend (admin list in Sites)

The **website** must also be built from the same branch (or after PR merge) so `getAllAdminUsers` calls `listAll` on the Edge Function. Edge v10 alone fixes **login**; **empty admin dropdown** needs the app deploy too.

## GitHub “conflicts” on the PR

That only blocks **merging** the PR into `main`. It does **not** block Supabase deploy — use the raw link above anytime.

After conflicts are fixed on the branch, use **Update branch** / merge `main` into the PR branch on GitHub, or merge the PR once GitHub shows a green merge button.
