#!/usr/bin/env bash
# Step 1 (read-only): probe PostgREST as anon — same role as the browser without a user JWT.
# Usage: ./scripts/security/probe-anon-rest.sh <table> [limit]
# Env: VITE_SUPABASE_URL or SUPABASE_URL; VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY

set -euo pipefail

TABLE="${1:-contractors}"
LIMIT="${2:-1}"

BASE_URL="${VITE_SUPABASE_URL:-${SUPABASE_URL:-}}"
ANON_KEY="${VITE_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-}}"

if [[ -z "$BASE_URL" || -z "$ANON_KEY" ]]; then
  echo "Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
URL="${BASE_URL}/rest/v1/${TABLE}?select=*&limit=${LIMIT}"

echo "Probe: GET ${TABLE} (limit ${LIMIT}) as anon"
echo "URL: ${BASE_URL}/rest/v1/${TABLE}?select=*&limit=${LIMIT}"
echo ""

HTTP_CODE=$(curl -sS -o /tmp/anon-probe-body.json -w "%{http_code}" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Accept: application/json" \
  "$URL")

echo "HTTP status: ${HTTP_CODE}"
echo "Response body (truncated):"
head -c 2000 /tmp/anon-probe-body.json
echo ""
if [[ "$(wc -c < /tmp/anon-probe-body.json)" -gt 2000 ]]; then
  echo "... (truncated)"
fi

case "$HTTP_CODE" in
  200)
    echo ""
    echo "Interpretation: request succeeded. If body is non-empty JSON array with objects, anon can read rows."
    ;;
  *)
    echo ""
    echo "Interpretation: request did not return 200 — still verify other tables and HTTP methods."
    ;;
esac
