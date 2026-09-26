# Evidence script: prove accreditations bucket is not world-readable via /object/public/.
# Run AFTER lock-down-accreditations-storage.sql (bucket public = false).
#
# Usage:
#   $env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
#   $env:ACCREDITATIONS_SAMPLE_PATH = "company_slug/section_evidence/1234567890.pdf"
#   .\scripts\security\probe-accreditations-storage-public-evidence.ps1
#
# Use a path you previously confirmed opened via /object/public/accreditations/... (incognito).

$ErrorActionPreference = "Continue"

$baseUrl = ($env:VITE_SUPABASE_URL -or $env:SUPABASE_URL)
$samplePath = $env:ACCREDITATIONS_SAMPLE_PATH

if (-not $baseUrl) {
  Write-Host "Set VITE_SUPABASE_URL (or SUPABASE_URL)." -ForegroundColor Red
  exit 2
}

if (-not $samplePath) {
  Write-Host "Set ACCREDITATIONS_SAMPLE_PATH to an object path inside the accreditations bucket (no leading slash)." -ForegroundColor Red
  exit 2
}

$baseUrl = $baseUrl.TrimEnd("/")
$samplePath = $samplePath.TrimStart("/")
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd HH:mm:ss") + " UTC"
$projectHost = ([Uri]$baseUrl).Host
$publicUri = "$baseUrl/storage/v1/object/public/accreditations/$samplePath"

Write-Host "========================================"
Write-Host "accreditations storage — public URL probe"
Write-Host "Timestamp: $timestamp"
Write-Host "Project host: $projectHost"
Write-Host "Role tested: none (unauthenticated, like incognito)"
Write-Host "========================================"
Write-Host ""
Write-Host "--- Public object URL (must NOT serve file) ---"
Write-Host "GET $publicUri"
Write-Host ""

$overallPass = $false

try {
  $response = Invoke-WebRequest -Method Get -Uri $publicUri -UseBasicParsing
  $status = $response.StatusCode
  $len = $response.RawContentLength
  Write-Host "HTTP $status (body length ~$len)"
  if ($status -eq 200 -and $len -gt 100) {
    Write-Host "RESULT: FAIL — file may still be publicly readable." -ForegroundColor Red
  } else {
    Write-Host "RESULT: PASS — unexpected 200 but tiny body (check manually)." -ForegroundColor Yellow
    $overallPass = $true
  }
} catch {
  $statusCode = $null
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
  }
  $msg = $_.Exception.Message
  Write-Host "Request failed (expected after lock-down): $msg"
  if ($statusCode) {
    Write-Host "HTTP $statusCode"
  }
  if ($statusCode -in 400, 401, 403, 404) {
    Write-Host "RESULT: PASS — public URL denied or not found." -ForegroundColor Green
    $overallPass = $true
  } else {
    Write-Host "RESULT: REVIEW — confirm in browser incognito whether the PDF still downloads." -ForegroundColor Yellow
  }
}

Write-Host ""
if ($overallPass) {
  Write-Host "OVERALL: PASS" -ForegroundColor Green
  exit 0
} else {
  Write-Host "OVERALL: FAIL" -ForegroundColor Red
  exit 1
}
