## Vidhione – Accounts Module Plan (Backend + Frontend)

This document tracks the plan for building the new shared **Accounts** module (and related core services) on top of the migrated **agency_db** PostgreSQL database, using **Encore.ts + GraphQL + Drizzle** for backend and the new **Vite + Ultima** frontend.

The goal is to have a clean, documented path so we can resume work even if chat history is lost.

---

## 1. Current Understanding & Scope

### 1.1 Core modules (shared by all industries)

- **Accounts / Ledger**
  - Base ledger master (`Ledger-Master.png`, `Ledger-Group-Master.png`) is the canonical accounts master, used by all apps.
  - Vouchers: sales, purchase, receipt, payment, journal, contra, credit/debit notes, RCM.
  - Reports: ledger, day book, trial balance, P&L, balance sheet, depreciation, audit, bank reconciliation.
- **Inventory**
  - Items, groups, brands, types, units, locations; stock movements (IN/OUT/TRANSFER/ADJUSTMENT).
  - Shared across Agency, Retail, Textile, Restaurant.
  - Older forms like `Assign-Taxation.png` and the legacy `Item GST.png` are not used in the new design.
- **Billing**
  - Shared invoices and related books for all industries.
  - GST invoices (sales, purchase, returns) are unified here; industry UIs front this engine.
- **GST / E-Invoice / E-Way Bill**
  - GSTR-1, GSTR-3B, HSN summaries, difference reports, tax reports.
  - E-invoice and e-way bill generation and status/acknowledgement.
- **Messaging & CRM**
  - WhatsApp, SMS, Email, CMS.
  - CRM-style features (e.g. from Retail POS CRM) are shared and callable by all apps.

### 1.2 Industry apps

- **Agency**, **Retail-POS**, **Textile**, **Media**, **Restaurant**:
  - Provide industry-specific screens and workflows (masters, transactions, reports).
  - Do not implement their own deep accounts/inventory logic.
  - When they perform financial or stock operations, they call the shared core modules.

### 1.3 Database

- Migrated agency database:
  - **DB name**: `agency_db`
  - **User**: `migration_user`
  - **Password**: `migration@123456`
  - **Engine**: PostgreSQL
- We will:
  - Map the existing tables (starting with accounts-related tables) into **Drizzle schemas**.
  - Use those schemas from an Encore.ts service that exposes a **GraphQL** API.

### 1.4 Frontend

- New frontend app is `vidhione`:
  - React + Vite + Ultima theme.
  - Dashboard at `/` (Vidhione Workspace).
  - Accounts app route at `/apps/accounts` (currently a placeholder page).
  - The sidebar is driven by `src/config/appsConfig.ts` and groups:
    - Industry apps (Agency, Retail, Textile, Restaurant)
    - Core (Wealth, Accounts, Inventory, Billing, GST)
    - Messaging (WhatsApp, Email, SMS, CMS)

---

## 2. Backend Architecture Plan (Encore.ts + GraphQL + Drizzle)

### 2.1 High-level layout

- New Encore app dedicated to the Vidhione backend (starting with Accounts):

  ```text
  vidhione/
    accounts-backend/
      encore.app
      package.json
      tsconfig.json
      encore.service.ts         # root service (monolith early on)
      src/
        db/
          drizzle/
            schemas/            # Drizzle table definitions (accounts first)
          index.ts              # Drizzle + agency_db wiring
        graphql/
          schema.ts             # GraphQL type definitions + resolvers
          server.ts             # GraphQL server (Apollo or graphql-http) wrapped by Encore api.raw
        accounts/
          queries.ts            # business logic / data access for accounts screens
  ```

- We start with a **single Encore service** (monolith style) and can later split into systems (accounts, inventory, billing, messaging) if needed.

### 2.2 Database integration

- Encore-side database resource:
  - Use `SQLDatabase` (Encore) for migrations if needed.
  - Use **Drizzle** as the ORM on top of the Postgres connection.
  - For the existing `agency_db`, we can:
    - Either manage migrations outside Encore (since the DB already exists) and treat it as a named/post-configured database.
    - Or gradually bring its schema under Drizzle migrations as we stabilize the schema.

- Drizzle schemas:
  - Start with accounts tables (ledger masters, voucher headers/lines, groups).
  - Keep them under `src/db/drizzle/schemas/accounts.ts` (or split by domain).

### 2.3 GraphQL layer

- Expose a single GraphQL endpoint via Encore `api.raw`:

  - Path: `/graphql`
  - Method: `POST`
  - Implementation:
    - Use Apollo Server or `graphql-http` with the Encore request/response object.

- GraphQL schema:
  - `Accounts` domain first:
    - `type Ledger { ... }`
    - `type LedgerGroup { ... }`
    - `type Voucher { ... }`
    - `type VoucherLine { ... }`
    - `type LedgerPage { items: [Ledger!]!, meta: PageMeta! }`
  - `Query` examples:
    - `ledgers(page: Int, pageSize: Int, search: String): LedgerPage!`
    - `ledger(id: ID!): Ledger`
    - `voucher(id: ID!): Voucher`
  - `PageMeta` for pagination: `{ totalCount, page, pageSize }`.

### 2.4 Service boundaries (near future)

- Once Accounts is stable:
  - Add Inventory, Billing, GST, Messaging to the same Encore app as additional modules under `src/`.
  - Later, consider splitting into services:
    - `accounts/`, `inventory/`, `billing/`, `gst/`, `messaging/`, etc., each with their own `encore.service.ts` if needed.

---

## 3. Frontend – Accounts Forms Plan

We will build the **Accounts** UI in the new frontend (`vidhione`) and connect it to the Encore GraphQL backend. Initial focus is purely on *display* (read-only) using real data from `agency_db`.

### 3.1 Initial Accounts UI target screens (read-only)

Using the legacy screenshots as reference, initial priorities:

1. **Ledger Master List & Details**
   - Source: `Ledger-Master-*.png`, `Ledger-Group-Master.png`
   - New pages:
     - `/apps/accounts/ledgers` – list with filters, search, group.
     - `/apps/accounts/ledgers/:id` – details view (address, bank, tax info).
2. **Ledger Group Master List**
   - Source: `Ledger-Group-Master.png`
   - `/apps/accounts/ledger-groups`
3. **Day Book**
   - Source: `Day-Book.png`
   - `/apps/accounts/day-book`
4. **Trial Balance (Summarized)**
   - Source: `Trial-Balance-Summarized.png`
   - `/apps/accounts/trial-balance/summarized`
5. **Balance Sheet (Summarized)**
   - Source: `Balance-Sheet-Summarized.png`
   - `/apps/accounts/balance-sheet/summarized`
6. **Profit & Loss**
   - Source: `Profit-&-Loss.png`
   - `/apps/accounts/profit-loss`

These give us a solid “accounts viewer” on top of the real migrated data.

Later displays (phase 2):

- Trial Balance Detailed, Balance Sheet Detailed.
- Ledger Month-wise Summary.
- Bank Reconciliation, Bank/Cash Deposit.
- Audit / Depreciation.

### 3.2 Frontend implementation notes

- Tech stack:
  - React + Vite + Ultima theme (already set up).
  - GraphQL client (likely Apollo Client, similar to legacy theme).
- Folder structure (inside `src/pages/(main)/apps/accounts` and `src/features/accounts`):

  ```text
  src/
    pages/(main)/apps/accounts/
      ledgers/page.tsx
      ledger-detail/page.tsx
      day-book/page.tsx
      trial-balance-summarized/page.tsx
      balance-sheet-summarized/page.tsx
      profit-loss/page.tsx

    features/accounts/
      components/
        LedgerTable.tsx
        LedgerDetailPanel.tsx
        DayBookTable.tsx
        TrialBalanceTable.tsx
        BalanceSheetSummary.tsx
        ProfitLossSummary.tsx
      graphql/
        queries.ts       # GraphQL queries for accounts screens
  ```

- We can use mock data:
  - While the backend schema stabilizes, we can implement these screens using mocked GraphQL responses or local fixtures.
  - Once the Encore GraphQL endpoint is available, we will switch the Apollo client to point to it and remove mocks.

---

## 4. Step-by-Step Execution Plan

### 4.1 Backend – Encore.ts bootstrap

1. Create `vidhione/accounts-backend` Encore app:
   - Add `encore.app`, `package.json`, `tsconfig.json`.
   - Add root `encore.service.ts` and `src` folder.
2. Configure connection to `agency_db`:
   - Create environment config to point to local Postgres with:
     - DB: `agency_db`
     - User: `migration_user`
     - Password: `migration@123456`
   - Add Drizzle config pointing to the same DB.
3. Define Drizzle schemas for accounts-related tables:
   - Start with Ledger and Ledger Group tables.
4. Implement GraphQL server:
   - Add `src/graphql/schema.ts` for types and resolvers.
   - Add `src/graphql/server.ts` with Encore `api.raw` endpoint at `/graphql`.

### 4.2 Frontend – Accounts pages

1. Add routing under `/apps/accounts/*` in `src/Router.tsx` if needed (currently `/apps/accounts` exists as a single shell).
2. Scaffold initial read-only pages:
   - Ledgers list + detail.
   - Day Book.
   - Trial Balance Summarized.
   - Balance Sheet Summarized.
   - Profit & Loss.
3. Add shared components under `src/features/accounts/components`.
4. Add GraphQL queries in `src/features/accounts/graphql/queries.ts`.
5. Initially use mock data while backend is still being wired.
6. Switch to live data once the Encore GraphQL endpoint is ready.

---

## 5. Open Questions / TODOs

- Exact table names and columns in `agency_db` for:
  - Ledger/Group masters.
  - Voucher headers/lines.
  - Trial balance and P&L views (whether precomputed or computed on the fly).
- Whether we centralize:
  - Parties/Customers as part of Accounts or a separate CRM/MasterData module.
- Final choice of GraphQL server library (Apollo vs `graphql-http`) for Encore `api.raw`.

This document should be kept up to date as we:

- Add more Drizzle schemas.
- Implement more Accounts screens.
- Extract and reuse Inventory, Billing, GST, and Messaging modules.
