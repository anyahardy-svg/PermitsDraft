# Training Records Bucket Setup

The Training Records feature requires a Supabase Storage bucket called `training-records` to store PDF and image files uploaded by contractors.

## Setup Instructions

### Option 1: Manual Setup via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Click **Storage** in the left sidebar
3. Click **New Bucket**
4. Enter bucket name: `training-records`
5. Uncheck "Make it public" (keep it private)
6. Click **Create bucket**

### Option 2: Automatic Setup via Node.js Script

If you have Node.js installed locally:

```bash
# Set your Supabase credentials as environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the setup script
node setup-bucket.js
```

**Where to find your credentials:**
- `SUPABASE_URL`: Supabase Dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → Service Role Key (keep this secret!)

## Bucket Configuration

| Setting | Value |
|---------|-------|
| **Name** | `training-records` |
| **Public** | No (Private) |
| **Max File Size** | 5 MB |
| **Allowed MIME Types** | application/pdf, image/jpeg, image/png, image/gif, image/webp |

## Security Notes

- The bucket is **private** - only authenticated users can upload/access files
- Files are stored in paths like: `company_name/contractor_name/training_type/timestamp.extension`
- Company training matrices are stored in: `company_name/matrices/timestamp.extension`
- RLS (Row Level Security) policies ensure users can only access their company's records
- Service role key should never be committed to version control

## Troubleshooting

### "Bucket already exists" error
This is fine! It means the bucket was already created. The app can use it.

### "Permission denied" when uploading
Check that the RLS policies are enabled. The app handles authentication automatically.

### Files not accessible
Make sure the bucket is accessible in your Supabase project. You can test in the Storage browser on the dashboard.

## Migrating existing UUID folders to company names

**Easiest:** After deploying, log in as **super admin** → **Admin Panel** → **Training Storage** → enter your password → click **Organize training files**. No terminal or SQL Editor required.

Older training files may still be under random ID folders. That one-click action moves them into company-name folders (same as accreditations). New uploads already use company names once this update is live.

### CLI fallback (optional)

Only needed if you cannot use the Admin Panel:

```bash
DRY_RUN=1 SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  npm run migrate-training-storage
```

To only **look up** which company a record belongs to (without moving files), use `scripts/lookup-training-records-storage.sql` in SQL Editor.

## After Setup

Once the bucket is created, the Training Records feature in the Contractor Admin dashboard will work automatically:

1. Contractor logs in
2. Clicks "Training Records" tab
3. Clicks "+ Add Record"
4. Fills in contractor, service, training name, bucket (category), expiry date
5. Attaches a PDF or image file
6. File is uploaded to `training-records` bucket
7. Record is saved to the database with file URL

That's it! 🎉
