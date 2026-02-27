# GST Sales Invoice Form: Legacy Parity Checklist

Date: 2026-02-26
Scope: `/apps/billing/invoice-form` (`register`, `new`, `edit`)
Legacy baseline: user-provided legacy GST Sales Invoice screen (example invoice `13667`, dated `07/02/2026`).

## Status Legend

- `DONE`: Legacy behavior/field is available in current form.
- `PARTIAL`: Available but not in legacy-equivalent UX pattern.
- `MISSING`: Not yet available.
- `DESCOPED`: Explicitly removed from scope by product decision.

## 1) Header + Action Strip Parity

| Legacy capability | Current status | State | Notes |
| --- | --- | --- | --- |
| Invoice prefix + invoice no + date | Present in header | `DONE` | Implemented in header top row. |
| Bill no + party GSTIN | Present in header | `DONE` | Added in compact top row. |
| Ledger group + ledger + address + other state | Present in header | `DONE` | Includes selected-ledger fallback and current balance label. |
| VAT Included + Scheme + Remark + Bizom invoice no | Present in header | `DONE` | Available in meta row. |
| Disputed + Cancel Invoice controls | Present in header | `DONE` | `Cancel Invoice` visible in edit mode. |
| Estimate action | Present with searchable lookup + import | `DONE` | Imports estimate lines/tax/additional tax/type details into draft. |
| Credit Note action | Present with searchable lookup + editable linkage rows | `DONE` | Party-scoped sales-return lookup supported. |
| Debit Note action | Present with searchable lookup + editable linkage rows | `DONE` | Voucher-id lookup + manual row edit supported. |
| Search Entry (`F11`) row in entry page | Not present | `MISSING` | Quick-jump is handled through date-range + invoice dropdown only. |
| From/To date strip above form | Present in entry top-right toolbar | `DONE` | Date range filters quick invoice jump list before invoice-no selector. |
| `Show Tax Column` toggle | Present | `DONE` | Toggle is available in action strip and controls SGST/CGST/IGST table columns. |
| `Replacement` action | Removed from scope | `DESCOPED` | Explicit de-scope decision. |
| `Recalc Replacement Amount` action | Removed from scope | `DESCOPED` | Explicit de-scope decision. |

## 2) Line Grid + Line Entry Parity

| Legacy capability | Current status | State | Notes |
| --- | --- | --- | --- |
| Line table with sales columns (item/type/remark/mrp/unit/qty/rate/free/qps/discount/tax/final) | Present | `DONE` | Core column coverage exists in `InvoiceLinesTable`. |
| SGST/CGST/IGST line-level visibility | Present | `DONE` | State-driven display and tax-ledger mapping. |
| Add line / edit line / delete line | Present | `DONE` | New line, row select/edit, delete, duplicate. |
| Keyboard flow for line editor | Present | `DONE` | `Enter`, `Ctrl+D`, `Delete`, plus function-key shortcuts (`F2/F4/F6/F7`) are supported. |
| Line-entry pattern standardization | Selected-row editor panel finalized as canonical pattern | `DONE` | Editor now uses one consistent flow (`Done`, `Add Next Line`, `Revert`) for all rows. |
| Legacy left `D` checkbox column for row mark/select | Not present | `MISSING` | Uses row selection and action buttons instead. |
| Type Details popup flow | Present | `DONE` | Triggered by dedicated action button + dialog. |
| Additional Tax popup flow | Present | `DONE` | Triggered by dedicated action button + dialog. |

## 3) Tax Summary + Totals + Footer Parity

| Legacy capability | Current status | State | Notes |
| --- | --- | --- | --- |
| Tax summary grid (Tax/Add/Less) | Present | `DONE` | `Less` is editable per ledger line. |
| Totals block (qty/free/amount/discount/tax/round/net) | Present | `DONE` | Includes net amount and taxation totals. |
| Replacement amount totals | Not surfaced for end user | `DESCOPED` | Payload still stores zero replacement amounts. |
| Save / Cancel actions | Present | `DONE` | Includes Save and Save+New (new mode). |
| Delete (cancel invoice behavior) | Present | `DONE` | Delete action maps to cancel semantics. |
| Legacy footer quick actions (`Print`, `Copy`, `Close`) | Present | `DONE` | Footer action group added in entry/edit actions bar. |
| Legacy `Print Scheme` / `Ledger` toggles near footer | Present | `DONE` | Toggles are available beside print/copy utilities in entry footer actions. |
| Tax "Clear Selection" shortcut link | Present as `Clear Less` | `DONE` | Tax summary now supports quick reset of `Less` values. |

## 4) Register Page Parity

| Legacy capability | Current status | State | Notes |
| --- | --- | --- | --- |
| Invoice list with search | Present | `DONE` | Search by id/no/party/date/amount. |
| Open edit from register | Present | `DONE` | Double-click and edit action supported. |
| Delete/cancel from register | Present | `DONE` | Confirm + cancel flow available. |
| Date-range filters in register | Present | `DONE` | Register toolbar now includes `From Date` and `To Date`. |
| Quick status filters (cancelled/disputed/with links) | Present | `DONE` | Register now includes `Include Cancelled`, `Disputed Only`, `Linked Only`. |
| Dense operational columns (bill no, flags, linkage counts) | Present | `DONE` | Register now includes bill no, status, and linkage summary columns. |

## 5) Sale Data Visibility Gaps (Data Exists but UI Hidden)

These fields are intentionally hidden from entry/edit UI and preserved in payload/hydration:

- `otherLedgerId` (`DESCOPED UI`)
- `itemBrandId` (`DESCOPED UI`)
- `isChecked` (`DESCOPED UI`)
- `g1BillNumber` (`DESCOPED UI`)
- `g1IsSchemeMatched` (`DESCOPED UI`)
- `g1IsAmountMatched` (`DESCOPED UI`)
- `g1Remark` (`DESCOPED UI`)

Notes:
- Values continue to be preserved and round-tripped on update.
- `Advanced / Legacy Metadata` editor block was removed per current legacy visibility scope.

## 6) Standard UI Pattern Recommendation (For Final UX Pass)

Recommended invoice page structure:

1. Context bar: mode, invoice id/no, net amount, line count, status chips.
2. Header card: compact 2-row grid (identity + party/tax flags), no unused horizontal space.
3. Line workspace: table + selected-row editor (standardized canonical pattern).
4. Summary/action rail: tax summary + totals + save/delete + optional print/copy group.

Rules to apply consistently:

- Keep only critical controls in always-visible header.
- Keep low-frequency legacy metadata out of primary entry UI unless explicitly re-enabled.
- Keep lookup actions (`Estimate`, `Credit`, `Debit`) together and near linkage status.
- Avoid mixed action placement (top and bottom duplicates) unless each has distinct use.

## 7) Prioritized Update Backlog

### P0 (High impact, parity-critical)

No open P0 parity items.

### P1 (Operational UX)

No open P1 items.

### P2 (Polish)

No open P2 items.

## Sign-off Snapshot

- Completed parity tracks: header core fields, ledger group/ledger visibility, estimate linkage/import, credit/debit linkage + lookup UX, register filters/columns, footer utility actions, tax reset helper, keyboard shortcut enhancement, and large-screen spacing tune-up.
- De-scoped track: replacement/recalc workflow.
- Remaining gaps are limited to non-priority legacy-only controls: `Search Entry (F11)` row in entry header and left `D` row-mark checkbox column in line grid.
