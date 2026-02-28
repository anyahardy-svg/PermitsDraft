-- Migration: Simplify induction system to single table
-- Purpose: Replace normalized 4-table structure with single comprehensive inductions table
-- Date: February 28, 2026

-- ============================================================================
-- 1. DROP OLD TABLES (in reverse dependency order)
-- ============================================================================
DROP TABLE IF EXISTS contractor_induction_progress CASCADE;
DROP TABLE IF EXISTS induction_questions CASCADE;
DROP TABLE IF EXISTS induction_subsections CASCADE;
DROP TABLE IF EXISTS induction_sections CASCADE;

-- ============================================================================
-- 2. CREATE NEW INDUCTIONS TABLE
-- Single table with all induction content
-- ============================================================================
CREATE TABLE IF NOT EXISTS inductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  induction_name TEXT NOT NULL,
  description TEXT,
  subsection_name TEXT, -- e.g., MEWP, Ladder, Telehandler (variant name)
  is_compulsory BOOLEAN DEFAULT TRUE,
  order_number INT DEFAULT 0,
  
  -- Scope & Service
  business_unit_ids UUID[] NOT NULL DEFAULT '{}', -- Array of BU IDs that use this
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL = applies to all sites in BU
  
  -- Video content
  video_url TEXT,
  video_duration INT, -- in minutes
  
  -- Question 1 (optional)
  question_1_text TEXT,
  question_1_options JSONB, -- Array of 4 answer strings
  question_1_correct_answer INT, -- 0-3 index of correct answer
  
  -- Question 2 (optional)
  question_2_text TEXT,
  question_2_options JSONB,
  question_2_correct_answer INT,
  
  -- Question 3 (optional)
  question_3_text TEXT,
  question_3_options JSONB,
  question_3_correct_answer INT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(induction_name, subsection_name)
);

CREATE INDEX IF NOT EXISTS idx_inductions_business_units ON inductions USING GIN(business_unit_ids);
CREATE INDEX IF NOT EXISTS idx_inductions_site ON inductions(site_id);
CREATE INDEX IF NOT EXISTS idx_inductions_compulsory ON inductions(is_compulsory);

-- ============================================================================
-- 3. CREATE CONTRACTOR INDUCTION PROGRESS TABLE
-- Track contractor progress through inductions
-- ============================================================================
CREATE TABLE IF NOT EXISTS contractor_induction_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  induction_id UUID NOT NULL REFERENCES inductions(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed'
  
  -- Contractor responses to questions (JSON format)
  -- { question_1: 0, question_2: 2, question_3: 1 }
  answers JSONB DEFAULT '{}',
  
  -- Signature
  signature_text TEXT,
  
  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(contractor_id, induction_id)
);

CREATE INDEX IF NOT EXISTS idx_contractor_induction_contractor ON contractor_induction_progress(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_induction_induction ON contractor_induction_progress(induction_id);
CREATE INDEX IF NOT EXISTS idx_contractor_induction_status ON contractor_induction_progress(status);

-- ============================================================================
-- 4. SAMPLE DATA
-- Insert initial induction for testing
-- ============================================================================

-- NOTE: Inductions are created via the admin portal
-- When a contractor completes an induction, the induction_name is added to their service_ids array
-- Example: Completing "Working at Heights - MEWP" adds "Working at Heights - MEWP" to contractor's services
