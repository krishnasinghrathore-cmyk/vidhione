# Textile MSSQL Migration Runbook

Date: 2026-03-10
Owner: Textile rollout / live client migration
Scope: Four live textile clients moving from legacy MSSQL to Vidhione PostgreSQL with common modules plus textile phase-1 processor and jobwork flows.

## Rollout Split

### Track 1: Live Textile Clients

Target all 4 live clients on the same capability shape:
- textile_processing_jobwork
- shared Accounts, Inventory, Billing, GST
- textile phase-1 processor and jobwork documents/books/statements

Current live mix:
- 2 processor-heavy clients
- 2 jobwork-heavy clients
- all 4 will receive processor plus jobwork in the new system

### Track 2: Future In-House Textile Clients

Keep the 2 interested in-house clients on a separate later track:
- target preset: textile_full
- depends on in-house product completion first
- should not block the live migration program

## Goal

Migrate each live client into a tenant-safe PostgreSQL environment with:
- common masters and accounting preserved
- textile operational documents migrated into the shared textile document model
- stock, fabric statement, and outward flow parity verified against legacy
- no forced tenant-type conversion later

## What I Need From Each Live Client When Migration Starts

Provide one bundle per client:

1. MSSQL access
- SQL Server host or backup source
- database name
- read-only username/password if direct access is used
- whether only one company exists in the DB or multiple company ids exist

2. Tenant identity
- target tenant code
- company legal name
- GSTIN
- active financial year
- primary operator usernames for UAT

3. Legacy usage facts
- whether challan flow is active
- whether processor flow is active
- whether jobwork flow is active
- any client-specific document-numbering rules
- current live forms actually used if different from our baseline

4. Migration scope choice
- full history or cutover-from date
- whether closed historical documents must be migrated or only open plus recent history
- whether historical invoices remain read-only reference data or fully editable in new system

5. Validation anchors
- latest fabric statement totals
- latest fabric stock statement totals
- latest outward / pending challan / pending invoice counts
- 3 to 5 known reference documents we can use for parity spot checks

## Migration Model

The migration is not a raw MSSQL table copy.

Use this flow:
1. Extract legacy rows from MSSQL.
2. Normalize them into `staging_mssql.textile_document_headers` and `staging_mssql.textile_document_lines`.
3. Run textile preflight checks.
4. Map legacy master ids to target common/textile ids.
5. Apply into canonical target tables.
6. Record `migration.id_crosswalk` for headers and lines.
7. Run textile parity checks.
8. Execute business UAT in the tenant UI.

## Source PK Convention

Future textile apply scripts must use these crosswalk keys:
- header: `header:<source_document_type>:<source_header_pk>`
- line: `line:<source_document_type>:<source_header_pk>:<source_line_pk>`

## Required Migration Order Per Client

1. Provision tenant and enable `textile_processing_jobwork`.
2. Run tenant DB migrations including textile staging.
3. Import common masters and build master crosswalks.
4. Stage textile phase-1 documents.
5. Run `db:textile:preflight`.
6. Fix mapping/data issues until preflight hard gates are clear.
7. Apply textile migration into canonical tables.
8. Run `db:textile:parity`.
9. Execute business UAT.
10. Perform final cutover freeze and delta migration.

## UAT Scope After Migration

Run this for every live client:
- Purchase Order create/view/update parity
- Fabric Inward parity
- Packing Slip parity
- Delivery Challan parity
- Job Work Issue parity
- Daily Outward parity
- GST Invoice parity from textile flow
- Bill Book parity
- Dispatch Book visibility
- Fabric Statement totals
- Fabric Stock Statement totals
- downstream edit/cancel locks

## Cutover Readiness Criteria

Approve go-live only when:
- preflight has no hard-gate issues
- parity has no missing header or line crosswalk gaps
- stock totals match agreed legacy anchors
- fabric statement totals match agreed legacy anchors
- client operators complete UAT on their own key flows
- rollback path is documented for that tenant

## Immediate Preparedness Status

Prepared now:
- textile staging schema in tenant DB migrations
- textile preflight script
- textile parity script
- textile canonical map baseline for phase 1

Still to do before first live run:
- actual MSSQL extract/apply scripts using the live client schema
- per-client master-id crosswalk strategy
- tenant-specific migration config files
- first dry-run report set from a real client DB
