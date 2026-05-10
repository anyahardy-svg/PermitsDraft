# Signature Persistence Debugging Guide

## Problem
Section 26 H&S Agreement signature is not persisting after you save.

## Step 1: Check Console Logs (F12)

1. Open browser Developer Tools: **F12**
2. Go to **Console** tab
3. Draw a signature and enter your name
4. Refresh the page
5. Look for these logs:

### Expected Log Sequence:

```
📋 Section 26 state changed: {
  has_signature: true,
  signature_size: 45000,
  accepted_by: "John Smith",
  acknowledged: false
}
⏱️ Setting auto-save timer for Section 26...
💾 Auto-saving Section 26: {
  has_signature: true,
  signature_length: 45000,
  accepted_by: "John Smith",
  acknowledged: false,
  accepted_at: "2026-05-10T12:34:56.789Z",
  company_id: "a97d672e-ae25-4b04-8dde-cc675c16eebf"
}
💾 Update request to Supabase: {...}
📥 Supabase response: {data: [...], error: null}
✨ Auto-saved successfully! {success: true, data: {...}}
```

## Step 2: Interpret the Logs

### If you see "has_signature: false"
- **Problem**: Signature not being drawn on canvas
- **Solution**: Check that canvas is rendering (look for "✅ Canvas context initialized" log)

### If you don't see "⏱️ Setting auto-save timer"
- **Problem**: Auto-save not triggering
- **Solution**: Make sure you enter BOTH signature AND name in the "Full Name" field

### If you see "❌ Auto-save error" or error in "📥 Supabase response"
- **Problem**: Database doesn't have the required columns
- **Solution**: Apply the migration (see Step 3)

## Step 3: Apply Database Migration

**CRITICAL**: The `hs_agreement_*` columns must exist in your Supabase database.

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create new query
3. Copy and paste this SQL:

```sql
-- Add Health & Safety Agreement signature columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_signature TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_accepted_by TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_acknowledged BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hs_agreement_accepted_at TIMESTAMP WITH TIME ZONE;

-- Verify columns were created
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'companies' AND column_name LIKE 'hs_agreement%';
```

4. Click **Run**
5. Verify you see these columns in the output:
   - hs_agreement_signature
   - hs_agreement_accepted_by
   - hs_agreement_acknowledged
   - hs_agreement_accepted_at

## Step 4: Verify the Fix

1. Go back to the app
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Draw signature again
4. Enter your name
5. Refresh page
6. Signature should now appear

## Troubleshooting

### Signature appears in my browser but disappears on refresh
- **Likely cause**: Database columns don't exist (Step 3)
- **Solution**: Run the SQL migration

### Auto-save logs show success but data still doesn't appear
- **Likely cause**: The SELECT query isn't fetching the columns
- **Solution**: Need to update the API query to include `hs_agreement_*` columns

### Console shows database error about missing columns
- **Confirmed**: Columns don't exist in database
- **Solution**: Run the SQL migration in Step 3

## Next Steps

Once you've applied the migration, reply with:
1. Whether the SQL executed successfully
2. The console logs you see when saving
3. Whether the signature now persists
