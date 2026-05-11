-- Migration: Add will_work_on_site and user_type columns to contractor_join_requests
-- Purpose: Track whether applicant will work on site (contractor vs admin staff)
-- Date: May 11, 2026

ALTER TABLE contractor_join_requests
ADD COLUMN IF NOT EXISTS will_work_on_site BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'contractor';

-- Set user_type based on will_work_on_site for any existing records
UPDATE contractor_join_requests 
SET user_type = CASE WHEN will_work_on_site THEN 'contractor' ELSE 'admin_staff' END
WHERE user_type = 'contractor' AND will_work_on_site = false;
