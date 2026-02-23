# Period Lock Policy

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 16, 2026

## Scope

This policy applies to all voucher save/update/cancellation actions that can change accounting impact for a posting period.

## Core Definitions

- `Open Period`: accounting period where posting-impact changes are allowed.
- `Locked Period`: accounting period where posting-impact changes are blocked.
- `Posting Date Basis`: lock validation is evaluated using posting date, not only voucher date.

## Policy Statements

1. Period lock checks are mandatory for posting-impact actions.
2. Lock validation must use `Posting Date`.
3. If posting date falls in a locked period, save/update must be blocked.
4. Voucher date difference must not bypass posting-date lock checks.
5. Reconciliation and period lock controls both apply when relevant.

## Expected System Behavior

- Users receive a clear error if action is blocked by locked period.
- Error messaging should mention locked period and posting date basis.
- Register/report views can still display vouchers from locked periods.
- Print/view actions remain available unless separate policy blocks them.

## Interaction with Other Policies

1. Posting Date Policy: determines date basis for accounting impact.
2. Reconciliation Policy: reconciled vouchers remain non-editable even in open periods.
3. Cancellation Policy: cancellation must respect locked-period restrictions where applicable.

## Example Scenarios

1. Voucher date in April, posting date in March, March locked:
   - Save/update blocked because posting date is in locked period.

2. Voucher date in March, posting date in April, April open:
   - Posting-period lock does not block action on date basis.
   - Other validations still apply.
