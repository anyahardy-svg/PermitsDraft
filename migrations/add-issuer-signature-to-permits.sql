-- Add issuer_signature column to permits table
-- Stores the base64 encoded PNG signature of the permit issuer when approving the permit

BEGIN;

ALTER TABLE permits
ADD COLUMN issuer_signature TEXT;

COMMIT;
