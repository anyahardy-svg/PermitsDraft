-- One-time: uninvited companies still at D → B (High Risk).
-- Safe to re-run: only touches rows with no invitation and contractor_type D (or null).

-- Preview
SELECT id, name, contractor_type, accreditation_invitation_sent_at
FROM companies
WHERE accreditation_invitation_sent_at IS NULL
  AND COALESCE(contractor_type, 'D') = 'D'
ORDER BY name;

-- Apply
UPDATE companies
SET contractor_type = 'B',
    updated_at = NOW()
WHERE accreditation_invitation_sent_at IS NULL
  AND COALESCE(contractor_type, 'D') = 'D';
