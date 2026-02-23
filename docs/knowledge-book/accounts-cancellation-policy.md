# Cancellation Policy

## Rule Header

- `Rule Version`: 1.1
- `Rule Date`: February 17, 2026

## Scope

This policy applies to voucher cancellation behavior in Accounts vouchers (Payment, Receipt, Contra, Journal, and other voucher variants supported by the common voucher engine).

## Core Definitions

- `Cancelled`: voucher is marked as cancelled and excluded from normal active operations.
- `Active`: voucher is not cancelled and can continue normal accounting flow.
- `Audit Trail`: ability to keep historical voucher record visible for verification and compliance.

## Policy Statements

1. Cancellation is a status transition, not a hard delete.
2. Cancelled vouchers must remain visible in register/audit context.
3. Cancellation status must be explicit in UI and print contexts.
4. A cancelled voucher should not be editable like an active voucher.
5. Reconciled vouchers must not be editable through voucher edit flow, including cancellation-driven edit attempts.
6. Posted vouchers should be corrected through cancel/reversal workflow; hard delete is reserved for draft/unposted vouchers only.

## Expected System Behavior

- Register filters must allow users to include/exclude cancelled vouchers.
- Users can identify cancellation status from register and voucher views.
- Once cancelled, voucher content is treated as finalized historical data unless business policy explicitly permits reactivation.
- If a voucher is already reconciliation-locked, edit/update attempts remain blocked by reconciliation rules.

## Control Notes

1. Cancellation actions should be permission-controlled.
2. Any cancel/uncancel event should be audit-friendly (who changed it and when).
3. If a period is locked for posting controls, cancellation should follow period-lock policy.

## Example Scenarios

1. User cancels a voucher entered by mistake:
   - Voucher remains in register.
   - Voucher shows cancelled status.
   - Voucher is not treated as a normal active entry.

2. User tries to edit a voucher already reconciled:
   - Edit is blocked under reconciliation policy.
   - Cancellation does not bypass reconciliation lock.
