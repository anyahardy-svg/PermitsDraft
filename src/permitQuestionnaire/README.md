# Permit questionnaires (specialized permits)

BU-wide **base** questions live in `permit_questionnaire_sets`. **Site-only extras** are additive rows in `permit_questionnaire_site_questions` and are merged at runtime.

## Database

Run [`migrations/add-permit-questionnaire-config.sql`](../../migrations/add-permit-questionnaire-config.sql) in Supabase.

Until a BU has a **published** base set, the app uses bundled [`defaults.js`](defaults.js) (same content as the former in-app definitions).

## Admin UI

Open **Admin → Permit Questionnaires** on the dashboard, or go directly to **`/admin/permit-questionnaires/`** after admin login.

## CSV

Import/export from the admin screen. `scope` is `base` or `site_addition`. Empty `site_name` with `base` updates the BU questionnaire; `site_addition` requires `site_name`.

Example site-only row:

```csv
permit_type_key,business_unit_name,site_name,scope,question_id,sort_order,insert_after_question_id,text,type,required
hotWork,Winstone Aggregates,Hunua Quarry,site_addition,site_hunua_extra_dust,1000,workshop_alternative,Any extra dust controls on this face?,yesno,true
```