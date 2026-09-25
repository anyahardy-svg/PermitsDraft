# Evidence script: prove anonymous (external) REST cannot read contractor rows.
# Run locally in PowerShell. Do NOT commit output files that contain your anon key.
#
# Usage:
#   $env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "eyJ..."   # Project Settings -> API -> anon public
#   .\scripts\security\probe-contractors-anon-evidence.ps1
#
# Optional: save report for auditors (no key in file)
#   .\scripts\security\probe-contractors-anon-evidence.ps1 | Tee-Object -FilePath contractor-anon-probe-$(Get-Date -Format yyyy-MM-dd).txt

$ErrorActionPreference = "Continue"

$baseUrl = ($env:VITE_SUPABASE_URL -or $env:SUPABASE_URL)
$anonKey = ($env:VITE_SUPABASE_ANON_KEY -or $env:SUPABASE_ANON_KEY)

if (-not $baseUrl -or -not $anonKey) {
  Write-Host "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_* equivalents)." -ForegroundColor Red
  exit 2
}

$baseUrl = $baseUrl.TrimEnd("/")
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + " UTC"
$projectHost = ([Uri]$baseUrl).Host

Write-Host "========================================"
Write-Host "Contractor table — anonymous access probe"
Write-Host "Timestamp: $timestamp"
Write-Host "Project host: $projectHost"
Write-Host "Role tested: anon (public API key, no user login)"
Write-Host "========================================"
Write-Host ""

function Test-AnonGet {
  param(
    [string]$Label,
    [string]$RelativePath
  )

  $uri = "$baseUrl$RelativePath"
  Write-Host "--- $Label ---"
  Write-Host "GET $uri"

  try {
    $response = Invoke-WebRequest -Method Get -Uri $uri -Headers @{
      apikey        = $anonKey
      Authorization = "Bearer $anonKey"
      Accept        = "application/json"
    } -UseBasicParsing

    $body = $response.Content
    $status = $response.StatusCode
    $snippet = if ($body.Length -gt 500) { $body.Substring(0, 500) + "..." } else { $body }

    $parsed = $null
    try { $parsed = $body | ConvertFrom-Json } catch { }

    $leaked = $false
    if ($parsed -is [System.Array] -and $parsed.Count -gt 0) {
      $first = $parsed[0]
      if ($first.PSObject.Properties.Name -contains "id") {
        $leaked = $true
      }
    }

    Write-Host "HTTP status: $status"
    Write-Host "Body snippet: $snippet"

    if ($leaked) {
      Write-Host "RESULT: FAIL — anonymous client received contractor row data." -ForegroundColor Red
      return $false
    }

    if ($status -eq 200 -and ($body -eq "[]" -or $body -eq "")) {
      Write-Host "RESULT: PASS — HTTP 200 with empty array (no rows exposed)." -ForegroundColor Green
      return $true
    }

    Write-Host "RESULT: PASS — no contractor rows in response (review status/body above)." -ForegroundColor Green
    return $true
  } catch {
    $status = $null
    $body = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        $reader.Close()
      } catch { }
    }

    $snippet = if ($body -and $body.Length -gt 500) { $body.Substring(0, 500) + "..." } else { $body }
    Write-Host "HTTP status: $status"
    Write-Host "Body snippet: $snippet"

    $permissionDenied = $body -match "permission denied" -or $body -match "42501" -or $status -eq 401 -or $status -eq 403
    if ($permissionDenied) {
      Write-Host "RESULT: PASS — anonymous access denied (expected after lock-down)." -ForegroundColor Green
      return $true
    }

    Write-Host "RESULT: REVIEW — unexpected error; confirm manually." -ForegroundColor Yellow
    return $false
  } finally {
    Write-Host ""
  }
}

$results = @()
$results += Test-AnonGet -Label "Full row probe (limit 1)" -RelativePath "/rest/v1/contractors?select=*&limit=1"
$results += Test-AnonGet -Label "PII columns probe (limit 5)" -RelativePath "/rest/v1/contractors?select=id,name,email,phone&limit=5"
$results += Test-AnonGet -Label "Count-style probe (limit 10)" -RelativePath "/rest/v1/contractors?select=id&limit=10"

$allPass = ($results | Where-Object { $_ -eq $false }).Count -eq 0

Write-Host "========================================"
if ($allPass) {
  Write-Host "OVERALL: PASS for PostgREST anonymous reads on public.contractors" -ForegroundColor Green
  Write-Host "Attach this output (and optional SQL policy screenshot) as evidence."
} else {
  Write-Host "OVERALL: FAIL or needs review — do not claim lock-down until fixed." -ForegroundColor Red
}
Write-Host ""
Write-Host "Limitations (disclose to auditors):"
Write-Host "  - Legitimate app flows use Edge Functions + server APIs (not anon table SELECT)."
Write-Host "  - Kiosk roster uses contractor-data Edge (scoped), not open REST dump."
Write-Host "  - Other tables (e.g. companies) may still need separate review."
Write-Host "========================================"

if (-not $allPass) { exit 1 }
exit 0
