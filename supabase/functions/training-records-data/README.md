# Moved into `company-data`

Training record admin APIs live on the **`company-data`** Edge function (version **2026-09-26-v5+**), not a separate deploy.

Actions: `listTrainingRecordsByCompany`, `listTrainingRecordsByContractor`, `getTrainingRecord`, `updateTrainingRecord`, `deleteTrainingRecord`, `approveTrainingRecord`, `approveAllPendingTrainingRecords`.

Deploy: update **`company-data`** in Supabase Dashboard — see `docs/security/DEPLOY_COMPANY_DATA.md` and `docs/security/DEPLOY_TRAINING_RECORDS_DATA.md`.
