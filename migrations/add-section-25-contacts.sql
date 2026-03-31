-- Add Section 25: Contact Information columns to companies table
-- Health and Safety Manager, Environmental Manager, Quality Manager, Occupational Hygienist

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS health_safety_manager_name TEXT,
ADD COLUMN IF NOT EXISTS health_safety_manager_email TEXT,
ADD COLUMN IF NOT EXISTS health_safety_manager_phone TEXT,
ADD COLUMN IF NOT EXISTS environmental_manager_name TEXT,
ADD COLUMN IF NOT EXISTS environmental_manager_email TEXT,
ADD COLUMN IF NOT EXISTS environmental_manager_phone TEXT,
ADD COLUMN IF NOT EXISTS quality_manager_name TEXT,
ADD COLUMN IF NOT EXISTS quality_manager_email TEXT,
ADD COLUMN IF NOT EXISTS quality_manager_phone TEXT,
ADD COLUMN IF NOT EXISTS occupational_hygienist_name TEXT,
ADD COLUMN IF NOT EXISTS occupational_hygienist_email TEXT,
ADD COLUMN IF NOT EXISTS occupational_hygienist_phone TEXT;
