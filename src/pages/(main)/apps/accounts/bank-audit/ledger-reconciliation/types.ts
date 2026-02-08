export interface BankReconciliationRow {
    postingId: number;
    voucherId: number | null;
    ledgerId: number;
    ledgerName: string | null;
    ledgerGroupName: string | null;
    voucherDate: string | null;
    voucherNumber: string | null;
    voucherType: string | null;
    counterLedgerName: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    balance: number;
    drCr: string;
    reconciliationDate: string | null;
    reconciliationRemark: string | null;
    isOpening: boolean;
    chequeNo: string | null;
    discountAmount: number | null;
    chequeCancelCharges: number | null;
}

export type ReconEdit = {
    date: Date | null;
    remark: string;
    touchedDate: boolean;
    touchedRemark: boolean;
};

export interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    ledgerGroupId: number | null;
    address: string | null;
}

export interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

export type ColumnFilterConstraint = {
    value?: unknown;
    matchMode?: string;
};

export type ColumnFilterMeta = {
    operator?: string;
    constraints?: ColumnFilterConstraint[];
    value?: unknown;
    matchMode?: string;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

export enum StatementMatchRule {
    ChqAmtDate = 0,
    AmtDateParty = 1,
    AmtDate = 2,
    AmtDateExact = 3
}

export type StatementPreviewStatus = 'Matched' | 'Ambiguous' | 'Unmatched' | '';

export type StatementEntry = {
    sourceRowNumber: number;
    postDate: Date | null;
    valueDate: Date | null;
    chequeNumber: string;
    description: string;
    debit: number;
    credit: number;
    excelStatus: string;
    excelRemark: string;
    status: StatementPreviewStatus;
    matchedTo?: string;
    reason?: string;
    matchedRowIndices?: number[];
};

export type StatementWorkbookInfo = {
    workbook: any;
    sheetName: string;
    headerRowIndex: number;
    colRecStatus: number;
    colRecRemark: number;
};
