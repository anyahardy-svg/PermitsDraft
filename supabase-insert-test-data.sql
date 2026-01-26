-- Insert test data into Supabase

-- Insert test sites
INSERT INTO sites (id, name, location) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Amisfield Quarry', 'Amisfield'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Belmont Quarry', 'Belmont'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Wheatsheaf Quarry', 'Wheatsheaf'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Otaki Quarry', 'Otaki'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Petone Quarry', 'Petone')
ON CONFLICT (name) DO NOTHING;

-- Insert test companies
INSERT INTO companies (name, email) VALUES 
  ('ABC Contractors Ltd', 'info@abc-contractors.com'),
  ('XYZ Services Inc', 'contact@xyz-services.com')
ON CONFLICT (name) DO NOTHING;

-- Insert test users
INSERT INTO users (email, name, role, is_admin, site_ids) VALUES 
  ('john.smith@company.com', 'John Smith', 'admin', true, ARRAY['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']),
  ('jane.doe@company.com', 'Jane Doe', 'user', false, ARRAY['550e8400-e29b-41d4-a716-446655440002']),
  ('bob.wilson@company.com', 'Bob Wilson', 'user', false, ARRAY['550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004'])
ON CONFLICT (email) DO NOTHING;
