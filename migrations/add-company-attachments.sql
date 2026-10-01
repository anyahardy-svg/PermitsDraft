-- Company-level attachments for accreditation / admin logins without a contractors row.
-- Files live in training-records bucket under {company}/company_other_attachments/…

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.companies.attachments IS
  'Array of { id, label, name, path, uploadedAt } for company-wide document uploads';
