# Sales Invoice Master Forms UAT Playbook

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 19, 2026
- `Applies From`: February 19, 2026
- `Audience`: Sales, Accounts, QA, implementation, and support teams

## Scope

This playbook defines form-by-form UAT for Sales Invoice related master forms to validate legacy parity for:

1. `View`
2. `Add`
3. `Edit`
4. `Delete`
5. Role/right-based action behavior
6. Delete dependency guard behavior

Forms in scope:

- Accounts: `ledgers`, `ledger-groups`, `salesmen`
- Inventory: `products`, `product-groups`, `product-brands`, `product-attribute-types`, `units`, `hsn-codes`, `godowns`, `scheme-batches`, `delivery-by`, `delivery-status`, `checked-by`, `bill-collection-status`, `transporters`

## Preconditions

Before running scenarios, ensure:

1. Legacy reference behavior is available (legacy user or agreed screenshots/recordings).
2. Test users exist for these profiles:
   - `FULL_RIGHTS`: add/edit/delete all enabled.
   - `EDIT_ONLY` or restricted mix as used in legacy (`is_add_flag`, `is_edit_flag`, `is_delete_flag`).
   - `VIEW_ONLY`: viewer fallback role or equivalent no-write rights.
3. At least one editable record exists per form.
4. At least one referenced (in-use) record exists for delete-block checks.

## Role/Permission UAT Matrix

Validate on each form:

1. `FULL_RIGHTS`:
   - New enabled.
   - Edit enabled.
   - Delete enabled (subject to dependency checks).
   - View enabled.
2. `VIEW_ONLY`:
   - New disabled.
   - Edit disabled.
   - Delete disabled.
   - View enabled.
   - Double-click opens View (not Edit).
3. `RESTRICTED`:
   - Action states match configured legacy flags exactly.
   - Log template baseline profile `RESTRICTED_ADD_EDIT_NO_DELETE` is provided as a common default (`add/edit/view = Yes`, `delete = No`) and can be adjusted per tenant rights.

## Execution Flow (Per Form)

Use this sequence for each master form:

1. Open route and validate page loads with rows/search.
2. Check action-state parity for current user profile.
3. Run `View`:
   - Open details from eye icon.
   - Verify read-only content parity.
4. Run `Add` (if allowed):
   - Create valid record.
   - Verify record appears in list and opens in view/edit.
5. Run `Edit` (if allowed):
   - Change one non-key field.
   - Click `Save` once and verify dry-check message appears and no DB update happens yet.
   - Click `Save` again (without changing form) and verify update persists.
   - Change field again and verify dry-check is required again before update.
6. Run `Delete` (if allowed):
   - Attempt delete on in-use record: expect block with dependency message.
   - Attempt delete on safe record:
     - expect confirmation text to include `Dry Delete Check passed`.
     - confirm delete and verify row removed.
7. Validate list controls:
   - Search behavior.
   - Limit/page-size behavior (where available).

## Form Route Map

| Scenario ID | Form | Route |
|---|---|---|
| SIM-M01 | Ledger Master | `/apps/accounts/ledgers` |
| SIM-M02 | Ledger Group Master | `/apps/accounts/ledger-groups` |
| SIM-M03 | Salesmen Master | `/apps/accounts/salesmen` |
| SIM-M04 | Product Master | `/apps/inventory/products` |
| SIM-M05 | Product Group Master | `/apps/inventory/product-groups` |
| SIM-M06 | Product Brand Master | `/apps/inventory/product-brands` |
| SIM-M07 | Product Attribute Type Master | `/apps/inventory/product-attribute-types` |
| SIM-M08 | Unit Master | `/apps/inventory/units` |
| SIM-M09 | HSN Code Master | `/apps/inventory/hsn-codes` |
| SIM-M10 | Godown Master | `/apps/inventory/godowns` |
| SIM-M11 | Scheme Batch Master | `/apps/inventory/scheme-batches` |
| SIM-M12 | Delivery By Master | `/apps/inventory/delivery-by` |
| SIM-M13 | Delivery Status Master | `/apps/inventory/delivery-status` |
| SIM-M14 | Checked By Master | `/apps/inventory/checked-by` |
| SIM-M15 | Bill Collection Status Master | `/apps/inventory/bill-collection-status` |
| SIM-M16 | Transporter Master | `/apps/inventory/transporters` |

## Critical Negative Checks

Run at least once during UAT:

1. Permission denied:
   - Disabled action buttons must not execute action.
   - Unauthorized action attempt must show `Permission Denied` warning.
2. Delete block:
   - In-use records must show clear dependency summary and remain undeleted.
3. View-only fallback:
   - Double-click must not open edit when edit permission is absent.
4. Mutation safety:
   - Unauthorized add/edit/delete attempts must fail server-side if forced via client tools.

## Evidence Capture

For each scenario/profile run, capture:

1. Scenario ID and form name
2. Role profile
3. Expected rights vs observed rights
4. Dry edit check result
5. Add/Edit/Delete/View outcomes
6. Dry delete check result
7. Delete guard result (blocked/success with reason)
8. Pass/Fail with remarks
9. Tester and date

Use: `sales-invoice-master-forms-uat-log-template.csv`

## Run Sequencing And Ownership

Use `sales-invoice-master-forms-uat-run-plan-template.csv` to manage execution order and assignment:

1. `BATCH_A_FULL_RIGHTS` (rows `1-16`): baseline CRUD and delete-guard behavior.
2. `BATCH_B_VIEW_ONLY` (rows `17-32`): strict no-write behavior and view-only fallback.
3. `BATCH_C_RESTRICTED` (rows `33-48`): mixed-right behavior (baseline add/edit/view allowed, delete blocked).

Recommended execution policy:

1. Complete all `P1` rows first (`SIM-M01`, `SIM-M04`) across all three batches.
2. Complete `P2` rows next (`SIM-M02`, `SIM-M05`, `SIM-M06`).
3. Complete remaining `P3` rows.

## Acceptance Rule

Mark a form as UAT-pass only when:

1. All permitted actions succeed.
2. All restricted actions are blocked and/or disabled correctly.
3. Delete guard behavior matches dependency state.
4. No regression is observed against agreed legacy behavior.
