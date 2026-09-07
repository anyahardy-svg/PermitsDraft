-- Idempotent: companies.site_ids may already exist in production.
-- Manager hub and accredited companies report read/write this column directly.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_companies_site_ids ON companies USING GIN(site_ids);
