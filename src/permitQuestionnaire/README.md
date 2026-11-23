# Specialised permit questions (flat sheet model)

## One table: `permit_questions`

Each row is one question. **Admin → Permit Questionnaires** or CSV.

| Column (CSV) | Meaning |
|--------------|---------|
| specialised_permit | e.g. `Hot Work` |
| question_number | Order (1, 2, 3 …) |
| question_id | Stable key stored on permits (e.g. `workshop_alternative`) |
| business_unit | e.g. `Winstone Aggregates` |
| sites | `All Sites` or exact site name (e.g. `Hunua Quarry`) |
| question | Question text |
| question_type | See **questionTypes.js** (`QUESTION_TYPE_LABELS`, `OPTIONS_FORMAT`) |
| options | See type guide in admin screen |

### Question types (summary)

| question_type | options column |
|---------------|----------------|
| yesno | `Yes; No` (optional) |
| yesnona | `Yes; No; N/A` (optional) |
| radio | `Choice A; Choice B` (required) |
| multi_checkbox | JSON array of `{label, value}` |
| text | empty (use text_label if needed) |
| yesno_text | empty (use yes_label / no_label) |
| contractor_lookup | `Lookup Contractors or overwrite` |
| attachment | empty |
| section | empty (heading only) |

Full detail: `src/permitQuestionnaire/questionTypes.js`

## Setup (no command prompt required)

1. Supabase **SQL Editor** → run `migrations/add-permit-questions-flat-table.sql`
2. Same SQL Editor → run `migrations/seed-permit-questions-from-defaults.sql` (copies bundled defaults into one row per question for **each** business unit, All Sites)
3. Edit via admin **Import/Export sheet** or SQL

Optional: `node scripts/seed-permit-questions-from-defaults.mjs` instead of step 2 if you can run Node with service role env.

Runtime falls back to `defaults.js` if no published rows exist for that business unit.

Legacy tables `permit_questionnaire_sets` / `permit_questionnaire_site_questions` are no longer read by the app.