-- Store site selections made during company accreditation.
-- Merged into companies.site_ids on submit/approval; Manager Hub continues to update site_ids directly.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS accreditation_site_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_companies_accreditation_site_ids ON companies USING GIN(accreditation_site_ids);
