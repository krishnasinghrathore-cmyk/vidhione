export type InventoryMenuGroupKey = 'masters' | 'transactions' | 'logistics' | 'reports';

export type InventoryMenuItem = {
    slug: string;
    label: string;
    icon: string;
};

export type InventoryMenuGroup = {
    key: InventoryMenuGroupKey;
    label: string;
    icon: string;
    items: InventoryMenuItem[];
};

export const INVENTORY_MENU_GROUPS: InventoryMenuGroup[] = [
    {
        key: 'masters',
        label: 'Masters',
        icon: 'pi pi-database',
        items: [
            { slug: 'product-groups', label: 'Product Groups', icon: 'pi pi-sitemap' },
            { slug: 'product-brands', label: 'Product Brands', icon: 'pi pi-tags' },
            { slug: 'product-attribute-types', label: 'Product Attribute Types', icon: 'pi pi-list' },
            { slug: 'units', label: 'Units', icon: 'pi pi-wrench' },
            { slug: 'hsn-codes', label: 'HSN Codes', icon: 'pi pi-book' },
            { slug: 'products', label: 'Products', icon: 'pi pi-percentage' },
            { slug: 'scheme-batches', label: 'Scheme Batches', icon: 'pi pi-calendar' },
            { slug: 'delivery-by', label: 'Delivery By', icon: 'pi pi-send' },
            { slug: 'delivery-status', label: 'Delivery Status', icon: 'pi pi-check-square' },
            { slug: 'checked-by', label: 'Checked By', icon: 'pi pi-user' },
            { slug: 'bill-collection-status', label: 'Bill Collection Status', icon: 'pi pi-wallet' },
            { slug: 'transporters', label: 'Transport', icon: 'pi pi-truck' },
            { slug: 'godowns', label: 'Godowns', icon: 'pi pi-building' }
        ]
    },
    {
        key: 'transactions',
        label: 'Transactions',
        icon: 'pi pi-pencil',
        items: [
            { slug: 'closing-stock', label: 'Closing Stock', icon: 'pi pi-box' },
            { slug: 'party-rates', label: 'Party Rates', icon: 'pi pi-wallet' }
        ]
    },
    {
        key: 'logistics',
        label: 'Logistics',
        icon: 'pi pi-truck',
        items: [
            { slug: 'transport-sheet-import', label: 'Transport Sheet Import', icon: 'pi pi-upload' },
            { slug: 'transport-stock-in', label: 'Transport Stock In', icon: 'pi pi-truck' },
            { slug: 'transport-stock-in-book', label: 'Transport Stock In Book', icon: 'pi pi-book' },
            { slug: 'transport-stock-analysis', label: 'Transport Stock Analysis', icon: 'pi pi-chart-line' },
            { slug: 'import-bizom-invoices', label: 'Import Bizom Invoices', icon: 'pi pi-download' }
        ]
    },
    {
        key: 'reports',
        label: 'Reports',
        icon: 'pi pi-chart-line',
        items: [
            { slug: 'stock-position', label: 'Stock Position', icon: 'pi pi-chart-bar' },
            { slug: 'stock-ledger', label: 'Stock Ledger', icon: 'pi pi-book' },
            { slug: 'closing-stock-book', label: 'Closing Stock Book', icon: 'pi pi-book' },
            { slug: 'party-rates-book', label: 'Party Rates Book', icon: 'pi pi-book' }
        ]
    }
];

export type InventoryMenuMapItem = InventoryMenuItem & { groupLabel: string };

export const INVENTORY_MENU_MAP: Record<string, InventoryMenuMapItem> = INVENTORY_MENU_GROUPS.reduce(
    (acc, group) => {
        group.items.forEach((item) => {
            acc[item.slug] = { ...item, groupLabel: group.label };
        });
        return acc;
    },
    {} as Record<string, InventoryMenuMapItem>
);
