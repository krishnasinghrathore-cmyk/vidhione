# Vidhione New

Vidhione's new developer panel. This repository includes a Vite + React frontend and an Encore TypeScript backend.

## Project structure

- `src/` - Frontend application (React Router, PrimeReact UI).
- `backend/` - Encore services (`auth`, `accounts`, `wealth`) with GraphQL + Drizzle.
- `docs/` - Project notes and references.
- `public/` - Static assets for the frontend.

## Frontend development

```bash
npm install
npm run dev
```

Other useful commands:

```bash
npm run lint
npm run format
npm run build
npm run preview
```

## Backend development

```bash
cd backend
npm install
npm run dev
```

The Encore dev dashboard is available while `encore run` is active.

## Environment configuration

- Frontend: `.env.local` (Vite variables must be prefixed with `VITE_`).
- Backend: `backend/.env.local` for Encore configuration.
- Update `.env.example` when adding new variables.

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

## Tech stack

- Frontend: React 18, Vite, PrimeReact, PrimeFlex, React Router, Apollo Client.
- Backend: Encore TS, GraphQL, Drizzle ORM, PostgreSQL.
