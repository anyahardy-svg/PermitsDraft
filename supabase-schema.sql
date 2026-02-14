-- Supabase Schema for Permits Management App
-- Execute this in your Supabase SQL Editor

-- Create Sites Table
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Companies Table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Contractors Table
CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  services TEXT[] DEFAULT '{}',
  site_ids UUID[] DEFAULT '{}',
  company_id UUID REFERENCES companies(id),
  induction_expiry DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Permit Issuers Table (Users)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company TEXT,
  site_ids UUID[] DEFAULT '{}',
  role TEXT DEFAULT 'user',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Permits Table
CREATE TABLE permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  status TEXT DEFAULT 'pending-approval',
  priority TEXT DEFAULT 'normal',
  start_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_date DATE NOT NULL,
  end_time TIME NOT NULL,
  requested_by TEXT NOT NULL,
  contractor_company TEXT,
  permitted_issuer TEXT,
  approved_date DATE,
  approved_by UUID REFERENCES users(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  contractor_id UUID REFERENCES contractors(id),
  controls_summary TEXT,
  specialized_permits JSONB DEFAULT '{}',
  single_hazards JSONB DEFAULT '{}',
  jsea JSONB DEFAULT '{}',
  sign_ons JSONB DEFAULT '{}',
  inspected JSONB DEFAULT NULL,
  completed_sign_off JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_id UUID NOT NULL REFERENCES permits(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  details JSONB DEFAULT '{}'
);

-- Create Sign-In Register Table (for visitors/contractors)
CREATE TABLE sign_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name TEXT NOT NULL,
  company TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out_time TIMESTAMP WITH TIME ZONE,
  site_id UUID NOT NULL REFERENCES sites(id),
  sign_in_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Templates Table (for permit templates)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Permit Questionnaires Table (for specialized permit questions)
CREATE TABLE permit_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type TEXT NOT NULL UNIQUE,
  questions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_permits_site_id ON permits(site_id);
CREATE INDEX idx_permits_status ON permits(status);
CREATE INDEX idx_permits_start_date ON permits(start_date);
CREATE INDEX idx_permits_contractor_id ON permits(contractor_id);
CREATE INDEX idx_contractors_company_id ON contractors(company_id);
CREATE INDEX idx_audit_logs_permit_id ON audit_logs(permit_id);
CREATE INDEX idx_sign_ins_site_id ON sign_ins(site_id);

-- Enable RLS (Row Level Security)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sign_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_questionnaires ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (allow all for now, secure later)
CREATE POLICY "Allow all access to sites" ON sites FOR ALL USING (true);
CREATE POLICY "Allow all access to companies" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all access to contractors" ON contractors FOR ALL USING (true);
CREATE POLICY "Allow all access to users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access to permits" ON permits FOR ALL USING (true);
CREATE POLICY "Allow all access to audit logs" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all access to sign ins" ON sign_ins FOR ALL USING (true);
CREATE POLICY "Allow all access to templates" ON templates FOR ALL USING (true);
CREATE POLICY "Allow all access to questionnaires" ON permit_questionnaires FOR ALL USING (true);
