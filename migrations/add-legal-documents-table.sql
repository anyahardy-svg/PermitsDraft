-- Create legal_documents table for storing configurable legal agreements
CREATE TABLE legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  document_content TEXT NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(document_type, version_number),
  CHECK (document_type IN ('h_s_agreement', 'induction_terms', 'contractor_code_of_conduct'))
);

-- Create index for efficient lookups
CREATE INDEX idx_legal_documents_type ON legal_documents(document_type);
CREATE INDEX idx_legal_documents_active ON legal_documents(document_type, is_active);

-- Add H&S agreement tracking columns to companies table
ALTER TABLE companies 
ADD COLUMN hs_agreement_accepted BOOLEAN DEFAULT false,
ADD COLUMN hs_agreement_signed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN hs_agreement_signature TEXT,
ADD COLUMN hs_agreement_accepted_by TEXT;

-- Create index for tracking
CREATE INDEX idx_companies_hs_agreement ON companies(hs_agreement_accepted);

-- Insert default H&S agreement document
INSERT INTO legal_documents (document_type, document_title, document_content, version_number, is_active)
VALUES (
  'h_s_agreement',
  'Health Safety and Environmental Agreement with Contractors',
  E'HEALTH SAFETY AND ENVIRONMENTAL AGREEMENT WITH CONTRACTORS\n\nPurpose\nThis document outlines the health, safety and environmental requirements, the nature of our Lifesaving Rules, and the procedures that contractors must follow when undertaking work.\n\nLifesaving Rules\nWe have six Lifesaving Rules that address activities with the highest potential for serious injury or fatality. These rules are non-negotiable and apply to all workers, contractors, and visitors while on site.\n\nKey Responsibilities\n\n1. Winstone Aggregates shall ensure that adequately resourced and competent contractors are engaged to undertake work on our sites.\n\n2. Contractors acknowledge their role in partnering with Winstone Aggregates to keep people safe and the environment protected.\n\n3. All workers must comply with the Health and Safety at Work Act 2015, the Resource Management Act 1991, and all other applicable legislation.\n\n4. Only competent, suitably trained, and fit-for-work personnel are assigned to undertake work.\n\nPersonal Protective Equipment (PPE) Requirements\n\nMandatory PPE to be worn by all contractor workers in operational areas shall be:\n- High visibility outer clothing\n- Ankle supporting safety boots\n- Wrist to ankle appropriate safety clothing\n- Hard hat\n- Hearing protection (in areas specified by signage)\n- Eye protection\n- Gloves (task dependent)\n- Dust Protection (task dependent)\n\nPermit to Work (PTW)\nWhere required, contractors shall ensure that:\n- A valid Permit to Work is obtained before commencing high-risk or non-routine work\n- Work does not commence or continue without an approved permit\n- Any changes to scope or conditions are reported and approved before work continues\n\nInduction and Site Access\nContractors shall ensure that:\n- All workers complete a robust, site-specific induction prior to commencing work\n- Workers have sufficient knowledge and understanding of site processes\n- All workers sign in and out of site each time they enter or leave\n\nTraining and Competency\nContractors are responsible for confirming that their people have the right training, skills, and authorisations before work begins.\n\nAcknowledgement\nI/We acknowledge that I/we have read and understood the foregoing Health, Safety and Environmental information and undertake that my/our workers will at all times comply with relevant legislation and with all applicable health, safety and environmental procedures, requirements, and instructions.',
  1,
  true
);
