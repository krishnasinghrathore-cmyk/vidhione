# Posting Date Policy

## Rule Header

- `Rule Version`: 1.0
- `Rule Date`: February 16, 2026

## Scope

This policy applies to all accounting vouchers in `vidhione`:
- Payment
- Receipt
- Contra
- Journal
- Sales/Purchase-style accounting entries
- Credit/Debit note entries

## Core Definitions

- `Voucher Date`: the business/document date (when the transaction happened on paper/in business context).
- `Posting Date`: the accounting-effective date (the date used for ledger impact, books, and period reporting).

## Policy Statements

1. Both dates are stored for all voucher types.
2. `Posting Date` defaults to `Voucher Date`, but can be changed by authorized users.
3. Book impact is controlled by `Posting Date`, not by `Voucher Date`.
4. Document chronology and source tracking continue to use/display `Voucher Date`.

## Where Posting Date Must Be Used

- Ledger posting impact and running balances.
- Trial Balance, P&L, Balance Sheet period inclusion.
- Reconciliation period selection and matching.
- Period lock / close validations.
- Any "as on date" accounting balance logic.

## Where Voucher Date Must Be Used

- Voucher print/document context.
- Source document narrative and operational chronology.
- Legacy/user-facing "transaction happened on" reference.

## Where Both Must Be Shown

- Voucher register and audit screens where date mismatch can happen.
- Edit/approval views where users may back-date voucher date but post in current period.
- Troubleshooting/report support views.

## Validation and Control Rules

1. If `Posting Date` falls in a locked period, save must be blocked.
2. `Voucher Date` may differ from `Posting Date`, but difference must be visible to users.
3. Any reconciliation-linked voucher should follow reconciliation edit restrictions regardless of date values.
4. Reports must state which date basis they use (posting-date basis for accounting reports).

## User Guidance

- Use `Voucher Date` for the real-world document date.
- Use `Posting Date` for when the transaction should affect books.
- If unsure, keep both same.
- Change `Posting Date` only when accounting policy requires period adjustment.

## Example Scenarios

1. Late entry:
   - Bill date: April 2
   - Entered on: April 10
   - Voucher Date: April 2
   - Posting Date: April 10 (if policy requires current-period posting)

2. Back-dated accounting correction:
   - Business happened: March 30
   - Entry done in April
   - Voucher Date: March 30
   - Posting Date: March 30 (only if March period is open and policy allows)

3. Operational date vs book date:
   - Cheque received on one date, deposited another date
   - Voucher Date tracks receipt event
   - Posting Date tracks actual accounting impact date per policy
