export type TrialBalanceViewMode = 'summarized' | 'detailed';

export type SelectOption = {
    label: string;
    value: number | null;
};

export interface TrialBalanceRow {
    id: number;
    ledgerGroup: string | null;
    groupId: number | null;
    annexure: string | null;
    ledger: string | null;
    ledgerId: number | null;
    openingBalance: number;
    openingDrCr: string;
    debitAmount: number;
    creditAmount: number;
    closingBalance: number;
    closingDrCr: string;
    defaultDrCr: string;
    transferTo: string | null;
    postingAmount: number;
    postingDiff: number;
    postingVoucherId: number | null;
    voucherNo: string | null;
    voucherDate: string | null;
    taxRate: number | null;
}

export interface VoucherTypeRow {
    voucherTypeId: number;
    voucherTypeName: string | null;
    displayName: string | null;
    voucherTypeCode: number | null;
}

export type TrialBalanceRowType = 'detail' | 'group-summary' | 'group-total';

export type TrialBalanceDisplayRow = TrialBalanceRow & {
    rowKey: string;
    isSkeleton?: boolean;
    isGroupTotal?: boolean;
    rowType?: TrialBalanceRowType;
    isFirstInGroup?: boolean;
    ledgerGroupFilter?: string;
};

export type TrialBalanceGroup = {
    key: string;
    groupId: number | null;
    label: string;
    annexure: string | null;
    taxRate: number | null;
    rows: TrialBalanceDisplayRow[];
    openingSigned: number;
    debit: number;
    credit: number;
};

export type EntryType = 'all' | 'sales' | 'purchase' | 'debit' | 'credit' | 'journal';

export type AppliedFilters = {
    viewMode: TrialBalanceViewMode;
    displayMode: 'trial' | 'summary';
    fromDate: Date | null;
    toDate: Date | null;
    voucherTypeId: number | null;
    entryType: EntryType;
    balanceStatus: number;
    taxType: number;
    rcmStatus: number;
};

export type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

export type TrialBalanceReportProps = {
    initialView?: TrialBalanceViewMode;
};
