-- When a company is removed, join requests for that company are no longer meaningful.
ALTER TABLE contractor_join_requests
  DROP CONSTRAINT IF EXISTS contractor_join_requests_company_id_fkey;

ALTER TABLE contractor_join_requests
  ADD CONSTRAINT contractor_join_requests_company_id_fkey
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;