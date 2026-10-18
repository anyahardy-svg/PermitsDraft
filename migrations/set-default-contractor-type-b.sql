-- Default new companies to B (High Risk) instead of D (Low Risk).
-- Run the backfill separately for existing uninvited rows if needed.

ALTER TABLE companies
  ALTER COLUMN contractor_type SET DEFAULT 'B';

COMMENT ON COLUMN companies.contractor_type IS
  'Contractor Type: A=Major Work, B=High Risk, C=Medium Risk, D=Low Risk (default B for new rows)';
