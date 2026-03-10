# Wealth Household UAT Playbook

Date: 2026-03-09
Owner: Wealth rollout / tenant onboarding
Scope: Household wealth tenant with investor profiles, demat accounts, imports, reports, and statement pack.

## Goal

Verify that one tenant can manage multiple investor profiles and multiple demat accounts safely with:
- same login / same tenant
- account-safe imports
- household, investor, and demat-level reporting
- printable statement pack output

## Preconditions

1. Tenant exists and Wealth app is enabled.
2. User can see Wealth in the menu.
3. Wealth tenant DB mapping is configured.
4. At least one operator login exists for testing.
5. Use a clean tenant or a clearly controlled sample-data tenant.

## Recommended Sample Setup

Use this minimum household:
- Investor 1: Self
- Investor 2: Spouse
- Demat Account 1: Self main account
- Demat Account 2: Spouse account

Use at least:
- 2 opening holdings rows
- 3 to 5 transaction rows
- 1 dividend row
- same security appearing in more than one demat account to confirm account-safe reporting

## Execution Order

### 1. Access And Navigation

Expected:
- Wealth menu is visible for the assigned user.
- Dashboard opens without error.
- Statements, Import, Investor Profiles, Demat Accounts, Holdings, Transactions, Realized P&L, Dividend Register, Ledger, and Statement Pack routes open.

### 2. Investor Profiles

Create:
- Self
- Spouse

Expected:
- Profiles save successfully.
- Edit works.
- Delete guard behaves correctly when profile is unused.
- List reflects active/inactive status correctly.

### 3. Demat Accounts

Create:
- one demat account for Self
- one demat account for Spouse

Expected:
- Account save works.
- Investor linkage is visible in the list.
- Broker / depository / code fields persist.
- Unassigned accounts are visible if intentionally left unassigned.

### 4. Opening Holdings Import

Flow:
- open `Wealth -> Rollout Kit` and use `Open sample opening`, or open `Wealth -> Import` directly
- choose `Opening Holdings CSV`
- download template or use the in-app sample preset
- paste sample rows
- select target demat account
- run `Dry run`
- then run actual import

Expected:
- dry run shows valid preview rows
- import posts to the selected demat account only
- duplicate batch protection works through `Batch Source Doc`
- holdings report shows imported positions

### 5. Transaction Import

Flow:
- switch to `Transactions CSV`
- download template or use `Open sample transactions` from the rollout kit
- include rows for both demat accounts
- run `Dry run`
- then import

Expected:
- rows must match existing demat account name or code
- no new demat account is silently created from CSV text
- if account is missing or ambiguous, preview/errors show it clearly
- household with one account allows blank account columns; multi-account household does not

### 6. Holdings Report

Check:
- household scope
- investor scope
- demat account scope

Expected:
- same security in multiple demat accounts does not merge incorrectly at account scope
- investor and account labels are correct
- value / P&L renders correctly
- export works

### 7. Transactions Report

Expected:
- investor and account columns are correct
- filters narrow rows correctly
- export works

### 8. Realized P&L

Expected:
- realized rows stay tied to the correct demat account
- investor and account filters work
- export works

### 9. Dividend Register

Expected:
- dividend rows show correct investor/account context
- gross / TDS / net amounts are correct
- export works

### 10. Cash Ledger

Expected:
- investor filtering works
- account filtering works
- opening balance logic behaves correctly for selected scope
- print and CSV export work

### 11. Statement Pack

Open:
- `Wealth -> Statement Pack`

Expected:
- company / tenant name appears in header
- generated date and prepared-by metadata appears
- holdings, realized P&L, dividends, and recent activity render together
- print preview is usable
- save-to-PDF output is client-readable

## Negative Tests

Run these explicitly:
- opening import without selecting demat account
- transaction import with unknown account code
- transaction import with ambiguous account name
- duplicate opening import with same batch source doc
- user without Wealth app access trying to open Wealth route

Expected:
- each case is blocked with clear feedback

## Sign-off Criteria

Mark UAT passed only if:
- no silent account mixing occurs
- no silent account creation occurs from transaction import
- household / investor / demat views all match expected data
- statement pack is printable and understandable
- operator flow is usable without developer help
