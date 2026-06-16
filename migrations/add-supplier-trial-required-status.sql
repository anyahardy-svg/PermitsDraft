-- Allow trial_required as a terminal supplier accreditation status.

ALTER TABLE supplier_accreditations
  DROP CONSTRAINT IF EXISTS supplier_accreditations_status_check;

ALTER TABLE supplier_accreditations
  ADD CONSTRAINT supplier_accreditations_status_check
  CHECK (status IN ('draft', 'reviewing', 'approved', 'trial_required', 'rejected'));
