# Anon key exposure note

Date: YYYY-MM-DD  
Author:  
Environment probed: production / staging  

## Principle

The Supabase anon key is embedded in the web client. Anyone can use it against PostgREST. UI login (admin or contractor) does not protect tables unless RLS/storage policies enforce access for the `anon` / `authenticated` roles.

## REST probe results (anon only)

| Table | HTTP | Rows returned? | Notes |
|-------|------|----------------|-------|
| contractors | | | |
| companies | | | |
| admin_users | | | Do not commit real row data |

Command: `./scripts/security/probe-anon-rest.sh <table> 1`

## Live vs repo

- Live export date:  
- Drift summary (policies only in prod / only in git):  

## Critical findings (fix in step 2+)

1.  
2.  
3.  

## Team rule (effective immediately)

- No new RLS policies with `USING (true)` or `WITH CHECK (true)` for `anon` on tenant or PII data.
- Every RLS migration PR must state which roles can SELECT/INSERT/UPDATE/DELETE.
