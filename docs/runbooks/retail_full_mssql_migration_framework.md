# Retail Full MSSQL Migration Framework

## Purpose
Use one repeatable workflow to migrate a live legacy retail tenant from MSSQL into shared `vidhione` modules without losing the features this client actively uses today: accounts, billing, inventory, CRM, gift coupons, barcode, SMS, and WhatsApp.

This is broader than the existing CRM/barcode utility. The goal here is full retail migration readiness comparable in intent to the older agency migration, but mapped into the current `vidhione` architecture instead of a legacy-shaped target database.

## Source Confirmed for This Client
- Source database: `dbRetailer_SS2018`
- Source server reached from this machine: `DESKTOP-6C1LQA8:52583`
- SQL Server instance reported by MSSQL: `DESKTOP-6C1LQA8\SQLEXPRESS`
- Discovery date: `2026-03-10`

## Live Source Snapshot
### Active modules and counts
- Accounts foundation: `VoucherTypeMaster=16`, `LedgerGroupMaster=59`, `LedgerMaster=344`, `VoucherH=6372`, `VoucherL=540051`
- Inventory foundation: `ItemMaster=8765`, `ItemGroupMaster=27`, `ItemTypeMaster=24`, `TypeDetailMaster=178`, `ItemBrandMaster=117`, `HSNCodeMaster=47`, `StockInH=5325`, `StockInL=5797`, `StockTakingH=344`, `StockTakingL=48045`, `BarcodeH=168`, `BarcodeL=21389`
- Billing history: `SaleInvoiceH=93679`, `SaleInvoiceL=361880`, `SaleReturnH=7186`, `SaleReturnL=13322`
- CRM/loyalty/gift: `CustomerMaster=9708`, `MemberPointAdjustmentL=3050`, `CouponMaster=5`, `GiftCouponH=45`, `GiftCouponL=6627`
- Messaging: `SMSRecordH=41163`, `WhatsappSMSRecordH=21155`, plus active SMS/WhatsApp settings and template tables

### Low-use or inactive modules in this client DB
- `EstimateH=0`, `EstimateL=0`
- `EstimateInH` / `EstimateInL` are not present
- `MoneyReceiptIssueBookH`, `MoneyReceiptCashH/L`, `MoneyReceiptBankH/L` are present but all zero rows
- `SalesmanMaster`, `ManagerMaster`, and `ManagerSalesmanMaster` are present but zero rows

### Freshness snapshot
- `SaleInvoiceH`: latest `20260306`
- `SaleReturnH`: latest `20260306`
- `StockInH`: latest `20260306`
- `VoucherH`: latest `20260306`
- `StockTakingH`: latest `20240307`
- `GiftCouponH`: latest `20250324`
- `SMSRecordH`: latest `September 30, 2024`
- `WhatsappSMSRecordH`: latest `September 30, 2025`

## Existing Reusable Building Blocks in This Repo
These are already available and should be reused, not reimplemented.

### Accounts foundation
- [refresh_voucher_accounts_from_mssql.sh](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/refresh_voucher_accounts_from_mssql.sh)
- [voucher-accounts-canonical-map.yml](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/voucher-accounts-canonical-map.yml)
- [mssql_refresh_receipt_migration_framework.md](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/docs/runbooks/mssql_refresh_receipt_migration_framework.md)

### Inventory foundation
- [refresh_inventory_masters_from_mssql.sh](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/refresh_inventory_masters_from_mssql.sh)
- [refresh_inventory_foundation_from_mssql.sh](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/refresh_inventory_foundation_from_mssql.sh)
- [inventory-foundation-canonical-map.yml](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/inventory-foundation-canonical-map.yml)
- The new foundation runner reuses the existing units/HSN import, then adds product groups, attribute masters, brands, products, product units, sales taxes, and attribute selections with retail-first source mapping and synthetic fallbacks for empty `ItemUnitMaster` / missing product-tax rows.

### CRM / barcode / loyalty / gift slice
- [refresh_crm_barcode_from_mssql.sh](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/refresh_crm_barcode_from_mssql.sh)
- [crm-barcode-common-map.yml](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/crm-barcode-common-map.yml)
- [retail-crm-barcode-query-templates.sql](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/retail-crm-barcode-query-templates.sql)

### Full-source discovery helper added for retail
- [retail-full-source-discovery.sql](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/retail-full-source-discovery.sql)
- [retail-full-canonical-map.yml](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/retail-full-canonical-map.yml)

### Retail target bootstrap and parity
- [bootstrapRetailTarget.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/bootstrapRetailTarget.ts)
- [retailApplyFromStage.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailApplyFromStage.ts)
- [retailParityCheck.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailParityCheck.ts)
- Use a donor/common tenant schema before the first retail apply. The bootstrap helper is destructive by design and requires `--confirmReset`, because it rebuilds the target tenant DB from the donor schema before rerunning retail migrations/imports.

## Target Module Strategy
Do not create a retail-shaped database clone. Use shared `vidhione` modules:
- `accounts` for ledger, voucher, and posting truth
- `inventory` for product masters, stock-in, stock-taking, barcode-operational support
- `billing` for sale invoices, returns, and pre-sales documents where actually used
- `crm` for customer/member, loyalty, coupons, gift certificates, schemes, and shared identifiers
- `sms` for SMS settings, bindings, and message history where worth preserving
- `whatsapp` for WhatsApp account settings, templates, bindings, campaigns/seeds, and historical message logs

## Migration Phases
### Phase 0: Discovery and freeze of assumptions
Use [retail-full-source-discovery.sql](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/retail-full-source-discovery.sql) against the source before each serious dry run.

Confirm again:
- source table names and row counts
- column shapes for key transaction tables
- latest dates for active modules
- whether any new client-side customization appeared since discovery

### Phase 1: Accounts foundation
Run the existing accounts refresh first.

Source scope:
- `VoucherTypeMaster`
- `LedgerGroupMaster`
- `LedgerMaster`
- `VoucherH`
- `VoucherL`
- optional money-receipt tables if they carry rows in the target client

Outcome required:
- `accounts.voucher_types`
- `accounts.ledger_groups`
- `accounts.ledgers`
- `accounts.vouchers`
- `accounts.voucher_postings`
- any non-zero receipt tables migrated and reconciled

Client note:
- This retail DB has zero-row money-receipt tables, so receipt migration is not a current blocker for this client.

### Phase 2: Inventory foundation
Run the shared inventory foundation refresh after accounts are in place.

Primary runner:
- [refresh_inventory_foundation_from_mssql.sh](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/refresh_inventory_foundation_from_mssql.sh)

Source scope now covered:
- `ItemGroupMaster -> inventory.product_groups`
- `ItemTypeMaster -> inventory.product_attribute_types`
- `TypeDetailMaster -> inventory.product_attributes`
- `ItemBrandMaster -> inventory.product_brands`
- `ItemMaster -> inventory.products`
- `ItemTypeDetailMaster -> inventory.product_attribute_selections`
- `ItemUnitMaster -> inventory.product_units`
- `ItemSalesTaxMaster -> inventory.product_sales_taxes`
- `ItemBrandCompanyMaster -> inventory.product_brand_ledgers`

Retail-specific behavior already handled:
- `UnitMaster` and `HSNCodeMaster` still refresh through the existing shared importer invoked by the new runner.
- If `ItemUnitMaster` is empty, the import synthesizes one default unit row per product from `ItemMaster.F_UnitMaster`.
- If a product has no `ItemSalesTaxMaster` rows, the import synthesizes one fallback tax/rate row from `ItemMaster` so the product remains usable in the target.

### Phase 3: Billing and retail operational documents
The retail document path now has all three dry-run layers:
- [020_retail_document_import_staging.sql](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/services/accounts/db/020_retail_document_import_staging.sql)
- [retailMigrationRun.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailMigrationRun.ts)
- [retailStageFromMssql.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailStageFromMssql.ts)
- [retailPreflight.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailPreflight.ts)
- [retailApplyFromStage.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailApplyFromStage.ts)
- [retailParityCheck.ts](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/retailParityCheck.ts)
- [retail-document-query-templates.sql](/C:/Users/devel/OneDrive/Documents/Krishna-Work/Developer-Panel-SAAS-Model-Projects/vidhione/backend/scripts/mssql-import/retail-document-query-templates.sql)

Current staged source coverage:
- `SaleInvoiceH/L`
- `SaleReturnH/L`
- `SaleReturnL_InvoiceDetails`
- `StockInH/L`
- `StockTakingH/L`

Current document-run sequence:
- bootstrap the retail tenant target from a donor/common PostgreSQL schema with `npm run db:retail:bootstrap-target -- ... --confirmReset`
- rerun tenant migrations so current repo SQL is present, including `services/inventory/db/003_stock_taking.sql`
- run `npm run db:retail:stage:mssql -- --runId <uuid>`
- run `npm run db:retail:preflight -- --runId <uuid>`
- run `npm run db:retail:apply -- --runId <uuid>`
- run `npm run db:retail:parity -- --runId <uuid>`

Current apply behavior:
- inserts sale invoice, sale return, stock-in, and stock-taking rows into shared `sales` / `inventory` targets
- writes rerunnable header, line, and sale-return-link crosswalks into `migration.id_crosswalk`
- intentionally skips staged headers with zero lines
- requires direct source IDs for ledgers, products, units, and brands to already exist from the foundation imports

Current parity behavior:
- compares eligible staged headers/lines/return-links against the run-scoped crosswalks after apply
- treats empty staged headers as informational skips rather than failures
- fails the command when applied crosswalk coverage is incomplete for the run

Still required after this apply/parity layer:
- legacy-vs-cloud reconciliation of document amounts/books during live dry runs and UAT
- optional `EstimateH/L` handling only if future retail/agency reuse needs history despite zero current rows here

This phase should preserve:
- party linkage
- item linkage
- barcode linkage where available
- gift-coupon and loyalty settlement linkage
- cancellation state
- voucher/date lineage

### Phase 4: CRM, loyalty, gift, coupon, barcode
Use the existing CRM/barcode framework, but run it as one phase within the full migration.

Confirmed special rule for this retail client:
- gift coupons are line-level certificates at `GiftCouponL.Id`
- invoice scan pattern is `GV/GU-YYYYmm-VoucherNo-LineId`
- applied redeemed amount is `GiftCouponH.CouponValue`

### Phase 5: Messaging migration
This client actively uses both SMS and WhatsApp-related legacy data.

Legacy source tables confirmed:
- SMS: `SMSSettingsMaster`, `SMSMappingMaster`, `SMSSchedulerMaster`, `SMSRecordH`
- WhatsApp: `WhatsappSettingsMaster`, `WhatsappTemplateMaster`, `WhatsappTemplateMapCodeMaster`, `WhatsappSMSRecordH`

Target mapping direction:
- `SMSSettingsMaster -> sms.sms_settings`
- `SMSMappingMaster` / `SMSSchedulerMaster -> sms.sms_template_bindings` and/or campaign seed metadata
- `SMSRecordH -> sms.sms_messages`
- `WhatsappSettingsMaster -> whatsapp.wa_accounts` plus provider-setting metadata
- `WhatsappTemplateMaster -> whatsapp.wa_templates`
- `WhatsappTemplateMapCodeMaster -> whatsapp.wa_template_bindings`
- `WhatsappSMSRecordH -> whatsapp.wa_messages`

Security rule:
- Do not blindly import live provider credentials like WhatsApp access tokens into the cloud tenant without explicit approval and a review of whether the credential should be rotated or re-entered manually.

### Phase 6: Dry run, reconciliation, rerun
After each module batch:
- stage/import into PostgreSQL
- run reconciliation
- fix mapping gaps
- rerun until clean

### Phase 7: Freeze-window final refresh and cutover
At final cutover:
- freeze legacy retail writes for agreed modules
- rerun latest-data refresh for active modules
- reconcile again
- switch users to `vidhione`
- keep legacy read-only for reference

## What Is Still Missing in Vidhione for Full Migration Execution
These are the big pending implementation items.

### Already scaffolded
- accounts refresh
- CRM/barcode/gift/loyalty refresh
- full inventory foundation refresh for units, HSN, product groups, brands, products, units, taxes, and attribute selections
- retail source discovery and cutover checklist tooling for CRM/barcode

### Still needs implementation
- broader retail book/register reconciliation during live dry runs and UAT
- SMS and WhatsApp import scripts / staging / apply logic
- one top-level retail migration runner that orchestrates bootstrap, master imports, document stage/apply/parity, and messaging phases in sequence

## Suggested Execution Order for This Client
1. Accounts foundation refresh and reconciliation
2. Inventory foundation refresh and reconciliation
3. Billing sale/return migration implementation and dry run
4. Stock-in / stock-taking migration implementation and dry run
5. CRM/barcode/gift/loyalty dry run
6. SMS/WhatsApp migration implementation and dry run
7. Full combined rehearsal for the tenant
8. Freeze-window final refresh and cutover

## Immediate Next Step
The next practical engineering step is now `retail document preflight and canonical apply`, starting with:
- run `db:retail:stage:mssql` into tenant staging and record the staged counts / artifact for the run id
- run `db:retail:preflight -- --runId <uuid>` and resolve hard-gate blockers plus major soft mismatches
- wire canonical apply for staged sale invoice / sale return / stock-in / stock-taking rows
- messaging import/apply skeleton for SMS and WhatsApp

The inventory foundation path is now in place, so the full-retail migration effort can move on to transactional history and communication modules.

