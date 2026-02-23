# Accounts Voucher Save Parity Playbook

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 17, 2026
- `Applies From`: February 17, 2026
- `Audience`: Accounts users, QA, support, and implementation team

## Scope

This playbook defines how to validate save/edit parity between legacy voucher behavior and `vidhione` voucher engine for:

- Payment
- Receipt
- Contra
- Journal
- Sales
- Purchase
- Credit Note
- Debit Note

Goal: avoid data loss and ensure that editing an existing voucher only changes what user intended.

## Validation Levels

Use all levels for final sign-off:

1. `UI Dry Check` (before save):
   - run `Dry Check` button (or `Ctrl+Shift+S`) in voucher form.
   - confirm checks pass and payload diff shows expected field changes only.
2. `Post-save form parity`:
   - save, reopen same voucher, verify all edited and non-edited fields.
3. `Register parity`:
   - verify register columns and status values after save.
4. `Posting/report parity`:
   - verify ledger impact, Dr/Cr totals, and bill-wise impact.

## Dry Check Coverage

Dry Check currently validates:

1. Voucher date exists.
2. Posting date exists.
3. Primary ledger selected.
4. At least one line ledger row present.
5. Header amount and net line postings are balanced.
6. Mode rules (as applicable):
   - single-line enforcement
   - primary ledger not repeated in entry lines
   - bill-wise rows required when bill-wise mode is enabled
   - cheque reference required in cheque flow

Dry Check also shows payload-level differences (`Before` vs `After`) for fields that changed from loaded baseline.

## Dry Delete Check Coverage

Dry Delete Check is a non-destructive validation for delete scenarios. It checks:

1. Voucher selection context is valid.
2. Voucher ID is valid.
3. Reconciliation lock status (reconciled vouchers should be blocked).
4. Posted-status policy check (posted vouchers should be blocked; cancel + reversal path).
5. Server-side delete eligibility response.
6. Database FK constraint coverage (`accounts.vouchers` reference constraints).
7. Database FK reference scan with blocking vs auto-cleanup classification.
8. Current cancellation status is visible in check result.
9. Receipt-meta linkage count visibility.

Dry Delete Check does not call delete mutation and does not remove data.
If database FK constraints for `accounts.vouchers` are missing, delete should be treated as blocked until migration is applied.
FK migration reference: `backend/services/accounts/db/013_receipt_voucher_meta_voucher_fk_not_valid.sql`.

## Canonical Test Scenario Matrix

Minimum coverage set:

| Scenario ID | Voucher Type | Mode | Key Conditions |
|---|---|---|---|
| VS-01 | Payment | Cash | manager required, simple 1-line |
| VS-02 | Payment | Bank | cheque payment, cheque book + ref no |
| VS-03 | Receipt | Cash | bill-wise enabled with partial adjustment |
| VS-04 | Receipt | Cash | bill-wise with discount + cheque return charges |
| VS-05 | Receipt | Bank | normal non-bill-wise |
| VS-06 | Contra | Deposit | single-line enforced |
| VS-07 | Contra | Withdrawal | single-line enforced |
| VS-08 | Contra | Transfer | disallow entry ledger = primary |
| VS-09 | Journal | Cash | header Dr/Cr and line Dr/Cr editable |
| VS-10 | Sales | Cash | trade voucher basic edit |
| VS-11 | Purchase | Cash | trade voucher basic edit |
| VS-12 | Credit Note | Cash | note voucher references |
| VS-13 | Debit Note | Cash | note voucher references |
| VS-14 | Any type | Any | reconciled voucher edit blocked |
| VS-15 | Any type | Any | cancelled voucher behavior as per policy |

## Field-by-Field Comparison Checklist

For each scenario, compare legacy vs new for these groups:

1. Header:
   - voucher number, voucher date, posting date
   - reference numbers/dates
   - narration
   - manager/salesman/payment-via
   - cancellation flag
2. Primary ledger block:
   - ledger group
   - primary ledger
   - Dr/Cr (where enabled)
   - amount
3. Entry lines:
   - ledger group, ledger, Dr/Cr, amount
   - line count and line ordering
4. Bill-wise:
   - selected invoices
   - applied amounts
   - debit-note flags
   - discount/charges ledger and amount
5. Status/locks:
   - reconciled and cancelled status visibility
   - edit action availability

## Edit Parity Test Flow (Per Scenario)

1. Open existing voucher in legacy and note baseline values.
2. Open same voucher in `vidhione` edit mode.
3. Run `Dry Check` without changing anything:
   - expected: zero payload changes.
4. Change one field only, run `Dry Check`:
   - expected: only that field path changes.
5. Save voucher.
6. Reopen and verify persisted value for changed field.
7. Verify unchanged fields remain identical to baseline.
8. Verify register row totals/status and report impact.

## Critical Negative Tests

1. Reconciled voucher:
   - edit must be blocked.
   - save/update should not proceed.
2. Locked period (posting-date based):
   - save/update blocked when posting date falls in locked period.
3. Imbalance:
   - header vs line mismatch should block save.
4. Missing mandatory dependencies:
   - cheque flow without cheque details must block save.

## Evidence Template

Capture the following for each run:

- `Scenario ID`
- `Voucher No`
- `Legacy Result`
- `New Result`
- `Dry Check Diff Paths`
- `Pass/Fail`
- `Remarks`

## Acceptance Rule

Mark scenario as parity-pass only when:

1. Dry Check shows expected diffs only.
2. Save succeeds/fails with same business rule as legacy.
3. Reopened voucher matches expected values.
4. Register/report impact matches expected accounting output.
