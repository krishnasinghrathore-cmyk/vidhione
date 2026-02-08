export interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
    address: string | null;
    openingBalanceAmount: string | null;
    balanceType: number | null;
}

export interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

export interface MonthRow {
    monthKey: string;
    label: string;
    debit: number;
    credit: number;
    balance: number;
    drCr: string;
    isOpening: boolean;
}

export interface MonthDisplayRow extends MonthRow {
    rowKey: string;
    closing: number;
    closingAbs: number;
}

export type SummaryFilters = {
    ledgerId: number | null;
    ledgerGroupId: number | null;
    fromDate: Date | null;
    toDate: Date | null;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};
