# Admin login troubleshooting

## “Password or username incorrect” (Emma and others)

Login uses the **`admin-auth`** Edge Function. As of **v8**, it verifies passwords in two ways:

1. **Postgres `admin_login_verify`** (`crypt`) — matches passwords set via SQL, e.g.  
   `UPDATE admin_users SET password_hash = extensions.crypt('...', extensions.gen_salt('bf', 10)) WHERE id = '...';`
2. **Legacy bcryptjs** — matches passwords created in the old app or via **`setPassword`** in the Edge function.

If only v7 (or earlier) is deployed, users with **bcryptjs** hashes (most admins except those reset in SQL) will always see “incorrect password”.

**Fix:** Deploy `supabase/functions/admin-auth/index.ts` from the repo (version **`2026-03-23-v8`**). Confirm with:

```json
{ "action": "ping" }
```

Response should include `"version": "2026-03-23-v8"`.

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
