import type { DataTableFilterMeta } from 'primereact/datatable';

export type SelectOption = {
    label: string;
    value: number;
    address?: string | null;
};

export type DayBookRow = {
    id: number;
    date: string | null;
    voucherNo: string | null;
    voucherType: string | null;
    voucherTypeId: number | null;
    ledger: string | null;
    narration: string | null;
    refNo: string | null;
    refDate: string | null;
    debit: number;
    credit: number;
    balance: number;
    drCr: string | null;
};

export type DayBookDisplayRow = DayBookRow & {
    rowKey: string;
    isSkeleton?: boolean;
};

export type DayBookFilters = {
    voucherTypeIds: number[];
    ledgerIds: number[];
    fromDate: Date | null;
    toDate: Date | null;
    cancelled: number;
    columnFilters: DataTableFilterMeta;
};

export type DayBookFilterOptions = {
    voucherNo: string[];
    date: string[];
    ledger: string[];
    narration: string[];
    voucherType: string[];
    refNo: string[];
    refDate: string[];
    debit: number[];
    credit: number[];
    balance: number[];
    drCr: string[];
};

export type LedgerOptionRow = {
    ledgerId: number;
    name: string | null;
    address?: string | null;
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

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

export type LedgerFilterOption = FilterOption<string> & {
    address?: string | null;
};
