# Ping company-data Edge Function (run locally in PowerShell).
# Usage:
#   $env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
#   $env:VITE_SUPABASE_ANON_KEY = "eyJ..."
#   .\scripts\security\ping-company-data.ps1

$ErrorActionPreference = "Stop"

$baseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY

if (-not $baseUrl) {
  $baseUrl = Read-Host "Supabase URL (e.g. https://nszkuoxibzcbiqaqdfml.supabase.co)"
}
if (-not $anonKey) {
  Write-Host "Get anon key: Supabase Dashboard -> Project Settings -> API -> anon public"
  $anonKey = Read-Host "Paste anon key here"
}

$baseUrl = $baseUrl.TrimEnd("/")
$uri = "$baseUrl/functions/v1/company-data"
$body = '{"action":"ping"}'

Write-Host "POST $uri"
Write-Host "Body: $body"
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
  if ($response.success -eq $true -and $response.version) {
    Write-Host ""
    Write-Host "OK: company-data ping (version $($response.version))." -ForegroundColor Green
  } else {
    Write-Host "Response is not a successful ping — check function name and deployed code." -ForegroundColor Yellow
  }
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  }
  Write-Host ""
  Write-Host "If you instead see a single UUID under column 'id', you hit REST/SQL on companies — not this Edge URL."
  exit 1
}
