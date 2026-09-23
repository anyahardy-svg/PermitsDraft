# Admin login troubleshooting

## “Password or username incorrect” (Emma and others)

Login uses the **`admin-auth`** Edge Function. As of **v9**, it verifies passwords in two ways (bcrypt **first** for `$2a$` / `$2b$` hashes):

1. **Postgres `admin_login_verify`** (`crypt`) — matches passwords set via SQL, e.g.  
   `UPDATE admin_users SET password_hash = extensions.crypt('...', extensions.gen_salt('bf', 10)) WHERE id = '...';`
2. **Legacy bcryptjs** — matches passwords created in the old app or via **`setPassword`** in the Edge function.

If only v7 (or earlier) is deployed, users with **bcryptjs** hashes (most admins except those reset in SQL) will always see “incorrect password”.

**Fix:** Deploy `supabase/functions/admin-auth/index.ts` from the repo (version **`2026-03-23-v9`**). Confirm with:

```json
{ "action": "ping" }
```

Response should include `"version": "2026-03-23-v9"`.

If Emma/Simon could use the app before a restart but not after, their **saved session** was masking a broken login path — redeploy **v9** (not only the website).

### Test whether the database accepts a password (SQL Editor)

```sql
SELECT email,
       password_hash = extensions.crypt('THEIR_PASSWORD_TRY', password_hash) AS pg_crypt_ok,
       left(password_hash, 7) AS hash_type
FROM admin_users
WHERE lower(email) = lower('user@example.com');
```

- `pg_crypt_ok = true` → password is correct for Postgres; Edge **v9** should allow login.
- `pg_crypt_ok = false` but they used the app before → hash is likely **bcryptjs**; **v9** Edge must be deployed (bcrypt runs in the function, not in this SQL test).

### Check an admin in SQL (no password shown)

```sql
SELECT id, email, name, role,
       password_hash IS NOT NULL AND length(trim(password_hash)) > 0 AS has_password,
       left(password_hash, 4) AS hash_prefix
FROM admin_users
WHERE lower(email) = lower('emma@example.com');
```

- `has_password = false` → user needs **invite / password setup**, not login.
- `hash_prefix` is usually `$2a$` or `$2b$` for bcrypt (legacy or SQL).

### Emergency password reset (SQL Editor)

```sql
UPDATE admin_users
SET password_hash = extensions.crypt(
  'ChooseANewTempPassword123',
  extensions.gen_salt('bf', 10)
)
WHERE lower(email) = lower('emma@example.com');
```

Share the temp password securely; user should change it after login.

## Simon still lands on Site Manager Hub

The app sends users to the hub when **`role = 'manager'`**. Super admins must have **`role = 'super_admin'`** in `admin_users`.

```sql
SELECT email, name, role FROM admin_users
WHERE lower(name) LIKE '%simon%' OR lower(email) LIKE '%simon%';
```

```sql
UPDATE admin_users SET role = 'super_admin'
WHERE id = '<simon-uuid>';
```

After a **frontend** deploy, super admins signing in from `/manager/` are redirected to `/admin/`. If Simon still sees the hub, his row is almost certainly still **`manager`**, or the browser is serving an old JS bundle (hard refresh).
