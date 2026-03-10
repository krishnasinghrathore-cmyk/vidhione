# Wealth Household Go-Live Runbook

Date: 2026-03-10
Scope: Onboard a real Wealth client using the current household Wealth app.

## Use The Right Tenant Model

Choose one of these two paths:

1. Existing client already uses another app in `vidhione`
- Keep the same tenant.
- Enable the `wealth` app for that tenant.
- Keep app access restricted per user with `user_tenant_apps`.
- Configure a separate Wealth service database for that tenant.

2. Brand-new Wealth client
- Create a new tenant.
- Enable the `wealth` app.
- Configure the tenant DB mappings before first login.

## Mandatory Control-Plane Setup

For every live Wealth tenant:

1. Tenant exists and is active.
2. `wealth` is enabled in the tenant app list.
3. At least one tenant user is assigned.
4. Tenant DB mappings exist and are active:
- `default`
- `migration`
- `wealth`
5. The Wealth database is on the latest household schema.

## Recommended User Setup

Create at least:

1. Tenant admin
- can manage household setup
- should usually have only `wealth` assigned unless they need other apps too

2. Wealth operator
- day-to-day data entry and review
- restrict to `wealth` in `user_tenant_apps`

3. Optional superadmin support access
- use tenant launch from `/admin/tenants` only for support/UAT

## First-Time Tenant Checklist

Run this order:

1. Log in as tenant admin.
2. Confirm the sidebar shows `Wealth` directly, not hidden under a generic add-on path.
3. Open the Wealth dashboard.
4. Create investor profiles.
5. Create demat accounts and link them to investor profiles.
6. Open `Wealth -> Rollout Kit`.
7. Run opening holdings import with `Dry run` first.
8. Run transaction import with `Dry run` first.
9. Review:
- holdings
- transactions
- realized P&L
- dividend register
- ledger
- statement pack
10. Save or print the statement pack once as a smoke test.

## UAT Sign-Off Before Real Use

Do not mark the tenant live until these pass:

1. Wealth-only operator login lands on `/apps/wealth`.
2. Unauthorized app routes redirect away cleanly.
3. Same security across multiple demat accounts does not mix incorrectly in account-level reporting.
4. Imports do not create demat accounts silently from CSV text.
5. Unknown or ambiguous account references are blocked during dry run.
6. Statement pack renders with live tenant identity and readable data.

## Go-Live Delivery To Client

Send the client:

1. Login email and password/reset path.
2. Which users are tenant admin vs operator.
3. Which CSV template to use for opening holdings.
4. Which CSV template to use for transactions.
5. The initial workflow:
- dashboard
- investor profiles
- demat accounts
- import
- reports
- statement pack

## Support Notes

- For a launched superadmin session, verify the tenant row in `/admin/tenants` shows `CONFIGURED` before launch.
- If Wealth routes open but the sidebar looks empty, refresh once and confirm the Wealth-focused shell is active.
- If imports fail, check account mapping first. Current Wealth import expects existing demat accounts.

## Current Sample Reference

Sample tenant already prepared in local environment:
- tenant id: `sample-household-wealth`
- tenant code: `WTH-0001`
- sample operator: `wealth.operator@samplewealth.test`
- sample tenant admin: `wealth.tenantadmin@samplewealth.test`
- sample superadmin: `wealth.superadmin@samplewealth.test`