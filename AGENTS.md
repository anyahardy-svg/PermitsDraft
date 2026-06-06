# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

ContractorHQ (`permitsappexpo`) is an Expo/React Native web + mobile app for construction site workforce operations (permits, inductions, kiosk sign-in, admin portals). Backend is **hosted Supabase** (no local Supabase stack in repo).

### Services

| Service | Command | Port | Required for |
|---------|---------|------|--------------|
| Expo web dev server | `npm run web` or `npx expo start --web --port 8081` | 8081 | Local frontend dev |
| Vercel dev (API routes) | `vercel dev` | 3000 (default) | `/api/*` email & auth-user routes locally |

Supabase is cloud-hosted. Fallback URL/anon key are in `src/config.js` so the app boots without `.env` for basic DB reads.

### Common commands

See `package.json` scripts:

- **Install:** `npm install` (uses `legacy-peer-deps=true` from `.npmrc`)
- **Dev (web):** `npm run web`
- **Build (web):** `npm run build` → outputs to `dist/`
- **Lint / test:** No root ESLint or test runner configured; `App.test.js` is a stub.

If `npm run build` fails with `Cannot find module ... @urql/core/dist/urql-core.js`, do a clean reinstall: `rm -rf node_modules && npm install`.

### Environment variables

Copy `.env.example` → `.env` for custom Supabase/Brevo keys. Optional for basic UI + Supabase reads (fallbacks in `src/config.js`). Privileged flows (`/api/create-auth-user`, email) need `SUPABASE_SERVICE_ROLE_KEY` and `BREVO_API_KEY` via Vercel env or `vercel dev`.

### Dev server caveats

- Run Expo in a **tmux** session for long-lived dev (`expo-web-dev` or similar); `CI=1` avoids interactive Expo prompts.
- Direct navigation to `/sign-in-contractor` may redirect when auth middleware is active; use the floating **Contractor** button from the home page or test from `/admin` for admin login modal.
- `vercel dev` is **not** in `package.json`; install Vercel CLI globally if you need local `/api/*` routes.

### Manual DB / storage setup

One-off scripts at repo root (`setup-bucket.js`, `apply-migration.sh`, SQL in `migrations/`) target the hosted Supabase project and require `SUPABASE_SERVICE_ROLE_KEY` — not part of routine dev startup.
