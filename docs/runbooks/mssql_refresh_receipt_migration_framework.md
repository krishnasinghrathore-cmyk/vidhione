# MSSQL Refresh + Receipt Migration Framework (Reusable for New Databases)

## Purpose
Use one repeatable workflow to:
1. Map MSSQL source tables to current canonical `agency_db` schema.
2. Refresh latest records from MSSQL into canonical accounts + moneyreceipt tables.
3. Migrate money receipt cash/bank into canonical receipt vouchers.
4. Validate parity (counts + errors) via SQL and UI before decommissioning legacy tables.

## Primary Handoff Document for Codex
For any future "migrate latest DB" request, always give Codex this file first:
- `docs/runbooks/mssql_refresh_receipt_migration_framework.md`

Give this file only when you need resume/recovery details by run id:
- `docs/runbooks/moneyreceipt_to_receiptvoucher.md`

Copy-paste prompt template:
```text
Use docs/runbooks/mssql_refresh_receipt_migration_framework.md as source of truth.
Goal: refresh from MSSQL to latest data and run receipt migration safely for company_id=1.
Rules:
1) Keep no-repost policy (RELINK default), unless I explicitly approve REBUILD.
2) Preserve row-count parity (stage vs target) and verify freshness dates.
3) Validate report integrity (dr/cr, day book, ledger month-wise) and receipt UI sanity.
4) Stop on any hard failure and report exact SQL/result before proceeding.
Deliverables:
- commands executed
- counts/freshness/parity evidence
- issues + fixes
- final go/no-go summary
```

## Mapping Source of Truth
- Legacy mapping project path:
  `C:\Users\devel\OneDrive\Documents\Krishna-Work\zdp-saas-workspace-backup\misc\references\db-migration-framework`
- Effective mapping format in that project is YAML manifest (`manifests/dbSohanAgencies.yml`) plus table/column overrides.
- Canonical mapping used by current repo:
  `backend/scripts/mssql-import/voucher-accounts-canonical-map.yml`

## Final Remap Registry (Locked)
For the next full migration cycle, these remaps are fixed and must stay consistent:

1. `SalesmanMaster -> core.salesmen`
2. `ManagerMaster -> core.managers`
3. `ManagerSalesmanMaster -> core.manager_salesman_links`
4. `ItemGroupMaster -> inventory.product_groups`
5. `ItemTypeMaster -> inventory.product_attribute_types`
6. `TypeDetailMaster -> inventory.product_attributes`
7. `ItemBrandMaster -> inventory.product_brands`
8. `ItemMaster -> inventory.products`
9. `ItemSalesTaxMaster -> inventory.product_sales_taxes`
10. `ItemTypeDetailMaster -> inventory.product_attribute_selections`
11. `ItemUnitMaster -> inventory.product_units`
12. `ItemBrandCompanyMaster -> inventory.product_brand_ledgers`

Accepted compromise for #12:
- `F_CompanyMaster` is mapped directly to `ledger_id`.

## One-Time SQL Setup Per Target Database
Run from repo root:
```bash
cd /mnt/c/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione
```

Apply import + migration foundation SQL:
```bash
psql "$TENANT_DB_URL" -f backend/services/accounts/db/001_masters.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/003_import_control_and_staging.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/004_import_apply_voucher_accounts.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/005_voucher_fk_type_normalization.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/009_receipt_migration_foundation.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/010_receipt_read_diffs.sql
psql "$TENANT_DB_URL" -f backend/services/accounts/db/011_voucher_postings_voucher_fk_not_valid.sql
```

`001_masters.sql` includes the non-CRM manager/salesman prerequisite table:
- `core.manager_salesman_links`

## Required Environment
```bash
export TENANT_DB_URL='postgresql://...'
export MSSQL_HOST='...'
export MSSQL_PORT='1433'
export MSSQL_DATABASE='...'
export MSSQL_USER='...'
export MSSQL_PASSWORD='...'

export CANONICAL_RECEIPT_READS=0
export LEGACY_MONEYRECEIPT_WRITES=1
```

## Locked No-Repeat Rules
1. Default policy is `RELINK` (no repost). Do not run `REBUILD` unless explicitly approved.
2. `voucher_postings` is source-copied first from MSSQL, then only relinked for moneyreceipt mapping.
3. Keep `dr_cr_flag` canonical in this project as `0=Dr`, `1=Cr`. Do not mass-rewrite dr/cr unless explicitly requested.
4. Cancelled receipts and cheque-inward bank entries are non-posting in parity checks.
5. `core.managers`, `core.salesmen`, `core.manager_salesman_links` remain non-CRM master mapping.
6. Bank and ledger-group display names must come from master tables, not placeholder labels.
7. If UI shows `Bank #...` or `Group #...`, stop and fix data/master sync before sign-off.

## Step 1: Refresh Latest MSSQL Data
```bash
bash backend/scripts/refresh_voucher_accounts_from_mssql.sh
```

Imported tables:
- `accounts.voucher_types`, `accounts.voucher_types_alt`
- `accounts.ledger_groups`, `accounts.ledgers`
- `accounts.vouchers`, `accounts.voucher_postings`
- `accounts.money_receipt_issue_books`
- `accounts.money_receipt_cash_headers`, `accounts.money_receipt_cash_lines`
- `accounts.money_receipt_bank_headers`, `accounts.money_receipt_bank_lines`

Post-refresh guard (required for Ledger Month-wise / date-key based reports):
```bash
psql "$TENANT_DB_URL" -c "
SELECT
  count(*) FILTER (WHERE voucher_date_key IS NULL) AS null_keys,
  count(*) FILTER (WHERE voucher_date_key = 0) AS zero_keys
FROM accounts.voucher_postings
WHERE company_id=1;"
```

If `null_keys`/`zero_keys` are non-zero, backfill:
```bash
psql "$TENANT_DB_URL" -c "
UPDATE accounts.voucher_postings
SET voucher_date_key = NULLIF(
  substr(regexp_replace(coalesce(voucher_date_text, ''), '\D', '', 'g'), 1, 8),
  ''
)::integer
WHERE (voucher_date_key IS NULL OR voucher_date_key = 0)
  AND length(regexp_replace(coalesce(voucher_date_text, ''), '\D', '', 'g')) >= 8;"
```

Report integrity guard (required when mixed `dr_cr_flag` conventions exist):
```bash
psql "$TENANT_DB_URL" -c "
WITH base AS (
  SELECT
    voucher_id,
    voucher_posting_id,
    line_amount,
    coalesce(dr_cr_flag, 0) AS dr_cr_flag,
    row_number() OVER (PARTITION BY voucher_id ORDER BY voucher_posting_id) AS rn,
    CASE
      WHEN max(CASE WHEN coalesce(dr_cr_flag, 0) = 2 THEN 1 ELSE 0 END)
           OVER (PARTITION BY voucher_id) = 1
        THEN coalesce(dr_cr_flag, 0)
      ELSE coalesce(dr_cr_flag, 0) + 1
    END AS normalized_flag
  FROM accounts.voucher_postings
  WHERE company_id=1 AND coalesce(is_cancelled_flag, 0)=0
)
SELECT
  sum(CASE WHEN rn=1 AND dr_cr_flag IN (0,1) THEN line_amount ELSE 0 END) AS daybook_old_debit_logic,
  sum(CASE WHEN rn=1 AND dr_cr_flag=2 THEN line_amount ELSE 0 END) AS daybook_old_credit_logic,
  sum(CASE WHEN rn=1 AND normalized_flag=1 THEN line_amount ELSE 0 END) AS daybook_normalized_debit,
  sum(CASE WHEN rn=1 AND normalized_flag=2 THEN line_amount ELSE 0 END) AS daybook_normalized_credit
FROM base;"
```

Expected:
- `daybook_normalized_debit` and `daybook_normalized_credit` should be logically balanced for full-period data.
- If old logic is highly skewed while normalized is balanced, the issue is report interpretation, not migration load loss.

## Step 1A: External Framework Full Refresh (141 Tables)
Use this when running the locked 141-table migration from the legacy external framework:

```bash
cd /mnt/c/Users/devel/OneDrive/Documents/Krishna-Work/zdp-saas-workspace-backup/misc/references/db-migration-framework
npm run build
```

Run all batches (use larger heap for transaction-line heavy runs):
```bash
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js migrate master_tables
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js migrate transaction_headers
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js migrate transaction_lines
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js migrate reporting
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js migrate staging
```

Verify all mapped tables:
```bash
NODE_OPTIONS='--max-old-space-size=8192' node dist/cli.js verify
```

Expected result:
- `141/141` row-count checks matched (`delta=0` per table).

Run-specific hardening applied in external framework (required for repeatability on this dataset):
- `src/data/load-table.ts`: empty CSV guard + `TRUNCATE ... CASCADE` + CSV header column list for COPY.
- `src/data/export-table.ts`: export only target-loadable columns; preserve exact target-case column names.
- `src/logger.ts`: tolerate artifact log write errors (OneDrive `EIO`) without aborting migration.

## Step 2: Validate Refresh Counts
Latest import run:
```bash
psql "$TENANT_DB_URL" -c "
SELECT run_id, status, started_at, completed_at, source_database, meta
FROM migration.import_runs
WHERE module_name='voucher_accounts'
ORDER BY started_at DESC
LIMIT 5;"
```

Stage vs target table counts (latest run):
```bash
psql "$TENANT_DB_URL" -c "
WITH latest AS (
  SELECT run_id
  FROM migration.import_runs
  WHERE module_name='voucher_accounts'
  ORDER BY started_at DESC
  LIMIT 1
)
SELECT 'voucher_types' table_name,
  (SELECT count(*) FROM staging_mssql.voucher_types s, latest l WHERE s.run_id=l.run_id) staged_count,
  (SELECT count(*) FROM accounts.voucher_types) target_count
UNION ALL
SELECT 'money_receipt_cash_headers',
  (SELECT count(*) FROM staging_mssql.money_receipt_cash_headers s, latest l WHERE s.run_id=l.run_id),
  (SELECT count(*) FROM accounts.money_receipt_cash_headers)
UNION ALL
SELECT 'money_receipt_bank_headers',
  (SELECT count(*) FROM staging_mssql.money_receipt_bank_headers s, latest l WHERE s.run_id=l.run_id),
  (SELECT count(*) FROM accounts.money_receipt_bank_headers);"
```

Freshness check (key operational tables):
```bash
psql "$TENANT_DB_URL" -c "
SELECT 'accounts.bill_collection_headers' AS table_name, max(voucher_date_text) AS max_voucher_date_text FROM accounts.bill_collection_headers
UNION ALL
SELECT 'accounts.money_receipt_bank_headers', max(voucher_date_text) FROM accounts.money_receipt_bank_headers
UNION ALL
SELECT 'accounts.money_receipt_cash_headers', max(voucher_date_text) FROM accounts.money_receipt_cash_headers
UNION ALL
SELECT 'accounts.vouchers', max(voucher_date_text) FROM accounts.vouchers
UNION ALL
SELECT 'sales.estimate_headers', max(voucher_date_text) FROM sales.estimate_headers
UNION ALL
SELECT 'sales.sale_invoice_headers', max(voucher_date_text) FROM sales.sale_invoice_headers
UNION ALL
SELECT 'sales.sale_return_headers', max(voucher_date_text) FROM sales.sale_return_headers
ORDER BY 1;"
```

Reference output from this cycle:
- `sales.sale_invoice_headers=20260207`
- `accounts.vouchers=20260206`
- `accounts.bill_collection_headers=20260206`
- `accounts.money_receipt_cash_headers=20260205`
- `accounts.money_receipt_bank_headers=20260205`

## Step 3: Run Receipt Migration
If moneyreceipt headers have `ledger_id=0` but `receipt_ledger_id` populated, use the patched scripts in this repo
(`receiptPreflight.ts`, `receiptBackfillVouchers.ts`, `receiptBackfillMeta.ts`) which apply:
- `effective_ledger_id = coalesce(nullif(ledger_id,0), nullif(receipt_ledger_id,0))`

Important behavior:
- `derivedMode=RELINK` is the default and recommended production mode.
- RELINK updates mapping links (voucher type/id relations) without reposting accounting lines.
- `derivedMode=REBUILD` is a repost/rebuild flow and must be used only when explicitly approved.
- REBUILD deletes and reinserts canonical rows in:
  - `accounts.voucher_bill_details`
  - `accounts.voucher_postings`
- For this dataset, credit-ledger fallback must use `receipt_voucher_meta.legacy_sales_ledger_id`
  when `sales.sale_invoice_headers.ledger_id` is null.

Dry run first:
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

Full run:
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

Fast deterministic rebuild (optional override; explicit approval required):
```bash
psql "$TENANT_DB_URL" -v company_id=1 -v voucher_type_id=3 \
  -f backend/scripts/sql/receipt_bulk_rebuild_type3.sql
```

Operational cleanup before reruns (if stale):
```bash
psql "$TENANT_DB_URL" -c "
UPDATE accounts.receipt_migration_runs
SET status='failed',
    finished_at=coalesce(finished_at, now()),
    counts_json=coalesce(counts_json,'{}'::jsonb) || jsonb_build_object('staleCleanup', true, 'errorMessage', 'stale run closed')
WHERE run_id IN (26,28)
  AND status='running';"
```

## Step 4: Monitor in UI
- Open: `/apps/accounts/migration-monitor`
- Verify:
  - `Hard Failures = 0`
  - Import table parity rows show `Match = OK`
  - Receipt parity checks `1` to `4` are `PASS`
  - Error reason counts are empty or expected low-impact warnings only

`receiptParityCheck` note:
- Check `5_double_count_risk_invoices` is advisory for transition planning and can stay non-zero
  while both legacy line reads and canonical bill-detail reads overlap.

## Step 5: Resume If Interrupted
Use existing runbook:
- `docs/runbooks/moneyreceipt_to_receiptvoucher.md`

Resume commands:
- `backend/scripts/receiptRebuildBillDetails.ts --runId=<id>`
- `backend/scripts/receiptRebuildPostings.ts --runId=<id>`
- `backend/scripts/receiptParityCheck.ts --runId=<id>`

## Step 6: Cutover Criteria Before Dropping Legacy MoneyReceipt Tables
Do not drop legacy tables unless all are true:
1. Latest refresh status is `applied` without import errors.
2. Receipt migration parity check passes for target company/date scope.
3. `accounts.receipt_migration_errors` has no blocking reason codes.
4. Read-path validation is complete with `CANONICAL_RECEIPT_READS=1` in controlled rollout.
5. Rollback plan exists and is tested.

Current known blocker pattern:
- In high-collision historical data, `hard_cash_bank_id_overlap` and `hard_voucher_id_collision` can remain non-zero.
- In `MAPPED` voucher-id mode these are expected advisory conditions for migration planning, but cutover must still be gated until parity and read-path validation are explicitly accepted.

Until then, keep:
```bash
export LEGACY_MONEYRECEIPT_WRITES=1
```

## Sign-Off Checklist (Must Pass Every Cycle)
1. Full refresh verified for all mapped tables (`verify` successful; no failed table checks).
2. Stage vs target counts match for key tables (`voucher_types`, `money_receipt_cash_headers`, `money_receipt_bank_headers` at minimum).
3. Freshness includes required latest date window (for this cycle, at least through `2026-02-07` when expected from source).
4. Receipt migration parity checks `1` to `4` pass.
5. Day Book debit/credit totals are not skewed by dr/cr interpretation issues.
6. Ledger Month-wise totals align with legacy for sample-ledger/same-date windows.
7. Receipt Cash/Bank register checks:
   - Cash/Bank ledger shown correctly in green header line.
   - Counterparty ledger shown on second line.
   - Bank + Branch resolved from bank master fields.
   - Ledger Group shows proper group name (no `Group #...` placeholders).
   - Discount amount with discount ledger posting is visible where applicable.
8. Manager/Salesman fields visible for cash receipts where source data exists.

## Execution Snapshot (2026-02-12)
1. External framework refresh completed for all 141 mapped tables.
2. External `verify` completed with `matched` status on every mapped table.
3. Receipt stale runs `run_id=26` and `run_id=28` were closed to `failed` (stale cleanup).
4. Receipt backfill reruns completed cleanly:
  - `run_id=41` (`receiptBackfillVouchers`): `214535` upserted, `0` invalid.
  - `run_id=42` (`receiptBackfillMeta`): `214535` upserted, `0` invalid.
5. Bulk canonical rebuild completed:
  - `voucher_bill_details` inserted: `238538`
  - `voucher_postings` inserted: `214457` DR + `213413` CR
  - posting invalid vouchers (missing credit-ledger mapping): `78`
6. Parity run `run_id=44`:
  - Checks `1a`, `1b`, `2`, `3`, `4`: PASS
  - Check `5_double_count_risk_invoices`: non-zero (`194113`) and treated as advisory overlap signal.
7. Freshness check from target data:
  - `accounts.money_receipt_bank_headers`: `20260218`
  - `accounts.money_receipt_cash_headers`: `20260205`
  - `accounts.vouchers` (type `3`): `20260218`
