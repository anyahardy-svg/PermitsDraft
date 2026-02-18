# Supabase Storage Setup for Permit Attachments

This directory contains scripts and SQL to configure Supabase Storage for the permit attachment feature.

## Quick Setup (Recommended)

### Option 1: Using SQL Editor (Easiest)

1. Go to your Supabase Project Dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of [`storage-policies.sql`](./storage-policies.sql)
5. Click **Run**
6. You should see "Success" messages for all policies

✅ Done! Attachments will now upload correctly.

---

### Option 2: Using Node.js Script

If you want to automate setup:

1. Install dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

   **To get your Service Role Key:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the "Service Role" key (⚠️ Keep this secret!)

3. Run the setup script:
   ```bash
   node setup-storage-policies.js
   ```

---

## What These Policies Do

| Policy | Action | Who | Purpose |
|--------|--------|-----|---------|
| Upload | INSERT | Authenticated users | Users can upload files to the bucket |
| Read | SELECT | Everyone | Files are readable publicly |
| Delete | DELETE | Authenticated users | Users can delete files they uploaded |
| Update | UPDATE | Authenticated users | Users can update file metadata |

---

## Troubleshooting

### Still Getting "Row-Level Security Policy" Error?

1. **Check the bucket exists:**
   - Dashboard → Storage → verify `permit-attachments` bucket is listed

2. **Verify policies are applied:**
   - Click on the bucket name
   - Click **Policies** tab
   - You should see 4 policies listed

3. **Check authentication:**
   - Make sure users are logged in with Supabase Auth
   - Verify their session token is being sent with the request

4. **Check file path:**
   - Ensure the permitId exists and is valid
   - File path format: `{permitId}/{timestamp}_{filename}`

---

## File Structure

```
/workspaces/PermitsDraft/
├── storage-policies.sql          ← SQL to run in Supabase dashboard
├── setup-storage-policies.js     ← Node.js automation script
└── README.md                     ← This file
```

---

## Testing the Setup

After applying policies, test by:

1. Go to your Permit app
2. Create or edit a permit in "Pending Approval" status
3. Expand the "Attachments" section
4. Click "Upload File" or "Take Photo"
5. Select a file/take a photo and upload

If successful, you'll see:
- ✅ "Success - File uploaded successfully."
- The attachment appears in the list with a download link

---

## Reference

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage/buckets/create)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase SQL Editor](https://supabase.com/docs/guides/database/sql-editor)
