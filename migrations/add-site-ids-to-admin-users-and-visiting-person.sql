-- Add site assignment support for admin users and store who visitors/contractors are visiting.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS site_ids UUID[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_admin_users_site_ids
  ON admin_users USING GIN (site_ids);

ALTER TABLE sign_ins
  ADD COLUMN IF NOT EXISTS visiting_person_name TEXT;

CREATE INDEX IF NOT EXISTS idx_sign_ins_visiting_person_name
  ON sign_ins(visiting_person_name);
