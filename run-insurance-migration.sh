#!/bin/bash

# Script to run migration for old insurance columns
# This migrates data from public_liability_insurance_url to public_liability_insurance_evidence_url

set -e

echo "🔄 Running migration: Migrate Old Insurance Columns"
echo "=================================================="

# Read the migration file
MIGRATION_SQL=$(cat "$(dirname "$0")/../migrations/migrate-old-insurance-columns.sql")

# Execute via Supabase CLI if available
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found - executing migration..."
    supabase db execute "$MIGRATION_SQL"
else
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "Please run this SQL manually in Supabase dashboard:"
    echo "1. Go to Supabase dashboard → SQL Editor"
    echo "2. Copy and paste the SQL from migrations/migrate-old-insurance-columns.sql"
    echo "3. Click Run"
    echo ""
    echo "OR use this command with your credentials:"
    echo "psql postgresql://[user]:[password]@[host]:[port]/[database] < migrations/migrate-old-insurance-columns.sql"
fi

echo ""
echo "✅ Migration complete!"
