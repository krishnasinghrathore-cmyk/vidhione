import type { SaleInvoiceListItem } from '@/lib/invoicing/api';
import type { TextileDocumentListItem } from '@/lib/textile/api';

export type TextileDispatchStage = '' | 'packing_slip' | 'delivery_challan' | 'invoice';

export type TextileDispatchBookFilters = {
    search: string;
    partyLedgerId: string;
    jobberLedgerId: string;
    fromDate: Date | null;
    toDate: Date | null;
    includeCancelled: boolean;
    stage: TextileDispatchStage;
};

export type TextileDispatchBookRow = {
    rowKey: string;
    stage: Exclude<TextileDispatchStage, ''>;
    documentNumber: string;
    documentDateText: string | null;
    sortTime: number;
    partyLedgerId: string | null;
    jobberLedgerId: string | null;
    referenceLabel: string;
    quantity: number;
    amount: number;
    lineCount: number;
    isCancelled: boolean;
    statusText: string;
    statusSeverity: 'success' | 'info' | 'warning' | 'danger';
    textileDocumentId: string | null;
    saleInvoiceId: number | null;
    linkedPackingSlipId: string | null;
    linkedDeliveryChallanId: string | null;
    linkedSaleInvoiceId: string | null;
    billNumber: string | null;
};

export const TEXTILE_DISPATCH_STAGE_OPTIONS: Array<{ label: string; value: TextileDispatchStage }> = [
    { label: 'All stages', value: '' },
    { label: 'Packing slips', value: 'packing_slip' },
    { label: 'Delivery challans', value: 'delivery_challan' },
    { label: 'GST invoices', value: 'invoice' }
];

export const DEFAULT_TEXTILE_DISPATCH_BOOK_FILTERS: TextileDispatchBookFilters = {
    search: '',
    partyLedgerId: '',
    jobberLedgerId: '',
    fromDate: null,
    toDate: null,
    includeCancelled: false,
    stage: ''
};

const trimValue = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const parseDispatchDate = (value: string | null | undefined) => {
    const trimmed = trimValue(value);
    if (!trimmed) return 0;
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        const time = new Date(`${trimmed.slice(0, 10)}T00:00:00`).getTime();
        return Number.isNaN(time) ? 0 : time;
    }
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
        const [, day, month, year] = dmyMatch;
        const time = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`).getTime();
        return Number.isNaN(time) ? 0 : time;
    }
    const time = new Date(trimmed).getTime();
    return Number.isNaN(time) ? 0 : time;
};

const buildReferenceLabel = (...values: Array<string | null | undefined>) => {
    const parts = values.map(trimValue).filter((value): value is string => Boolean(value));
    return parts.length > 0 ? parts.join(' | ') : '-';
};

const buildTextileDispatchRow = (row: TextileDocumentListItem): TextileDispatchBookRow => ({
    rowKey: `${row.documentType}:${row.textileDocumentId}`,
    stage: row.documentType as 'packing_slip' | 'delivery_challan',
    documentNumber: trimValue(row.documentNumber) ?? 'Pending number',
    documentDateText: row.documentDate,
    sortTime: parseDispatchDate(row.documentDate),
    partyLedgerId: row.partyLedgerId,
    jobberLedgerId: row.jobberLedgerId,
    referenceLabel: buildReferenceLabel(row.referenceNumber, row.jobberChallanNo, row.remarkForStatement, row.remarks),
    quantity: Number(row.totalQuantity ?? 0),
    amount: Number(row.totalAmount ?? 0),
    lineCount: Number(row.lineCount ?? 0),
    isCancelled: Boolean(row.isCancelled),
    statusText: row.documentType === 'packing_slip' ? 'Packed' : 'Delivered',
    statusSeverity: row.isCancelled ? 'danger' : row.documentType === 'packing_slip' ? 'info' : 'warning',
    textileDocumentId: row.textileDocumentId,
    saleInvoiceId: null,
    linkedPackingSlipId: row.linkedPackingSlipId,
    linkedDeliveryChallanId: row.linkedDeliveryChallanId,
    linkedSaleInvoiceId: row.linkedSaleInvoiceId,
    billNumber: null
});

const buildInvoiceDispatchRow = (row: SaleInvoiceListItem): TextileDispatchBookRow => ({
    rowKey: `invoice:${row.saleInvoiceId}`,
    stage: 'invoice',
    documentNumber: trimValue(row.voucherNumber) ?? `Invoice ${row.saleInvoiceId}`,
    documentDateText: row.voucherDateText,
    sortTime: parseDispatchDate(row.voucherDateText),
    partyLedgerId: row.ledgerId != null ? String(row.ledgerId) : null,
    jobberLedgerId: row.textileJobberLedgerId != null ? String(row.textileJobberLedgerId) : null,
    referenceLabel: buildReferenceLabel(row.billNumber, row.textileJobberChallanNo, row.textileRemarkForStatement, row.remarks),
    quantity: Number(row.totalQuantity ?? 0),
    amount: Number(row.totalNetAmount ?? 0),
    lineCount: 0,
    isCancelled: Boolean(row.isCancelled),
    statusText: trimValue(row.deliveryStatus) ?? 'Invoiced',
    statusSeverity: row.isCancelled ? 'danger' : 'success',
    textileDocumentId: null,
    saleInvoiceId: row.saleInvoiceId,
    linkedPackingSlipId: null,
    linkedDeliveryChallanId: null,
    linkedSaleInvoiceId: null,
    billNumber: trimValue(row.billNumber)
});

export const buildTextileDispatchRows = (
    packingSlips: TextileDocumentListItem[],
    deliveryChallans: TextileDocumentListItem[],
    invoices: SaleInvoiceListItem[]
) =>
    [...packingSlips.map(buildTextileDispatchRow), ...deliveryChallans.map(buildTextileDispatchRow), ...invoices.map(buildInvoiceDispatchRow)].sort(
        (left, right) => {
            if (right.sortTime !== left.sortTime) return right.sortTime - left.sortTime;
            return left.documentNumber.localeCompare(right.documentNumber);
        }
    );
