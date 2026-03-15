-- Create permit_templates table
-- Stores reusable permit templates (specialized permits, hazards, JSEA)
-- Separate from permits table to prevent accidental export of templates

CREATE TABLE IF NOT EXISTS permit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  -- Reusable permit components
  specialized_permits JSONB DEFAULT '{}',
  single_hazards JSONB DEFAULT '{}',
  jsea JSONB DEFAULT '{}',
  completion JSONB DEFAULT NULL,
  -- Template metadata
  description TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_permit_templates_business_unit ON permit_templates(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_permit_templates_name ON permit_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_permit_templates_created_at ON permit_templates(created_at DESC);

-- Enable RLS
ALTER TABLE permit_templates ENABLE ROW LEVEL SECURITY;

-- Allow all access (same as other tables)
CREATE POLICY "Allow all access to permit_templates" ON permit_templates FOR ALL USING (true);
