export type GstMenuGroupKey = 'returns' | 'reports' | 'einvoice';

export type GstMenuItem = {
    slug: string;
    label: string;
    icon: string;
};

export type GstMenuGroup = {
    key: GstMenuGroupKey;
    label: string;
    icon: string;
    items: GstMenuItem[];
};

export const GST_MENU_GROUPS: GstMenuGroup[] = [
    {
        key: 'returns',
        label: 'Returns',
        icon: 'pi pi-file',
        items: [
            { slug: 'gstr1', label: 'GSTR-1', icon: 'pi pi-file' },
            { slug: 'gstr3b', label: 'GSTR-3B', icon: 'pi pi-file' }
        ]
    },
    {
        key: 'reports',
        label: 'Reports',
        icon: 'pi pi-chart-line',
        items: [
            { slug: 'gst-from-books', label: 'GST From Books', icon: 'pi pi-book' },
            { slug: 'gst-reports', label: 'GST Reports', icon: 'pi pi-chart-line' },
            { slug: 'gst-difference-report', label: 'GST Difference Report', icon: 'pi pi-chart-line' },
            { slug: 'gst-tax-report', label: 'GST Tax Report', icon: 'pi pi-percentage' },
            { slug: 'gst-hsn-wise-summary', label: 'GST HSN Wise Summary', icon: 'pi pi-list' }
        ]
    },
    {
        key: 'einvoice',
        label: 'E-Invoice',
        icon: 'pi pi-check-square',
        items: [
            { slug: 'eway-bill', label: 'E-Way Bill', icon: 'pi pi-truck' },
            { slug: 'e-invoice', label: 'E-Invoice', icon: 'pi pi-file' },
            { slug: 'e-invoice-acknowledgement', label: 'E-Invoice Acknowledgement', icon: 'pi pi-check-square' }
        ]
    }
];

export type GstMenuMapItem = GstMenuItem & { groupLabel: string };

export const GST_MENU_MAP: Record<string, GstMenuMapItem> = GST_MENU_GROUPS.reduce(
    (acc, group) => {
        group.items.forEach((item) => {
            acc[item.slug] = { ...item, groupLabel: group.label };
        });
        return acc;
    },
    {} as Record<string, GstMenuMapItem>
);
