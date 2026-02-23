# MoneyReceipt -> ReceiptVoucher Migration Runbook (Refresh + Rerun + Tracking)

## Scope
Use this file for receipt-migration execution details, reruns, and stale-run recovery.

For complete latest-DB refresh + 141-table mapping workflow, use:
- `docs/runbooks/mssql_refresh_receipt_migration_framework.md`

## Goal
Run this migration repeatedly and safely:
1. Refresh latest voucher/accounts/moneyreceipt data from MSSQL into `agency_db`.
2. Migrate money receipt cash/bank into canonical receipt voucher tables.
3. Track progress using logs + `accounts.receipt_migration_runs`.
4. Resume from interruption without losing progress.

## Locked Operational Rule (No Repost)
Use relink flow as default so existing client accounting postings are preserved.
1. Start from clean target tables for a full cycle.
2. Copy source tables fresh from MSSQL.
3. Move money-receipt headers into canonical voucher header/meta/bill-detail mappings.
4. Relink legacy `voucher_postings`/`voucher_bill_details` rows to canonical voucher id + voucher type.
5. Do not delete/rebuild postings unless explicitly forced with `--derivedMode=REBUILD`.

Canonical targets:
- `accounts.vouchers`
- `accounts.receipt_voucher_meta`
- `accounts.voucher_bill_details`
- `accounts.voucher_postings`

## Prerequisites
Run from repository root:
```bash
cd /mnt/c/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione
```

Required env (minimum):
```bash
export TENANT_DB_URL='postgresql://...'
export CANONICAL_RECEIPT_READS=0
export LEGACY_MONEYRECEIPT_WRITES=1
```

MSSQL refresh env (required when refresh is enabled):
```bash
export MSSQL_HOST='...'
export MSSQL_PORT='1433'
export MSSQL_DATABASE='...'
export MSSQL_USER='...'
export MSSQL_PASSWORD='...'
```

Migration foundation SQL must be applied once:
```bash
psql "$TENANT_DB_URL" -f backend/services/accounts/db/003_import_control_and_staging.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/004_import_apply_voucher_accounts.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/005_voucher_fk_type_normalization.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/009_receipt_migration_foundation.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/010_receipt_read_diffs.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/011_voucher_postings_voucher_fk_not_valid.sql
```

Refresh scope now includes:
- `accounts.voucher_types`, `accounts.ledger_groups`, `accounts.ledgers`, `accounts.vouchers`, `accounts.voucher_postings`
- `accounts.money_receipt_issue_books`
- `accounts.money_receipt_cash_headers`, `accounts.money_receipt_cash_lines`
- `accounts.money_receipt_bank_headers`, `accounts.money_receipt_bank_lines`

Schema compatibility note for this dataset:
- Some refreshes populate receipt ledger on `receipt_ledger_id` while `ledger_id` is `0`.
- Migration scripts in this repo now use:
  `coalesce(nullif(ledger_id,0), nullif(receipt_ledger_id,0))`
  as effective header ledger during preflight/backfill/meta steps.
- In many rows, `sales.sale_invoice_headers.ledger_id` is null. Rebuild paths must fallback to
  `receipt_voucher_meta.legacy_sales_ledger_id` for CR posting ledger resolution.

## Mode Decisions
`--mode`:
- `UNIFIED`: cash=3, bank=3
- `SPLIT`: cash=3, bank=29

`--voucherIdMode`:
- `PRESERVE`: reuse legacy header id as voucher id; fails on collisions/overlaps
- `MAPPED`: generate mapped voucher ids when needed (recommended for production data)

`--derivedMode`:
- `RELINK`: relink existing legacy-derived rows (default, no delete/repost of client postings)
- `REBUILD`: deterministic repost/rebuild (deletes + reinserts canonical `voucher_bill_details` and `voucher_postings`) - use only when explicitly required

`RELINK` posting gap handling:
- Cancelled receipt vouchers are treated as non-posting and are not logged as missing posting errors.
- Bank cheque-inward entries (where legacy bank header has `cheque_received_number` or `cheque_received_date_text`) are treated as non-posting and are not logged as missing posting errors.

## Date Range Behavior
- If `--from` and `--to` are omitted, migration runs for **all available voucher dates**.
- Date format is mandatory when provided: `YYYYMMDD`.

## Trackable One-Command Run (recommended)
This executes: refresh -> dry run -> full migrate -> cutover checklist.

```bash
mkdir -p backend/logs
LOG_FILE="backend/logs/receipt-migrate-$(date +%Y%m%d-%H%M%S).log"

nohup bash backend/scripts/receipt_refresh_and_migrate.sh \
  --companyId=1 \
  --batchSize=5000 \
  --mode=UNIFIED \
  --voucherIdMode=MAPPED \
  --derivedMode=RELINK \
  >"$LOG_FILE" 2>&1 &

echo $! > backend/logs/receipt-migrate.pid
echo "pid=$(cat backend/logs/receipt-migrate.pid) log=$LOG_FILE"
```

For full-history rerun, omit `--from` and `--to`.

For slice run:
```bash
nohup bash backend/scripts/receipt_refresh_and_migrate.sh \
  --companyId=1 \
  --from=20260101 \
  --to=20260212 \
  --batchSize=5000 \
  --mode=UNIFIED \
  --voucherIdMode=MAPPED \
  --derivedMode=RELINK \
  >"$LOG_FILE" 2>&1 &
```

## Refresh-Only Then Migrate (two-phase rerun)
Use this if you want explicit control.

Refresh only:
```bash
bash backend/scripts/refresh_voucher_accounts_from_mssql.sh
```

Dry-run only:
```bash
bash backend/scripts/receipt_refresh_and_migrate.sh \
  --companyId=1 \
  --batchSize=5000 \
  --mode=UNIFIED \
  --voucherIdMode=MAPPED \
  --derivedMode=RELINK \
  --skipRefresh \
  --dryRunOnly
```

Full migration after dry run:
```bash
bash backend/scripts/receipt_refresh_and_migrate.sh \
  --companyId=1 \
  --batchSize=5000 \
  --mode=UNIFIED \
  --voucherIdMode=MAPPED \
  --derivedMode=RELINK \
  --skipRefresh \
  --skipDryRun
```

### Post-run hygiene (important for repeat full refreshes)
If current source history is smaller than a previous cycle, stale meta/bill-detail artifacts can remain.
Run these checks and fixes after full migration:

1. Verify header/meta parity:
```bash
psql "$TENANT_DB_URL" -c "
SELECT
  (SELECT count(*) FROM accounts.money_receipt_cash_headers WHERE company_id=1) AS cash_headers,
  (SELECT count(*) FROM accounts.money_receipt_bank_headers WHERE company_id=1) AS bank_headers,
  (SELECT count(*) FROM accounts.receipt_voucher_meta WHERE source_kind='cash') AS cash_meta,
  (SELECT count(*) FROM accounts.receipt_voucher_meta WHERE source_kind='bank') AS bank_meta;"
```

2. Prune stale meta rows (and their stale canonical bill-details):
```bash
psql "$TENANT_DB_URL" -v ON_ERROR_STOP=1 -c "
BEGIN;
CREATE TEMP TABLE tmp_stale_receipt_meta AS
WITH curr AS (
  SELECT 'cash'::text AS source_kind, cash_receipt_id::bigint AS source_header_id FROM accounts.money_receipt_cash_headers
  UNION ALL
  SELECT 'bank'::text, bank_receipt_id::bigint FROM accounts.money_receipt_bank_headers
)
SELECT m.voucher_id, m.source_kind, m.source_header_id
FROM accounts.receipt_voucher_meta m
LEFT JOIN curr c
  ON c.source_kind = m.source_kind
 AND c.source_header_id = m.source_header_id
WHERE c.source_header_id IS NULL;

DELETE FROM accounts.voucher_bill_details b
USING tmp_stale_receipt_meta s
WHERE b.voucher_id = s.voucher_id;

DELETE FROM accounts.receipt_voucher_meta m
USING tmp_stale_receipt_meta s
WHERE m.voucher_id = s.voucher_id;
COMMIT;"
```

3. If migrated receipt vouchers show wrong Day Book side, realign receipt posting direction by voucher primary ledger:
- For migrated receipt vouchers (`receipt_voucher_meta` scoped), `primary_ledger_id` is party ledger and must be `CR=1`.
- Counter ledgers (cash/bank/invoice ledgers) must be `DR=0`.
```bash
psql "$TENANT_DB_URL" -c "
WITH scoped AS (
  SELECT v.voucher_id::bigint AS voucher_id,
         coalesce(v.primary_ledger_id, 0)::numeric AS primary_ledger_id
  FROM accounts.vouchers v
  INNER JOIN accounts.receipt_voucher_meta m
    ON m.voucher_id = v.voucher_id
  WHERE coalesce(v.voucher_type_id, 0)::int IN (3, 29)
)
UPDATE accounts.voucher_postings vp
SET dr_cr_flag = CASE
  WHEN coalesce(vp.ledger_id, 0) = s.primary_ledger_id THEN 1
  ELSE 0
END
FROM scoped s
WHERE vp.voucher_id = s.voucher_id
  AND coalesce(vp.voucher_type_id, 0)::int IN (3, 29)
  AND coalesce(vp.dr_cr_flag, 0) IN (0, 1);"
```

Fast full rerun for large history (skip dry run + skip cutover checklist):
```bash
bash backend/scripts/receipt_refresh_and_migrate.sh \
  --companyId=1 \
  --batchSize=50000 \
  --mode=UNIFIED \
  --voucherIdMode=MAPPED \
  --derivedMode=RELINK \
  --skipRefresh \
  --skipDryRun \
  --skipCutoverChecklist
```

Set-based bulk canonical rebuild (optional override only):
```bash
psql "$TENANT_DB_URL" -v company_id=1 -v voucher_type_id=3 \
  -f backend/scripts/sql/receipt_bulk_rebuild_type3.sql
```

## Live Tracking During Run
UI dashboard:
- Open `/apps/accounts/migration-monitor` in the app.
- Use `companyId` and optional `from/to` filters (`YYYYMMDD`) to monitor parity and errors.

Tail log:
```bash
tail -f "$LOG_FILE"
```

Check latest migration runs:
```bash
psql "$TENANT_DB_URL" -c "
SELECT run_id, status, started_at, finished_at, filters_json, counts_json
FROM accounts.receipt_migration_runs
ORDER BY run_id DESC
LIMIT 20;"
```

Check error summary:
```bash
psql "$TENANT_DB_URL" -c "
SELECT run_id, stage, reason_code, count(*) AS cnt
FROM accounts.receipt_migration_errors
GROUP BY run_id, stage, reason_code
ORDER BY run_id DESC, cnt DESC
LIMIT 100;"
```

Check active migration processes:
```bash
ps -ef | rg "receipt(RebuildBillDetails|RebuildPostings|receiptMigrate|receipt_refresh_and_migrate)"
```

## Stale Run Recovery (important)
If DB shows `status='running'` but no migration process exists, run is stale/interrupted.

### 1) Identify the stale run
```bash
psql "$TENANT_DB_URL" -c "
SELECT run_id, status, started_at, finished_at, counts_json
FROM accounts.receipt_migration_runs
ORDER BY run_id DESC
LIMIT 10;"
```

### 2) Resume specific step with same `run_id`
Run from `backend/`:
```bash
cd backend
```

Resume bill details (REBUILD mode only):
```bash
TENANT_DB_URL="$TENANT_DB_URL" TS_NODE_TRANSPILE_ONLY=1 \
node --loader ts-node/esm scripts/receiptRebuildBillDetails.ts \
  --companyId=1 --batchSize=5000 --runId=<RUN_ID>
```

Resume postings (REBUILD mode only):
```bash
TENANT_DB_URL="$TENANT_DB_URL" TS_NODE_TRANSPILE_ONLY=1 \
node --loader ts-node/esm scripts/receiptRebuildPostings.ts \
  --companyId=1 --batchSize=2000 --runId=<RUN_ID>
```

Resume bill details (RELINK mode):
```bash
TENANT_DB_URL="$TENANT_DB_URL" TS_NODE_TRANSPILE_ONLY=1 \
node --loader ts-node/esm scripts/receiptRelinkBillDetails.ts \
  --companyId=1 --batchSize=5000 --runId=<RUN_ID>
```

Resume postings (RELINK mode):
```bash
TENANT_DB_URL="$TENANT_DB_URL" TS_NODE_TRANSPILE_ONLY=1 \
node --loader ts-node/esm scripts/receiptRelinkPostings.ts \
  --companyId=1 --batchSize=2000 --runId=<RUN_ID>
```

Run parity at end:
```bash
TENANT_DB_URL="$TENANT_DB_URL" TS_NODE_TRANSPILE_ONLY=1 \
node --loader ts-node/esm scripts/receiptParityCheck.ts \
  --companyId=1 --runId=<RUN_ID>
```

If you want a fresh cycle instead of resuming, start a new run with wrapper script and keep old run for audit.

## Hard Stop Conditions
Stop and investigate if any is true:
1. `receiptPreflight` hard gate fails.
2. Any step exits non-zero.
3. `receiptParityCheck` checks `1` to `4` return `FAIL`.
4. Large repeated error codes:
`MISSING_LEDGER_ID`, `MISSING_VOUCHER_DATE_TEXT`, `MISSING_SALE_INVOICE_ID`, `MISSING_SALE_INVOICE_OR_LEDGER`, `DR_CR_MISMATCH`.

Advisory:
- `5_double_count_risk_invoices` can be non-zero during transition while legacy and canonical read paths overlap.

## Recommended Batch Sizes
- `receiptBackfillVouchers`: `5000`
- `receiptBackfillMeta`: `5000`
- `receiptRelinkBillDetails`: `5000` (default path)
- `receiptRelinkPostings`: `2000` (default path)
- `receiptRebuildBillDetails`: `5000` (override only)
- `receiptRebuildPostings`: `2000` (override only)

Lower sizes (`1000` or `500`) if DB is under load.
Higher sizes (`20000` to `50000`) are acceptable on dedicated DB windows to reduce runtime.

## Rollback / Safe Fallback
Keep canonical reads OFF while validating:
```bash
export CANONICAL_RECEIPT_READS=0
```

Keep legacy write flow enabled:
```bash
export LEGACY_MONEYRECEIPT_WRITES=1
```

Do not drop `money_receipt_*` tables in this stage.
