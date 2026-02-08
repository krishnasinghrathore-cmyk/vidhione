export interface AreaRow {
    areaId: number;
    name: string | null;
}

export interface AreaOption {
    label: string;
    value: number;
}

export interface LedgerSummaryRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    address: string | null;
}

export interface LedgerOption extends LedgerSummaryRow {
    label: string;
    value: number;
}

export interface InvoiceRolloverRow {
    rowKey: string;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerGroupId: number | null;
    ledgerGroupName: string | null;
    invoiceId: number | null;
    invoiceNumber: string | null;
    invoiceDate: string | null;
    voucherTypeId: number | null;
    voucherType: string | null;
    agLedger: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    difference: number | null;
    receiptDate: string | null;
    receiptType: string | null;
    receiptVoucherNo: string | null;
    receiptAmount: number | null;
    totalPaid: number | null;
    isReceiptRow: boolean;
    isSkeleton?: boolean;
}

export type InvoiceRolloverFilters = {
    ledgerIds: number[] | null;
    areaIds: number[] | null;
    fromDate: string | null;
    toDate: string | null;
    removeZeroLines: number;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};
