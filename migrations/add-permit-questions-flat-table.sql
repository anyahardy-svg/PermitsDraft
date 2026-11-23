-- One row per question (spreadsheet model). Replaces permit_questionnaire_sets / site_questions for new config.
-- Legacy tables may remain; application reads permit_questions when populated.

CREATE TABLE IF NOT EXISTS permit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permit_type_key TEXT NOT NULL,
  question_number NUMERIC(10, 2) NOT NULL,
  question_id TEXT NOT NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  depends_on_question_id TEXT,
  depends_on_value TEXT,
  note TEXT,
  controls_label TEXT,
  controls_on TEXT,
  no_controls BOOLEAN NOT NULL DEFAULT false,
  blocking_question BOOLEAN NOT NULL DEFAULT false,
  blocking_answer TEXT,
  text_label TEXT,
  yes_label TEXT,
  no_label TEXT,
  inline_only BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT permit_questions_type_check CHECK (
    question_type IN (
      'yesno', 'yesnona', 'yesno_text', 'text', 'radio', 'multi_checkbox',
      'attachment', 'section', 'contractor_lookup'
    )
  )
);

-- site_id NULL = All Sites for that business unit
CREATE UNIQUE INDEX IF NOT EXISTS idx_permit_questions_all_sites
  ON permit_questions (permit_type_key, business_unit_id, question_id)
  WHERE site_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_permit_questions_per_site
  ON permit_questions (permit_type_key, business_unit_id, site_id, question_id)
  WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_permit_questions_resolve
  ON permit_questions (business_unit_id, permit_type_key, question_number)
  WHERE is_published = true;

ALTER TABLE permit_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to permit_questions"
  ON permit_questions FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE permit_questions IS
  'Flat specialised permit questions: one row per question. site_id NULL = All Sites.';
COMMENT ON COLUMN permit_questions.options IS
  'yesno/yesnona: Yes; No (; N/A). radio: semicolon list. multi_checkbox: JSON array. contractor_lookup: hint text.';