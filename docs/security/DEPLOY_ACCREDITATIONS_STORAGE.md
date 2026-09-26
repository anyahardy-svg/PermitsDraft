# Private `accreditations` storage bucket (Step 2e)

Company accreditation certificates, section evidence, and evidence-library files live in the **`accreditations`** bucket.

## Rollout

1. Deploy **`company-data` v7** — ping expects `2026-09-26-v7`; action `createAccreditationsSignedUrl`.
2. Deploy **production** frontend (signed URL helpers + accreditation screen).
3. Smoke **before SQL**: Contractor HQ → Accreditation → View/Download a certificate; Network shows **`sign`** or `createAccreditationsSignedUrl`.
4. Run `migrations/lock-down-accreditations-storage.sql` (or Storage → **accreditations** → Public **OFF** + policies from migration).
5. Incognito test: old `.../object/public/accreditations/...` URL must **fail**; app view still works.

Optional PowerShell probe (no anon key): `scripts/security/probe-accreditations-storage-public-evidence.ps1` with `ACCREDITATIONS_SAMPLE_PATH` set to a known object path.

## Legacy data

Columns such as `aep_certificate_url` and `*_evidence_url` may still hold full public HTTPS strings. The app resolves the object path for signing. New uploads store **path only**.

## Not in this step

- **`suppliers`** bucket (supplier accreditation forms) — separate follow-up.
- **`evidence_library_items` table** RLS — metadata; files are in this bucket.
