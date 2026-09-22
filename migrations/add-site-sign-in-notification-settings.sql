-- Site-level sign-in notification settings.
-- When a visitor/contractor signs in without selecting a visiting person,
-- notifications can go to a default manager if enabled for the site.

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS default_notification_manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS send_default_sign_in_notifications BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_sites_default_notification_manager_id
  ON sites(default_notification_manager_id);

COMMENT ON COLUMN sites.default_notification_manager_id IS
  'Admin user who receives sign-in notifications when no visiting person is selected';

COMMENT ON COLUMN sites.send_default_sign_in_notifications IS
  'Whether to email the default manager when no visiting person is selected at sign-in';
