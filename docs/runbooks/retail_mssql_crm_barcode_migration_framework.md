# Retail MSSQL to Shared CRM/Barcode Migration Framework

## Purpose
Use one repeatable workflow to migrate legacy retail CRM, gift-coupon, loyalty, and identifier data from MSSQL into the shared `vidhione` tenant schema without creating retail-only backend structures.

This framework is retail-first, but the target schema is shared for other apps too:
- `accounts.ledgers` remains the canonical party identity.
- `crm.party_profiles` stores CRM/member extensions.
- `crm.settings` stores tenant CRM options mapped from legacy retail options.
- `crm.benefit_programs`, `crm.benefit_wallet_entries`, `crm.coupon_definitions`, and `crm.gift_certificates` stay shared under CRM.
- `crm.identifier_codes` holds product/member/gift-certificate barcode or QR identifiers.

## Primary Files
- SQL foundation: `backend/services/crm/db/002_common_import_staging.sql`
- Direct refresh script: `backend/scripts/refresh_crm_barcode_from_mssql.sh`
- Mapping manifest: `backend/scripts/mssql-import/crm-barcode-common-map.yml`
- Query templates: `backend/scripts/mssql-import/retail-crm-barcode-query-templates.sql`

## Retail Legacy Sources Covered
Default retail sources wired in the script:
- `dbo.Options`
- `dbo.CustomerMaster`
- `dbo.GiftCouponH`

Retail legacy sources expected but override-driven because schema shape can vary by client/project:
- loyalty/scheme masters
- point ledgers / balance history
- `dbo.CouponMaster`
- barcode header/line sources such as `BarcodeH` / `BarcodeL`

Reference forms from the legacy `Retailer_POS` project:
- `frmCRMOptions.cs`
- `frmCustomerRegister.cs`
- `frmMemberMaster.cs`
- `frmGiftCoupon.cs`
- `frmCouponMaster.cs`
- `frmBarcodePrinting.cs`
- `frmBarcodeHistory.cs`
- `frmPrintedBarcode.cs`
- `frmInvoice_GST.cs`

## One-Time Tenant SQL Setup
Run from `backend/` after the normal accounts import foundation exists:

```bash
psql "$TENANT_DB_URL" -f services/accounts/db/003_import_control_and_staging.sql
psql "$TENANT_DB_URL" -f services/crm/db/001_init.sql
psql "$TENANT_DB_URL" -f services/crm/db/002_common_import_staging.sql
```

If you use project scripts, `db:migrate:tenant` should include the new CRM import SQL.

## Required Environment
```bash
export TENANT_DB_URL='postgresql://...'
export MSSQL_HOST='...'
export MSSQL_PORT='1433'
export MSSQL_DATABASE='retail_client_live_db'
export MSSQL_USER='...'
export MSSQL_PASSWORD='...'

export CRM_COMPANY_ID='1'
export CRM_CREATE_CUSTOMER_LEDGERS='1'
export CRM_CUSTOMER_LEDGER_GROUP_ID='40'
```

`CRM_CUSTOMER_LEDGER_GROUP_ID` is required when new canonical customer ledgers are allowed to be created.

## Optional Override Queries
Set these only when the legacy source exists and should be imported in the same run:

```bash
export CRM_BENEFIT_PROGRAMS_QUERY='SELECT ...'
export CRM_BENEFIT_WALLET_QUERY='SELECT ...'
export CRM_COUPON_DEFINITIONS_QUERY='SELECT ...'
export CRM_GIFT_CERTIFICATES_QUERY='SELECT ...'
export CRM_GIFT_CERTIFICATE_REDEMPTIONS_QUERY='SELECT ...'
export CRM_IDENTIFIER_CODES_QUERY='SELECT ...'
```

The new template file includes retail-first starting points for:
- `CouponMaster`
- `MemberPointAdjustmentL`
- `GiftCouponL` redemption history
- `BarcodeH` / `BarcodeL`

## Default Retail Behaviors
### CRM settings
`dbo.Options` is mapped to shared CRM settings, including:
- default points / amount-per-point
- point adjustment days
- mobile digit count
- minimum invoice amount
- invoice and auto SMS flags
- QR enablement
- gift coupon posting ledger
- `MemberPartyCode` as member-code and member-barcode prefix seed

### Parties and member import
`dbo.CustomerMaster` is mapped to:
1. `accounts.ledgers` when a canonical ledger does not already exist
2. `crm.party_profiles` on top of that canonical ledger

The apply step stores these source markers in `accounts.ledgers.extra_fields`:
- `crmCommonSourceDatabase`
- `crmCommonSourcePartyKey`
- `crmCommonSourceLedgerId`

This keeps reruns idempotent.

### Member barcode pattern
Legacy retail invoice/member scan behavior uses:
- `MemberPartyCode + 'M' + CustomerMaster.Id`

The shared import keeps that pattern by auto-generating `crm.identifier_codes` member identifiers from the imported CRM settings plus each imported party source key.

### Gift coupons to shared gift certificates
Default script behavior maps `dbo.GiftCouponH` into `crm.gift_certificates`.
If the client DB stores redemption/balance in richer tables, replace the default with `CRM_GIFT_CERTIFICATES_QUERY`.

### Gift coupon redemptions
Gift-certificate redemption history is not hardcoded because retail clients vary at the line level. Use `CRM_GIFT_CERTIFICATE_REDEMPTIONS_QUERY` when the client DB exposes line-level or invoice-linked gift coupon usage.

The shared apply step now imports those rows into `crm.gift_certificate_redemptions` idempotently, using the imported gift certificate as the canonical parent.

## Product Barcode Import
Product barcode history is intentionally not hardcoded because retail variants differ. Use `CRM_IDENTIFIER_CODES_QUERY` to map product codes into the shared identifier table.

Recommended output contract for `CRM_IDENTIFIER_CODES_QUERY`:
- `source_identifier_key`
- `company_id`
- `entity_type`
- `entity_id`
- `source_entity_key`
- `source_entity_ledger_id`
- `code_value`
- `code_type`
- `template_key`
- `is_primary`
- `status`
- `metadata_json`

Typical retail product mapping:
- `entity_type = 'product'`
- `entity_id = ItemMaster.Id`
- `code_value = printed/generated barcode`
- `code_type = 'barcode'`

Typical retail member mapping if importing explicitly instead of auto-generation:
- `entity_type = 'party_profile'`
- `source_entity_key = CustomerMaster.Id`
- `code_value = MemberPartyCode + 'M' + CustomerMaster.Id`
- `code_type = 'member_barcode'`

## Legacy Live-State Behaviors Confirmed
Checked against the current `Retailer_POS` codebase before starting live migration work:
- `frmInvoice_GST.cs` issues coupons through `SaleInvoiceH.F_CouponMaster`, so coupon master import alone is not enough for later invoice reconciliation.
- `frmInvoice_GST.cs` applies gift coupons through `F_GiftCouponH` / `F_GiftCouponL` and `Select_GiftCouponDetails`, so active/open coupon balances must be refreshed again at cutover.
- `frmInvoice_GST.cs` plus `MemberPointAdjustmentL` drive loyalty earn/adjust/reversal behavior, so imported wallet history should preserve source effective dates.
- `frmStockIn.cs`, `frmStockTaking.cs`, `frmBarcodePrinting.cs`, and `frmBarcodeHistory.cs` show barcode lineage is operational, not only master-data labeling.

## dbRetailer_SS2018 Discovery Findings
Read-only discovery against the live retail source succeeded on the same SQL Server used for `dbSohanAgencies`:
- SQL Server: `DESKTOP-6C1LQA8\SQLEXPRESS`
- Port: `52583`
- Database: `dbRetailer_SS2018`
- Discovery date: `2026-03-10`

Confirmed retail source tables and counts relevant to the shared CRM/barcode cutover:
- `CustomerMaster`: `9,708`
- `MemberPointAdjustmentL`: `3,050`
- `CouponMaster`: `5`
- `GiftCouponH`: `45`
- `GiftCouponL`: `6,627`
- `BarcodeH`: `168`
- `BarcodeL`: `21,389`
- `SaleInvoiceH`: `93,679`
- `SaleInvoiceL`: `361,880`
- `StockInH`: `5,325`
- `StockInL`: `5,797`
- `SchemeH`: `1`
- `SchemeL`: `1`

Important source-shape findings:
- `Options` confirms active retail CRM/coupon/gift behavior: `IsCRM=1`, `IsCouponPrinting=1`, `IsGiftCard=1`, `IsQRCode=1`, `IsAutoSendSMS=1`, `IsSendInvoiceSMS=1`, `DefaultPointOnSale=1`, `DefaultPointOnSaleAmt=100`, `DefaultPointAdjustmentDays=61`, `F_LedgerMaster_GiftCoupon=100090056`, `MemberPartyCode='1'`.
- `CustomerMaster` is the effective member/customer source here; there is no separate `MemberMaster` table in this DB, and customer profile coverage is strong (`9,708/9,708` with mobile, `9,600` with DOB, `5,575` with anniversary).
- `MemberPointAdjustmentL` is the live loyalty ledger in this client DB. Discovered rows are invoice-linked earn entries only; no redeem rows were present in the current dataset.
- `SaleInvoiceH` carries live settlement linkage through `F_CouponMaster`, `CouponNo`, `F_GiftCouponH`, `F_GiftCouponL`, `MemberPoint`, and `F_CustomerMaster`.
- `GiftCouponL` is the actual scannable coupon unit for this client. `frmInvoice_GST` reads `GV/GU-YYYYmm-VoucherNo-LineId`, and `Select_GiftCouponDetails` returns `GiftCouponH.CouponValue` while checking usage through `SaleInvoiceH.F_GiftCouponL`.
- Current live line-level state is `6,627` total coupon lines, `176` redeemed lines, `3,441` active unused lines on non-cancelled headers, and `3,010` cancelled lines.
- Gift-certificate redemption history should therefore be imported line-by-line, using `GiftCouponL.Id` as the certificate key and `GiftCouponH.CouponValue` as the redeemed amount.
- `SaleInvoiceL.F_BarcodeL` stores the sold barcode string, and it is populated on `360,549 / 361,880` sale lines.
- `BarcodeH` / `BarcodeL` store product barcode print lineage and quantities, but they do not expose the final printed barcode string in this DB; explicit identifier import needs a client-specific barcode-string source.
- `PartyLoyaltyProgramH/L` and `RetailerFootPathH/L` were not present in this database, so those legacy variants should not be assumed for this client.
## Direct Refresh Command
From `backend/`:

```bash
TARGET_DB_URL="$TENANT_DB_URL" \
MSSQL_HOST="$MSSQL_HOST" \
MSSQL_DATABASE="$MSSQL_DATABASE" \
MSSQL_USER="$MSSQL_USER" \
MSSQL_PASSWORD="$MSSQL_PASSWORD" \
CRM_COMPANY_ID=1 \
CRM_CREATE_CUSTOMER_LEDGERS=1 \
CRM_CUSTOMER_LEDGER_GROUP_ID=40 \
bash scripts/refresh_crm_barcode_from_mssql.sh
```

Or with npm:

```bash
npm run db:import:crm-barcode:mssql-direct
```

## Validation Queries
Latest CRM/barcode import runs:

```bash
psql "$TENANT_DB_URL" -c "
SELECT run_id, status, started_at, completed_at, source_database, meta
FROM migration.import_runs
WHERE module_name='crm_barcode_common'
ORDER BY started_at DESC
LIMIT 5;"
```

Imported party/profile counts for latest run:

```bash
psql "$TENANT_DB_URL" -c "
WITH latest AS (
  SELECT run_id
  FROM migration.import_runs
  WHERE module_name='crm_barcode_common'
  ORDER BY started_at DESC
  LIMIT 1
)
SELECT
  (SELECT count(*) FROM staging_mssql.crm_party_profiles_import s, latest l WHERE s.run_id = l.run_id) AS staged_parties,
  (SELECT count(*) FROM crm.party_profiles) AS crm_parties,
  (SELECT count(*) FROM accounts.ledgers WHERE extra_fields ->> 'crmCommonSourceDatabase' IS NOT NULL) AS imported_ledgers;"
```

Generated member identifier check:

```bash
psql "$TENANT_DB_URL" -c "
SELECT count(*) AS member_identifier_count
FROM crm.identifier_codes
WHERE code_type = 'member_barcode';"
```

Gift-certificate redemption import check:

```bash
psql "$TENANT_DB_URL" -c "
SELECT count(*) AS redemption_count
FROM crm.gift_certificate_redemptions;"
```

Import issues for latest run:

```bash
psql "$TENANT_DB_URL" -c "
WITH latest AS (
  SELECT run_id
  FROM migration.import_runs
  WHERE module_name='crm_barcode_common'
  ORDER BY started_at DESC
  LIMIT 1
)
SELECT severity, target_table, issue_code, count(*)
FROM migration.import_issues i, latest l
WHERE i.run_id = l.run_id
GROUP BY severity, target_table, issue_code
ORDER BY severity, target_table, issue_code;"
```

## Current Scope vs Deferred
Included now:
- shared CRM settings import
- customer/member profile import
- optional ledger creation into canonical accounts
- gift-certificate import
- optional gift-certificate redemption import
- optional loyalty, coupon, and identifier staging hooks
- member barcode auto-generation in shared identifier table

Deferred until source confirmation or later phase:
- stitching/alteration workflow migration
- barcode print-job history recreation
- dedicated product barcode header/line migration defaults for all retail variants
- exact point-ledger reconciliation logic for clients with custom loyalty data shapes

## Cutover Rule
Do not start the live import until the exact retail client MSSQL database name and connection are confirmed. The reusable utility can be prepared and code-reviewed before that, but the actual run should target the client's live retail source database, not `agency_db`.

## Staging Preflight
Run this against the selected import run to inspect staged MSSQL rows before sign-off. The current direct refresh script keeps staging rows for the run, so preflight can be executed immediately after a dry run or refresh.

```bash
cd backend
node --loader ts-node/esm/transpile-only scripts/crmBarcodePreflight.ts --companyId=1
```

Or with npm:

```bash
cd backend
npm run db:preflight:crm-barcode -- --companyId=1
```

Optional flags:
- `--runId=<uuid>` preflights a specific import run.
- `--sourceDatabase=<name>` narrows latest-run lookup when multiple legacy DBs are in play.
- `--outDir=<path>` writes the JSON report to a different directory.
- `--noJson` disables JSON artifact output.

## Automated Cutover Checklist
Run this after every CRM/barcode refresh, and again for the final freeze-window refresh before retail go-live:

```bash
cd backend
node --loader ts-node/esm/transpile-only scripts/crmBarcodeCutoverChecklist.ts --companyId=1
```

Or with npm:

```bash
cd backend
npm run db:check:crm-barcode:cutover -- --companyId=1
```

Optional flags:
- `--runId=<uuid>` validates a specific imported run instead of the latest one.
- `--sourceDatabase=<name>` narrows latest-run lookup when multiple legacy DBs are in play.
- `--failOnWarn` turns warnings into a non-zero exit code for final sign-off.

The checklist verifies the selected run for:
- latest import run status
- recorded import issues
- CRM settings presence for the same source database
- party/profile parity and unresolved-ledger gaps
- benefit program parity
- wallet row, amount, point, and dated-entry parity
- coupon definition parity
- gift-certificate issued/redeemed/balance parity
- gift-certificate redemption parity
- explicit identifier parity
- member-barcode coverage for imported party profiles

For manual SQL-side reconciliation, use:

```bash
psql "$TENANT_DB_URL" -f backend/scripts/mssql-import/retail-crm-barcode-reconciliation.sql
```

That bundle uses psql variables at the top for `company_id`, `run_id`, and `source_database`, so it can be rerun for the latest import or a specific cutover run without editing the underlying queries.

## Cutover Criteria
Do not switch the retail client to `vidhione` unless all are true:
1. The final freeze-window CRM/barcode import run is `applied`.
2. `crmBarcodeCutoverChecklist.ts` shows no `FAIL` rows for that final run.
3. Any `WARN` rows are reviewed and explicitly accepted.
4. Open gift-certificate balances and loyalty totals match the legacy source for the cutover scope.
5. Required member/product barcode coverage is present for live billing and stock operations.
6. Legacy drafts or in-progress CRM/gift-coupon entries are closed, cancelled, or included in an explicit open-state plan.
7. Historical invoice-linked coupon issuance is either accepted as out-of-scope history or migrated through a client-specific extension before sign-off.

