-- Configurable permit questionnaires: BU-wide base + optional site-only additions (merged at runtime).

CREATE TABLE IF NOT EXISTS permit_questionnaire_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type_key TEXT NOT NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permit_questionnaire_sets_published_bu
  ON permit_questionnaire_sets (permit_type_key, business_unit_id)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_permit_questionnaire_sets_bu
  ON permit_questionnaire_sets (business_unit_id, permit_type_key);

CREATE TABLE IF NOT EXISTS permit_questionnaire_site_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type_key TEXT NOT NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  question JSONB NOT NULL,
  sort_order NUMERIC NOT NULL DEFAULT 1000,
  insert_after_question_id TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_permit_site_q_published_id
  ON permit_questionnaire_site_questions (site_id, permit_type_key, ((question ->> 'id')))
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_permit_site_q_lookup
  ON permit_questionnaire_site_questions (business_unit_id, site_id, permit_type_key);

ALTER TABLE permit_questionnaire_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_questionnaire_site_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to permit_questionnaire_sets"
  ON permit_questionnaire_sets FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all access to permit_questionnaire_site_questions"
  ON permit_questionnaire_site_questions FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE permit_questionnaire_sets IS
  'BU-wide base questionnaire per specialized permit type. site_id is not used here (see site_questions).';
COMMENT ON TABLE permit_questionnaire_site_questions IS
  'Extra questions merged onto BU base for a specific site only (additive, not replacement).';