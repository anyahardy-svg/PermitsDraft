-- Add Visitor Induction Content Table
-- Allows admins to manage visitor induction text per site

CREATE TABLE IF NOT EXISTS visitor_inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  business_unit_id UUID NOT NULL,
  content TEXT NOT NULL,
  last_updated_by UUID, -- User who last edited
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_visitor_induction_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE,
  CONSTRAINT fk_visitor_induction_business_unit FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- One induction per site (unique constraint)
  CONSTRAINT unique_visitor_induction_per_site UNIQUE(site_id)
);

-- Create index for quick lookups
CREATE INDEX idx_visitor_inductions_site_id ON visitor_inductions(site_id);
CREATE INDEX idx_visitor_inductions_business_unit_id ON visitor_inductions(business_unit_id);

-- Insert default induction content for existing sites
INSERT INTO visitor_inductions (site_id, business_unit_id, content)
SELECT s.id, s.business_unit_id, 'Welcome to our site. Please read the following information carefully before proceeding with your visit. Failure to comply with safety procedures may result in immediate removal from site.'
FROM sites s
WHERE NOT EXISTS (SELECT 1 FROM visitor_inductions WHERE site_id = s.id)
ON CONFLICT DO NOTHING;
