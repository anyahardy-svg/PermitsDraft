#!/bin/bash
# Build script that exports environment variables before Expo build

# Export all VITE_ prefixed env vars for Expo to pick them up
export VITE_BREVO_API_KEY="${VITE_BREVO_API_KEY}"
export VITE_SUPABASE_URL="${VITE_SUPABASE_URL}"
export VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}"

# Run Expo build
expo export --platform web
