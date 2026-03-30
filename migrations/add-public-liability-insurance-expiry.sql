-- Migration: Add Public Liability Insurance Expiry to Companies Table
-- Purpose: Track contractor public liability insurance expiry dates and send notifications
-- Date: March 30, 2026

-- Add public liability insurance expiry date column
ALTER TABLE companies ADD COLUMN IF NOT EXISTS public_liability_insurance_expiry DATE;

-- Add tracking for last notification date (to avoid sending duplicate emails)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_insurance_expiry_notification_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient "expiring soon" queries
CREATE INDEX IF NOT EXISTS idx_companies_insurance_expiry ON companies(public_liability_insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_insurance_expiry_notification ON companies(last_insurance_expiry_notification_sent_at);
