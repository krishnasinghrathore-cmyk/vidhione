export interface LedgerLookupRow {
    ledgerId: number;
    name: string | null;
    groupName: string | null;
    ledgerGroupId: number | null;
    cityId: number | null;
    cityName: string | null;
    address: string | null;
    openingBalanceAmount: string | null;
    balanceType: number | null;
}

export interface LedgerLookupOption extends LedgerLookupRow {
    label: string;
}

export type SelectOption = {
    label: string;
    value: number | null;
};

export interface CityRow {
    cityId: number;
    name: string | null;
    stateName: string | null;
}

export interface LedgerReportRow {
    id: number;
    date: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    counterLedger: string | null;
    counterLedgerDetail: string | null;
    narration: string | null;
    debit: number;
    credit: number;
    runningDelta: number;
}

export type LedgerReportFilters = {
    ledgerId: number | null;
    voucherTypeId: number | null;
    cancelled: -1 | 0 | 1;
    fromDate: Date | null;
    toDate: Date | null;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

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
