export type BalanceSheetViewMode = 'summarized' | 'detailed';

export type BalanceSheetFilters = {
    viewMode: BalanceSheetViewMode;
    fromDate: Date | null;
    toDate: Date | null;
    openingOnly: boolean;
};

export type BalanceSheetDetailedRow = {
    id: number;
    ledgerId: number;
    ledgerGroupId?: number | null;
    ledgerName: string;
    groupName: string;
    annexureName?: string | null;
    side: 'Assets' | 'Liabilities';
    amount: number;
};

export type BalanceSheetDisplayRow = {
    rowKey: string;
    ledgerId?: number | null;
    ledgerGroupId?: number | null;
    groupName: string;
    ledgerName?: string | null;
    annexureName?: string | null;
    side: 'Assets' | 'Liabilities';
    amount: number;
    isSkeleton?: boolean;
};

export type BalanceSheetSideRow = {
    rowType: 'group' | 'detail' | 'total';
    groupId?: number | null;
    groupName: string;
    ledgerName?: string | null;
    annexureName?: string | null;
    amount: number;
    isExpandable?: boolean;
    detailGroupName?: string | null;
    isSplitGroup?: boolean;
};

export type BalanceSheetTableRow = {
    rowKey: string;
    left: BalanceSheetSideRow | null;
    right: BalanceSheetSideRow | null;
    isSkeleton?: boolean;
};

export type BalanceSheetReportProps = {
    initialView?: BalanceSheetViewMode;
};
