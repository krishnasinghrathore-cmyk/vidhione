export type ProfitLossSection = 'Trading' | 'ProfitLoss';
export type ProfitLossSide = 'Dr' | 'Cr';

export type ProfitLossLine = {
    id: number;
    section: ProfitLossSection;
    side: ProfitLossSide;
    ledgerGroupId?: number | null;
    ledgerGroupName?: string | null;
    ledgerId?: number | null;
    ledgerName?: string | null;
    annexureName?: string | null;
    amount: number;
};

export type ProfitLossReportPayload = {
    lines: ProfitLossLine[];
    grossProfit: number;
    grossLoss: number;
    netProfit: number;
    netLoss: number;
};

export type ProfitLossFilters = {
    fromDate: Date | null;
    toDate: Date | null;
};

export type ProfitLossSideRow = {
    rowType: 'group' | 'ledger' | 'gross' | 'net' | 'total' | 'carry';
    label: string;
    amount: number;
    groupId?: number | null;
    isExpandable?: boolean;
    section?: ProfitLossSection;
};

export type ProfitLossTableRow = {
    rowKey: string;
    left: ProfitLossSideRow | null;
    right: ProfitLossSideRow | null;
    leftParticular?: string | null;
    leftAmount?: number | null;
    rightParticular?: string | null;
    rightAmount?: number | null;
    isSkeleton?: boolean;
};

export type ProfitLossExportRow = {
    section: string;
    side: ProfitLossSide;
    particulars: string;
    amount: number;
    rowType: ProfitLossSideRow['rowType'];
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

export type ProfitLossSideFilters = {
    particulars: string[];
    amounts: number[];
};
