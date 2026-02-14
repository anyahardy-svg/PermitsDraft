-- Create isolation_register table
CREATE TABLE IF NOT EXISTS isolation_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  main_lockout_item VARCHAR(255) NOT NULL,
  linked_item_1 VARCHAR(255),
  linked_item_2 VARCHAR(255),
  linked_item_3 VARCHAR(255),
  linked_item_4 VARCHAR(255),
  linked_item_5 VARCHAR(255),
  linked_item_6 VARCHAR(255),
  linked_item_7 VARCHAR(255),
  linked_item_8 VARCHAR(255),
  linked_item_9 VARCHAR(255),
  linked_item_10 VARCHAR(255),
  key_procedure TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_isolation_register_site_id ON isolation_register(site_id);
CREATE INDEX IF NOT EXISTS idx_isolation_register_main_lockout ON isolation_register(main_lockout_item);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_isolation_register_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS isolation_register_update_timestamp ON isolation_register;
CREATE TRIGGER isolation_register_update_timestamp
  BEFORE UPDATE ON isolation_register
  FOR EACH ROW
  EXECUTE FUNCTION update_isolation_register_updated_at();
