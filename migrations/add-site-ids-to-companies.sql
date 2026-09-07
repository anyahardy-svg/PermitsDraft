-- Add explicit site assignments for accredited companies (manager hub)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS site_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_companies_site_ids ON companies USING GIN(site_ids);
