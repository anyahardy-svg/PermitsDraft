-- Add company_id column to templates table (templates can optionally be restricted to a company)
-- For business units: use the template_business_units junction table for many-to-many relationship
-- If no entries in template_business_units for a template, it applies to all business units

ALTER TABLE templates
ADD COLUMN company_id UUID;

-- Add foreign key constraint for company
ALTER TABLE templates
ADD CONSTRAINT fk_templates_company
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;

-- Create index for company queries
CREATE INDEX idx_templates_company_id ON templates(company_id);
CREATE INDEX idx_templates_type ON templates(template_type);

-- Create junction table for template-to-business-unit many-to-many relationship
CREATE TABLE template_business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL,
  business_unit_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE,
  UNIQUE(template_id, business_unit_id)
);

-- Create indexes for efficient querying
CREATE INDEX idx_template_business_units_template_id ON template_business_units(template_id);
CREATE INDEX idx_template_business_units_business_unit_id ON template_business_units(business_unit_id);
