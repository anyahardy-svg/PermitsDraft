-- Migration: Add Accreditation Fields to Companies Table
-- Purpose: Support contractor accreditation questionnaire Sections 2 & 3
-- Date: March 9, 2026

-- ============================================================================
-- SECTION 1: Company Information
-- ============================================================================

-- Company NZBN (New Zealand Business Number)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nzbn TEXT;

-- ============================================================================
-- SECTION 2: Services & Business Units
-- ============================================================================

-- Services the contractor is approved/trained to perform
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_services JSONB DEFAULT '[]'::jsonb;

-- Fletcher business units they work for (Firth, Fletcher Steel, Golden Bay, Humes, Stramit, Winstone Aggregates)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS fletcher_business_units JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- SECTION 3: Accredited Systems
-- ============================================================================

-- ACC Accredited Employer Programme (AEP)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aep_accredited BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aep_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aep_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS aep_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- ISO 45001 (Occupational Health and Safety)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_45001_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_45001_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_45001_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_45001_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Totika Prequalification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS totika_prequalified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS totika_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS totika_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS totika_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- SHE Prequal Prequalification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS she_prequal_qualified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS she_prequal_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS she_prequal_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS she_prequal_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- IMPAC Prequal Prequalification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impac_prequalified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impac_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impac_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS impac_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- SiteWise (Site Safe) Prequalification
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sitewise_prequalified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sitewise_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sitewise_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sitewise_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- RAPID Prequalification (Australia only)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rapid_prequalified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rapid_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rapid_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rapid_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- ISO 9001 (Quality)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_9001_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_9001_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_9001_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_9001_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- ISO 14001 (Environmental)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_14001_certified BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_14001_certificate_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_14001_certificate_expiry DATE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS iso_14001_certificate_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Track accreditation questionnaire completion
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accreditation_status TEXT DEFAULT 'in-progress';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accreditation_last_updated TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accreditation_expiry_date DATE;

-- ============================================================================
-- SECTION 4: Policies
-- ============================================================================

-- Health and Safety Policy
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_safety_policy_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_safety_policy_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_safety_policy_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Environmental Policy
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_policy_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_policy_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS environmental_policy_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Drug and Alcohol Policy
ALTER TABLE companies ADD COLUMN IF NOT EXISTS drug_alcohol_policy_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS drug_alcohol_policy_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS drug_alcohol_policy_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Quality Policy
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_policy_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_policy_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quality_policy_uploaded_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- SECTION 4: Accident, Incident & Investigation Management
-- ============================================================================

-- Accident/incident reporting and recording system
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_reporting_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_reporting_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_reporting_evidence_url TEXT;

-- Accident/investigation process
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_investigation_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_investigation_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accident_investigation_evidence_url TEXT;

-- ============================================================================
-- SECTION 5: Health Hazard Management
-- ============================================================================

-- Health Hazard Management Plan
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_hazard_plan_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_hazard_plan_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_hazard_plan_evidence_url TEXT;

-- Exposure monitoring
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exposure_monitoring_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exposure_monitoring_frequency INT DEFAULT 1; -- 1-5 years
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exposure_monitoring_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exposure_monitoring_evidence_url TEXT;

-- Respiratory protection training
ALTER TABLE companies ADD COLUMN IF NOT EXISTS respiratory_training_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS respiratory_training_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS respiratory_training_evidence_url TEXT;

-- Exhaust ventilation systems
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exhaust_ventilation_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exhaust_ventilation_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS exhaust_ventilation_evidence_url TEXT;

-- Health monitoring
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_monitoring_exists BOOLEAN DEFAULT FALSE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_monitoring_frequency INT DEFAULT 1; -- 1-5 years
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_monitoring_score INT DEFAULT 0; -- 1-4 rating
ALTER TABLE companies ADD COLUMN IF NOT EXISTS health_monitoring_evidence_url TEXT;

-- ============================================================================
-- Create Indexes for Common Queries
-- ============================================================================

-- For finding contractors by approved services
CREATE INDEX IF NOT EXISTS idx_companies_approved_services ON companies USING gin(approved_services);

-- For finding contractors by business unit
CREATE INDEX IF NOT EXISTS idx_companies_fletcher_business_units ON companies USING gin(fletcher_business_units);

-- For expiry notifications/dashboard
CREATE INDEX IF NOT EXISTS idx_companies_aep_expiry ON companies(aep_certificate_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_iso_45001_expiry ON companies(iso_45001_certificate_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_totika_expiry ON companies(totika_certificate_expiry);
CREATE INDEX IF NOT EXISTS idx_companies_accreditation_expiry ON companies(accreditation_expiry_date);
