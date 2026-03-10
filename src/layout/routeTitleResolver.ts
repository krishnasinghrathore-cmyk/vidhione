import type { Breadcrumb, MenuModel } from '@/types/layout';
import { model } from './AppMenuModel';

const PAYMENT_VOUCHERS_PATH_PREFIX = '/apps/accounts/payment-vouchers';
const VOUCHER_ENGINE_PATH_PREFIX = '/apps/accounts/vouchers/voucher';

const VOUCHER_ENGINE_TYPE_LABELS: Record<string, string> = {
    payment: 'Payment Vouchers',
    receipt: 'Receipt Vouchers',
    contra: 'Contra Vouchers',
    sales: 'Sales Vouchers',
    purchase: 'Purchase Vouchers',
    'credit-note': 'Credit Notes',
    'debit-note': 'Debit Notes',
    'tax-invoice': 'Tax Invoices',
    journal: 'Journal Voucher'
};

const VOUCHER_ENGINE_MODE_LABELS: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transfer: 'Transfer'
};

const VOUCHER_ENGINE_MODE_LABELS_BY_TYPE: Record<string, Record<string, string>> = {
    sales: { cash: 'Entry' },
    purchase: { cash: 'Entry' },
    'credit-note': { cash: 'Entry' },
    'debit-note': { cash: 'Entry' },
    'tax-invoice': { cash: 'Sales', bank: 'Purchase' }
};

const WEALTH_ROUTE_LABELS: Array<{ prefix: string; labels: string[] }> = [
    { prefix: '/apps/wealth/statements/pack', labels: ['Wealth', 'Statement Pack'] },
    { prefix: '/apps/wealth/investor-profiles', labels: ['Wealth', 'Investor Profiles'] },
    { prefix: '/apps/wealth/demat-accounts', labels: ['Wealth', 'Demat Accounts'] },
    { prefix: '/apps/wealth/corporate-actions', labels: ['Wealth', 'Corporate Actions'] },
    { prefix: '/apps/wealth/manual-transactions', labels: ['Wealth', 'Manual Entry'] },
    { prefix: '/apps/wealth/transactions', labels: ['Wealth', 'Transactions'] },
    { prefix: '/apps/wealth/statements', labels: ['Wealth', 'Statements'] },
    { prefix: '/apps/wealth/securities', labels: ['Wealth', 'Securities'] },
    { prefix: '/apps/wealth/dividends', labels: ['Wealth', 'Dividend Register'] },
    { prefix: '/apps/wealth/holdings', labels: ['Wealth', 'Holdings'] },
    { prefix: '/apps/wealth/realized', labels: ['Wealth', 'Realized P&L'] },
    { prefix: '/apps/wealth/rollout', labels: ['Wealth', 'Rollout Kit'] },
    { prefix: '/apps/wealth/import', labels: ['Wealth', 'Import'] },
    { prefix: '/apps/wealth/prices', labels: ['Wealth', 'Prices & FMV'] },
    { prefix: '/apps/wealth/ledger', labels: ['Wealth', 'Ledger'] },
    { prefix: '/apps/wealth', labels: ['Wealth', 'Dashboard'] }
];

const EXACT_PATH_LABELS: Record<string, string[]> = {
    '/': ['Dashboard'],
    '/dashboard': ['Dashboard'],
    '/notfound': ['Not Found'],
    '/landing': ['Landing'],
    '/apps/accounts/payment-voucher': ['Accounts', 'Payment Voucher']
};

const SEGMENT_LABEL_OVERRIDES: Record<string, string> = {
    auth: 'Auth',
    apps: 'Apps',
    admin: 'Admin',
    pages: 'Pages',
    uikit: 'UI Kit',
    utilities: 'Utilities',
    profile: 'Profile',
    crm: 'CRM',
    sms: 'SMS',
    gst: 'GST',
    figma: 'Figma'
};

const GENERIC_TAIL_SEGMENTS = new Set(['new', 'edit', 'detail', 'view']);

const decodeRouteSegment = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const isPrefixPathMatch = (pathname: string, prefix: string) => {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

const formatSegmentLabel = (segment: string) => {
    const normalized = decodeRouteSegment(segment).trim();
    if (!normalized) return '';
    const override = SEGMENT_LABEL_OVERRIDES[normalized.toLowerCase()];
    if (override) return override;
    return normalized
        .replace(/[-_]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (value) => value.toUpperCase());
};

const looksLikeIdentifier = (segment: string) => {
    return /^\d+$/.test(segment) || /^[a-f0-9]{8,}$/i.test(segment);
};

const resolvePaymentVoucherBreadcrumb = (pathname: string): Breadcrumb | null => {
    if (!isPrefixPathMatch(pathname, PAYMENT_VOUCHERS_PATH_PREFIX)) return null;

    const segments = pathname.split('/').filter(Boolean);
    const modeSegment = segments[3] ?? '';
    if (!modeSegment) {
        return { labels: ['Accounts', 'Payment Vouchers', 'Register'], to: pathname };
    }

    const modeLabel = modeSegment === 'cash' ? 'Cash' : modeSegment === 'bank' ? 'Bank' : null;
    if (!modeLabel) return null;

    const sectionSegment = segments[4] ?? '';
    const voucherNoSegment = segments[5] ? decodeRouteSegment(segments[5]) : '';
    const sectionLabel =
        sectionSegment === 'new'
            ? 'New'
            : sectionSegment === 'edit'
              ? voucherNoSegment
                  ? `Edit #${voucherNoSegment}`
                  : 'Edit'
              : 'Register';

    return {
        labels: ['Accounts', 'Payment Vouchers', modeLabel, sectionLabel],
        to: pathname
    };
};

const resolveVoucherEngineBreadcrumb = (pathname: string): Breadcrumb | null => {
    if (!isPrefixPathMatch(pathname, VOUCHER_ENGINE_PATH_PREFIX)) return null;

    const segments = pathname.split('/').filter(Boolean);
    const voucherTypeSegment = segments[4] ?? '';
    const voucherTypeLabel = VOUCHER_ENGINE_TYPE_LABELS[voucherTypeSegment];
    if (!voucherTypeLabel) return null;

    const modeSegment = segments[5] ?? '';
    if (!modeSegment) {
        return {
            labels: ['Accounts', 'Vouchers', voucherTypeLabel, 'Register'],
            to: pathname
        };
    }

    const modeLabel =
        VOUCHER_ENGINE_MODE_LABELS_BY_TYPE[voucherTypeSegment]?.[modeSegment] ?? VOUCHER_ENGINE_MODE_LABELS[modeSegment];
    if (!modeLabel) return null;

    const sectionSegment = segments[6] ?? '';
    const voucherNoSegment = segments[7] ? decodeRouteSegment(segments[7]) : '';
    const sectionLabel =
        sectionSegment === 'new'
            ? 'New'
            : sectionSegment === 'edit'
              ? voucherNoSegment
                  ? `Edit #${voucherNoSegment}`
                  : 'Edit'
              : 'Register';

    return {
        labels: ['Accounts', 'Vouchers', voucherTypeLabel, modeLabel, sectionLabel],
        to: pathname
    };
};

const resolveWealthBreadcrumb = (pathname: string): Breadcrumb | null => {
    const match = WEALTH_ROUTE_LABELS.find((entry) => isPrefixPathMatch(pathname, entry.prefix));
    if (!match) return null;
    return { labels: match.labels, to: pathname };
};

const resolveMenuBreadcrumb = (pathname: string): Breadcrumb | null => {
    let activeBreadcrumb: Breadcrumb | null = null;
    let activeMatchLength = -1;

    const search = (items: MenuModel[], parent: MenuModel[]) => {
        for (const item of items) {
            const path = [...parent, item];
            if (typeof item.to === 'string') {
                const isMatch = item.to === pathname || (pathname.startsWith(item.to) && pathname.charAt(item.to.length) === '/');
                if (isMatch && item.to.length > activeMatchLength) {
                    activeMatchLength = item.to.length;
                    activeBreadcrumb = {
                        labels: path.map((entry) => entry.label),
                        to: item.to
                    };
                }
            }

            if (item.items) {
                search(item.items, path);
            }
        }
    };

    search(model, []);
    return activeBreadcrumb;
};

const resolveFallbackLabels = (pathname: string): string[] => {
    const exactMatch = EXACT_PATH_LABELS[pathname];
    if (exactMatch) return exactMatch;

    const segments = pathname.split('/').filter(Boolean).map(decodeRouteSegment);
    if (!segments.length) return ['Dashboard'];

    if (segments[0] === 'auth') {
        const authPage = formatSegmentLabel(segments[1] ?? 'login');
        return ['Auth', authPage];
    }

    const labels = segments.map(formatSegmentLabel).filter(Boolean);
    if (!labels.length) return ['Dashboard'];

    const lastRaw = segments[segments.length - 1] ?? '';
    const prevRaw = segments[segments.length - 2] ?? '';
    if (looksLikeIdentifier(lastRaw) && GENERIC_TAIL_SEGMENTS.has(prevRaw.toLowerCase())) {
        labels.pop();
    }

    return labels;
};

export const resolveBreadcrumbFromPath = (pathname: string): Breadcrumb => {
    const paymentVoucherBreadcrumb = resolvePaymentVoucherBreadcrumb(pathname);
    if (paymentVoucherBreadcrumb) return paymentVoucherBreadcrumb;

    const voucherEngineBreadcrumb = resolveVoucherEngineBreadcrumb(pathname);
    if (voucherEngineBreadcrumb) return voucherEngineBreadcrumb;

    const wealthBreadcrumb = resolveWealthBreadcrumb(pathname);
    if (wealthBreadcrumb) return wealthBreadcrumb;

    const menuBreadcrumb = resolveMenuBreadcrumb(pathname);
    if (menuBreadcrumb) return menuBreadcrumb;

    return { labels: resolveFallbackLabels(pathname), to: pathname };
};

export const resolveRouteTitleFromPath = (pathname: string) => {
    const labels = resolveBreadcrumbFromPath(pathname).labels ?? [];
    if (!labels.length) return null;
    const contextualLabels = labels.slice(-3);
    return contextualLabels.join(' - ');
};

