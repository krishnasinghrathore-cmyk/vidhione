# Agent Guidelines for `vidhione/`

This project contains a Vite + React frontend and an Encore TS backend (GraphQL + Drizzle). Keep changes aligned with existing patterns and conventions.

## General

- Prefer TypeScript for new code; avoid `any` unless you isolate it at boundaries.
- Follow the existing folder structure and naming; avoid introducing new libraries unless necessary.
- Keep changes minimal and local (feature folders) instead of large global utilities.
- Do not commit secrets; only update `.env.example` with safe sample values.
- Daily knowledge log is mandatory: after every task/update, append a short entry to `docs/knowledge-book/daily-work-log.md`.
- Each daily log entry must include: date, summary of change, key files touched, and validation/testing status.
- If the task is discussion/planning only, still add an entry and mark `files touched` as `none`.

## Frontend (Vite + React + PrimeReact + Apollo + React Router)

- Entry points: `src/main.tsx`, `src/App.tsx`. Routes: `src/Router.tsx`.
- Pages live under `src/pages/`; shared UI in `src/components/`; layout pieces in `src/layout/`.
- Shared helpers live in `src/lib/`, configuration in `src/config/`, styles in `src/styles/`, types in `src/types/`.
- Prefer PrimeReact/PrimeFlex/PrimeIcons components and patterns; use Toast-style notifications when available.

**Naming & exports**

- Components: `PascalCase.tsx`; hooks: `useSomething.ts`; booleans: `is/has/can*`; callbacks: `onX`.
- Prefer named exports for shared modules; keep default exports for route pages only.

**Component architecture**

- Page/Route: composition only (minimal logic, no heavy data shaping).
- Container: data fetching + orchestration (hooks, queries, mutations).
- View: presentational UI (no API calls; props in, events out via `onX` callbacks).

**Reusable component rules**

- Shared UI takes data via props and emits events via `onX` callbacks.
- Shared UI must accept `className` and must not contain feature-specific copy or API calls.

**Maintainability targets (best-effort)**

- Prefer small files and reusable components; avoid “one big component” implementations.
- Aim for: ≤ 150 lines per file (excluding imports/types), ≤ 60 lines per component.
- If JSX grows (> ~80 lines), split into child components with clear props.
- If logic grows (> ~30–40 lines) or is reused, extract a hook and/or child component.
- Keep files focused: one primary component per file; co-locate small subcomponents nearby.
- Legacy large pages can be refactored opportunistically when touched; don’t do drive-by refactors.

**UI hygiene**

- Avoid nested ternaries; extract `Header/Toolbar/List/EmptyState` sections.
- Avoid huge inline handlers inside `map` loops; extract callbacks.
- Keep local state local; avoid prop drilling beyond ~3 levels (use scoped context if needed).

**Report pages**

- For new account reports, follow the standard template in `docs/REPORT_PROMPT.md`.
- Use `ReportDataTable`, `AppReportActions`, and the `reportSkeleton` helpers for consistent layout and loading.
- Keyboard flow: auto-focus the first field, wire Enter-to-next on all filter controls (`AppDateInput` `onEnterNext`, `AppAutoComplete`/`AppDropdown` `onKeyDown`), and set a `refreshButtonId` so the last control can jump to Refresh.
- Lookup controls: when using `AppAutoComplete` for ledger search, add a simple last-fetch cache (like Day Book) to avoid repeated empty-query loads and stuck spinners.
- Report data loading: use apply/skip pattern, `notifyOnNetworkStatusChange: true`, and prefer `fetchPolicy: 'cache-and-network'` with `nextFetchPolicy: 'cache-first'` to keep rows visible during refresh.
- Skeleton loading: show skeleton only when `loading === true` and table is empty; avoid spinner overlays that hide headers.

**Forms & validation**

- Use Zod for non-trivial forms/payload validation; surface field errors near inputs.

## Backend (Encore TS + GraphQL + Drizzle + Multi-tenant)

- Services live under `backend/services/<service>/` (e.g. `accounts`, `auth`, `wealth`).
- Drizzle schemas live in `backend/services/<service>/db/schemas/`.
- GraphQL schema/resolvers live in `backend/services/<service>/graphql/`.
- Shared backend utilities belong in `backend/lib/` (auth, entitlements, tenancy, shared helpers).

**API**

- GraphQL is the only external API surface for data communication; do not add REST endpoints.
- Keep resolvers thin: validate inputs, authorize, delegate to service/data functions.

**Data access**

- Keep DB access in `db/*` helpers or service modules; avoid sprinkling SQL across resolvers.
- Prefer Drizzle query builder; use raw SQL only when it materially improves correctness/performance and is well-contained.

**Auth, tenancy, entitlements**

- Never accept `tenantId` from client input; always derive tenant context from auth (JWT / request context).
- Ensure tenant routes enforce tenant context and app entitlements before accessing tenant data.
- Don’t mix control-plane DB (`AUTH_DB_URL`) access with tenant DB access in the same codepath unless explicitly required.

## Env/config

- Frontend uses `.env.local` + `.env.example` (Vite vars must be `VITE_`-prefixed).
- Backend uses `backend/.env.local` + `backend/.env.example`; update examples whenever adding/changing variables.

## PR checklist (quick)

- `npm run lint` + `npm run format` (frontend).
- Backend changes keep GraphQL, Drizzle schemas, and env examples in sync.
- New tenant-facing backend logic enforces auth + tenant context + entitlement gating.
