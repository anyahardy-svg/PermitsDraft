#!/usr/bin/env bash
# Ping company-data Edge Function.
# Usage:
#   export VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
#   export VITE_SUPABASE_ANON_KEY="eyJ..."
#   ./scripts/security/ping-company-data.sh

set -euo pipefail

base_url="${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}"
anon_key="${VITE_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}"

if [[ -z "$base_url" || -z "$anon_key" ]]; then
  echo "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_*)." >&2
  exit 2
fi

base_url="${base_url%/}"
uri="${base_url}/functions/v1/company-data"
body='{"action":"ping"}'

echo "POST ${uri}"
echo "Body: ${body}"
echo ""

http_code=$(curl -sS -w "%{http_code}" -o /tmp/company-data-ping.json \
  -X POST "$uri" \
  -H "Authorization: Bearer ${anon_key}" \
  -H "apikey: ${anon_key}" \
  -H "Content-Type: application/json" \
  -d "$body")

echo "HTTP ${http_code}"
cat /tmp/company-data-ping.json
echo ""

if grep -q '"success":true' /tmp/company-data-ping.json && grep -q '"version"' /tmp/company-data-ping.json; then
  echo "OK: company-data ping."
else
  echo "Not a successful ping — check function name, deploy, and POST body." >&2
  exit 1
fi
