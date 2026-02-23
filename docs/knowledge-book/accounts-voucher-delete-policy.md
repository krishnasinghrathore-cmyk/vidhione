# Voucher Delete Policy

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 17, 2026
- `Applies From`: February 17, 2026

## Scope

This policy applies to delete behavior for Accounts vouchers (Payment, Receipt, Contra, Journal, Sales, Purchase, Credit Note, Debit Note) in `vidhione`.

## Core Definitions

- `Draft/Unposted Voucher`: voucher header exists but no posting lines exist in `accounts.voucher_postings`.
- `Posted Voucher`: voucher has one or more posting lines in `accounts.voucher_postings`.
- `Hard Delete`: permanent record removal from voucher tables.

## Policy Statements

1. Hard delete is allowed only for draft/unposted vouchers.
2. Posted vouchers must not be hard-deleted.
3. For posted vouchers, correction must use cancellation and reversal/adjustment entry flow.
4. Reconciled vouchers remain non-deletable and non-editable.
5. Database-level FK checks must run before delete to prevent orphaned references.

## Expected System Behavior

- Dry Delete Check shows:
  - posted/unposted status,
  - reconciliation status,
  - database FK reference summary,
  - blocking reasons.
- Delete action is blocked when voucher is posted, reconciled, or FK validation fails.
- Delete action may proceed only when voucher is unposted and all checks pass.

## Implementation Notes

- Posted status is derived from posting row count in `accounts.voucher_postings`.
- FK checks use live `pg_constraint` metadata for references to `accounts.vouchers(voucher_id)`.
- Cleanup tables may be deleted first within transaction where policy allows.
