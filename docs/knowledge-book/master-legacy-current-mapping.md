# Legacy to Current Master Mapping

## Scope

This note maps legacy master screens from the Agency legacy application to the current `vidhione` master routes in Accounts and Inventory.

Primary legacy references used:

- Screenshot index: `.../misc/references/Screenshosts/Agencies/Masters`
- Manager-specific legacy form/code:
  - `legacy-projects/Agency_Manager/Agency_Manager/frmAllMaster.designer.cs`
  - `legacy-projects/Agency_Manager/Agency_Manager/frmAllMaster.cs`

Primary current references used:

- `src/config/accountsMenu.ts`
- `src/config/inventoryMenu.ts`
- `src/layout/AppMenuModel.ts`
- current master route pages under `src/pages/(main)/apps/accounts` and `src/pages/(main)/apps/inventory`

## Mapping Table

| Legacy master | Current master/route | Status | Notes |
| --- | --- | --- | --- |
| Company Details | `Companies` / `/apps/accounts/companies` | Mapped | Same business area; current form is web-adapted rather than legacy desktop layout. |
| User Master | `Users` / `/apps/accounts/users` | Mapped | Same master intent. |
| Form Master | `Forms` / `/apps/accounts/forms` | Mapped | Same master intent. |
| Bank Master | `Banks` / `/apps/accounts/banks` | Mapped | Same master intent. |
| Branch Master | `Branches` / `/apps/accounts/branches` | Mapped | Same master intent. |
| Area Master | `Areas` / `/apps/accounts/areas` | Mapped | Same master intent. |
| State Master | `States` / `/apps/accounts/states` | Mapped | Same master intent. |
| City Master | No standalone current master route | Partially mapped / replaced | Current app uses city lookups in forms, but does not expose a standalone City master page in the active menu. |
| Ledger Group Master | `Ledger Groups` / `/apps/accounts/ledger-groups` | Mapped | Same core master; current UI has been standardized, but legacy protection/flag semantics should still be checked where relevant. |
| Ledger Master | `Ledgers` / `/apps/accounts/ledgers` | Mapped with structural gaps | Same core master, but legacy has denser business grouping and broader field workflow expectations. |
| Manager Master | `Managers` / `/apps/accounts/managers` | Mapped with relationship UI gap closed | Legacy manager form includes salesman assignment inside Manager. Current manager master now models manager-to-salesman assignment too, though the web UI intentionally uses current project dialog patterns instead of the exact desktop split layout. |
| Salesman Master | `Salesmen` / `/apps/accounts/salesmen` | Mapped | Legacy also has standalone Salesman master. Current standalone master is valid. |
| Manager -> Salesman mapping | Inside `Managers` | Mapped | Legacy uses `ManagerSalesmanMaster` mapping with `Salesman List` in Manager form. Current app now persists `salesmanIds` through `core.manager_salesman_links` inside the manager master flow. |
| Payment Via | `Payment Via` / `/apps/accounts/payment-via` | Current-only / legacy ref not confirmed from screenshot set | Present in current Accounts menu; no direct master screenshot confirmed from the reviewed legacy master screenshot set. |
| Item Group Master | `Product Groups` / `/apps/inventory/product-groups` | Mapped | Naming translation: `Item` -> `Product`. |
| Item Brand Master | `Product Brands` / `/apps/inventory/product-brands` | Mapped with migration-risk note | Naming translation is valid. Legacy label says `Company List`, and the actual grid stores `F_LedgerMaster` through `ItemBrandCompanyMaster` with a purchase-ledger lookup. Current app now uses a `Company List` relationship editor too, but older migrated DBs can still open with an empty list if `inventory.product_brand_ledgers.ledger_id` was left null during transform. |
| Item Type Master | `Product Attribute Types` / `/apps/inventory/product-attribute-types` | Mapped with naming translation | Current name is more explicit than legacy `Item Type`. |
| Item Master | `Products` / `/apps/inventory/products` | Mapped with structural gaps | Same business master; current form still needs stronger large-form parity in grouping/layout/workflow. |
| Unit Master | `Units` / `/apps/inventory/units` | Mapped | Same master intent. |
| HSN Code Master | `HSN Codes` / `/apps/inventory/hsn-codes` | Mapped | Same master intent. |
| Godown Master | `Godowns` / `/apps/inventory/godowns` | Mapped | Same master intent. |
| Scheme Batch Master | `Scheme Batches` / `/apps/inventory/scheme-batches` | Mapped | Same master intent. |
| Delivery By Master | `Delivery By` / `/apps/inventory/delivery-by` | Mapped | Same master intent. |
| Delivery Status Master | `Delivery Status` / `/apps/inventory/delivery-status` | Mapped | Same master intent. |
| Checked By Master | `Checked By` / `/apps/inventory/checked-by` | Mapped | Same master intent. |
| Bill Collection Status Master | `Bill Collection Status` / `/apps/inventory/bill-collection-status` | Mapped | Same master intent. |
| Transport Master | `Transport` / `/apps/inventory/transporters` | Mapped with naming gap | Business mapping is correct; current route slug uses `transporters` while UI label is `Transport`. |

## Key Observations

### 1. Manager parity is now functionally covered

Legacy `Manager Master` is not just a one-field name master. It includes:

- manager `Name`
- a `Salesman List`
- load/save logic through `ManagerSalesmanMaster`

The correct current mapping is:

- `Salesmen` remains a standalone master
- `Managers` also owns salesman assignment

The remaining difference is mostly UI structure: the web app now uses a dialog-based relationship editor rather than the exact legacy desktop split form.

### 2. City is no longer modeled as a standalone master

Legacy has a dedicated City master screenshot. Current app appears to treat city as lookup/reference data instead of a standalone CRUD master in the active menu.

### 3. Product Brand is closer than the old label suggests

Legacy `Item Brand Master` shows a `Company List`, but the underlying grid is actually backed by `LedgerMaster`:

- the grid column is `Item Company`
- rows are stored in `ItemBrandCompanyMaster`
- each row persists `F_LedgerMaster`
- the dropdown source is `Select_LedgerMaster_Spl('Purchase')`

So the current app is not fundamentally using the wrong entity type. It is already brand-to-ledger mapping. The real remaining gaps are:

- migration safety: preserve/backfill the legacy link column into `inventory.product_brand_ledgers.ledger_id`
- purchase-ledger filtering for the company lookup
- keeping the business-friendly `Item Company` / `Company List` wording consistent in edit and detail views

### 4. Large masters are mapped but still not parity-complete

`Ledgers` and `Products` are already present and functionally broad, but they still need more legacy-equivalent workflow quality:

- stronger grouping
- better field presentation
- more deliberate keyboard flow
- section-based detail/view layout

## Recommended Classification

- `Mapped`: Bank, Branch, Area, Form, User, State, Company, Salesman, Manager, Ledger Group, Unit, HSN, Godown, Scheme Batch, Delivery By, Delivery Status, Checked By, Bill Collection Status, Transport
- `Mapped with structural gaps`: Ledger, Product
- `Mapped with relationship/UI gaps`: Product Brand
- `Partially mapped`: City
- `Missing`: none in the reviewed Accounts/Inventory master set; remaining issues are mainly workflow, naming, filtering, or relationship-editor presentation gaps

## Recommended Next Build Step

1. Tighten `Product Brands` to legacy parity by switching from generic ledger mapping language to business-friendly `Item Company` labeling and by using purchase-filtered ledger options.
2. Decide whether `Product Brands` should stay a compact multi-select form or move to a row-based relationship editor closer to the legacy company grid.
3. Decide whether `City` should remain lookup-only or return as a standalone master.

## Relationship UI Rule

Checkbox assignment grids should stay limited to masters that had a real child-mapping workflow in legacy, not become the default view for simple masters.

Current rule:

- `Use assignment grid`: `Managers` because legacy `Manager Master` persisted `ManagerSalesmanMaster` rows and exposed a `Salesman List` selection area.
- `Do not use assignment grid by default`: single-record masters like `Branch`, `Bank`, `Area`, `Form`, `Salesman`, `Delivery By`, `Checked By`, `Status` masters, etc.
- `Use a row-based relationship editor if we pursue closer legacy parity`: `Product Brands`, because legacy manages multiple `Item Company` rows rather than a flat multiselect, even though both models are ultimately ledger-backed.

So the checkbox-grid pattern is a relationship-editor pattern, not a general master-form pattern.
