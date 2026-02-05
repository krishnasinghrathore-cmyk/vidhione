# Accounts Forms Status (Legacy → `vidhione`)

This is a living checklist of Accounts screens and how far the new `vidhione` implementation has progressed compared to the legacy WinForms apps:

- Legacy UI reference (common): `legacy-projects/General/General_Desktop/General_Desktop`
- Legacy menu reference (Agency): `legacy-projects/Agency_Manager/Agency_Manager/frmMDI.designer.cs`
- Screenshot index: `references/Screenshosts/Agencies/README.md`

## 1) What’s already in `vidhione`

| Feature | Route | UI file | Backend | Status vs legacy |
| --- | --- | --- | --- | --- |
| Accounts home tiles | `/apps/accounts` | `src/pages/(main)/apps/ledger/page.tsx` | n/a | ✅ basic navigation |
| Ledger Groups | `/apps/accounts/ledger-groups` | `src/pages/(main)/apps/accounts/ledger-groups/page.tsx` | `ledgerGroups` query | 🟡 list-only (legacy has full master CRUD + flags) |
| Ledgers master | `/apps/accounts/ledgers` | `src/pages/(main)/apps/accounts/ledgers/page.tsx` | `ledgerSummaries` + `create/update/deleteLedger` | 🟡 CRUD exists, but legacy LedgerMaster has many more fields (tax, shipping, contacts, limits, interest, etc.) |
| Day Book | `/apps/accounts/day-book` | `src/pages/(main)/apps/accounts/day-book/page.tsx` | `dayBook` (paged, running balance) | 🟡 legacy-style search (type + match exact), ledger filter, ref columns, running balance; export/print + voucher drilldown pending |
| Trial Balance (Sum) | `/apps/accounts/trial-balance/summarized` | `src/pages/(main)/apps/accounts/trial-balance-summarized/page.tsx` | `trialBalanceSummarized` | 🟡 placeholder computation (opening balances); legacy supports summarized/detailed/annexure + posting view |
| Balance Sheet | `/apps/accounts/balance-sheet/detailed` | `src/pages/(main)/apps/accounts/balance-sheet-detailed/page.tsx` | `balanceSheetDetailed` | 🟡 placeholder computation; latest layout (legacy Balance Sheet 2) |
| Profit & Loss | `/apps/accounts/profit-loss` | `src/pages/(main)/apps/accounts/profit-loss/page.tsx` | `profitLossReport` | 🟡 trading + P&L split report (ledger-level); posting/remuneration tabs pending |

## 2) Legacy Accounts menu (Agency Manager) → mapping

Menu source: `legacy-projects/Agency_Manager/Agency_Manager/frmMDI.designer.cs` (Accounts menu)  
Handlers map to these forms in `legacy-projects/Agency_Manager/Agency_Manager/frmMDI.cs`.

| Menu item | Legacy form | Key legacy SP(s) | Screenshot ref | `vidhione` status |
| --- | --- | --- | --- | --- |
| Ledger Month Wise Summary | `General_Desktop.frmLedgerMonthSummary` | `Select_Acc_LedgerMonthSummary` | `Accounts/Ledger-Month-Wise-Summary.png` | 🟡 month totals + running balance; drill to ledger; print/report pending |
| Ledger (statement) | `frmLedgerNew` | `Select_Acc_Ledger_SummaryNew` (+ balance) | `Accounts/Ledger.png` | ❌ pending |
| Day Book | `frmDayBook` | `Select_Acc_DayBook` | `Accounts/Day-Book.png` | 🟡 running balance + legacy filters/columns done; print/export + voucher drill pending |
| Invoice Rollover (Agency) | `Agency_Manager.frmASInvoiceRollover` | agency-specific | `Accounts/Invoice-Rollover.png` | ❌ pending (agency-only) |
| Voucher Entry | `frmVoucherEntry2` | `Select_Acc_VoucherEntry` + numbering | `Accounts/Voucher-Entry-*.png` | ❌ pending (large) |
| Cash Expenditure Entry | `frmExpenditure` | `Select_Acc_Expenditure` | `Accounts/Cash-Expenditure-Entry.png` | ❌ pending |
| Bank Cash Deposit | `frmBankCashDeposit` | `Select_Acc_Expenditure` | `Accounts/Bank-Cash-Deposit.png` | ❌ pending |
| Bank Cheque Issue | `frmBankChequeIssue` | `Select_Acc_Expenditure` | `Accounts/Cheque-Issue-Entry.png` | ❌ pending |
| Bank Reconciliation | `frmBankReconciliation` | `Select_Acc_BankReconciliation` | `Accounts/Bank-Reconciliation.png` | ❌ pending |
| Stock In Hand | `frmStockInHand` | `Select_Acc_StockInHand` | `Accounts/Stock-In-Hand.png` | ❌ pending |
| Depreciation | `frmDepreciation` | `Select_Acc_Depreciation` | `Accounts/Depriciation.png` | ❌ pending |
| VAT Reports | `frmVATReports` | (legacy VAT-only) | n/a in index | 🚫 not planned |
| Trial Balance | `frmTrialBalance` | `Select_Acc_TrialBalance` | `Accounts/Trial-Balance-*.png` | 🟡 summarized placeholder only |
| Profit & Loss | `frmProfitLoss` | `Select_Acc_ProfitLoss` (+ post) | `Accounts/Profit-%26-Loss.png` | 🟡 trading + P&L report done; posting/remuneration pending |
| Balance Sheet | `frmBalanceSheet2` | `Select_Acc_ProfitLoss` (+ post) | `Accounts/Balance-Sheet-Detailed.png` | 🟡 placeholder only (legacy menu label Balance Sheet 2) |
| Audit | `frmAudit` | `Select_Acc_PostingDetails` | `Accounts/Audit.png` | ❌ pending |
| Book Printing | `frmBookPrinting` | `Select_Acc_BookPrinting` | `Accounts/Book-Printing.png` | ❌ pending |

## 3) Other legacy Accounts-related forms (General Desktop)

These are not all directly in the Agency menu, but are part of Accounts functionality in `legacy-projects/General/General_Desktop/General_Desktop`:

**Masters**
- `frmLedgerMaster` (ledger master full form) → new ledgers UI exists but only covers a subset of fields.
- `frmLedgerGroupMaster` (ledger group master) → new ledger groups UI list exists; CRUD not implemented.
- `frmVoucherTypeMaster` (voucher type master) → not implemented.

**Books / Statements**
- `frmLedgerBook` (address/party book style listing) → not implemented.
- `frmASLedgerBook` (ledger book / advanced search) → not implemented.

**Transactions**
- `frmVoucherEntry`, `frmVoucherEntry2`, `frmPurchaseVoucher` → not implemented (foundation needed: voucher header + voucher lines + item/tax lines).

## 4) Backend/API coverage snapshot

Current Accounts GraphQL (`backend/services/accounts/graphql/schema.ts`) exposes:
- `ledgerSummaries`, `ledgerGroups`, `cities`
- `dayBook` (paged, running balance, from `accounts.vouchers`)
- `trialBalanceSummarized`, `balanceSheetSummarized`, `balanceSheetDetailed`, `profitLossSummarized`, `profitLossReport` (profit/loss uses trading + P&L split)
- Ledger mutations: `createLedger`, `updateLedger`, `deleteLedger`

Main API gaps to reach legacy parity:
- Real voucher header/line data model + queries (not just postings): voucher entry, drill-down, print/export.
- Ledger statement (`frmLedgerNew` equivalent): running balance + opening/closing + voucher drill.
- Ledger month-wise summary (report export + current balance parity pending).
- Trial Balance detailed/annexure + posting view.
- Balance Sheet detailed (latest layout).
- Audit/posting details + book printing datasets.
- Bank reconciliation workflow (reconciliation date/remark, cleared status).

## 6) Ledger Month-wise Summary parity checklist

Use this to compare the new screen vs `Select_Acc_LedgerMonthSummary` (legacy):

- Filters: ledger selected, ledger group selected, and no ledger/group (all groups) all return rows.
- Date range: monthly rows cover every month between From/To (missing months show zero Dr/Cr).
- Opening row: shows Dr/Cr opening (split-year logic + pre-from-date txn for ledger only).
- Running balance: `Balance` is cumulative (Opening + sum of month Dr - Cr).
- Cancelled: only not-cancelled transactions (Cancelled=0).
- Current balance: for selected ledger only, balance as of today (legacy behavior).

## 5) Recommended build order (practical)

1. Ledger statement (`frmLedgerNew` equivalent) + ledger current balance endpoint.
2. Ledger month-wise summary (parity refinements, report export).
3. Trial Balance detailed/annexure (date-range based) + drill into ledger.
4. Balance Sheet detailed (latest layout) + Profit/Loss trading split.
5. Voucher entry core (header + postings/lines) with voucher type master + numbering.
6. Bank reconciliation and cheque/deposit/expenditure screens (many are voucher-type specializations).
7. Audit/posting details + book printing/export.
