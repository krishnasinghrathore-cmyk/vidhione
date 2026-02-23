# Tenant-Safe Master Lookup Cache (Draft)

## Goal

Reuse common Accounts lookup data (`ledgerGroups`, `ledger`, `voucherTypes`, `city`, `area`) across forms while keeping tenant data strictly isolated.

## How It Works

1. Shared store is Apollo cache (not a custom global mutable object).
2. Lookup hooks use `cache-first` policy so the first successful fetch is reused.
3. On tenant scope change (login/logout/launch tenant/exit tenant), all Apollo client stores are cleared.
4. On master updates (ledger/ledger-group/voucher-type/city/area mutations), related lookup cache entries are evicted so next reads fetch fresh data.

## Implemented Building Blocks

- `src/components/TenantApolloCacheGuard.tsx`
  Clears all Apollo client stores when auth scope changes (`userId + tenantId`).

- `src/lib/accounts/masterLookupCache.ts`
  Contains:
  - shared lookup query policy (`ACCOUNT_MASTER_QUERY_OPTIONS`)
  - centralized root field eviction (`invalidateAccountMasterLookups`)

- Shared hooks:
  - `src/lib/accounts/ledgerGroups.ts`
  - `src/lib/accounts/voucherTypes.ts`
  - `src/lib/accounts/ledgerOptions.ts`
  - `src/lib/accounts/partyLedger.ts`
  - `src/lib/accounts/cities.ts`
  - `src/lib/accounts/areas.ts`

## Security Notes

- Tenant isolation is enforced by server auth + tenant context.
- Client-side cache is wiped whenever tenant context changes, preventing one tenant from reusing another tenant’s cached results in the same browser session.
- Do not put `tenantId` in client mutation/query inputs for this purpose; tenant must continue to come from auth context on backend.

## Usage Pattern

1. For dropdown lookups, use shared hooks from `src/lib/accounts/*`.
2. For master mutations, call `invalidateAccountMasterLookups(apolloClient)` after success.
3. Optionally `refetch()` current page query when immediate table refresh is needed.
