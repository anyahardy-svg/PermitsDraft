-- Migration: Create comprehensive induction system
-- Purpose: Contractor induction training with video, questions, and service qualification
-- Date: February 28, 2026

-- ============================================================================
-- 1. INDUCTION_SECTIONS TABLE
-- Main induction topics (e.g., "Working at Heights", "Hot Work")
-- ============================================================================

CREATE TABLE IF NOT EXISTS induction_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULL = all sites in BU
  service_id UUID REFERENCES services(id) ON DELETE SET NULL, -- Service earned by completing this
  
  -- Section details
  induction_name TEXT NOT NULL,
  description TEXT,
  is_compulsory BOOLEAN DEFAULT TRUE,
  order_number INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(business_unit_id, site_id, induction_name)
);

CREATE INDEX idx_induction_sections_business_unit ON induction_sections(business_unit_id);
CREATE INDEX idx_induction_sections_site ON induction_sections(site_id);
CREATE INDEX idx_induction_sections_service ON induction_sections(service_id);

-- ============================================================================
-- 2. INDUCTION_SUBSECTIONS TABLE
-- Variants within a section (e.g., EWP, Telehandler, Ladder for "Working at Heights")
-- ============================================================================

CREATE TABLE IF NOT EXISTS induction_subsections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  induction_section_id UUID NOT NULL REFERENCES induction_sections(id) ON DELETE CASCADE,
  
  -- Subsection details
  subsection_name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE, -- Pre-selected for contractor?
  order_number INT DEFAULT 0,
  
  -- Video content
  video_url TEXT NOT NULL, -- YouTube URL
  video_duration_minutes INT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(induction_section_id, subsection_name)
);

CREATE INDEX idx_induction_subsections_section ON induction_subsections(induction_section_id);

-- ============================================================================
-- 3. INDUCTION_QUESTIONS TABLE
-- Questions for each subsection (max 3 per subsection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS induction_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  induction_subsection_id UUID NOT NULL REFERENCES induction_subsections(id) ON DELETE CASCADE,
  
  -- Question details
  question_number INT NOT NULL, -- 1, 2, or 3
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple-choice', -- 'multiple-choice', 'true-false', 'text'
  
  -- For multiple choice / true-false
  options JSONB, -- {"a": "Option A", "b": "Option B", "c": "Option C"}
  correct_answer TEXT, -- 'a', 'b', 'c', 'true', 'false'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(induction_subsection_id, question_number)
);

CREATE INDEX idx_induction_questions_subsection ON induction_questions(induction_subsection_id);

-- ============================================================================
-- 4. CONTRACTOR_INDUCTION_PROGRESS TABLE
-- Tracks contractor's journey through inductions
-- ============================================================================

CREATE TABLE IF NOT EXISTS contractor_induction_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- Which induction/subsection
  induction_section_id UUID NOT NULL REFERENCES induction_sections(id) ON DELETE CASCADE,
  induction_subsection_id UUID NOT NULL REFERENCES induction_subsections(id) ON DELETE CASCADE,
  
  -- Progress status
  status TEXT DEFAULT 'not_started', -- 'not_started', 'in_progress', 'questions_answered', 'completed'
  
  -- Questions - JSONB to store all answers
  -- Format: { "q1": "a", "q2": "b", "q3": "c" }
  answers_submitted JSONB,
  questions_score INT DEFAULT 0, -- How many correct (0-3)
  
  -- Completion
  started_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE, -- When they submitted answers
  completed_at TIMESTAMP WITH TIME ZONE, -- When they finished and signed
  expires_at TIMESTAMP WITH TIME ZONE, -- 1 year from completed_at
  
  -- Signature
  signature_url TEXT, -- URL to signature image in storage
  
  -- Service tracking
  service_added_at TIMESTAMP WITH TIME ZONE, -- When service was added to contractor
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(contractor_id, induction_subsection_id, business_unit_id)
);

CREATE INDEX idx_contractor_induction_progress_contractor ON contractor_induction_progress(contractor_id);
CREATE INDEX idx_contractor_induction_progress_site ON contractor_induction_progress(site_id);
CREATE INDEX idx_contractor_induction_progress_section ON contractor_induction_progress(induction_section_id);
CREATE INDEX idx_contractor_induction_progress_status ON contractor_induction_progress(status);
CREATE INDEX idx_contractor_induction_progress_expires ON contractor_induction_progress(expires_at);

-- ============================================================================
-- 5. INDUCTION_SECTION_SUBSECTIONS MAPPING
-- Maps which subsections are required for a section
-- (allows flexible subsection selection per contractor)
-- ============================================================================

CREATE TABLE IF NOT EXISTS induction_section_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  induction_section_id UUID NOT NULL REFERENCES induction_sections(id) ON DELETE CASCADE,
  
  -- Requirement logic
  require_all_subsections BOOLEAN DEFAULT FALSE, -- If false, contractor chooses which subsections
  min_subsections_required INT DEFAULT 1, -- Minimum subsections to complete
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_induction_section_requirements_section 
ON induction_section_requirements(induction_section_id);

-- ============================================================================
-- 6. SAMPLE DATA - WINSTONE AGGREGATES
-- (Can be customized per your business units and sites)
-- ============================================================================

-- Create sample induction sections for Winstone Aggregates
INSERT INTO induction_sections (business_unit_id, induction_name, description, is_compulsory, service_id, order_number)
SELECT 
  bu.id,
  'Working at Heights',
  'Safe work practices for elevated work including EWP, Telehandler, and Ladder work',
  TRUE,
  (SELECT id FROM services WHERE business_unit_id = bu.id AND name = 'Working at Heights' LIMIT 1),
  1
FROM business_units bu
WHERE bu.name = 'Winstone Aggregates'
ON CONFLICT (business_unit_id, site_id, induction_name) DO NOTHING;

INSERT INTO induction_sections (business_unit_id, induction_name, description, is_compulsory, service_id, order_number)
SELECT 
  bu.id,
  'Hot Work',
  'Hot work permit requirements and fire safety procedures',
  TRUE,
  (SELECT id FROM services WHERE business_unit_id = bu.id AND name = 'Hot Work' LIMIT 1),
  2
FROM business_units bu
WHERE bu.name = 'Winstone Aggregates'
ON CONFLICT (business_unit_id, site_id, induction_name) DO NOTHING;

-- Create subsections for "Working at Heights" (sample)
INSERT INTO induction_subsections (induction_section_id, subsection_name, is_default, order_number, video_url, video_duration_minutes)
SELECT
  s.id,
  'EWP (Elevated Work Platform)',
  TRUE,
  1,
  'https://www.youtube.com/embed/dQw4w9WgXcQ', -- Replace with real video
  15
FROM induction_sections s
WHERE s.induction_name = 'Working at Heights'
AND s.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
ON CONFLICT (induction_section_id, subsection_name) DO NOTHING;

INSERT INTO induction_subsections (induction_section_id, subsection_name, is_default, order_number, video_url, video_duration_minutes)
SELECT
  s.id,
  'Telehandler',
  FALSE,
  2,
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  12
FROM induction_sections s
WHERE s.induction_name = 'Working at Heights'
AND s.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
ON CONFLICT (induction_section_id, subsection_name) DO NOTHING;

INSERT INTO induction_subsections (induction_section_id, subsection_name, is_default, order_number, video_url, video_duration_minutes)
SELECT
  s.id,
  'Ladder',
  FALSE,
  3,
  'https://www.youtube.com/embed/dQw4w9WgXcQ',
  10
FROM induction_sections s
WHERE s.induction_name = 'Working at Heights'
AND s.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
ON CONFLICT (induction_section_id, subsection_name) DO NOTHING;

-- Create sample questions for EWP subsection
INSERT INTO induction_questions (induction_subsection_id, question_number, question_text, question_type, options, correct_answer)
SELECT
  sub.id,
  1,
  'What is the maximum safe working height for an EWP?',
  'multiple-choice',
  '{"a": "10 meters", "b": "Site-specific (check harness certification)", "c": "No limit with proper training"}',
  'b'
FROM induction_subsections sub
JOIN induction_sections sec ON sub.induction_section_id = sec.id
WHERE sub.subsection_name = 'EWP (Elevated Work Platform)'
AND sec.induction_name = 'Working at Heights'
AND sec.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
AND NOT EXISTS (SELECT 1 FROM induction_questions WHERE induction_subsection_id = sub.id AND question_number = 1)
ON CONFLICT DO NOTHING;

INSERT INTO induction_questions (induction_subsection_id, question_number, question_text, question_type, options, correct_answer)
SELECT
  sub.id,
  2,
  'You must conduct a safety check before using equipment.',
  'multiple-choice',
  '{"a": "True", "b": "False"}',
  'a'
FROM induction_subsections sub
JOIN induction_sections sec ON sub.induction_section_id = sec.id
WHERE sub.subsection_name = 'EWP (Elevated Work Platform)'
AND sec.induction_name = 'Working at Heights'
AND sec.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
AND NOT EXISTS (SELECT 1 FROM induction_questions WHERE induction_subsection_id = sub.id AND question_number = 2)
ON CONFLICT DO NOTHING;

INSERT INTO induction_questions (induction_subsection_id, question_number, question_text, question_type, options, correct_answer)
SELECT
  sub.id,
  3,
  'What is the first thing you should do if equipment fails?',
  'multiple-choice',
  '{"a": "Continue working and report later", "b": "Evacuate immediately and isolate the equipment", "c": "Try to fix it yourself"}',
  'b'
FROM induction_subsections sub
JOIN induction_sections sec ON sub.induction_section_id = sec.id
WHERE sub.subsection_name = 'EWP (Elevated Work Platform)'
AND sec.induction_name = 'Working at Heights'
AND sec.business_unit_id = (SELECT id FROM business_units WHERE name = 'Winstone Aggregates')
AND NOT EXISTS (SELECT 1 FROM induction_questions WHERE induction_subsection_id = sub.id AND question_number = 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Comment out after deployment)
-- ============================================================================

-- List all induction sections:
-- SELECT bu.name, s.induction_name, s.is_compulsory, srv.name as service_name 
-- FROM induction_sections s
-- JOIN business_units bu ON s.business_unit_id = bu.id
-- LEFT JOIN services srv ON s.service_id = srv.id
-- ORDER BY bu.name, s.order_number;

-- List all subsections for a section:
-- SELECT s.induction_name, sub.subsection_name, sub.video_url, sub.video_duration_minutes
-- FROM induction_subsections sub
-- JOIN induction_sections s ON sub.induction_section_id = s.id
-- WHERE s.induction_name = 'Working at Heights'
-- ORDER BY sub.order_number;

-- List all questions for a subsection:
-- SELECT q.question_number, q.question_text, q.correct_answer
-- FROM induction_questions q
-- JOIN induction_subsections sub ON q.induction_subsection_id = sub.id
-- WHERE sub.subsection_name = 'EWP (Elevated Work Platform)'
-- ORDER BY q.question_number;
