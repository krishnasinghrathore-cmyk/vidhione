export type AccountsMenuGroupKey = 'masters' | 'banking' | 'utilities' | 'settings';

export type AccountsMenuItem = {
    slug: string;
    label: string;
    icon: string;
};

export type AccountsMenuGroup = {
    key: AccountsMenuGroupKey;
    label: string;
    icon: string;
    items: AccountsMenuItem[];
};

export const ACCOUNTS_MENU_GROUPS: AccountsMenuGroup[] = [
    {
        key: 'masters',
        label: 'Masters',
        icon: 'pi pi-database',
        items: [
            { slug: 'users', label: 'Users', icon: 'pi pi-users' },
            { slug: 'forms', label: 'Forms', icon: 'pi pi-list' },
            { slug: 'managers', label: 'Managers', icon: 'pi pi-briefcase' },
            { slug: 'salesmen', label: 'Salesmen', icon: 'pi pi-users' },
            { slug: 'banks', label: 'Banks', icon: 'pi pi-building-columns' },
            { slug: 'branches', label: 'Branches', icon: 'pi pi-building' },
            { slug: 'areas', label: 'Areas', icon: 'pi pi-map-marker' },
            { slug: 'cities', label: 'Cities', icon: 'pi pi-map-marker' },
            { slug: 'districts', label: 'Districts', icon: 'pi pi-map-marker' },
            { slug: 'states', label: 'States', icon: 'pi pi-map-marker' },
            { slug: 'companies', label: 'Companies', icon: 'pi pi-building' },
            { slug: 'payment-via', label: 'Payment Via', icon: 'pi pi-credit-card' }
        ]
    },
    {
        key: 'banking',
        label: 'Banking & Audit',
        icon: 'pi pi-search',
        items: [{ slug: 'cheque-inward', label: 'Cheque Inward', icon: 'pi pi-credit-card' }]
    },
    {
        key: 'utilities',
        label: 'Utilities',
        icon: 'pi pi-wrench',
        items: [
            { slug: 'update-ledger-balance', label: 'Update Ledger Balance', icon: 'pi pi-refresh' }
        ]
    },
    {
        key: 'settings',
        label: 'Settings',
        icon: 'pi pi-cog',
        items: [
            { slug: 'voucher-options', label: 'Voucher Options', icon: 'pi pi-tags' },
            { slug: 'log-details', label: 'Log Details', icon: 'pi pi-history' },
            { slug: 'report-settings', label: 'Report Settings', icon: 'pi pi-cog' },
            { slug: 'create-new-year', label: 'Create New Year', icon: 'pi pi-calendar' },
            { slug: 'change-session', label: 'Change Session', icon: 'pi pi-refresh' }
        ]
    }
];

export type AccountsMenuMapItem = AccountsMenuItem & { groupLabel: string };

export const ACCOUNTS_MENU_MAP: Record<string, AccountsMenuMapItem> = {
    ...ACCOUNTS_MENU_GROUPS.reduce(
        (acc, group) => {
            group.items.forEach((item) => {
                acc[item.slug] = { ...item, groupLabel: group.label };
            });
            return acc;
        },
        {} as Record<string, AccountsMenuMapItem>
    ),
    'vat-reports': {
        slug: 'vat-reports',
        label: 'VAT Reports',
        icon: 'pi pi-percentage',
        groupLabel: 'Reports'
    },
    'change-session': {
        slug: 'change-session',
        label: 'Change Session',
        icon: 'pi pi-refresh',
        groupLabel: 'Settings'
    },
    'change-password': {
        slug: 'change-password',
        label: 'Change Password',
        icon: 'pi pi-key',
        groupLabel: 'Settings'
    },
    'balance-sheet-2': {
        slug: 'balance-sheet-2',
        label: 'Balance Sheet',
        icon: 'pi pi-objects-column',
        groupLabel: 'Financial Statements'
    }
};
