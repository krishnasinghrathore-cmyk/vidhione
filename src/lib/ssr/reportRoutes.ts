const REPORT_ROUTE_PREFIXES = [
    // Accounts reports and report-like registers.
    '/apps/accounts/day-book',
    '/apps/accounts/trial-balance',
    '/apps/accounts/balance-sheet',
    '/apps/accounts/profit-loss',
    '/apps/accounts/ledger',
    '/apps/accounts/stock-in-hand',
    '/apps/accounts/depreciation',
    '/apps/accounts/invoice-rollover',
    '/apps/accounts/book-printing',
    '/apps/accounts/accounts-reports',
    '/apps/accounts/bank-cash-deposit',
    '/apps/accounts/bank-cheque-issue',
    '/apps/accounts/cheque-book-issue',
    '/apps/accounts/ledger-reconciliation',
    '/apps/accounts/audit',
    '/apps/accounts/vouchers/voucher',
    '/apps/accounts/payment-voucher',
    '/apps/accounts/payment-vouchers',
    '/apps/accounts/voucher-entry',
    '/apps/accounts/vat-reports',
    '/apps/accounts/balance-sheet-2',

    // Billing books and report screens.
    '/apps/billing/sales-book',
    '/apps/billing/sales-return-book',
    '/apps/billing/purchase-book',
    '/apps/billing/purchase-return-book',
    '/apps/billing/gst-sales-invoices',
    '/apps/billing/money-receipt-cash',
    '/apps/billing/money-receipt-bank',
    '/apps/billing/receipt-book-issue',
    '/apps/billing/money-receipt-manual-book-issue',
    '/apps/billing/estimate-book',
    '/apps/billing/delivery-process-book',
    '/apps/billing/bill-collection-book',
    '/apps/billing/money-receipt-cash-book',
    '/apps/billing/money-receipt-bank-book',
    '/apps/billing/receipt-book-issue-detail',
    '/apps/billing/money-receipt-manual-book-issue-detail',
    '/apps/billing/cash-receipt-book',
    '/apps/billing/scheme-book',
    '/apps/billing/party-loyalty-program-report',
    '/apps/billing/party-wise-item-sale-detail',
    '/apps/billing/area-wise-summary',
    '/apps/billing/g1-bill-details',

    // GST and wealth reports.
    '/apps/gst',
    '/apps/wealth/dividends',
    '/apps/wealth/holdings',
    '/apps/wealth/realized',
    '/apps/wealth/transactions',
    '/apps/wealth/ledger',
] as const;

const REPORT_ROUTE_PATTERNS: RegExp[] = [
    /^\/apps\/[^/]+\/reports(?:\/|$)/,
];

const normalizePath = (rawUrl: string) => {
    const withoutQuery = (rawUrl || '/').split('?')[0] || '/';
    const withoutHash = withoutQuery.split('#')[0] || '/';
    const normalized = withoutHash.replace(/\/+$/, '');
    return normalized.length > 0 ? normalized : '/';
};

const matchesPrefix = (path: string, prefix: string) =>
    path === prefix || path.startsWith(`${prefix}/`);

export const isReportRoute = (rawUrl: string) => {
    const path = normalizePath(rawUrl);
    if (REPORT_ROUTE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
        return true;
    }
    return REPORT_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
};
