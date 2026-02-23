# Legacy MoneyReceipt Extra Columns (Cash + Bank)

This is the locked inventory of fields shown in legacy `Money Receipt (Cash)` and `Money Receipt (Bank)` screens that are not fully represented in current `Receipt Voucher` UI.

## Source References

- Legacy cash page: `src/pages/(main)/apps/billing/money-receipt-cash/page.tsx`
- Legacy bank page: `src/pages/(main)/apps/billing/money-receipt-bank/page.tsx`
- Current receipt voucher register: `src/pages/(main)/apps/accounts/vouchers/voucher/VoucherTable.tsx`
- Current receipt voucher form: `src/pages/(main)/apps/accounts/vouchers/voucher/components/VoucherFormMainSection.tsx`
- Current receipt voucher footer: `src/pages/(main)/apps/accounts/vouchers/voucher/components/VoucherFormFooter.tsx`
- Current receipt voucher lines: `src/pages/(main)/apps/accounts/vouchers/voucher/components/VoucherDebitLinesSection.tsx`

## Legacy Register Columns

### Legacy Cash Register Columns

- `Receipt No`
- `Date`
- `Ledger`
- `Other Ledger`
- `Sales Ledger`
- `Manager`
- `Salesman`
- `Full Paid`
- `Total`
- `Discount`
- `Net`
- `Adjusted`
- `Diff`
- `Chq. Cancel`
- `Status`
- `Checked`

### Legacy Bank Register Columns

- `Receipt No`
- `Date`
- `Ledger`
- `Other Ledger`
- `Bank`
- `Branch`
- `Cheque No`
- `Cheque Date`
- `Full Paid`
- `Total`
- `Discount`
- `Net`
- `Adjusted`
- `Diff`
- `Chq. Cancel`
- `Return`
- `Status`
- `Checked`

## Legacy Entry Form Fields

### Legacy Cash Form Fields

- `Voucher Date`
- `Voucher No`
- `Ledger`
- `Other Ledger`
- `Sales Ledger`
- `Issue Book`
- `Manager`
- `Salesman`
- `Full Paid` (checkbox)
- `Discount`
- `Cheque Cancel Charges`
- `Checked` (checkbox)
- `Remarks`
- `Invoice Lines`: `Invoice Id`, `Amount`, `Remark`
- Footer summary: `Total Amount`, `Net Amount`, `Difference`

### Legacy Bank Form Fields

- `Voucher Date`
- `Voucher No`
- `Ledger`
- `Other Ledger`
- `Sales Ledger`
- `Bank`
- `Branch`
- `Cheque No`
- `Cheque Date`
- `Cheque Received No`
- `Cheque Received Date`
- `Full Paid` (checkbox)
- `Discount`
- `Cheque Cancel Charges`
- `Cheque Returned` (checkbox)
- `Checked` (checkbox)
- `Remarks`
- `Invoice Lines`: `Invoice Id`, `Amount`, `Remark`
- Footer summary: `Total Amount`, `Net Amount`, `Difference`

## Extra Fields To Add In Current Receipt Voucher (Gap List)

### Register Gaps

- `Other Ledger`
- `Sales Ledger` (cash + bank legacy behavior)
- `Salesman` (cash legacy behavior)
- `Full Paid`
- `Total`
- `Discount`
- `Adjusted`
- `Diff`
- `Cheque Cancel Charges`
- `Checked`
- `Return` (bank)
- `Bank` (bank)
- `Branch` (bank)
- `Cheque No` (bank)
- `Cheque Date` (bank)

### Entry Form Gaps

- `Other Ledger`
- `Sales Ledger`
- `Issue Book` (cash)
- `Salesman` (cash)
- `Full Paid`
- `Discount`
- `Cheque Cancel Charges`
- `Checked`
- `Cheque Returned` (bank)
- `Bank` (bank)
- `Branch` (bank)
- `Cheque No` (bank)
- `Cheque Date` (bank)
- `Cheque Received No` (bank)
- `Cheque Received Date` (bank)
- `Invoice Id` in receipt line editor
- `Line Remark` in receipt line editor
