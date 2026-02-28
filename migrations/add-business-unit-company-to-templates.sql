-- Add business_unit_id and company_id columns to templates table
-- These are now first-class properties instead of just in JSONB data

ALTER TABLE templates
ADD COLUMN business_unit_id UUID,
ADD COLUMN company_id UUID;

-- Add foreign key constraints
ALTER TABLE templates
ADD CONSTRAINT fk_templates_business_unit
  FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE;

ALTER TABLE templates
ADD CONSTRAINT fk_templates_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Create indexes for common queries
CREATE INDEX idx_templates_business_unit_id ON templates(business_unit_id);
CREATE INDEX idx_templates_company_id ON templates(company_id);
CREATE INDEX idx_templates_type_business_unit ON templates(template_type, business_unit_id);
