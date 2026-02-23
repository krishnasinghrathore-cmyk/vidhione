# Universal Voucher Platform Plan (Keep Payment Voucher Untouched)

## Summary

- Build a new long-term stable **common voucher form** for all voucher entry types.
- Keep existing **Payment Voucher** flow unchanged (final tested version).
- Add voucher-wise menu entries (Payment, Receipt, Contra, Sales, Purchase, Debit Note, Credit Note, RCM, Tax Invoice variants).
- Use legacy behavior from `frmVoucherEntry2.cs` as reference, but implement in modern modular architecture.

## Non-Negotiables

- Do not change current payment voucher implementation:
  - `src/pages/(main)/apps/accounts/vouchers/payment-voucher/*`
  - Existing payment routes in `src/Router.tsx`
- Build common voucher as a **new module**.
- Keep current legacy/general voucher pages available until parity sign-off.

## Voucher Coverage Matrix

- Payment Vouchers: existing module (unchanged), IDs `2`, `30`
- Receipt Vouchers: cash/bank, IDs `3`, `29` (legacy reads `13`, `14`)
- Contra Vouchers: deposit/withdrawal/transfer, ID `1`
- Journal Vouchers: ID `4`
- Sales Vouchers: ID `5`
- Purchase Vouchers: ID `7`
- Credit Note: ID `6`
- Debit Note: ID `8`
- RCM Invoice: ID `32`
- Tax Invoice (without item details): sales/purchase mode (posting + tax summary)
- Tax Invoice (with item details): sales/purchase mode (posting + item grid + bill details)

## Frontend Architecture

Create new module:

- `src/pages/(main)/apps/accounts/vouchers/common/`

Core files:

- `voucherProfiles.ts` (profile registry)
- `useVoucherCommonState.ts` (state engine)
- `VoucherCommonPage.tsx`
- `VoucherCommonFormHeader.tsx`
- `VoucherCommonPostingLines.tsx`
- `VoucherCommonBillDetails.tsx`
- `VoucherCommonItemDetails.tsx`
- `VoucherCommonFooter.tsx`
- `VoucherCommonRegisterTable.tsx`

Design principles:

- Profile-driven rendering (sections shown based on voucher profile config)
- Reuse action-state pattern from `src/lib/accounts/voucherActionsState.ts`
- Keyboard flow parity with payment voucher and report form standards
- Dynamic register mode:
  - Current voucher register
  - Common register (cross-voucher)

## Router and Menu Changes

Update `src/Router.tsx` with dedicated route families:

- `/apps/accounts/receipt-vouchers/...`
- `/apps/accounts/contra-vouchers/...`
- `/apps/accounts/journal-vouchers/...`
- `/apps/accounts/sales-vouchers/...`
- `/apps/accounts/purchase-vouchers/...`
- `/apps/accounts/credit-notes/...`
- `/apps/accounts/debit-notes/...`
- `/apps/accounts/rcm-invoices/...`
- `/apps/accounts/tax-invoices/basic/...`
- `/apps/accounts/tax-invoices/items/...`

Update `src/layout/AppMenu.tsx`:

- Add separate voucher entries for each voucher family.
- Keep Payment Voucher separate.
- Temporarily keep old `Voucher Entry` as "Legacy Voucher Entry".

Update `src/layout/AppBreadCrumb.tsx`:

- Generalize payment-only breadcrumb resolver into common voucher route resolver.

## Backend Changes (Accounts)

Current gap:

- `voucher_bill_details` table exists but create/update flow does not persist/reload bill details in voucher APIs.
- Item/detail voucher behavior from legacy is not represented in accounts voucher GraphQL contract.

### New/Extended GraphQL (Accounts)

Add:

- `voucherCompositeById(voucherId: Int!): VoucherCompositeDetails`
- `openBillDocuments(ledgerId: Int!, docKinds: [String!], asOnDate: String, search: String): [OpenBillDocument!]!`
- `saveVoucherComposite(input: SaveVoucherCompositeInput!): SaveVoucherCompositeResult!`

Add input/output types:

- `VoucherBillAllocationInput`
- `VoucherDocumentInput`
- `SaveVoucherCompositeInput`
- `VoucherBillAllocation`
- `VoucherDocumentRef`
- `VoucherCompositeDetails`
- `SaveVoucherCompositeResult`

Keep unchanged for safety:

- `createVoucher`
- `updateVoucherEntry`

So current payment voucher behavior remains stable.

### Data Model Enhancements

Add new accounts tables:

- `accounts.voucher_bill_allocations` (normalized bill adjustments)
- `accounts.voucher_documents` (voucher-to-billing-document linking for itemized/tax invoice modes)

Compatibility:

- Keep `accounts.voucher_bill_details` for legacy compatibility during migration period.

### Supporting Ledger Purpose Rules

Extend purpose map in:

- `backend/services/accounts/graphql/supporting.ts`

Add missing purpose keys:

- `JOURNAL-AGAINST`
- `VOUCHER TAX`
- `RCM_TAX`
- Explicit purpose keys for tax-invoice modes

## Billing Integration Boundary

For with-item tax invoice modes:

- Reuse billing invoice payload semantics (existing billing API behavior).
- Avoid duplicating tax computation logic in accounts module.
- Store linkage in `voucher_documents` so voucher and invoice are traceable together.

## Phased Rollout

### Phase 0: Baseline Freeze

- Freeze payment voucher behavior and create regression checklist.

### Phase 1: Backend Foundation

- Add composite voucher API, new tables, and purpose rules.

### Phase 2: Common Engine (Core)

- Deliver receipt, contra, journal using common module.

### Phase 3: Commercial Vouchers

- Deliver sales, purchase, credit note, debit note.
- Enable bill details save/load.

### Phase 4: RCM and Tax Invoice Modes

- Deliver RCM.
- Deliver tax invoice without-items.
- Deliver tax invoice with-items and billing linkage.

### Phase 5: Stabilization and Cutover

- Full parity checks against legacy behavior matrix.
- Keep old pages until sign-off.
- Update status docs and operational checklist.

## Test Plan

### Backend

1. `saveVoucherComposite` creates balanced postings with header/lines.
2. Update flow replaces allocations atomically.
3. Bill allocations persist and reload via `voucherCompositeById`.
4. `openBillDocuments` returns only outstanding docs by ledger/type/date.
5. Existing payment voucher mutations still behave unchanged.

### Frontend

1. Payment voucher routes unchanged (regression pass).
2. Receipt cash/bank create-edit-delete.
3. Contra deposit/withdrawal/transfer behavior.
4. Sales/purchase with tax and bill details.
5. Credit/debit note with ref2/reason fields.
6. RCM validations and ledger filters.
7. Tax invoice basic and item-detail modes.
8. Register scope switch behavior.
9. Keyboard navigation parity.

## Assumptions

- Payment voucher module remains frozen and separate.
- Common voucher uses new composite APIs.
- Migration is profile-by-profile, not big-bang.
- Legacy voucher entry remains temporarily for fallback.
