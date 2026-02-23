# Reconciliation Policy

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 16, 2026

## Scope

This policy applies to voucher entries that become reconciled through bank/ledger reconciliation workflows.

## Core Definitions

- `Reconciled`: voucher posting lines are matched/confirmed in reconciliation workflow.
- `Unreconciled`: voucher posting lines are not yet matched in reconciliation workflow.
- `Reconciliation Lock`: control that prevents editing of reconciled vouchers from voucher edit screens.

## Policy Statements

1. Reconciled vouchers are treated as locked accounting records.
2. Reconciled rows must be visibly distinguishable in voucher register.
3. Edit action must be disabled for reconciled vouchers in register UI.
4. Backend update mutation must reject edits for reconciled vouchers.
5. Users may still view and print reconciled vouchers.

## Expected System Behavior

- Register shows a reconciled indicator/status for reconciled rows.
- Hover message/tooling should clarify why edit is disabled.
- Register supports quick status filter:
  - `All`
  - `Reconciled`
  - `Unreconciled`
- If voucher is reconciled, save/update flow should return a clear validation message.

## Operational Guidance

1. If changes are needed, unreconcile first as per authorized reconciliation workflow.
2. After unreconciliation, edit may proceed subject to other controls (period lock, permissions, etc.).
3. Reconciliation lock is independent from voucher date; posting controls still follow posting-date policy.

## Example Scenarios

1. Reconciled voucher in register:
   - Row is highlighted as reconciled.
   - Edit action is disabled.
   - Print remains available.

2. User attempts direct edit via URL:
   - Backend rejects save/update.
   - User receives reconciliation-lock error.
