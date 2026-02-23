# Report SSR Setup

## Goal

Enable true server-side rendering (SSR) for report screens so first paint includes rendered report markup and hydrated GraphQL cache.

## What Is Implemented

1. SSR route matcher for reports: `src/lib/ssr/reportRoutes.ts`.
2. Server-side render entry with auth bootstrap and Apollo prefetch: `src/entry-server.tsx`.
3. Dedicated SSR web server (dev/prod): `server/ssr-server.mjs`.
4. Shared app providers for both client and server render paths: `src/AppProviders.tsx`.
5. Hydration-aware client bootstrap: `src/main.tsx`.
6. SSR-aware Apollo client factory: `src/lib/apolloClient.ts`.
7. Auth provider hydration support: `src/lib/auth/context.tsx`.

## Commands

1. Install dependencies in the same OS/runtime where you run the app (important for `esbuild`):
```bash
npm install
```
2. Run normal CSR dev server:
```bash
npm run dev
```
3. Run SSR dev server:
```bash
npm run dev:ssr
```
4. Build SSR bundles:
```bash
npm run build:ssr
```
5. Start SSR in production mode:
```bash
npm run start:ssr
```

## Important Runtime Note (WSL/Windows)

If you see:
`You installed esbuild for another platform...`
then `node_modules` was installed on a different OS target. Reinstall dependencies in the current runtime:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Important Runtime Note (Relative GraphQL URL)

When `VITE_GRAPHQL_URL` is set to a relative path (for example `/graphql`), browser CSR works but Node SSR needs an absolute backend origin.

Set:

```bash
SSR_API_ORIGIN=http://127.0.0.1:4000
```

If `VITE_GRAPHQL_URL` is already absolute (`http://.../graphql`), this variable is optional.

## Report Route Coverage

SSR now targets all current project report screens via explicit route prefixes in `src/lib/ssr/reportRoutes.ts`.

1. Accounts:
`day-book`, `trial-balance`, `balance-sheet`, `profit-loss`, `ledger`, `ledger/month-wise-summary`, `stock-in-hand`, `depreciation`, `invoice-rollover`, `book-printing`, `accounts-reports`, audit/bank report pages, voucher registers.
2. Billing:
all implemented book/report screens (`sales/purchase` books + returns, GST sales invoices, money receipt report/register pages), plus legacy report slug paths routed by `billing/section`.
3. GST:
all GST report/return routes under `/apps/gst/*`.
4. Wealth:
`dividends`, `holdings`, `realized`, `transactions`, `ledger`.

When a new report route is added, append its route prefix in `REPORT_ROUTE_PREFIXES` inside `src/lib/ssr/reportRoutes.ts`.
