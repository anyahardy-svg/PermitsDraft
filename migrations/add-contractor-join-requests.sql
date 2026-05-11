-- Migration: Add Contractor Join Requests Table
-- Purpose: Allow contractors to request to join without admin pre-registration
-- Date: May 11, 2026

-- ============================================================================
-- CREATE CONTRACTOR JOIN REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  company_id UUID REFERENCES companies(id),
  company_name TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure unique pending requests per email/company combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
  ON contractor_join_requests(email, company_id) 
  WHERE status = 'pending';

-- ============================================================================
-- CREATE INDEXES FOR COMMON QUERIES
-- ============================================================================

-- For finding pending requests by company
CREATE INDEX IF NOT EXISTS idx_join_requests_company_status 
  ON contractor_join_requests(company_id, status);

-- For finding requests by status
CREATE INDEX IF NOT EXISTS idx_join_requests_status 
  ON contractor_join_requests(status);

-- For finding requests by email
CREATE INDEX IF NOT EXISTS idx_join_requests_email 
  ON contractor_join_requests(email);

-- For sorting by date
CREATE INDEX IF NOT EXISTS idx_join_requests_requested_at 
  ON contractor_join_requests(requested_at DESC);

-- ============================================================================
-- CREATE TRIGGER TO UPDATE updated_at COLUMN
-- ============================================================================

CREATE OR REPLACE FUNCTION update_contractor_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contractor_join_requests_update_timestamp
  BEFORE UPDATE ON contractor_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_join_requests_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE contractor_join_requests ENABLE ROW LEVEL SECURITY;

-- Contractors can view their own requests (matched by email)
CREATE POLICY contractor_join_requests_select_own
  ON contractor_join_requests FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Company members can view all requests for their company
-- (Check if logged-in email exists as a contractor in that company)
CREATE POLICY contractor_join_requests_select_company
  ON contractor_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contractors 
      WHERE contractors.email = auth.jwt() ->> 'email'
      AND contractors.company_id = contractor_join_requests.company_id
    )
  );

-- Company members can update requests for their company
CREATE POLICY contractor_join_requests_update_company
  ON contractor_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM contractors 
      WHERE contractors.email = auth.jwt() ->> 'email'
      AND contractors.company_id = contractor_join_requests.company_id
    )
  );

-- Anyone can insert their own request
CREATE POLICY contractor_join_requests_insert_own
  ON contractor_join_requests FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = email);
