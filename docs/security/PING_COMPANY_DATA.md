# Ping `company-data` (same as contractors — one word changes)

Use the **same steps as `contractor-data`**. Only the **function name in the URL** changes.

| | Contractors (works for you) | Companies (Step 2b) |
|--|-----------------------------|---------------------|
| **Edge function name** | `contractor-data` | **`company-data`** |
| **URL path** | `/functions/v1/contractor-data` | `/functions/v1/company-data` |
| **Wrong (table REST)** | `/rest/v1/contractors` | `/rest/v1/companies` ← returns `{ "id": "uuid..." }` rows, **not** a ping |

Do **not** use `companies` in the Edge URL. The database table is `companies`; the Edge function must be named **`company-data`** (matches `src/api/companyData.js`).

## PowerShell (copy contractor one-liner, change the path segment)

```powershell
$uri = "https://nszkuoxibzcbiqaqdfml.supabase.co/functions/v1/company-data"
$key = "PASTE_ANON_KEY_FROM_API_SETTINGS"
Invoke-RestMethod -Method Post -Uri $uri `
  -Headers @{ Authorization = "Bearer $key"; apikey = $key } `
  -ContentType "application/json" `
  -Body '{"action":"ping"}'
```

**Expected JSON:**

```json
{
  "success": true,
  "version": "2026-09-26-v5",
  "serviceRoleConfigured": true
}
```

## If you see a single UUID under column `id`

You hit **PostgREST** on the table (`/rest/v1/companies?...`) or SQL `select id from companies`, not Edge. That does **not** test `company-data`.

## If Edge returns 404 or “function not found”

1. Supabase → **Edge Functions** → confirm a function named exactly **`company-data`** (not `companies`, not `company_data`).
2. Deploy pasted code from:
   - https://raw.githubusercontent.com/anyahardy-svg/PermitsDraft/cursor/security-step-one-anon-audit-8ffb/supabase/functions/company-data/index.ts
3. Re-run the PowerShell block above.

## Script

`scripts/security/ping-company-data.ps1` — same as `ping-contractor-data.ps1` but calls `company-data`.
