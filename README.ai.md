# README.ai

Quick context for AI agents working in `vidhione`.

## Project layout

- `src/` - Vite + React frontend (PrimeReact UI, React Router).
- `backend/` - Encore TS services (`auth`, `accounts`, `wealth`) with Drizzle + GraphQL.
- `docs/` - internal notes and references.

## Common commands

Frontend (from repo root):

```bash
npm install
npm run dev
```

Backend (from `backend/`):

```bash
npm install
npm run dev
```

## Key conventions

- Routes are defined in `src/Router.tsx` and rendered from `src/App.tsx`.
- Use PrimeReact/PrimeFlex components and patterns where possible.
- Keep shared frontend helpers in `src/lib/` and types in `src/types/`.
- Backend GraphQL lives in `backend/services/<service>/graphql/`.
- GraphQL is the only data API surface; do not add REST endpoints.
- Database schemas live in `backend/services/<service>/db/schemas/` (Drizzle).
- Use Zod for non-trivial validation on both client and server.

## Env notes

- Frontend: `.env.local` (Vite variables must be prefixed with `VITE_`).
- Backend: `backend/.env.local` for Encore; update `.env.example` when adding vars.

## Auth & tenancy (one DB per tenant)

- Control-plane DB: set `AUTH_DB_URL` + run `backend/services/auth/db/001_init.sql`.
- JWT: set `AUTH_JWT_SECRET` (required once the frontend sends `Authorization` headers).
- Multi-tenant routing: set `TENANT_DIRECTORY_MODE=db` and configure `tenant_databases(service='default')` per tenant.
- Bootstrap: run the `bootstrap` mutation on `/auth/graphql` (only works when `users` is empty).
- Superadmin UI: `/admin/tenants` (tenants + DB + apps) and `/admin/users` (create users, reset passwords, assign tenant).

## SaaS model (admin vs tenant modes)

- Admin mode: superadmin without a tenant context sees only admin menus (tenants/users).
- Tenant mode: after Launch, the token includes `tenantId`; menus and app access are filtered by entitlements.
- Launch requires: active tenant, configured DB, and at least one user assigned to the tenant.
- Exit Tenant returns to the admin console; Support Mode banner confirms the active tenant context.

## Dev testing (create tenant user without email/SMS)

- Get a tenant id (superadmin token required):
  ```graphql
  query {
    adminTenants { items { id name isActive hasDatabase } }
  }
  ```
- If needed, activate the tenant:
  ```graphql
  mutation {
    adminSetTenantActive(input: { tenantId: "TENANT_ID", isActive: true }) { ok }
  }
  ```
- Create a tenant user:
  ```graphql
  mutation {
    adminCreateUser(input: {
      email: "test@agency.com"
      password: "Test@1234"
      role: "tenant_admin"
      tenantId: "TENANT_ID"
    }) {
      user { id email role isActive tenantId }
    }
  }
  ```
- If login fails due to phone verification, set `AUTH_ENFORCE_PHONE_VERIFICATION=0` in `backend/.env.local` for dev or use the invite flow with OTPs logged when `AUTH_DEV_OTP=1`.

## Useful checks

- Frontend lint: `npm run lint`
- Frontend format: `npm run format`
- Backend tests: `cd backend && npm run test` (placeholder)
