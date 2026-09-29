# Suppliers lock-down (low-traffic admin area)

Supplier data is **not** used for morning sign-ins. Lock-down removes **anon PostgREST** reads/writes on `suppliers` and `supplier_accreditations` while keeping:

| Flow | Mechanism |
|------|-----------|
| Admin list / CSV / invite | `GET /api/list-suppliers`, `POST /api/create-supplier`, `POST /api/delete-supplier` (service role) |
| Admin accreditation editor | `GET /api/get-supplier-accreditation`, `POST /api/save-supplier-accreditation`, `POST /api/update-supplier-profile` |
| Public supplier form (email link) | Token APIs: `validate-supplier-token`, `get-supplier-accreditation-by-token`, `save-supplier-accreditation-by-token`, `upload-supplier-document` |
| Invitation email | `api/send-email.js` (service role) |

## Go / no-go (all YES before SQL)

1. **`SUPABASE_SERVICE_ROLE_KEY`** is set on Vercel (already required for supplier invite).
2. **Frontend deployed** with `src/api/supplierApi.js` using APIs only (no PostgREST fallback).
3. **Smoke test (production or preview with service role):**
   - Admin → Suppliers: list loads.
   - Open one supplier accreditation, save a draft.
   - Optional: open a `supplier-form?token=…` link and save.
4. **Anon probe (after SQL):** `./scripts/security/probe-anon-rest.sh suppliers 1` → non-200 or empty, not a JSON array of companies.

## Sequence

```text
1. Merge + deploy frontend (Vercel)
2. Run migrations/lock-down-anon-suppliers.sql in Supabase SQL Editor
3. Re-run anon probes + quick admin supplier smoke test
```

## If something breaks

- **Empty supplier list:** check Vercel function logs for `list-suppliers`; confirm service role env vars.
- **Save fails:** confirm `save-supplier-accreditation` and `SUPABASE_SERVICE_ROLE_KEY`.
- Do **not** re-open broad anon policies; fix forward via APIs.
