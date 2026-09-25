# Ping `contractor-data` when Invoke / curl won’t run

You do **not** need the browser console. The anon key is read from **your machine only**.

## Get the anon key (dashboard)

1. Supabase → **Project Settings** (gear) → **API**
2. Copy **anon** `public` or **publishable** key (not `service_role`)

Do not post this key in chat or tickets.

## Option A — PowerShell script (recommended on Windows)

```powershell
cd C:\path\to\PermitsDraft
.\scripts\security\ping-contractor-data.ps1
```

Paste URL and key when prompted, or set `$env:VITE_SUPABASE_URL` and `$env:VITE_SUPABASE_ANON_KEY` first.

## Option B — One-shot PowerShell (no script)

```powershell
$uri = "https://nszkuoxibzcbiqaqdfml.supabase.co/functions/v1/contractor-data"
$key = "PASTE_ANON_KEY_FROM_API_SETTINGS"
Invoke-RestMethod -Method Post -Uri $uri `
  -Headers @{ Authorization = "Bearer $key"; apikey = $key } `
  -ContentType "application/json" `
  -Body '{"action":"ping"}'
```

## Why “Invoke function” curl often fails on Windows

- PowerShell’s `curl` is an alias for `Invoke-WebRequest`, not real curl — use **`curl.exe`** or **`Invoke-RestMethod`** (script above).
- Default body `{"name":"Functions"}` returns **Unknown action** — must be `{"action":"ping"}`.

## If it still fails

1. **Edge Functions → contractor-data → Logs** — run the ping once, refresh Logs.  
   - No line at all → request never reached Supabase (wrong URL, firewall, typo).  
   - Error line → often missing `SUPABASE_SERVICE_ROLE_KEY` on the function (copy from `admin-auth` settings).

2. **Skip standalone ping** (acceptable for weekend): merge PR #234, deploy production, admin login → open contractor list → DevTools **Network** → filter `contractor-data`. A **200** on `listAll` proves the function works.
