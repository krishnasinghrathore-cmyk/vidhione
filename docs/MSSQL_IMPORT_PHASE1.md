# MSSQL Direct Import Phase 1 (Voucher/Accounts)

This phase keeps `agency_db` as canonical schema and loads voucher/accounts data directly from MSSQL into controlled staging, then applies into canonical tables.

## Scope

Phase 1 tables:

- `accounts.voucher_types` (`dbo.VoucherTypeMaster`)
- `accounts.ledger_groups` (`dbo.LedgerGroupMaster`)
- `accounts.ledgers` (`dbo.LedgerMaster`)
- `accounts.vouchers` (`dbo.VoucherH`)
- `accounts.voucher_postings` (`dbo.VoucherL`)

Optional (skipped by default):

- `accounts.voucher_types_alt` (`dbo.VoucherTypeMaster1`)

## Migration SQL

- `backend/services/accounts/db/003_import_control_and_staging.sql`
- `backend/services/accounts/db/004_import_apply_voucher_accounts.sql`
- `backend/services/accounts/db/005_voucher_fk_type_normalization.sql`

These provide:

- import run tracking in `migration.*`
- phase-1 staging tables in `staging_mssql.*`
- `migration.open_import_run(...)`
- `migration.finish_import_run(...)`
- `migration.apply_voucher_accounts_run(...)`
- FK-type normalization for voucher/ledger references before FK enforcement

## Direct Refresh Command

Run from `backend`:

```bash
TARGET_DB_URL="postgresql://.../agency_db" \
MSSQL_HOST="..." \
MSSQL_PORT="1433" \
MSSQL_DATABASE="..." \
MSSQL_USER="..." \
MSSQL_PASSWORD="..." \
./scripts/refresh_voucher_accounts_from_mssql.sh
```

NPM shortcut:

```bash
TENANT_DB_URL="postgresql://.../agency_db" \
MSSQL_HOST="..." MSSQL_DATABASE="..." MSSQL_USER="..." MSSQL_PASSWORD="..." \
npm run db:import:voucher-accounts:mssql-direct
```

Include duplicate alt table only when needed:

```bash
IMPORT_VOUCHER_TYPES_ALT=1 npm run db:import:voucher-accounts:mssql-direct
```

## Notes

- Import mode is **replace** for phase-1 tables.
- Data first lands in `staging_mssql.*` with `run_id`, then apply loads canonical tables.
- `voucher_date_key` is backfilled from `voucher_date_text` when source does not provide it.
- Legacy bridge script is retained as a wrapper:
  `backend/scripts/refresh_voucher_accounts_from_agency_db_mssql.sh`
- Mapping reference:
  `backend/scripts/mssql-import/voucher-accounts-canonical-map.yml`
