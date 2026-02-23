# Sales Invoice Master Forms: Legacy Gap Analysis

## Scope

This checklist covers master forms used by Sales Invoice and related delivery/collection flows:

- Accounts: `ledgers`, `ledger-groups`, `salesmen`
- Inventory: `products`, `product-groups`, `product-brands`, `product-attribute-types`, `units`, `hsn-codes`, `godowns`, `scheme-batches`, `delivery-by`, `delivery-status`, `checked-by`, `bill-collection-status`, `transporters`

## Legacy Parity Baseline

For legacy parity, each master should support:

1. `Add`
2. `Edit`
3. `Delete`
4. `View` (read-only details)

And should expose legacy-required fields that are still present in current DB/API models.

Baseline source for legacy behavior/parameters: `docs/legacy-form-procedure-map.csv`.

## Action Parity Matrix

| Form | Add | Edit | Delete | View | Status |
|---|---:|---:|---:|---:|---|
| Ledger Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Ledger Group Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Salesmen Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Product Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Product Group Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Product Brand Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Product Attribute Type Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Unit Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| HSN Code Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Godown Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Scheme Batch Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Delivery By Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Delivery Status Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Checked By Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Bill Collection Status Master | Yes | Yes | Yes | Yes | Phase 1 complete |
| Transporter Master | Yes | Yes | Yes | Yes | Phase 1 complete |

## Field/Behavior Gaps vs Legacy-Oriented Models

### 1) Ledger Master (High Impact)

- Status: resolved in Phase 1.
- Added create/edit/view support for:
  - `alias`, `postalCode`, `officePhone`, `residencePhone`, `email`, `website`
  - `panNumber`, `tinNumber`
  - `taxRate`, `taxTypeCode`, `isReverseChargeApplicableFlag`, `isExportFlag`
  - explicit `isActiveFlag` toggle in form

### 2) Product Brand Master (High Impact)

- Status: resolved in Phase 1.
- Added `ledgerIds` mapping in list/create/update/view flows.

### 3) Transporter Master (Medium)

- Status: resolved in Phase 2.
- Replaced raw `cityId` number input with city lookup dropdown using geo city options.

### 4) View Mode Consistency (Medium)

- Status: resolved in Phase 1.
- Added explicit read-only `View` action/dialog across all Sales Invoice-related master forms.

### 5) Delete Flow Parity/Safety (Medium)

- Status: resolved in Phase 2.
- Added standardized pre-delete warning message across Sales Invoice master forms.
- Added standardized “record in use” error normalization when deletes fail due references/constraints.
- Added explicit dependency-count pre-check APIs in inventory/accounts GraphQL and wired strict frontend pre-delete blocking with dependency summaries.

### 6) Large-Data Behavior (Low-Medium)

- Status: resolved in Phase 2.
- Wired server-side `search/limit` across Sales Invoice master scope:
  - `products`
  - `product-brands`
  - `transporters`
  - `ledger-groups`
  - `salesmen`
  - `product-groups`
  - `product-attribute-types`
  - `units`
  - `hsn-codes`
  - `godowns`
  - `scheme-batches`
  - `delivery-by`
  - `delivery-status`
  - `checked-by`
  - `bill-collection-status`

### 7) Phase 3 Validation Findings (Legacy Params vs Current GraphQL/UI)

- Validation run date: February 17, 2026.
- Validation source: `insert_proc_params`, `update_proc_params`, and `list_proc_params` from `docs/legacy-form-procedure-map.csv`, compared against current GraphQL schemas and master pages.

Confirmed aligned (no material field-level gap observed):

- `salesmen`
- `product-groups`
- `product-brands`
- `product-attribute-types`
- `units`
- `hsn-codes`
- `godowns`
- `scheme-batches`
- `delivery-by`
- `delivery-status`
- `checked-by`
- `bill-collection-status`
- `transporters`

Resolved in current Phase 3 pass (February 17, 2026):

- `ledger-groups` (Medium)
  - Added `EditPassword` parity in accounts GraphQL + UI.
  - `editPassword` is now available for create/update/list flows and shown in View mode as `Set` / `Not Set`.
- `products` list behavior (Low-Medium)
  - Added list-level `searchType` and `mrp` filters in inventory GraphQL (`products` query).
  - Added Products page filter controls for brand, MRP, and search type, and wired them to server-side list query variables.
  - Added search-mode parity on list UI (`Name / Id` vs `Detailed`) and kept brand filtering server-driven.
- `ledgers` (High, partial)
  - Added first-class `areaId` support in accounts ledger GraphQL and ledger UI (list payload, create/update mutations, form control, and view details).
  - Added first-class shipping block support in accounts ledger GraphQL and ledger UI:
    - `shipAddressLine1`, `shipAddressLine2`, `shipAddressLine3`
    - `shipCityId`, `shipPostalCode`
    - `shipOfficePhone`, `shipResidencePhone`, `shipMobileNumber`
  - Shipping fields are now explicit API/UI fields while persisting in `extraFields` storage for current DB compatibility.
  - Added first-class credit limit fields in accounts ledger GraphQL and ledger UI:
    - `creditLimitNoOfDays`, `creditLimitNoOfBills`
  - Credit limit fields are now explicit API/UI fields while persisting in `extraFields` storage for current DB compatibility.
  - Added first-class tax-configuration fields in accounts ledger GraphQL and ledger UI:
    - `taxCalculation`, `taxNature`, `taxCapitalGoods`
    - `taxRoundOffSales`, `taxRoundOffPurchase`
    - `taxFPurchaseLedgerId`, `taxFSalesLedgerId`, `taxFSalesLedger2Id`
    - `taxAccountsUpdate`
  - Tax-configuration fields are now explicit API/UI fields while persisting in `extraFields` storage for current DB compatibility.
  - Added first-class operational fields in accounts ledger GraphQL and ledger UI:
    - `isGenerateBill`, `typeOfParty`, `isPrintBill`
    - `isTaxApplicable`, `isStopGst`, `gstStopDate`
    - `intRate`, `isTcsApplicable`
  - Operational fields are now explicit API/UI fields while persisting in `extraFields` storage for current DB compatibility.
  - Added first-class alternate tax ID fields in accounts ledger GraphQL and ledger UI:
    - `tinNumber2`, `tinNumber3`
    - `tinNumberFrom2`, `tinNumberFrom3`
  - Alternate tax ID fields are now explicit API/UI fields while persisting in `extraFields` storage for current DB compatibility.
  - Added first-class child-grid payload support in accounts ledger GraphQL and ledger UI:
    - `contactPersonsJson` (legacy `ContactPersonMaster` grid payload)
    - `ledgerSalesTaxesJson` (legacy `LedgerSalesTaxMaster` grid payload)
  - Child-grid payloads are now editable in add/edit flows and visible in View mode while persisting in `extraFields` storage for current DB compatibility.

Resolved in extended Phase 3 pass (February 19, 2026):

- Master-form dry-run behavior (Medium)
  - Added `Dry Edit Check` flow in Sales Invoice related master forms:
    - In `Edit` mode, first `Save` click runs non-destructive dry check and shows pass message.
    - Second `Save` click (same form state) applies the actual update.
    - If form values change after dry check, edit requires dry check again before update.
  - Added explicit `Dry Delete Check` pass indicator in delete confirmation messaging:
    - Delete action still runs dependency pre-check first.
    - Confirmation popup now clearly indicates dry delete check passed before final delete confirmation.
- `ledger-groups` accounting edit/delete guardrails (High)
  - Protected accounting groups (legacy system group type codes) now block delete in both UI and backend.
  - For protected accounting groups, structural fields are read-only/blocked:
    - `groupTypeCode`
    - `defaultBalanceType`
    - `isTradingFlag`
    - `isProfitLossFlag`
    - `isBalanceSheetFlag`
  - Structural edits are also blocked once a ledger group is already referenced in dependent records.
  - Backend delete now re-validates dependency impact before executing actual delete, even if frontend checks are bypassed.
  - Ledger Group UI now makes dry edit flow explicit:
    - Save button shows `Run Dry Check` first, then `Apply Changes` after dry pass.
    - Delete flow shows a toast-level `Dry Delete Check Passed` before final confirmation popup.
  - Ledger Group table/view now shows protection visibility:
    - Type column displays `Protected` badge for protected groups.
    - View dialog shows `Protected Accounting Group` and explicit `Locked Fields`.
  - Legacy `DrCr` normalization is now enforced in voucher/accounts import apply path:
    - Source (legacy): `DrCr` uses `0=Dr`, `1=Cr`.
    - Canonical target: `defaultBalanceType` uses `1=Dr`, `-1=Cr`.
    - One-time backfill was run from staged legacy data to restore missing default balance values.
- `ledgers` accounting edit/delete guardrails (High)
  - Backend now applies accounting constraints before actual update/delete:
    - Protected accounting ledgers cannot be deleted.
    - Structural edits are blocked for protected accounting ledgers:
      - `ledgerGroupId`
      - `openingBalanceAmount`
      - `balanceType`
      - `isActiveFlag`
    - Structural edits are blocked for referenced ledgers (dependency impact check).
    - Delete re-validates dependencies in backend before actual delete.
  - Ledger UI now reflects accounting guardrails:
    - Edit dialog shows explicit dry-save state (`Run Dry Check` -> `Apply Changes`).
    - Edit dialog locks protected structural fields.
    - Table and detail view indicate protected ledgers.
    - Delete action is disabled for protected ledgers and still uses dry-delete pre-check.

Remaining open gaps to close:

1. `ledgers` (Field-level parity)
   - No high-impact ledger field-level gaps remain from the mapped legacy parameter set.
   - Current compatibility note: child-grid rows are exposed as JSON payload fields and persisted in `extraFields` (not yet normalized into dedicated relational child tables).

## Suggested Closure Plan

### Phase 1 (Parity Critical)

Status: Completed on February 17, 2026.

1. Add read-only `View` action to all master forms (same pattern as Ledger).
2. Add `ledgerIds` support in Product Brand form (query, form, create/update payload, table rendering).
3. Expand Ledger form with missing legacy fields and active toggle.

### Phase 2 (Reliability + UX)

Status: Completed on February 17, 2026.

Completed in current pass:

1. Replace Transporter `cityId` number input with city lookup control.
2. Add standardized delete pre-check messaging for referenced masters.
3. Add server-side search/limit for large master datasets (`products`, `product-brands`, `transporters`).
4. Add explicit dependency-count pre-check APIs and strict pre-delete checks for Sales Invoice-related accounts/inventory master forms.
5. Extend server-driven list behavior to remaining Sales Invoice master forms (`ledger-groups`, `salesmen`, `product-groups`, `product-attribute-types`, `units`, `hsn-codes`, `godowns`, `scheme-batches`, `delivery-by`, `delivery-status`, `checked-by`, `bill-collection-status`).

### Phase 3 (Final Legacy Alignment)

Status: In progress (started February 17, 2026).

1. Validate legacy-only fields/behaviors not yet present in GraphQL for each master.
2. Align role/permission behavior for add/edit/delete/view with legacy form rights.
   - Backend enforcement: completed February 17, 2026.
   - Frontend action-state parity: completed February 19, 2026.
   - Frontend coverage completed for:
     - Accounts: `ledgers`, `ledger-groups`, `salesmen`
     - Inventory: `products`, `product-groups`, `product-brands`, `product-attribute-types`, `units`, `hsn-codes`, `godowns`, `scheme-batches`, `delivery-by`, `delivery-status`, `checked-by`, `bill-collection-status`, `transporters`
3. Run UAT checklist form-by-form with legacy users.
   - UAT assets created on February 19, 2026:
     - `docs/knowledge-book/sales-invoice-master-forms-uat-playbook.md`
     - `docs/knowledge-book/sales-invoice-master-forms-uat-log-template.csv`
     - `docs/knowledge-book/sales-invoice-master-forms-uat-run-plan-template.csv`
   - `FULL_RIGHTS` expected-permission matrix prefilled in log template on February 19, 2026.
   - `VIEW_ONLY` and baseline `RESTRICTED_ADD_EDIT_NO_DELETE` expected-permission matrices prefilled in log template on February 19, 2026.
   - UAT log template extended with explicit dry-run evidence fields:
     - `dry_edit_check_result`
     - `dry_delete_check_result`
   - Dry-run expected outcomes prefilled by role profile in UAT log template on February 19, 2026.
   - Run-plan template prefilled with sequence (`1-48`), batches, and priority levels (`P1/P2/P3`) on February 19, 2026.
   - Execution status: pending scenario runs with legacy users.

## Source Files Used

- Frontend master pages under `src/pages/(main)/apps/accounts/*` and `src/pages/(main)/apps/inventory/*`
- Legacy parity mapping: `docs/legacy-form-procedure-map.csv`
- Inventory GraphQL schema: `backend/services/inventory/graphql/schema.ts`
- Inventory GraphQL API context: `backend/services/inventory/api.ts`
- Inventory master handlers: `backend/services/inventory/graphql/masters.ts`
- Accounts GraphQL schema: `backend/services/accounts/graphql/schema.ts`
- Ledger/ledger-group handlers: `backend/services/accounts/graphql/mutations.ts`, `backend/services/accounts/graphql/ledgerMaster.ts`, `backend/services/accounts/graphql/ledgerGroupMaster.ts`
- Shared master action permissions helper: `backend/lib/masterActionPermissions.ts`
- Frontend master action permissions helper: `src/lib/masterActionPermissions.ts`
- Frontend master dry-run helper: `src/lib/masterDryRun.ts`
- Sales Invoice master UAT playbook: `docs/knowledge-book/sales-invoice-master-forms-uat-playbook.md`
- Sales Invoice master UAT log template: `docs/knowledge-book/sales-invoice-master-forms-uat-log-template.csv`
- Sales Invoice master UAT run-plan template: `docs/knowledge-book/sales-invoice-master-forms-uat-run-plan-template.csv`
- Accounts DB schema: `backend/services/accounts/db/schemas/accounts.ts`
