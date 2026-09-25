# Ping contractor-data Edge Function (run locally in PowerShell — key never leaves your PC).
# Usage:
#   cd path\to\PermitsDraft
#   .\scripts\security\ping-contractor-data.ps1
#
# Or set env first (same as your .env):
#   $env:VITE_SUPABASE_URL = "https://nszkuoxibzcbiqaqdfml.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "eyJ..."

$ErrorActionPreference = "Stop"

$baseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $baseUrl) {
  $baseUrl = Read-Host "Supabase URL (e.g. https://nszkuoxibzcbiqaqdfml.supabase.co)"
}
if (-not $anonKey) {
  Write-Host "Get anon key: Supabase Dashboard -> Project Settings -> API -> anon public (or publishable)"
  $anonKey = Read-Host "Paste anon key here"
}

$baseUrl = $baseUrl.TrimEnd("/")
$uri = "$baseUrl/functions/v1/contractor-data"
$body = '{"action":"ping"}'

Write-Host "POST $uri"
Write-Host ""

try {
  $response = Invoke-RestMethod -Method Post -Uri $uri `
    -Headers @{
      Authorization = "Bearer $anonKey"
      apikey        = $anonKey
    } `
    -ContentType "application/json" `
    -Body $body

  $response | ConvertTo-Json -Depth 5
  if ($response.success -eq $true) {
    Write-Host ""
    Write-Host "OK: contractor-data is reachable (version $($response.version))." -ForegroundColor Green
  } else {
    Write-Host "Unexpected response (success not true)." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  }
  Write-Host ""
  Write-Host "Tips:"
  Write-Host "  - Use PowerShell, not cmd. Do not use curl alias in PS 5 (use this script or curl.exe)."
  Write-Host "  - URL must match your app project (same as VITE_SUPABASE_URL in Vercel)."
  Write-Host "  - Edge Function name must be exactly contractor-data."
  Write-Host "  - In Supabase -> contractor-data -> Logs, look for errors after a failed attempt."
  exit 1
}
