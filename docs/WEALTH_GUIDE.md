# Wealth module guide (vidhione)

Wealth Admin is a lightweight master + entry UI for the Wealth engine. Styling follows the shared app theme; backend connects to `wealth_db` (same host/user/password as Agency).

## 1) Database setup (wealth_db)

### Create DB
Create the database (example):

```sql
CREATE DATABASE wealth_db;
```

### Apply schema / migrations

If this is a fresh database, run:
- `vidhione/backend/services/wealth/db/001_init.sql`

If your DB was created earlier without the newer columns, also run:
- `vidhione/backend/services/wealth/db/002_add_segment_and_invoice_date.sql`
- `vidhione/backend/services/wealth/db/003_add_account_code.sql`

All SQL files are idempotent (“safe to run multiple times”).

## 2) Backend env (Encore)

The Wealth service reads the connection string in this order:
1. `WEALTH_DB_URL` (preferred)
2. `AGENCY_DB_URL` (auto-derives `wealth_db` from it)
3. `DATABASE_URL`

Example (`vidhione/backend/.env.local`):

```bash
AGENCY_DB_URL=postgres://USER:PASSWORD@localhost:5432/agency_db
# optional
WEALTH_DB_URL=postgres://USER:PASSWORD@localhost:5432/wealth_db
PGSSL=0
```

Run backend:

```bash
cd vidhione/backend
encore run
```

Wealth GraphQL:
- `http://127.0.0.1:4000/wealth/graphql`

## 3) Frontend env

Wealth frontend uses:
- `VITE_WEALTH_GRAPHQL_URL` (optional)
- otherwise derives from `VITE_GRAPHQL_URL` by converting `/graphql` → `/wealth/graphql`

Example:

```bash
VITE_GRAPHQL_URL=http://127.0.0.1:4000/graphql
# optional override
VITE_WEALTH_GRAPHQL_URL=http://127.0.0.1:4000/wealth/graphql
```

Run frontend:

```bash
cd vidhione
pnpm dev
```

## 4) Field mapping (paper → app)

The app fields match the paper register terms:
- **ISIN (Share code)** → Security `ISIN`
- **Share / Security name** → Security `Name` (and `Symbol`)
- **Trading code (A/c name/number)** → Account `Code` (Trading Code) + `Name`
- **Qty (Sale/Buy)** → Transaction `Qty`
- **Gross rate / Trade price** → Transaction `Price`
- **Brokerage / TDS** → Transaction `Fees` (label changes for Dividend)
- **GST Inv No / Contract note** → Transaction `SourceDoc`
- **Invoice date** → Transaction `InvoiceDate`
- **Type (Buy/Sale/SLBM/FAO)** → Transaction `Type` + `Segment`
- **Fair market value** → derived from `Prices` (FMV calculator uses close price)

## 5) Recommended workflow

1. **Create Account(s)**: Wealth Admin → Accounts (Name + Trading Code).
2. **Create Security master**: Wealth Admin → Securities (ISIN + Symbol + Name).
3. **(Optional) Import opening holdings** (best practice for starting mid-year):
   - Go to `/apps/wealth/import`
   - Choose **Opening Holdings CSV**
   - Set **As-of Date**, **Account Name/Code**, **Batch SourceDoc** (keep unique)
   - Paste CSV and run **Dry run** first
   - Turn off **Dry run** and import
4. **Enter/Import transactions**:
   - Manual entry: Wealth Admin → Manual Entry
   - Bulk entry: `/apps/wealth/import` → Transactions CSV/Excel/PDF (PDF parsing is best-effort; verify headers)
5. **Enter daily close prices**: Wealth Admin → Prices (needed for CMP, portfolio value and FMV).
6. **Corporate actions**:
   - Use Wealth Admin → Corporate Actions for SPLIT / BONUS / RIGHTS / DIVIDEND / CAPITAL_REDUCTION
   - Do not double-enter the same corporate action as both a Corporate Action and a Transaction.
7. **Reports / views**:
   - Menu: Wealth → (Ledger / Holdings / Realized / Dividends)
   - Transactions: `/apps/wealth/transactions`
   - Ledger (Khata): `/apps/wealth/ledger`
   - Holdings: `/apps/wealth/holdings`
   - Realized P&L: `/apps/wealth/realized`
   - Dividend Register: `/apps/wealth/dividends`

## 6) Sample files

Use these as templates:
- Opening holdings: `vidhione/docs/samples/wealth/sample_opening_holdings.csv`
- Transactions: `vidhione/docs/samples/wealth/sample_transactions.csv`
- Corporate actions examples: `vidhione/docs/samples/wealth/sample_corporate_actions.md`
- Excel sample: `vidhione/docs/samples/wealth/Billfortheyear16T001    _18122025100140.xlsx`
- Contract note PDF: `vidhione/docs/samples/wealth/CN_20221129_16T001_MER.pdf`
- Holdings PDF: `vidhione/docs/samples/wealth/HOLDING (5).pdf`

## 7) Troubleshooting

- **“Cannot query field … on type Query”**: frontend is pointing to the wrong endpoint. Check `VITE_WEALTH_GRAPHQL_URL` (or derived URL from `VITE_GRAPHQL_URL`).
- **Segment / Invoice Date missing**: ensure `002_add_segment_and_invoice_date.sql` is applied.
- **Trading code missing**: ensure `003_add_account_code.sql` is applied.
