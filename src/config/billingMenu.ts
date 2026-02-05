export type BillingMenuGroupKey = 'sales' | 'purchases' | 'collections' | 'programs' | 'reports';

export type BillingMenuItem = {
    slug: string;
    label: string;
    icon: string;
};

export type BillingMenuGroup = {
    key: BillingMenuGroupKey;
    label: string;
    icon: string;
    items: BillingMenuItem[];
};

export const BILLING_MENU_GROUPS: BillingMenuGroup[] = [
    {
        key: 'sales',
        label: 'Sales',
        icon: 'pi pi-shopping-cart',
        items: [
            { slug: 'estimates', label: 'Estimates', icon: 'pi pi-file' },
            { slug: 'gst-sales-invoices', label: 'GST Sales Invoices', icon: 'pi pi-percentage' },
            { slug: 'gst-sales-returns', label: 'GST Sales Return Invoices', icon: 'pi pi-percentage' }
        ]
    },
    {
        key: 'purchases',
        label: 'Purchases',
        icon: 'pi pi-shopping-bag',
        items: [
            { slug: 'gst-purchase-invoices', label: 'GST Purchase Invoices', icon: 'pi pi-percentage' },
            { slug: 'gst-purchase-returns', label: 'GST Purchase Return Invoices', icon: 'pi pi-percentage' }
        ]
    },
    {
        key: 'collections',
        label: 'Collections',
        icon: 'pi pi-wallet',
        items: [
            { slug: 'delivery-process', label: 'Delivery Process', icon: 'pi pi-truck' },
            { slug: 'bill-collection', label: 'Bill Collection', icon: 'pi pi-wallet' },
            { slug: 'money-receipt-manual-book-issue', label: 'Money Receipt Manual Book Issue', icon: 'pi pi-book' }
        ]
    },
    {
        key: 'programs',
        label: 'Programs',
        icon: 'pi pi-star',
        items: [
            { slug: 'schemes', label: 'Schemes', icon: 'pi pi-tags' },
            { slug: 'party-loyalty-program', label: 'Party Loyalty Program', icon: 'pi pi-star' },
            { slug: 'retailer-foot-path', label: 'Retailer Foot Path', icon: 'pi pi-map-marker' }
        ]
    },
    {
        key: 'reports',
        label: 'Reports',
        icon: 'pi pi-chart-line',
        items: [
            { slug: 'sales-book', label: 'Sales Book', icon: 'pi pi-book' },
            { slug: 'sales-return-book', label: 'Sales Return Book', icon: 'pi pi-book' },
            { slug: 'estimate-book', label: 'Estimate Book', icon: 'pi pi-book' },
            { slug: 'purchase-book', label: 'Purchase Book', icon: 'pi pi-book' },
            { slug: 'purchase-return-book', label: 'Purchase Return Book', icon: 'pi pi-book' },
            { slug: 'delivery-process-book', label: 'Delivery Process Book', icon: 'pi pi-book' },
            { slug: 'bill-collection-book', label: 'Bill Collection Book', icon: 'pi pi-book' },
            { slug: 'money-receipt-cash-book', label: 'Money Receipt Cash Book', icon: 'pi pi-book' },
            { slug: 'money-receipt-bank-book', label: 'Money Receipt Bank Book', icon: 'pi pi-book' },
            { slug: 'money-receipt-manual-book-issue-detail', label: 'Money Receipt Manual Book Issue Detail', icon: 'pi pi-book' },
            { slug: 'cash-receipt-book', label: 'Cash Receipt Book', icon: 'pi pi-book' },
            { slug: 'scheme-book', label: 'Scheme Book', icon: 'pi pi-book' },
            { slug: 'party-loyalty-program-report', label: 'Party Loyalty Program Report', icon: 'pi pi-chart-line' },
            { slug: 'party-wise-item-sale-detail', label: 'Party Wise Item Sale Detail', icon: 'pi pi-file' },
            { slug: 'area-wise-summary', label: 'Area Wise Summary', icon: 'pi pi-chart-line' },
            { slug: 'g1-bill-details', label: 'G1 Bill Details', icon: 'pi pi-file' }
        ]
    }
];

export type BillingMenuMapItem = BillingMenuItem & { groupLabel: string };

export const BILLING_MENU_MAP: Record<string, BillingMenuMapItem> = BILLING_MENU_GROUPS.reduce(
    (acc, group) => {
        group.items.forEach((item) => {
            acc[item.slug] = { ...item, groupLabel: group.label };
        });
        return acc;
    },
    {} as Record<string, BillingMenuMapItem>
);
