# Evidence script: prove anonymous REST cannot read training_records rows.
# Usage:
#   $env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "eyJ..."
#   .\scripts\security\probe-training-records-anon-evidence.ps1

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
Write-Host "training_records — anonymous access probe"
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

    if ($leaked) {
      Write-Host "RESULT: FAIL — anon received row data (HTTP $status)" -ForegroundColor Red
    } else {
      Write-Host "RESULT: PASS — no row payload (HTTP $status)" -ForegroundColor Green
    }
    Write-Host "Body snippet: $snippet"
  } catch {
    $status = $_.Exception.Response.StatusCode.value__
    $detail = $_.ErrorDetails.Message
    if (-not $detail) { $detail = $_.Exception.Message }

    if ($detail -match "42501" -or $detail -match "permission denied") {
      Write-Host "RESULT: PASS — permission denied (expected after lock-down)" -ForegroundColor Green
    } else {
      Write-Host "RESULT: CHECK — HTTP $status / $detail" -ForegroundColor Yellow
    }
  }

  Write-Host ""
}

Test-AnonGet -Label "List training_records (limit 1)" -RelativePath "/rest/v1/training_records?select=id,contractor_id,file_url&limit=1"

Write-Host "Save this output for auditors (timestamp + PASS/FAIL)."
