-- Multiple company admin users per company (not only companies.contact_email).
-- Each accreditation invitation grants a row here for the invited email.

CREATE TABLE IF NOT EXISTS company_admin_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_admin_access_email_lower
  ON company_admin_access (lower(email));

CREATE INDEX IF NOT EXISTS idx_company_admin_access_company_id
  ON company_admin_access (company_id);

ALTER TABLE company_admin_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to company_admin_access"
  ON company_admin_access FOR ALL USING (true);
