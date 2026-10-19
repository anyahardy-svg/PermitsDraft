# Database & storage disk maintenance (Supabase)

When Supabase reports the **database disk is full**, ContractorHQ stops working: kiosks cannot load sites, accreditation **View / Download** fails, and Vercel API routes return errors. Files in **Storage** also count toward project quota.

## Immediate recovery

1. **Supabase Dashboard** → your project → **Project Settings** → **Database** (or **Usage**).
2. Confirm **disk / database size** and **Storage** usage.
3. If the project was **paused**, restore it.
4. If disk is at 100%, you often need to **free space** (steps below) or **increase disk size** (Pro plan) before `VACUUM` or heavy writes succeed.
5. After deletes, run **`VACUUM (ANALYZE)`** on the largest tables (see staged SQL).

Re-test: kiosk URL loads site name, and accreditation **View / Download** opens a document.

## Find what is using space

Run the read-only script in the SQL Editor:

```text
scripts/sql/database-disk-diagnostics.sql
```

Typical results for this app:

| Area | What grows |
|------|------------|
| **`sign_ins`** | Every kiosk visitor/contractor check-in (often the largest table) |
| **`email_send_log`** | Reminder and notification sends |
| **`reminder_cron_runs`** | Daily cron summaries (JSONB) |
| **`permits`** | Large JSONB (JSEA, attachments metadata, logs) |
| **`storage.objects`** | PDFs/images in `accreditations`, `training-records`, `permit-attachments`, etc. |

**Postgres size ≠ Storage size.** You must clean both if the project quota is full.

## Safe cleanup order

Use preview counts first, then delete in stages:

```text
scripts/sql/database-disk-cleanup-staged.sql
```

Recommended order:

1. **Logs** — `email_send_log` (>90 days), `reminder_cron_runs` (>90 days), used/expired `accreditation_approval_tokens`.
2. **`sign_ins`** — only **checked-out** rows older than your retention (default script uses **24 months**; change the interval if you need longer history).
3. **`VACUUM (ANALYZE)`** on tables you deleted from.
4. **Storage** — remove orphaned or duplicate files identified in diagnostics section 8 (do not delete accreditation evidence still linked from `companies` unless you intend to).

## Ongoing prevention

- **Increase disk** on Supabase Pro if you are near the limit regularly.
- **Schedule retention**: archive or delete old `sign_ins` periodically (export CSV first if required for audits).
- **Cap log tables**: keep `email_send_log` and `reminder_cron_runs` to ~90 days.
- **Storage hygiene**: avoid uploading huge files to permit/accreditation buckets; compress PDFs where possible.
- **Monitor**: Supabase Usage alerts + occasional run of `database-disk-diagnostics.sql`.

## Legal / audit note

`sign_ins` and accreditation files may be required for health & safety records. Agree a retention period with your team before bulk deletes. The cleanup script only targets **checked-out** sign-ins older than the interval you set.
