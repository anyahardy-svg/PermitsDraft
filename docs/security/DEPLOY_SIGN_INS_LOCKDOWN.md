# Sign-in register lock-down (`sign_ins`)

## What this protects

- Stops **anon PostgREST** dumps of the sign-in register (all sites, full history, phones, etc.).
- Kiosk URL users only get **site-scoped** data via `/api/kiosk-sign-ins` and `/api/kiosk-check-in` (name, company, masked phone on sign-out UI).
- **Manager history** via `/api/manager-sign-in-history` with `requestingAdminId`.

## Deploy order

1. Merge + **Vercel** deploy (APIs + `signIns.js` + kiosk UI without contractor email on picker).
2. Smoke **before SQL** on one kiosk subdomain:
   - Contractor check-in
   - Visitor check-in
   - Sign-out + on-site list
3. Manager hub: sign-in history search for one site.
4. Run `migrations/lock-down-anon-sign_ins.sql`.
5. `./scripts/security/probe-anon-rest.sh sign_ins 1` → denied or empty.

## APIs

| Route | Use |
|-------|-----|
| `POST /api/kiosk-check-in` | Contractor check-in |
| `POST /api/kiosk-sign-ins` | `checkInVisitor`, `checkOut`, `listOnSite` |
| `POST /api/manager-sign-in-history` | Manager search (admin session id) |

Optional body fields: `kioskSubdomain`, `hostname` (validated against `sites.kiosk_subdomain` in production).

## Not changed

- `sign_ins` auto-signout cron (service role).
- Sign-in notification emails (server-side).
