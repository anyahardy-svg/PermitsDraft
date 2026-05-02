-- Add flag and RT fields to sites table
-- These indicate whether the site uses flags and RTs

ALTER TABLE sites ADD COLUMN IF NOT EXISTS flag BOOLEAN DEFAULT false;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS rt BOOLEAN DEFAULT false;

-- Add indexes for querying
CREATE INDEX IF NOT EXISTS idx_sites_flag ON sites(flag);
CREATE INDEX IF NOT EXISTS idx_sites_rt ON sites(rt);
