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

## Supabase Dashboard (if PowerShell “does nothing”)

The ping is **not** SQL and **not** opening a URL in the browser (that is GET-only and will not send the JSON body).

1. Dashboard → **Edge Functions** → click **`company-data`** (must exist in the list).
2. Open **Invoke** / **Test** (wording varies).
3. Method: **POST**.
4. Request body (exactly):

```json
{"action":"ping"}
```

5. Run invoke. You should see JSON in the response panel within a few seconds.
6. Optional: **Logs** tab → refresh after invoke. If logs stay empty, the request never reached this function (wrong project, wrong name, or invoke UI not actually sending POST).

If **`company-data` is not in the Edge Functions list**, create it: **Deploy a new function** → name **`company-data`** → paste `index.ts` → Deploy. Until that exists, no ping can succeed.

## “Ping not running” checklist

| Symptom | Likely cause |
|--------|----------------|
| SQL Editor / `select id from companies` | Table REST/SQL — use Edge URL above |
| Browser address bar on `/functions/v1/company-data` | GET with no body — use POST + JSON |
| 404 / function not found | Function not deployed or wrong name (`companies` vs `company-data`) |
| PowerShell returns instantly with no output | Forgot `-Method Post` or wrong `$uri` (missing `/functions/v1/`) |
| `Unknown action` with no version | Body missing or empty — need `{"action":"ping"}` |
| Hangs then timeout | Wrong host, firewall, or typo in project URL |
| Works for `contractor-data` but not `company-data` | **`company-data` never deployed** — deploy paste separately |

## Scripts

- `scripts/security/ping-company-data.ps1` (PowerShell)
- `scripts/security/ping-company-data.sh` (bash / Git Bash / macOS)
