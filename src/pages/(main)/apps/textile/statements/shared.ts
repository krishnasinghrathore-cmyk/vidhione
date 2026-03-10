import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';
import { useAuth } from '@/lib/auth/context';
import type { TextileDocumentType } from '@/lib/textile/api';

export const TEXTILE_STATEMENT_DOCUMENT_OPTIONS: Array<{ label: string; value: TextileDocumentType | '' }> = [
    { label: 'All Documents', value: '' },
    { label: 'Purchase Orders', value: 'purchase_order' },
    { label: 'Fabric Inward', value: 'fabric_inward' },
    { label: 'Packing Slips', value: 'packing_slip' },
    { label: 'Delivery Challans', value: 'delivery_challan' },
    { label: 'Job Work Issue', value: 'job_work_issue' },
    { label: 'Daily Outward', value: 'daily_outward' }
];

export const formatTextileDate = (value: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-GB');
};

export const formatTextileNumber = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(value)) return '0';
    return value.toLocaleString('en-IN', {
        minimumFractionDigits: value % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    });
};

export const humanizeTextileDocumentType = (value: TextileDocumentType) =>
    value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

export const buildTextileLotLabel = (row: {
    receiptNo?: string | null;
    baleNo?: string | null;
    lotNo?: string | null;
    comboNo?: string | null;
    rollNo?: string | null;
}) => {
    const parts = [
        row.receiptNo ? `Receipt ${row.receiptNo}` : null,
        row.baleNo ? `Bale ${row.baleNo}` : null,
        row.lotNo ? `Lot ${row.lotNo}` : null,
        row.comboNo ? `Combo ${row.comboNo}` : null,
        row.rollNo ? `Roll ${row.rollNo}` : null
    ].filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(' | ') : '-';
};

export const useTextileSharedAccess = () => {
    const { tenantIndustryKey, tenantSettings } = useAuth();
    const isTextileTenant = isTextileIndustry(tenantIndustryKey);
    const presetKey = isTextileTenant
        ? tenantSettings?.textilePresetKey ?? defaultTextilePresetKey(tenantIndustryKey)
        : null;
    const capabilities = resolveTextileCapabilities(presetKey, tenantSettings?.textileCapabilities ?? null);
    const canAccessSharedReports = isTextileTenant && (capabilities.processor || capabilities.jobwork || capabilities.inhouse);

    return {
        isTextileTenant,
        capabilities,
        canAccessSharedReports
    };
};
