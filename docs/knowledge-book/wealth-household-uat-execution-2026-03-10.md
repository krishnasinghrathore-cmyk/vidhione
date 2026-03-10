# Wealth Household UAT Execution - 2026-03-10

Date: 2026-03-10
Tenant: sample-household-wealth
Tenant Code: WTH-0001
Environment:
- Backend: http://127.0.0.1:4000
- Frontend: http://127.0.0.1:5173

## Logins Covered

- Wealth operator: `wealth.operator@samplewealth.test`
- Tenant admin: `wealth.tenantadmin@samplewealth.test`
- Superadmin: `wealth.superadmin@samplewealth.test`

## Fixes Verified During This Run

- Wealth-only login now lands on `/apps/wealth` instead of falling back to the generic sales dashboard.
- Direct navigation to unauthorized `/apps/accounts` redirects back to `/apps/wealth` for the wealth-only operator.
- Full-page auth routes remain stable after refresh because layout consumers now have a safe default layout context.
- Transactions batch review no longer fails on `sourceDoc`; the filtered review route now loads correctly.
- Wealth import sample presets no longer show duplicate load toasts for the same preset.
- Superadmin tenant launch now opens the sample household tenant correctly after the control-plane DB mapping was completed and refreshed.

## Operator Flow Executed

1. Logged in with the wealth-only sample operator.
2. Confirmed post-login landing on `/apps/wealth`.
3. Confirmed unauthorized `/apps/accounts` reroutes to `/apps/wealth`.
4. Opened these authenticated routes successfully:
   - `/apps/wealth`
   - `/apps/wealth/investor-profiles`
   - `/apps/wealth/demat-accounts`
   - `/apps/wealth/import`
   - `/apps/wealth/holdings`
   - `/apps/wealth/transactions`
   - `/apps/wealth/ledger`
   - `/apps/wealth/statements`
   - `/apps/wealth/statements/pack`
   - `/apps/wealth/rollout`
5. Created a new investor profile:
   - `UAT Family Member`
   - relationship `Sibling`
   - PAN `AAAPL1234Q`
6. Created a new linked demat account:
   - `UAT Test Demat`
   - code `DEMAT-UAT-01`
   - broker `Test Broker`
   - depository `CDSL`
7. Ran opening holdings import with sample preset:
   - dry run passed
   - apply posted `2` rows into `UAT Test Demat`
8. Ran transactions import with sample preset:
   - dry run passed
   - apply posted `5` rows
9. Used the post-import review links to open holdings and source-doc-filtered transactions successfully.
10. Ran negative validation by changing the account code to `BAD-CODE-01`; dry run correctly blocked the row with a clear missing-account error.

## Access Matrix Verified

### Wealth Operator

Expected:
- Wealth routes only
- redirected away from unauthorized apps

Observed:
- pass

### Tenant Admin

Expected:
- same focused Wealth shell as a live tenant admin
- tenant-scoped Wealth data visible

Observed:
- pass

### Launched Superadmin

Expected:
- able to launch `sample-household-wealth` from `/admin/tenants`
- same Wealth-focused shell and real tenant data visible

Observed:
- pass
- launch opened `/apps/wealth`
- after load settled, dashboard showed `4` investor profiles, `4` demat accounts, `22` transactions, and `5` positions

## Statement Pack Validation

- Opened `/apps/wealth/statements/pack` in launched-superadmin tenant mode.
- Verified printable statement sections render with live household data:
  - holdings snapshot
  - realized P&L
  - dividend summary
  - recent activity
- Verified header metadata:
  - tenant/company label
  - generated date
  - prepared-by email
- Generated a sample PDF artifact:
  - `docs/knowledge-book/wealth-statement-pack-sample-2026-03-10.pdf`

## Result

Status: Pass

The sample household tenant now passes the main operator, tenant-admin, and launched-superadmin Wealth flows. The remaining work is rollout polish and future enhancements, not a blocker for a first real client onboarding.