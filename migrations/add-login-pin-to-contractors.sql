-- Add PIN-based authentication to contractors table
-- Allows contractors to set and use PINs to access Contractor Admin

ALTER TABLE contractors ADD COLUMN login_pin VARCHAR(6);
ALTER TABLE contractors ADD COLUMN pin_last_updated TIMESTAMP WITH TIME ZONE;

-- Index for PIN authentication
CREATE INDEX idx_contractors_login_pin ON contractors(login_pin);
