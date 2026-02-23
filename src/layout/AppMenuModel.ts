import type { MenuModel } from '@/types/layout';
import { APPS } from '@/config/appsConfig';
import { ACCOUNTS_MENU_GROUPS } from '@/config/accountsMenu';
import { BILLING_MENU_GROUPS } from '@/config/billingMenu';
import { GST_MENU_GROUPS } from '@/config/gstMenu';
import { INVENTORY_MENU_GROUPS } from '@/config/inventoryMenu';

const inventoryMenuGroups = INVENTORY_MENU_GROUPS.filter(
    (group) => group.key !== 'reports' && group.key !== 'masters'
);
const inventoryReportItems = INVENTORY_MENU_GROUPS.find((group) => group.key === 'reports')?.items ?? [];
const accountMasterItems = ACCOUNTS_MENU_GROUPS.find((group) => group.key === 'masters')?.items ?? [];
const accountBankingExtras = ACCOUNTS_MENU_GROUPS.find((group) => group.key === 'banking')?.items ?? [];
const accountUtilityExtras = ACCOUNTS_MENU_GROUPS.find((group) => group.key === 'utilities')?.items ?? [];
const accountSettingsItems = ACCOUNTS_MENU_GROUPS.find((group) => group.key === 'settings')?.items ?? [];
const voucherSidebarMovedBillingSlugs = new Set([
    'receipt-book-issue',
    'money-receipt-manual-book-issue'
]);
const billingMenuGroups = BILLING_MENU_GROUPS.filter((group) => group.key !== 'reports')
    .map((group) => ({
        ...group,
        items: group.items.filter((item) => !voucherSidebarMovedBillingSlugs.has(item.slug))
    }))
    .filter((group) => group.items.length > 0);
const billingReportItems = BILLING_MENU_GROUPS.find((group) => group.key === 'reports')?.items ?? [];
const inventoryMasterItems = INVENTORY_MENU_GROUPS.find((group) => group.key === 'masters')?.items ?? [];
const accountMasterBySlug = new Map(accountMasterItems.map((item) => [item.slug, item]));
const inventoryMasterBySlug = new Map(inventoryMasterItems.map((item) => [item.slug, item]));

const buildAccountMasters = (slugs: string[]) =>
    slugs
        .map((slug) => accountMasterBySlug.get(slug))
        .filter(Boolean)
        .map((item) => ({
            label: item!.label,
            icon: item!.icon,
            to: `/apps/accounts/${item!.slug}`
        }));

const buildInventoryMasters = (slugs: string[]) =>
    slugs
        .map((slug) => inventoryMasterBySlug.get(slug))
        .filter(Boolean)
        .map((item) => ({
            label: item!.label,
            icon: item!.icon,
            to: `/apps/inventory/${item!.slug}`
        }));

export const model: MenuModel[] = [
    {
        label: 'Workspace',
        icon: 'pi pi-home',
        items: [
            {
                label: 'Dashboard',
                icon: 'pi pi-fw pi-home',
                to: '/'
            },
            {
                label: 'App Marketplace',
                icon: 'pi pi-fw pi-shopping-cart',
                to: '/apps/marketplace'
            }
        ]
    },
    {
        label: 'Admin',
        icon: 'pi pi-shield',
        items: [
            {
                label: 'Tenants',
                icon: 'pi pi-building',
                to: '/admin/tenants'
            },
            {
                label: 'Users',
                icon: 'pi pi-users',
                to: '/admin/users'
            }
        ]
    },
    {
        label: 'Industry Apps',
        icon: 'pi pi-th-large',
        items: APPS.filter((app) => app.category === 'industry').map((app) => {
            if (app.id === 'wealth') {
                return {
                    label: app.name,
                    icon: app.icon,
                    items: [
                        { label: 'Wealth Admin', icon: 'pi pi-home', to: '/apps/wealth' },
                        { label: 'Transactions', icon: 'pi pi-list', to: '/apps/wealth/transactions' },
                        { label: 'Ledger (Khata)', icon: 'pi pi-book', to: '/apps/wealth/ledger' },
                        { label: 'Holdings', icon: 'pi pi-briefcase', to: '/apps/wealth/holdings' },
                        { label: 'Realized P&L', icon: 'pi pi-chart-line', to: '/apps/wealth/realized' },
                        { label: 'Dividend Register', icon: 'pi pi-wallet', to: '/apps/wealth/dividends' },
                        { label: 'Import', icon: 'pi pi-upload', to: '/apps/wealth/import' }
                    ]
                };
            }
            return {
                label: app.name,
                icon: app.icon,
                to: app.path
            };
        })
    },
    {
        label: 'Accounts',
        icon: 'pi pi-book',
        items: [
            { label: 'Accounts Home', icon: 'pi pi-home', to: '/apps/accounts' },
            {
                label: 'Books',
                icon: 'pi pi-book',
                items: [
                    {
                        label: 'Ledger Month-wise Summary',
                        icon: 'pi pi-chart-bar',
                        to: '/apps/accounts/ledger/month-wise-summary'
                    },
                    { label: 'Ledger Statement', icon: 'pi pi-file', to: '/apps/accounts/ledger' },
                    { label: 'Day Book', icon: 'pi pi-calendar', to: '/apps/accounts/day-book' },
                    { label: 'Invoice Rollover', icon: 'pi pi-refresh', to: '/apps/accounts/invoice-rollover' }
                ]
            },
            {
                label: 'Transactions',
                icon: 'pi pi-pencil',
                items: []
            },
            {
                label: 'Vouchers',
                icon: 'pi pi-file',
                items: [
                    {
                        label: 'Payment Voucher',
                        icon: 'pi pi-wallet',
                        to: '/apps/accounts/vouchers/voucher/payment/bank'
                    },
                    {
                        label: 'Receipt Voucher',
                        icon: 'pi pi-money-bill',
                        to: '/apps/accounts/vouchers/voucher/receipt/cash'
                    },
                    {
                        label: 'Contra Voucher',
                        icon: 'pi pi-refresh',
                        to: '/apps/accounts/vouchers/voucher/contra/deposit'
                    },
                    {
                        label: 'Journal Voucher',
                        icon: 'pi pi-pencil',
                        to: '/apps/accounts/vouchers/voucher/journal'
                    },
                    {
                        label: 'Trade Voucher',
                        icon: 'pi pi-briefcase',
                        to: '/apps/accounts/vouchers/voucher/sales/cash'
                    },
                    {
                        label: 'Note Voucher',
                        icon: 'pi pi-clone',
                        to: '/apps/accounts/vouchers/voucher/credit-note/cash'
                    },
                    {
                        label: 'Issue',
                        icon: 'pi pi-book',
                        items: [
                            { label: 'Cheque Book Issue', icon: 'pi pi-bookmark', to: '/apps/accounts/cheque-book-issue' },
                            {
                                label: 'Receipt Book Issue',
                                icon: 'pi pi-book',
                                to: '/apps/billing/receipt-book-issue'
                            }
                        ]
                    }
                ]
            },
            {
                label: 'Banking & Audit',
                icon: 'pi pi-search',
                items: [
                    ...accountBankingExtras.map((item) => ({
                        label: item.label,
                        icon: item.icon,
                        to: `/apps/accounts/${item.slug}`
                    })),
                    { label: 'Ledger Reconciliation', icon: 'pi pi-check-square', to: '/apps/accounts/ledger-reconciliation' },
                    { label: 'Audit (Posting Details)', icon: 'pi pi-search', to: '/apps/accounts/audit' }
                ]
            },
            {
                label: 'Reports',
                icon: 'pi pi-chart-line',
                items: [
                    {
                        label: 'Trial Balance',
                        icon: 'pi pi-chart-line',
                        to: '/apps/accounts/trial-balance'
                    },
                    { label: 'Balance Sheet', icon: 'pi pi-objects-column', to: '/apps/accounts/balance-sheet' },
                    { label: 'Profit & Loss', icon: 'pi pi-percentage', to: '/apps/accounts/profit-loss' }
                ]
            },
            {
                label: 'Inventory & Fixed Assets',
                icon: 'pi pi-box',
                items: [
                    { label: 'Stock In Hand', icon: 'pi pi-box', to: '/apps/accounts/stock-in-hand' },
                    { label: 'Depreciation', icon: 'pi pi-wrench', to: '/apps/accounts/depreciation' }
                ]
            },
            {
                label: 'Utilities',
                icon: 'pi pi-wrench',
                items: [
                    { label: 'Book Printing', icon: 'pi pi-print', to: '/apps/accounts/book-printing' },
                    { label: 'Migration Monitor', icon: 'pi pi-chart-bar', to: '/apps/accounts/migration-monitor' },
                    ...accountUtilityExtras.map((item) => ({
                        label: item.label,
                        icon: item.icon,
                        to: `/apps/accounts/${item.slug}`
                    }))
                ]
            }
        ]
    },
    {
        label: 'Reports',
        icon: 'pi pi-chart-line',
        items: [
            {
                label: 'Inventory Reports',
                icon: 'pi pi-box',
                items: [
                    ...inventoryReportItems.map((item) => ({
                        label: item.label,
                        icon: item.icon,
                        to: `/apps/inventory/${item.slug}`
                    }))
                ]
            },
            {
                label: 'Billing Reports',
                icon: 'pi pi-credit-card',
                items: billingReportItems.map((item) => ({
                    label: item.label,
                    icon: item.icon,
                    to: `/apps/billing/${item.slug}`
                }))
            }
        ]
    },
    {
        label: 'Inventory',
        icon: 'pi pi-box',
        items: [
            { label: 'Inventory Home', icon: 'pi pi-home', to: '/apps/inventory' },
            ...inventoryMenuGroups.map((group) => ({
                label: group.label,
                icon: group.icon,
                items: group.items.map((item) => ({
                    label: item.label,
                    icon: item.icon,
                    to: `/apps/inventory/${item.slug}`
                }))
            }))
        ]
    },
    {
        label: 'Billing',
        icon: 'pi pi-credit-card',
        items: [
            { label: 'Billing Home', icon: 'pi pi-home', to: '/apps/billing' },
            ...billingMenuGroups.map((group) => ({
                label: group.label,
                icon: group.icon,
                items: group.items.map((item) => ({
                    label: item.label,
                    icon: item.icon,
                    to: `/apps/billing/${item.slug}`
                }))
            }))
        ]
    },
    {
        label: 'GST',
        icon: 'pi pi-percentage',
        items: [
            { label: 'GST Home', icon: 'pi pi-home', to: '/apps/gst' },
            ...GST_MENU_GROUPS.map((group) => ({
                label: group.label,
                icon: group.icon,
                items: group.items.map((item) => ({
                    label: item.label,
                    icon: item.icon,
                    to: `/apps/gst/${item.slug}`
                }))
            }))
        ]
    },
    {
        label: 'Add-ons',
        icon: 'pi pi-bell',
        items: APPS.filter((app) => app.category === 'addon').map((app) => ({
            label: app.name,
            icon: app.icon,
            to: app.path
        }))
    },
    {
        label: 'Masters',
        icon: 'pi pi-database',
        items: [
            {
                label: 'Accounting',
                icon: 'pi pi-book',
                items: [
                    { label: 'Ledger Groups', icon: 'pi pi-sitemap', to: '/apps/accounts/ledger-groups' },
                    { label: 'Ledgers', icon: 'pi pi-book', to: '/apps/accounts/ledgers' },
                    ...buildAccountMasters(['banks', 'branches', 'managers', 'salesmen', 'payment-via'])
                ]
            },
            {
                label: 'Inventory',
                icon: 'pi pi-box',
                items: buildInventoryMasters([
                    'product-groups',
                    'product-brands',
                    'product-attribute-types',
                    'units',
                    'hsn-codes',
                    'products',
                    'scheme-batches'
                ])
            },
            {
                label: 'Logistics & Delivery',
                icon: 'pi pi-truck',
                items: buildInventoryMasters([
                    'delivery-by',
                    'delivery-status',
                    'checked-by',
                    'bill-collection-status',
                    'transporters',
                    'godowns'
                ])
            },
            {
                label: 'Geography',
                icon: 'pi pi-map-marker',
                items: buildAccountMasters(['areas', 'cities', 'districts', 'states'])
            },
            {
                label: 'Users & Forms',
                icon: 'pi pi-users',
                items: buildAccountMasters(['users', 'forms'])
            }
        ]
    },
    {
        label: 'Settings',
        icon: 'pi pi-cog',
        items: [
            { label: 'Company Profile', icon: 'pi pi-building', to: '/apps/accounts/company-profile' },
            ...accountSettingsItems.map((item) => ({
                label: item.label,
                icon: item.icon,
                to: `/apps/accounts/${item.slug}`
            }))
        ]
    },
    {
        label: 'Help',
        icon: 'pi pi-question-circle',
        items: [
            { label: 'Help Center', icon: 'pi pi-question-circle', to: '/pages/help' },
            { label: 'Accounting Rules', icon: 'pi pi-bookmark', to: '/pages/help/accounting-rules' }
        ]
    }
];
