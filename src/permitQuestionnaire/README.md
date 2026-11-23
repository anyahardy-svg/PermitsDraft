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

## Setup

1. Run `migrations/add-permit-questions-flat-table.sql`
2. Seed: `node scripts/seed-permit-questions-from-defaults.mjs` (service role env)
3. Edit via CSV or admin

Runtime falls back to `defaults.js` if no published rows exist for that business unit.

Legacy tables `permit_questionnaire_sets` / `permit_questionnaire_site_questions` are no longer read by the app.