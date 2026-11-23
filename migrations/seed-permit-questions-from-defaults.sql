-- Seed permit_questions from defaults.js for EVERY business unit (All Sites).
-- Run AFTER migrations/add-permit-questions-flat-table.sql
-- Safe to re-run: clears All Sites rows per BU then re-inserts.

DELETE FROM permit_questions WHERE site_id IS NULL;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  1,
  'marking_hazards_controlled',
  bu.id,
  NULL,
  'Are you aware of any bench condition and face edge hazards and are they controlled?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  2,
  'marking_lv_parking',
  bu.id,
  NULL,
  'Light vehicles remain in designated LV parking area?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  3,
  'marking_standoff_established',
  bu.id,
  NULL,
  'Minimum 2m stand-off distance from the face established? (If not, RM needs to approve)',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  4,
  'marking_standoff_increased',
  bu.id,
  NULL,
  'Does the stand-off distance need to be increased?',
  'yesno_text',
  NULL,
  false,
  'marking_standoff_established',
  'yes',
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'To how many meters:',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  5,
  'marking_standoff_marked',
  bu.id,
  NULL,
  'Minimum stand-off distance marked with dazzle, markers, cones, fence posts?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  6,
  'marking_bund_break',
  bu.id,
  NULL,
  'Safe break in bund for drill rig established?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  7,
  'marking_bund_marked',
  bu.id,
  NULL,
  'Break in bund marked with cones?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  8,
  'marking_weather_checked',
  bu.id,
  NULL,
  'Weather checked to avoid significant weather events?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  9,
  'marking_edge_protection',
  bu.id,
  NULL,
  'Edge protection marked on drill plan?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  10,
  'marking_plan_approved',
  bu.id,
  NULL,
  'Drill Plan reviewed and approved by Permit Issuer?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingMarking',
  11,
  'marking_drill_plan_file',
  bu.id,
  NULL,
  'Attach Drill Plan',
  'attachment',
  NULL,
  false,
  NULL,
  NULL,
  'Attach the drill plan document',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  1,
  'drilling_inspection_completed',
  bu.id,
  NULL,
  'Drill rig daily inspection sheet completed prior to start-up?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  2,
  'drilling_ground_conditions',
  bu.id,
  NULL,
  'Are ground conditions suitable to prevent drill rigs toppling over?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  3,
  'drilling_oriented_toppling',
  bu.id,
  NULL,
  'Is the drill rig oriented to prevent falling over edge if it should topple over ?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  4,
  'drilling_oriented_distance',
  bu.id,
  NULL,
  'Is the drill rig oriented to maximize distance from face?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  5,
  'drilling_normal_area',
  bu.id,
  NULL,
  'Is drilling completed in an area where geotechnical information is known?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  6,
  'drilling_plan_received',
  bu.id,
  NULL,
  'Drill Plan and instructions received from the marker?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingDrilling',
  7,
  'drilling_log_attached',
  bu.id,
  NULL,
  'Drill log completed and attached?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  1,
  'licensed_shot_firer',
  bu.id,
  NULL,
  'Name of licensed shot firer assigned.',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  2,
  'blasting_staff_notified',
  bu.id,
  NULL,
  'Staff notified of intended time/date/location of blast and which radio channel to use?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  3,
  'blasting_third_parties_consulted',
  bu.id,
  NULL,
  'Third parties/members of the public consulted/notified?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  4,
  'blasting_third_parties_evacuated',
  bu.id,
  NULL,
  'Third parties/members of the public evacuated if not in the public safety zone?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  5,
  'blasting_access_bench_clear',
  bu.id,
  NULL,
  'Access to bench clear and the Authority to Load inspection completed?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  6,
  'blasting_geological_changes',
  bu.id,
  NULL,
  'There are known geological changes or faults that may impact on the blast?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  7,
  'blasting_drill_reviewed',
  bu.id,
  NULL,
  'Drill log and bore track results reviewed and discussed with driller?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  8,
  'blasting_burden_bore_tracked',
  bu.id,
  NULL,
  'Has front rows been bore-tracked?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  9,
  'blasting_burden_front_face',
  bu.id,
  NULL,
  'Minimum burden of front face hole bore tracking is (m)',
  'text',
  NULL,
  true,
  'blasting_burden_bore_tracked',
  'yes',
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  10,
  'blasting_burden_consistent',
  bu.id,
  NULL,
  'Is the actual burden consistent with design burden?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  11,
  'blasting_safety_factor',
  bu.id,
  NULL,
  'Can a safety factor 4x be achieved for personnel positioned in the all in firing position?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  12,
  'blasting_safety_factor_plant',
  bu.id,
  NULL,
  'Can a safety factor 2x be achieved for personnel positioned for all plant and equipment',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  13,
  'blasting_manager_signoff_required',
  bu.id,
  NULL,
  'Regional Manager Sign-Off Required: Safety requirements not met',
  'section',
  NULL,
  false,
  'blasting_burden_bore_tracked,blasting_burden_consistent,blasting_safety_factor,blasting_safety_factor_plant',
  'no,no,no,no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  14,
  'blasting_manager_name',
  bu.id,
  NULL,
  'Regional Manager Name',
  'text',
  NULL,
  true,
  'blasting_burden_bore_tracked,blasting_burden_consistent',
  'no,no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  15,
  'blasting_manager_signoff_file',
  bu.id,
  NULL,
  'Regional Manager Sign-Off Document',
  'attachment',
  NULL,
  false,
  'blasting_burden_bore_tracked,blasting_burden_consistent,blasting_safety_factor,blasting_safety_factor_plant',
  'no,no,no,no',
  'Attach signed approval from Regional Manager',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  16,
  'blasting_safe_distance_personnel',
  bu.id,
  NULL,
  'Safe distance for personnel on site is',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  '_____ m',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  17,
  'blasting_safe_distance_plant',
  bu.id,
  NULL,
  'Safe location distance for plant/equipment/vehicles is',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  '_____ m',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  18,
  'blasting_firing_direction',
  bu.id,
  NULL,
  'Firing direction understood?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  19,
  'blasting_monitors_set_up',
  bu.id,
  NULL,
  'Have the blast monitors been set up?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  20,
  'blasting_site_plan',
  bu.id,
  NULL,
  'Site Plan completed with and discussed with Permit Issuer?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'n',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  21,
  'blasting_holes_below_midc',
  bu.id,
  NULL,
  'Are holes below or equal to their Maximum instantaneous Design Charge?',
  'yesno_text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'If no, note the numbers and comment',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  22,
  'blasting_personnel_accounted',
  bu.id,
  NULL,
  'Visitors/Contractors/Personnel/Plant/Equipment on site all accounted for and in agreed safety zone?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  23,
  'blasting_shotfirer_position',
  bu.id,
  NULL,
  'Shotfirer in the established firing position, not in line of sight of the blast?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  24,
  'blasting_mgm_signoff_required',
  bu.id,
  NULL,
  'Blasting Company Operations Manager Sign-Off Required: Safety requirements not met',
  'section',
  NULL,
  false,
  'blasting_shotfirer_position',
  'no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  25,
  'blasting_mgm_name',
  bu.id,
  NULL,
  'Operations Manager Name',
  'text',
  NULL,
  true,
  'blasting_shotfirer_position',
  'no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  26,
  'blasting_mgm_signoff_file',
  bu.id,
  NULL,
  'Regional Manager Sign-Off Document',
  'attachment',
  NULL,
  false,
  'blasting_shotfirer_position',
  'no',
  'Attach signed approval from Regional Manager',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  27,
  'blasting_fumex_settled',
  bu.id,
  NULL,
  'Fumex and dust have settled and dissipated before entering?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  28,
  'blasting_faces_inspected',
  bu.id,
  NULL,
  'Faces inspected and deemed safe?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  29,
  'blasting_all_holes_fired',
  bu.id,
  NULL,
  'All holes have fired?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'blastingExecution',
  30,
  'blasting_all_clear',
  bu.id,
  NULL,
  'All clear given to proceed with normal operations?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  1,
  'isolations',
  bu.id,
  NULL,
  'Are all isolations necessary completed?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  2,
  'training',
  bu.id,
  NULL,
  'Are all workers entering the confined space trained and competent to perform the required task within the confined space as well as entering the confined space? NO CONFINED SPACE TRAINING = NO ENTRY',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  3,
  'medical_check',
  bu.id,
  NULL,
  'All workers checked for any potential medical, health, psychological conditions that might pose a risk, prior to entry.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  4,
  'atmosphere_testing',
  bu.id,
  NULL,
  'Is atmosphere testing required?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  5,
  'testing_gases',
  bu.id,
  NULL,
  'Which gases will be tested?',
  'multi_checkbox',
  '[{"label":"O2","value":"O2"},{"label":"CO","value":"CO"},{"label":"H2S","value":"H2S"},{"label":"Combustibles","value":"combustibles"},{"label":"Other Toxic gases","value":"other_toxic","textLabel":"Specify other toxic gases"},{"label":"Other asphyxiants","value":"other_asphyxiants","textLabel":"Specify other asphyxiants"}]',
  true,
  'atmosphere_testing',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  6,
  'ventilation',
  bu.id,
  NULL,
  'Is ventilation of the confined space required?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  'Describe controls',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  7,
  'engulfment',
  bu.id,
  NULL,
  'Is there a possibility of engulfment, drowning or overhead hazards?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  8,
  'pressure',
  bu.id,
  NULL,
  'Is there a possibility of extreme suction, pressure or flow occurring while people are in this confined space?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  9,
  'access_egress',
  bu.id,
  NULL,
  'Is the access and egress to the confined space restricted, difficult or hazardous?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  10,
  'barrier',
  bu.id,
  NULL,
  'Will a barrier always be placed over the access point when workers leave the area.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  11,
  'vehicles',
  bu.id,
  NULL,
  'Are vehicles or combustion engines likely to be a hazard?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  12,
  'harnesses',
  bu.id,
  NULL,
  'Are safety harnesses and a method of extraction required?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  'If yes, Review the Fall Arrest Equipment Checklist.',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  13,
  'communication_method',
  bu.id,
  NULL,
  'How will you communicate?',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Phone/Radio/Audible Signal/Visual Signal/Rope Signal',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'confinedSpace',
  14,
  'safety_watch_name',
  bu.id,
  NULL,
  'Name',
  'contractor_lookup',
  'Lookup Contractors or overwrite',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Enter name',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  1,
  'isolation_requirements',
  bu.id,
  NULL,
  'Isolation requirements completed? Test and prove all isolations. Personal locks to be used and in place during the job, as noted in Isolation Register.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  2,
  'signage',
  bu.id,
  NULL,
  'Signage required to be placed by job to warn of hazard?',
  'yesno_text',
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'Describe signage type and placement',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  3,
  'ladder_required',
  bu.id,
  NULL,
  'Will a ladder be required? If yes, non-metallic ladders to be used in switchyards and around live equipment.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  4,
  'electrical_ladder_condition',
  bu.id,
  NULL,
  'Is the ladder to be used in good condition?',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  'Check: All rubber feet present; All rungs in good condition; All safety catches/locking bars intact; AS/NZS 1892 standard mark present and rated for weight',
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  5,
  'electrical_ladder_non_metallic',
  bu.id,
  NULL,
  'Is the ladder non-metallic?',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  'Non-metallic ladders required in switchyards and around live equipment',
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  6,
  'electrical_ladder_angle',
  bu.id,
  NULL,
  'Is the angle of the ladder set up to a ratio of 4 up and 1 out?',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  7,
  'electrical_ladder_level_ground',
  bu.id,
  NULL,
  'Is the ladder to be footed on level ground?',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  8,
  'electrical_ladder_secured',
  bu.id,
  NULL,
  'Is the ladder secured against movement at the top and bottom? (Note: you must have someone hold the ladder at the bottom initially to set this up)',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  9,
  'electrical_ladder_three_points',
  bu.id,
  NULL,
  'Will it be possible to maintain 3 points of contact at all times?',
  'yesno',
  'Yes; No',
  true,
  'ladder_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  10,
  'electrical_exclusion',
  bu.id,
  NULL,
  'Does an exlusion zone need to be set up?.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  11,
  'electrical_exclusion_photo',
  bu.id,
  NULL,
  'Exclusion zone photo',
  'attachment',
  NULL,
  false,
  'electrical_exclusion',
  'yes',
  'Attach photo of exclusion zone setup',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  12,
  'ppe',
  bu.id,
  NULL,
  'What PPE is required to be worn?',
  'multi_checkbox',
  '[{"label":"CAL rated clothing","value":"high_viz"},{"label":"Flame Retardant Overalls/Clothing","value":"flame_retardant"},{"label":"Safety Boots","value":"safety_boots"},{"label":"Safety Glasses","value":"safety_glasses"},{"label":"CAL rated gloves","value":"cal_gloves"},{"label":"Other","value":"other","textLabel":"Specify other PPE"}]',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  13,
  'oil_spillage',
  bu.id,
  NULL,
  'Oil spill kit available for work on transformers or oil filled switch gear.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  14,
  'competent_personnel',
  bu.id,
  NULL,
  'All personnel undertaking this work are suitably competent (or supervised) to perform the required tasks?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  15,
  'environmental',
  bu.id,
  NULL,
  'Consider: Are there any environmental matters?',
  'yesno_text',
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'If yes, describe environmental considerations and precautions',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  16,
  'communication',
  bu.id,
  NULL,
  'All relevant personnel has been notified of the work that is being undertaken? Consider: Production, other site personnel, contractors and external agencies',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'electrical',
  17,
  'job_completion',
  bu.id,
  NULL,
  'Job Completion: Any special requirements at the closure of the job, before handing permit back for sign off?',
  'yesno_text',
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'Describe completion requirements',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'excavation',
  1,
  'before_you_dig',
  bu.id,
  NULL,
  'Before you dig notification completed?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'excavation',
  2,
  'underground_services',
  bu.id,
  NULL,
  'Underground services identified and marked?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'excavation',
  3,
  'shoring_required',
  bu.id,
  NULL,
  'Is shoring or slope protection required?',
  'yesno_text',
  NULL,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  'Describe shoring/slope protection measures',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'excavation',
  4,
  'competent_person',
  bu.id,
  NULL,
  'Name of competent person assigned to supervise excavation.',
  'contractor_lookup',
  'Lookup Contractors or overwrite',
  true,
  'shoring_required',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'excavation',
  5,
  'emergency_egress',
  bu.id,
  NULL,
  'Describe emergency plan for persons in excavation',
  'text',
  NULL,
  true,
  'shoring_required',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Describe emergency plan for persons in excavation',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  1,
  'workshop_alternative',
  bu.id,
  NULL,
  'Will the hot work be done in an approved hot work area such as the workshop?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  2,
  'flammable_materials',
  bu.id,
  NULL,
  'Are there flammable or combustible substances/material evident within 10m of the hot work?  Look for dry vegetation, containers, piping systems, drains, other equipment in the area, or directly above or below the area?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  'Describe purging/removal/covering methods?',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  3,
  'fire_extinguishers',
  bu.id,
  NULL,
  'Adequate and suitable fire extinguishers available on the job? A minimum of 3.5kg CO2 or dry powder fire extinguishers must be on hand.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  'What fire extinguishers do you have available?',
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  4,
  'hot_marking',
  bu.id,
  NULL,
  'Are there other workers in the area?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  'All items must be marked HOT to warn others in the area',
  'How will you protect others from the Hot Work?',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  5,
  'flashback_arrestors',
  bu.id,
  NULL,
  'Are the correct flash back arrestors fitted to all gas bottles?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true,
  'no',
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  6,
  'ignition_conveyance',
  bu.id,
  NULL,
  'Is it possible for ignition sources from hot work to be conveyed by conveyors, ducting, airflow or wind to combustible materials?',
  'yesno',
  'Yes; No',
  true,
  'workshop_alternative',
  'no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  7,
  'conveyors_nearby',
  bu.id,
  NULL,
  'Are there conveyors, rubber lined chutes and poly deck screens in the immediate area and/or below any hot work?',
  'yesno',
  'Yes; No',
  true,
  'workshop_alternative',
  'no',
  NULL,
  'Describe the protection measure taken?',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  8,
  'wet_surfaces',
  bu.id,
  NULL,
  'Does floors and surface areas need to be wetted down?',
  'yesno',
  'Yes; No',
  true,
  'workshop_alternative',
  'no',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  9,
  'flammable_gases',
  bu.id,
  NULL,
  'Are flammable gases present in the area?',
  'yesno',
  'Yes; No',
  true,
  'workshop_alternative',
  'no',
  'Gas test required if yes',
  'What gases were tested, and what were the results?',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  10,
  'confined_space',
  bu.id,
  NULL,
  'Is hot work being undertaken in a confined space?',
  'yesno',
  'Yes; No',
  false,
  'workshop_alternative',
  'no',
  'Confined Space permit also required if yes',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  11,
  'hdpe_welding',
  bu.id,
  NULL,
  'Is High Density Polyethylene pipe being welded using electrofusion?',
  'yesno',
  'Yes; No',
  false,
  'workshop_alternative',
  'no',
  'Blank off open end and follow manufacturer cooling times',
  'Describe blanking procedures and cooling time requirements',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  12,
  'wash_down',
  bu.id,
  NULL,
  'On processing plants, wash down hose in place and pumps turned on before commencing hot work.',
  'yesno',
  'Yes; No',
  true,
  'workshop_alternative',
  'no',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  13,
  'grinders',
  bu.id,
  NULL,
  'Are disk grinders being used?',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  14,
  'grinder_ppe',
  bu.id,
  NULL,
  'What PPE is required for grinder use?',
  'multi_checkbox',
  '[{"label":"Double eye protection (visor and glasses)","value":"double_eye_protect"},{"label":"Other","value":"other","textLabel":"Specify other grinder PPE"}]',
  true,
  'grinders',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  15,
  'correct_grinder',
  bu.id,
  NULL,
  'Does the grinder have anti-kickback protection and a deadman switch?',
  'yesno',
  'Yes; No',
  false,
  'grinders',
  'yes',
  NULL,
  'Who will be using the grinder and what extra controls do you have in place?',
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  16,
  'grinder_safety',
  bu.id,
  NULL,
  'Is the guard fitted and side handle in position?',
  'yesno',
  'Yes; No',
  false,
  'grinders',
  'yes',
  NULL,
  'Who will be using the grinder and what extra controls do you have in place?',
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  17,
  '9inch',
  bu.id,
  NULL,
  'Are 9 inch grinders being used?',
  'yesno',
  'Yes; No',
  false,
  'grinders',
  'yes',
  'Only qualified tradesmen are allowed to use 9" grinders',
  'Who will be using the grinder and what extra controls do you have in place?',
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  18,
  'alarm_plan',
  bu.id,
  NULL,
  'Is there a plan to raise the alarm if needed?',
  'yesno_text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  'Describe the emergency plan details',
  'Describe how this will be controlled',
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  19,
  'hw_safety_watch',
  bu.id,
  NULL,
  'Who is the safety watch person?',
  'contractor_lookup',
  'Lookup Contractors or overwrite',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'hotWork',
  20,
  'hw_safety_period',
  bu.id,
  NULL,
  'What is the safety watch period?',
  'radio',
  '30 minutes (low risk); 60 minutes (high risk)',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  1,
  'environmental_conditions',
  bu.id,
  NULL,
  'Are the environmental conditions suitable for this activity? (lifts should not proceed if wind exceeds 35 knots, 60 MPH, or 15m/h)',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  2,
  'supervisors_oversight',
  bu.id,
  NULL,
  'Are the supervisors in place to oversee work competently?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  3,
  'lighting_provided',
  bu.id,
  NULL,
  'Has adequate lighting been provided for workers? (if natural light is inadequate)',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  4,
  'exclusion_zone',
  bu.id,
  NULL,
  'Has an exclusion zone been established around the area during preparation and lift?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  5,
  'exclusion_zone_photo',
  bu.id,
  NULL,
  'Exclusion zone photo',
  'attachment',
  NULL,
  false,
  'exclusion_zone',
  'yes',
  'Attach photo of exclusion zone setup',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  6,
  'personnel_trained',
  bu.id,
  NULL,
  'Are all personnel trained and competent in their respective equipment (i.e., crane driver, dogman, rigger, safety observer etc.)?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  7,
  'safe_working_load',
  bu.id,
  NULL,
  'Is the lift within 80% of the crane/hiab safe working load limit?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  8,
  'complex_lift_procedure',
  bu.id,
  NULL,
  'If over 60% or a complex lift (more people, 2 or more cranes etc), has a Lifting Procedure been signed off by the Crane Controller or Lift Supervisor?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  9,
  'equipment_isolated',
  bu.id,
  NULL,
  'Have all affected plant and equipment been isolated prior to lift?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  10,
  'manufacturer_specs',
  bu.id,
  NULL,
  'Is the lift within the manufacturer''s specifications for the hoist, sling and chains?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  11,
  'loads_secured',
  bu.id,
  NULL,
  'Are loads adequately secured to ensure they are stable during lift and are all hooks etc. certified?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  12,
  'communication',
  bu.id,
  NULL,
  'Does the dogman/rigger and crane operator able to have visual contact or a defined means of communication? (a designated radio channel is required for a blind lift)',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  13,
  'lifting_equipment_certified',
  bu.id,
  NULL,
  'Have all lifting equipment, slings and chains been checked and certified to carry load?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  14,
  'tag_lines',
  bu.id,
  NULL,
  'Are tag lines or piles available to control the load and swing?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'lifting',
  15,
  'boom_positioning',
  bu.id,
  NULL,
  'Is the crew aware that the boom and loads are not to be left positioned over live work areas when left unattended?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  1,
  'lockout_recorded',
  bu.id,
  NULL,
  'All people working on mobile plant have applied a lockout and lockouts and these are recorded in Isolations section the PTW',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  2,
  'zero_energy_confirmed',
  bu.id,
  NULL,
  'A zero-energy state confirmed. (All electrical, hydraulic, pneumatic, mechanical systems de-energized.  Think about hoseburst protection systems, springs, rollaway, flywheels etc.)',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  3,
  'workers_trained',
  bu.id,
  NULL,
  'All workers trained, competent and experienced at performing the repair task on the mobile plant.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  4,
  'manufacturer_manual',
  bu.id,
  NULL,
  'Is the repair being completed as per the Mobile Plant Manufacturers Workshop Manual where applicable or available?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  5,
  'access_restricted',
  bu.id,
  NULL,
  'Access to the repair area is restricted for pedestrians and vehicles. Only workers engaged in the work and signed on to the permit and the permit issuer have access to the service area.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  6,
  'fluids_contained',
  bu.id,
  NULL,
  'Are all fluids and other waste materials contained and will it be removed by the end of the task.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  7,
  'hot_fluids_controls',
  bu.id,
  NULL,
  'Controls for release/draining of hot fluids in place - e.g. engine oil, hydraulic oils etc',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  8,
  'pressurized_controls',
  bu.id,
  NULL,
  'Controls for venting of pressurized fluids or systems in place - e.g. hydraulic oil',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  9,
  'flammable_controls',
  bu.id,
  NULL,
  'Controls for flammables in place - e.g. petrol, diesel',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  10,
  'no_suspended_loads',
  bu.id,
  NULL,
  'Will anyone be under suspended loads?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true,
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  11,
  'plant_operation',
  bu.id,
  NULL,
  'If the mobile plant is to be started or moved by a contractor, are they trained and competent in the operation of the mobile plant, hold the correct licenses and be trained in the relevant Winstone Aggregates SOPs.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  12,
  'safe_access_height',
  bu.id,
  NULL,
  'Is there safe access to the work area?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  13,
  'heavy_lifting_controls',
  bu.id,
  NULL,
  'Controls in place for heavy lifting that might be involved.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  14,
  'additional_permits',
  bu.id,
  NULL,
  'Are all associated permits completed?  eg. Hot Work, Working at Height, Lifting with Cranes or Hiabs etc.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  15,
  'tools_equipment',
  bu.id,
  NULL,
  'All tools, equipment used fit for purpose, safe, certified where necessary. Any custom-built items verified.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  16,
  'approved_area',
  bu.id,
  NULL,
  'Mobile Plant repair being done in approved servicing area.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  17,
  'traffic_diversion_required',
  bu.id,
  NULL,
  'Traffic Diversion required?',
  'yesno',
  'Yes; No',
  false,
  'approved_area',
  'no',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  18,
  'traffic_areas_described',
  bu.id,
  NULL,
  'Have all staff been informed of the areas of the site that will be affected?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  19,
  'traffic_period_described',
  bu.id,
  NULL,
  'Have all staff been informed of the likely period of time that site traffic will be disrupted?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  20,
  'traffic_conflicting_checked',
  bu.id,
  NULL,
  'Have you checked for conflicting work or activity on site roads?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  21,
  'traffic_emergency_exits',
  bu.id,
  NULL,
  'Will access to emergency exits, or emergency equipment and services be blocked?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  22,
  'traffic_deliveries_communicated',
  bu.id,
  NULL,
  'Have you communicated the likely impact on site deliveries, customer traffic to site?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  23,
  'traffic_route_checked',
  bu.id,
  NULL,
  'Have you checked the planned route of travel is appropriate for the load size and weight? (E.g. gradient, width, surface etc.)',
  'yesnona',
  'Yes; No; N/A',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  24,
  'traffic_barriers_planned',
  bu.id,
  NULL,
  'Have you clearly marked the area using barriers, cones and signs etc.?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  25,
  'traffic_pedestrian_hazards',
  bu.id,
  NULL,
  'Will all pedestrians be safe from traffic inside the marked barriers?',
  'yesno',
  'Yes; No',
  true,
  'traffic_diversion_required',
  'yes',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  26,
  'tire_safety',
  bu.id,
  NULL,
  'Safety systems in place for inflating tyres.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  27,
  'batteries_protected',
  bu.id,
  NULL,
  'Batteries protected from arcing.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  28,
  'wheels_removed',
  bu.id,
  NULL,
  'Will any wheels be removed during this work?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  29,
  'chocks_used',
  bu.id,
  NULL,
  'Suitable chocks being used to prevent movement?',
  'yesnona',
  'Yes; No; N/A',
  true,
  'wheels_removed',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  30,
  'retorque_sop',
  bu.id,
  NULL,
  'Aware of retorqueing required on all heavy vehicles after tyre wheel removal?',
  'yesnona',
  'Yes; No; N/A',
  true,
  'wheels_removed',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  31,
  'wheel_torque_level',
  bu.id,
  NULL,
  'Correct Wheel torque level known',
  'text',
  NULL,
  true,
  'wheels_removed',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  'Nm',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  32,
  'retorque_record',
  bu.id,
  NULL,
  'Wheel Retorque Record Completed',
  'yesnona',
  'Yes; No; N/A',
  true,
  'wheels_removed',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  33,
  'hydraulic_raising',
  bu.id,
  NULL,
  'Will Hydraulic Bins, Buckets or Booms need to be raised?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  34,
  'overhead_check',
  bu.id,
  NULL,
  'Are there any overhead structures/powerlines and wires present?',
  'yesnona',
  'Yes; No; N/A',
  true,
  'hydraulic_raising',
  'yes',
  NULL,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  35,
  'bins_empty',
  bu.id,
  NULL,
  'Was bins checked to ensure they are empty?',
  'yesnona',
  'Yes; No; N/A',
  true,
  'hydraulic_raising',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  36,
  'locks_used',
  bu.id,
  NULL,
  'Approved locks used for securing raised attachments',
  'yesnona',
  'Yes; No; N/A',
  true,
  'hydraulic_raising',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  37,
  'pins_props',
  bu.id,
  NULL,
  'Approved pins or props in place before anyone can work under raised attachments/bins/buckets',
  'yesnona',
  'Yes; No; N/A',
  true,
  'hydraulic_raising',
  'yes',
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'mobilePlantServicing',
  38,
  'no_person_raised_bucket',
  bu.id,
  NULL,
  'Will any person work in or be carried in a raised bucket of mobile plant?',
  'yesnona',
  'Yes; No; N/A',
  true,
  'hydraulic_raising',
  'yes',
  NULL,
  NULL,
  NULL,
  true,
  true,
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  1,
  'lockout_recorded',
  bu.id,
  NULL,
  'All people working on fixed plant have applied a lockout and lockouts and these are recorded in Isolations section the PTW',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  2,
  'zero_energy_confirmed',
  bu.id,
  NULL,
  'A zero-energy state confirmed. (All electrical, hydraulic, pneumatic, mechanical systems de-energized.  Think about hoseburst protection systems, springs, rollaway, flywheels etc.)',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  3,
  'workers_trained',
  bu.id,
  NULL,
  'All workers trained, competent and experienced at performing the repair task on the fixed plant.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  4,
  'manufacturer_manual',
  bu.id,
  NULL,
  'Is the repair being completed as per the Fixed Plant Manufacturers Workshop Manual where applicable or available?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  5,
  'access_restricted',
  bu.id,
  NULL,
  'Access to the repair area is restricted for pedestrians and vehicles. Only workers engaged in the work and signed on to the permit and the permit issuer have access to the service area.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  6,
  'fluids_contained',
  bu.id,
  NULL,
  'Are all fluids and other waste materials contained and will it be removed by the end of the task.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  7,
  'hot_fluids_controls',
  bu.id,
  NULL,
  'Controls for release/draining of hot fluids in place - e.g. engine oil, hydraulic oils etc',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  8,
  'pressurized_controls',
  bu.id,
  NULL,
  'Controls for venting of pressurized fluids or systems in place - e.g. hydraulic oil',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  9,
  'flammable_controls',
  bu.id,
  NULL,
  'Controls for flammables in place - e.g. petrol, diesel',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  10,
  'no_suspended_loads',
  bu.id,
  NULL,
  'Will anyone be under suspended loads?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true,
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  11,
  'plant_operation',
  bu.id,
  NULL,
  'If the plant is to be started or moved by a contractor, are they trained and competent in the operation of the fixed plant, hold the correct licenses and be trained in the relevant Winstone Aggregates SOPs.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  12,
  'safe_access_height',
  bu.id,
  NULL,
  'Is there safe access to the work area?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  13,
  'heavy_lifting_controls',
  bu.id,
  NULL,
  'Controls in place for heavy lifting that might be involved.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  14,
  'additional_permits',
  bu.id,
  NULL,
  'Are all associated permits completed?  eg. Hot Work, Working at Height, Lifting with Cranes or Hiabs etc.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'plantServicing',
  15,
  'tools_equipment',
  bu.id,
  NULL,
  'All tools, equipment used fit for purpose, safe, certified where necessary. Any custom-built items verified.',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  1,
  'environmental_clearance',
  bu.id,
  NULL,
  'Environmental consents followed?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  2,
  'archaeology_survey',
  bu.id,
  NULL,
  'Archaeological survey conditions/restrictions followed?',
  'yesnona',
  'Yes; No; N/A',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  3,
  'equipment_inspection',
  bu.id,
  NULL,
  'Stripping equipment pre-start inspections completed daily?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  4,
  'dust_control',
  bu.id,
  NULL,
  'Dust suppression measures in place?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  5,
  'traffic_management',
  bu.id,
  NULL,
  'Traffic management plan still relevant and correct?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  6,
  'overhead_wires',
  bu.id,
  NULL,
  'Overhead wires identified and adequately controlled?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  7,
  'speed_limits',
  bu.id,
  NULL,
  'Speed limits defined?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  8,
  'two_way_traffic',
  bu.id,
  NULL,
  '2-way traffic controlled?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  9,
  'light_vehicle_access',
  bu.id,
  NULL,
  'Light vehicle access controlled?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  10,
  'rt_calling_points',
  bu.id,
  NULL,
  'R/T calling points identified?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  11,
  'emergency_run_off',
  bu.id,
  NULL,
  'Emergency run off areas provided if needed?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  12,
  'haul_roads_bunded',
  bu.id,
  NULL,
  'All haul roads and faces adequately bunded?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  13,
  'haul_road_gradient',
  bu.id,
  NULL,
  'Gradient of all haul roads appropriate for vehicles used?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  14,
  'passing_points',
  bu.id,
  NULL,
  'Passing points defined on any single lane sections?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  15,
  'road_maintenance',
  bu.id,
  NULL,
  'Road maintenance adequate?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  16,
  'pushing_material_controls',
  bu.id,
  NULL,
  'Controls in place if pushing material over faces?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  17,
  'tipping_procedures',
  bu.id,
  NULL,
  'Tipping procedures followed correctly?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  18,
  'plant_operators_trained',
  bu.id,
  NULL,
  'All mobile plant operators adequately trained and supervised?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  19,
  'operator_sign_in',
  bu.id,
  NULL,
  'All operators signed in on site daily?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  20,
  'stripping_comms',
  bu.id,
  NULL,
  'There is an agreed plan of communication in case of emergency?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  21,
  'adverse_weather_controls',
  bu.id,
  NULL,
  'Controls in place to manage hazards arising from environmental conditions (rain/fog/frost/sun)?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'stripping',
  22,
  'stripping_quarry_interaction',
  bu.id,
  NULL,
  'Access to stripping area, and interaction with quarry vehicles managed?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  1,
  'survey_plan',
  bu.id,
  NULL,
  'Survey plan and methodology approved?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  2,
  'qualified_surveyor',
  bu.id,
  NULL,
  'Name of Qualified surveyor assigned to task',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  3,
  'equipment_calibration',
  bu.id,
  NULL,
  'Survey equipment calibration current?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  4,
  'site_access',
  bu.id,
  NULL,
  'Safe site access routes established?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  5,
  'communication',
  bu.id,
  NULL,
  'What is the communication plan while pedestrian is on site?',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Describe communication method and frequency',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  6,
  'site_plan_advising',
  bu.id,
  NULL,
  'Surveyor given site plan advising of location of all stockpiles and agreed access routes?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  7,
  'vehicle_flashing_beacon',
  bu.id,
  NULL,
  'Surveyor''s vehicle fitted with flashing beacon and flag?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  8,
  'rt_communication',
  bu.id,
  NULL,
  'Surveyor has R/T, is aware of correct channel to use in relevant areas of site, site R/T protocol and need for all calls to be acknowledged?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  9,
  'driving_procedures',
  bu.id,
  NULL,
  'Surveyor is inducted to site procedures for driving to site stockyards (i.e. give way to mobile plant, flashing light on, one way systems, using R/T calls etc)?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  10,
  'quarry_vehicles_advised',
  bu.id,
  NULL,
  'All relevant quarry vehicles to be advised of surveyor activity before commencing?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  11,
  'drone_preference',
  bu.id,
  NULL,
  'Is the surveying being done by drone to prevent pedestrian access around stockpiles?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  12,
  'stockpile_surveying',
  bu.id,
  NULL,
  'Stockpile Surveying',
  'section',
  NULL,
  false,
  NULL,
  NULL,
  'Only complete this part if you need to access the stockpile on foot',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  13,
  'loader_operator_advised',
  bu.id,
  NULL,
  'Loader and Dump truck operator(s) advised via R/T of pedestrian presence prior to measuring each stockpile?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  14,
  'vehicle_parking',
  bu.id,
  NULL,
  'Will the vehicle be parked in load out areas of stockpile to be measured, to restrict mobile plant access?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  15,
  'haul_road_clear',
  bu.id,
  NULL,
  'Pedestrians will keep clear of haul roads or other areas heavy vehicles may be operating and work by stockpile only?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  16,
  'avoid_loaded_stockpile',
  bu.id,
  NULL,
  'Surveyor understands not to approach any stockpile currently being loaded on to by dumper, or from by loader - wait in vehicle until the mobile plant has moved clear?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  17,
  'undercut_faces_clear',
  bu.id,
  NULL,
  'Surveyor aware of what an undercut stockpile face is, and to keep clear and notify any undercuts to QM?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  18,
  'pit_face_surveying',
  bu.id,
  NULL,
  'Pit and Face Surveying',
  'section',
  NULL,
  false,
  NULL,
  NULL,
  'Only complete this part if you need to access the pit on foot',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  19,
  'no_unprotected_benches',
  bu.id,
  NULL,
  'Does all benches where access is needed have over edge protection?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  20,
  'no_edge_protection_standing',
  bu.id,
  NULL,
  'Is pedestrian aware that it is not allowed to stand on edge protection bunding?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  21,
  'face_stability',
  bu.id,
  NULL,
  'Faces has been inspected for stability before approaching closer than 3m to toe?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'surveying',
  22,
  'avoid_operating_vehicles',
  bu.id,
  NULL,
  'Will pedestrians be entering areas where quarry vehicles are operating directly above or next to the pedestrian?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  1,
  'trained_competent',
  bu.id,
  NULL,
  'Are all workers undertaking the task trained and competent in work at heights?',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  2,
  'fitness',
  bu.id,
  NULL,
  'Are all persons fit for work at height? No persons are suffering from any ailment, illness or physical condition that could put any person at risk during work at height.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  3,
  'equip_types',
  bu.id,
  NULL,
  'Which working at height equipment will be used?',
  'multi_checkbox',
  '[{"label":"MEWP","value":"mewp"},{"label":"Scaffold","value":"scaffold"},{"label":"Ladders","value":"ladder"},{"label":"Other","value":"other","textLabel":"Specify other systems"},{"label":"No W@H equipment needed, access available","value":"none"}]',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  4,
  'fall_prevention',
  bu.id,
  NULL,
  'Fall prevention methods that will be in place?',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  5,
  'protection_system',
  bu.id,
  NULL,
  'Will fall protection systems be used?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  6,
  'system_types',
  bu.id,
  NULL,
  'Which fall protection systems will be used?',
  'multi_checkbox',
  '[{"label":"Total Restraint","value":"total_restraint"},{"label":"Fall Restraint","value":"fall_restraint"},{"label":"Work Positioning","value":"work_positioning"},{"label":"Limited Free Fall Arrest","value":"limited_free_fall"},{"label":"Free Fall Arrest","value":"free_fall_arrest"},{"label":"Physical Barriers","value":"barriers"},{"label":"Other","value":"other","textLabel":"Specify other systems"}]',
  true,
  'protection_system',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  7,
  'protection_system_controls',
  bu.id,
  NULL,
  'Any other additional controls needed for this equipment?',
  'text',
  NULL,
  false,
  'protection_system',
  'yes',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  8,
  'safety_equipment',
  bu.id,
  NULL,
  'What extra PPE is needed',
  'multi_checkbox',
  '[{"label":"Harness","value":"harness"},{"label":"Lanyard","value":"lanyard"},{"label":"Working at Heights Helmet","value":"wah_helmet"},{"label":"Other","value":"other","textLabel":"Specify other PPE"}]',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  9,
  'ladder_best_method',
  bu.id,
  NULL,
  'Is a ladder the best method to access the work area required? (Ladders should only be used for low-risk, short-duration tasks under 30 minutes)',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  'Do not: Go beyond the third rung from the top; Leave tools on the ladder; Allow overreach; Carry loads that will prevent three points of contact; Use with more than one person',
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  10,
  'ladder_condition',
  bu.id,
  NULL,
  'Is the ladder to be used in good condition?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  'Check: All rubber feet present; All rungs in good condition; All safety catches/locking bars intact; AS/NZS 1892 standard mark present and rated for weight',
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  11,
  'ladder_overhang',
  bu.id,
  NULL,
  'If being used as an access way, does the ladder overhang at least one metre beyond the step off point?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  12,
  'ladder_secured',
  bu.id,
  NULL,
  'Is the ladder secured against movement at the top and bottom? (Note: you must have someone hold the ladder at the bottom initially to set this up)',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  13,
  'ladder_level_ground',
  bu.id,
  NULL,
  'Is the ladder to be footed on level ground?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  14,
  'ladder_angle',
  bu.id,
  NULL,
  'Is the angle of the ladder set up to a ratio of 4 up and 1 out?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  15,
  'ladder_access_way',
  bu.id,
  NULL,
  'Is the ladder in a vehicle or pedestrian access way? (Put up temporary barriers - cones/tape/signage etc)',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'yes',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  16,
  'ladder_three_points',
  bu.id,
  NULL,
  'Will it be possible to maintain 3 points of contact at all times?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'ladder',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  17,
  'mewp_daily_check',
  bu.id,
  NULL,
  'Has a daily check been performed on the EWP?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  18,
  'mewp_operator_trained',
  bu.id,
  NULL,
  'Is the operator trained in the use of this elevating work platform?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  19,
  'mewp_inspected',
  bu.id,
  NULL,
  'Has the machine been inspected within the previous 6 months?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  20,
  'mewp_controls_identified',
  bu.id,
  NULL,
  'Are all the controls clearly identified with direction of movement and operate correctly when tested?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  21,
  'mewp_emergency_stop',
  bu.id,
  NULL,
  'Does the emergency stop operate when activated?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  22,
  'mewp_fluid_levels',
  bu.id,
  NULL,
  'Are fuel, water, oil and battery levels adequate?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  23,
  'mewp_no_damage',
  bu.id,
  NULL,
  'Is there any visible damage?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  24,
  'mewp_level_ground',
  bu.id,
  NULL,
  'Is the machine set up on level ground with stabilisers extended to the ground?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  25,
  'mewp_exclusion_zone',
  bu.id,
  NULL,
  'Is there a clear exclusion zone set up around the work area?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  26,
  'mewp_weight_limit',
  bu.id,
  NULL,
  'Will the weight be kept within the SWL? (A person and their tools calculated at being 100kgs)',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  27,
  'mewp_horn_check',
  bu.id,
  NULL,
  'If a self-propelled EWP is being used are the horn operating correctly?',
  'yesno',
  'Yes; No',
  false,
  'equip_types',
  'mewp',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  28,
  'scaffold_tag_safe',
  bu.id,
  NULL,
  'Does the scaffold have a tag to confirm it is safe for use?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'scaffold',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  29,
  'scaffold_guardrail_toe_board',
  bu.id,
  NULL,
  'All working platforms has a guardrail and toe board?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'scaffold',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  30,
  'scaffold_no_damage',
  bu.id,
  NULL,
  'Is there any visible damage to the scaffold?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'scaffold',
  NULL,
  NULL,
  'yes',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  31,
  'scaffold_exclusion_zone',
  bu.id,
  NULL,
  'Is there a clear exclusion zone set up around the work area to prevent incidents from dropped objects?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'scaffold',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  32,
  'scaffold_weight_limit',
  bu.id,
  NULL,
  'Will the weight be kept within the SWL?',
  'yesno',
  'Yes; No',
  true,
  'equip_types',
  'scaffold',
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  33,
  'harness_lanyard_inspected',
  bu.id,
  NULL,
  'All harnesses/lanyards/ropes etc. externally inspected in the last 6 months?',
  'yesno',
  'Yes; No',
  true,
  'safety_equipment',
  'harness,lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  34,
  'anchor_points_certified',
  bu.id,
  NULL,
  'All anchor points certified and inspected in the last 12 months?',
  'yesno',
  'Yes; No',
  true,
  'safety_equipment',
  'harness,lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  35,
  'harness_webbing',
  bu.id,
  NULL,
  'Webbing - No cuts, nicks, tears, fraying, abrasions, burns, mold, mildew, or chemical damage',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  36,
  'harness_stitching',
  bu.id,
  NULL,
  'Stitching - Not broken, burned, pulled, or missing threads',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  37,
  'harness_hardware',
  bu.id,
  NULL,
  'Hardware (D-Rings, Buckles, Pass-Thru) - Check for rust, cracks, corrosion, distortion, sharp edges, or deformation',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  38,
  'harness_impact_indicators',
  bu.id,
  NULL,
  'Impact indicators - Verify tags have not been deployed or torn',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  39,
  'harness_labels',
  bu.id,
  NULL,
  'Labels/Tags - Ensure labels are present and legible, providing manufacturer, model, and serial number',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  40,
  'harness_fit',
  bu.id,
  NULL,
  'Fit/Adjustment - Ensure straps and buckles operate smoothly and can be properly adjusted to the user',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  41,
  'harness_correct_size',
  bu.id,
  NULL,
  'Correct size harness for the person?',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'harness',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  42,
  'lanyard_webbing',
  bu.id,
  NULL,
  'Webbing/Rope - Inspect for frays, tears, burns, cuts, and chemical/UV degradation',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  43,
  'lanyard_shock_absorber',
  bu.id,
  NULL,
  'Shock Absorber/Pack - Check the pouch for tearing, burning, or stitches that have already deployed',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  44,
  'lanyard_hardware',
  bu.id,
  NULL,
  'Hardware (Hooks/Carabiners) - Inspect for distortion, cracks, and ensuring gate mechanisms self-lock and close properly',
  'yesno',
  'Yes; No',
  false,
  'safety_equipment',
  'lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  true,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  45,
  'anchor_points',
  bu.id,
  NULL,
  'Specify the anchor point(s)',
  'text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  46,
  'falling_objects',
  bu.id,
  NULL,
  'Provision made to prevent objects from falling below, such as tethering, kickrails etc.',
  'yesno',
  'Yes; No',
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  47,
  'tool_count',
  bu.id,
  NULL,
  'Tool count completed before and after work?',
  'yesnona',
  'Yes; No; N/A',
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  'no',
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  48,
  'initial_tool_count',
  bu.id,
  NULL,
  'How many tools are you taking with you?',
  'text',
  NULL,
  false,
  'tool_count',
  'yes,na',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Enter number of tools',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  49,
  'overhead_lines',
  bu.id,
  NULL,
  'Will work at height be conducted within 4 meters of overhead lines? All work closer than 4 meters to overhead conductors must be authorized by the network operator.',
  'yesno',
  'Yes; No',
  true,
  NULL,
  NULL,
  'Network operator approval required if within 4m',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  50,
  'network_operator_approval',
  bu.id,
  NULL,
  'Network operator approval',
  'attachment',
  NULL,
  false,
  'overhead_lines',
  'yes',
  'Attach network operator approval document',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  51,
  'emergency_retrieval',
  bu.id,
  NULL,
  'Describe emergency retrieval plan and suspension trauma relief procedures',
  'text',
  NULL,
  true,
  'safety_equipment',
  'harness,lanyard',
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Describe emergency retrieval plan and suspension trauma relief procedures',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  52,
  'safety_watch',
  bu.id,
  NULL,
  'Safety watch required? Safety Watch must be present if harness is in use.',
  'yesno_text',
  NULL,
  true,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  false,
  NULL,
  'Name safety watch person and describe their specific duties',
  NULL,
  NULL,
  false,
  true
FROM business_units bu;

INSERT INTO permit_questions (
  permit_type_key, question_number, question_id, business_unit_id, site_id,
  question_text, question_type, options, required,
  depends_on_question_id, depends_on_value, note,
  controls_label, controls_on, no_controls,
  blocking_question, blocking_answer,
  text_label, yes_label, no_label, inline_only, is_published
)
SELECT
  'workingAtHeight',
  53,
  'exclusion_zone_photo',
  bu.id,
  NULL,
  'Exclusion zone photo',
  'attachment',
  NULL,
  false,
  'mewp_exclusion_zone,scaffold_exclusion_zone',
  'yes',
  'Attach photo of exclusion zone setup',
  NULL,
  NULL,
  false,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  false,
  true
FROM business_units bu;
