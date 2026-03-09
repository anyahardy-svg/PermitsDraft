# Contractor Accreditation System - Migration Guide

## Overview
The accreditation system has been implemented with a complete database schema, API layer, and UI component. The code is committed and ready. Before using the system, you need to run the database migration to add the necessary columns to the `companies` table.

## Migration Structure
**File**: `migrations/add-accreditation-fields-to-companies.sql` (62 lines)

The migration adds:
- **Section 2 Data**: Services and Fletcher business units (JSONB arrays)
- **Section 3 Data**: 9 Accredited systems (boolean + URL + expiry + timestamp for each)
- **Tracking Fields**: Last updated timestamp and overall expiry date
- **Performance Indexes**: GIN indexes for JSONB searches, B-tree indexes for date filtering

## How to Run the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the contents of `migrations/add-accreditation-fields-to-companies.sql`
6. Paste into the query editor
7. Click **Run** (or press Ctrl+Enter)
8. Verify: All statements should complete successfully (green checkmarks)

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Navigate to project
cd /workspaces/PermitsDraft

# Run migration
supabase db push --local migrations/add-accreditation-fields-to-companies.sql
```

### Option 3: psql (Direct PostgreSQL)
If you have direct database access:
```bash
psql -U postgres -h your-database-host -d your-database-name < migrations/add-accreditation-fields-to-companies.sql
```

## What the Migration Adds

### JSONB Fields (Flexible Arrays)
- `approved_services`: Array of services contractor can perform (from 24-item list)
- `fletcher_business_units`: Array of Fletcher units they work for (from 6-item list)

### Accreditation Fields (Each certification has 4 columns)
For each of 9 systems:
- `{system}_accredited` / `{system}_certified` / `{system}_prequalified`: Boolean flag
- `{system}_certificate_url`: Public URL to uploaded certificate
- `{system}_certificate_expiry`: Expiry date (YYYY-MM-DD format)
- `{system}_certificate_uploaded_at`: Timestamp when document was uploaded

**Accreditation Systems**:
1. ACC Accredited Employer Programme (AEP)
2. ISO 45001 (Occupational Health & Safety)
3. Totika Prequalification
4. SHE Prequal Qualification
5. IMPAC Prequalification
6. SiteWise (Site Safe) Prequalification
7. RAPID Prequalification
8. ISO 9001 (Quality)
9. ISO 14001 (Environmental)

### Tracking Fields
- `accreditation_last_updated`: TIMESTAMP (when form was last completed)
- `accreditation_expiry_date`: DATE (overall accreditation expiry for reminders)

## Implementation Status

✅ **Completed**:
- [x] Database migration SQL file created
- [x] API layer (`src/api/accreditations.js`) with 5 functions:
  - `updateCompanyAccreditation()` - Save accreditation data
  - `getCompanyAccreditation()` - Fetch single company's accreditation
  - `getAllCompaniesAccreditation()` - Fetch all companies (admin dashboard)
  - `uploadAccreditationCertificate()` - File upload to Supabase Storage
  - `getExpiryStatus()` - Helper for expiry checking
- [x] UI Component (`src/screens/CompanyAccreditationScreen.js`) with:
  - Section 2: Service selection grid (24 checkboxes)
  - Section 2: Business unit selection (6 checkboxes)
  - Section 3: Accreditation systems with toggles and expiry dates
  - Save functionality
  - Contractor/Admin access control structure
- [x] Integration into App.js navigation
- [x] Code committed to GitHub (commit 4da026df)

🔄 **Pending**:
- [ ] Run migration in Supabase
- [ ] Test accreditation form submission
- [ ] File upload certificate functionality (UI ready, needs Supabase Storage setup)
- [ ] Admin dashboard to view all contractor accreditations
- [ ] Remaining sections (4-16) of questionnaire

## Next Steps After Migration

1. **Test the Form**:
   - Log in as contractor
   - Navigate to Accreditation in menu
   - Select services and business units
   - Add accreditation data
   - Click Save
   - Verify data persists in database

2. **Set Up File Uploads** (Optional):
   - Create Supabase Storage bucket named `accreditations`
   - Enable public access on bucket
   - Configure policy for file uploads

3. **Add Admin Dashboard** (Phase 2):
   - Create admin view to see all contractors' accreditations
   - Add filters for expiry status (Valid/Expiring/Expired)
   - Add expiry reminders

4. **Expand Questionnaire** (Phase 3):
   - Add Sections 4-16 following same pattern
   - Each section as new screen tab

## Database Verification

After running the migration, verify the columns were created:

**In Supabase Dashboard**:
1. Click **Table Editor**
2. Select `companies` table
3. Scroll right to see new columns
4. Should see `approved_services`, `fletcher_business_units`, all accreditation columns, and tracking fields

**Via SQL Query**:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
  AND column_name LIKE '%accredit%' 
     OR column_name LIKE '%services%'
     OR column_name LIKE '%fletcher%'
ORDER BY ordinal_position;
```

This should return ~45 new columns total.

## Troubleshooting

### Migration Fails with "Column Already Exists"
- This is safe - the migration uses `IF NOT EXISTS` clauses
- Run again or ignore the error

### Can't See New Fields in UI
- Make sure the migration completed successfully
- Restart the Expo dev server
- Check browser console for API errors

### File Upload Fails
- Verify Supabase Storage bucket named `accreditations` exists
- Check bucket is public or has proper policies
- Verify CORS settings allow file uploads from your domain

## Questions?
Refer to the conversation summary in the session memory for:
- Full requirements and user intent
- Accreditation form sections (16 total)
- Service list (24 items)
- Fletcher business units (6 items)
- Access control rules (contractor vs admin)
