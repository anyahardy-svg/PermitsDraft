# Permit questionnaires (specialized permits)

BU-wide **base** questions live in `permit_questionnaire_sets`. **Site-only extras** are additive rows in `permit_questionnaire_site_questions` and are merged at runtime.

## Database

Run [`migrations/add-permit-questionnaire-config.sql`](../../migrations/add-permit-questionnaire-config.sql) in Supabase.

Until a BU has a **published** base set, the app uses bundled [`defaults.js`](defaults.js) (same content as the former in-app definitions).

## Admin UI

Open **`/admin/permit-questionnaires/`** after logging into the admin panel (route is wired; dashboard tile not added to avoid unrelated UI changes).

## CSV

Import/export from the admin screen. `scope` is `base` or `site_addition`. Empty `site_name` with `base` updates the BU questionnaire; `site_addition` requires `site_name`.

Example site-only row:

```csv
permit_type_key,business_unit_name,site_name,scope,question_id,sort_order,insert_after_question_id,text,type,required
hotWork,Winstone Aggregates,Hunua Quarry,site_addition,site_hunua_extra_dust,1000,workshop_alternative,Any extra dust controls on this face?,yesno,true
```