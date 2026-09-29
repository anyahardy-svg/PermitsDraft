# Private `suppliers` storage bucket

Supplier accreditation uploads (PDFs, certs, SDS, etc.) live in the **`suppliers`** bucket. This is **separate from** locking down the `suppliers` **table** (`lock-down-anon-suppliers.sql`).

## Why both matter

| Layer | What it blocks |
|--------|----------------|
| **Table SQL** | Anonymous bulk read of supplier rows via PostgREST |
| **Storage SQL** | Anyone with an old **public** `.../object/public/suppliers/...` link reading files without auth |

Storage lock-down does **not** give hackers SQL access; it stops **direct file download** if URLs leak or are guessed.

## No Supabase Edge function required

Same as supplier **table** data: **Vercel** holds the service role (`upload-supplier-document`, `create-supplier-document-signed-url`).

## Rollout

1. Merge + deploy **Vercel** (signed URL route + form “View” uses signing).
2. Smoke **before storage SQL**: upload a doc on admin supplier form → **View** → Network shows `create-supplier-document-signed-url` (not `object/public`).
3. Run `migrations/lock-down-suppliers-storage.sql` (or Storage → **suppliers** → Public **OFF**).
4. Incognito: old public URL for a known object must **fail**; in-app View still works.

## Legacy JSON

`accreditation_data` may still contain full public HTTPS strings. The app resolves the object path for signing (see `extractSupplierDocumentStoragePath`).
