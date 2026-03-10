import type React from 'react';
import { Column } from 'primereact/column';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { ReportDataTable } from '@/components/ReportDataTable';
import type { ProfitLossTableRow } from '../types';

type ProfitLossSectionTableProps = {
    rows: ProfitLossTableRow[];
    hasApplied: boolean;
    reportLoading: boolean;
    columnFilters: DataTableFilterMeta;
    onFilter: (event: DataTableFilterEvent) => void;
    globalSearchValue?: string;
    onGlobalSearchValueChange?: (nextValue: string) => void;
    globalSearchMatchCase?: boolean;
    onGlobalSearchMatchCaseChange?: (nextValue: boolean) => void;
    globalSearchWholeWord?: boolean;
    onGlobalSearchWholeWordChange?: (nextValue: boolean) => void;
    headerColumnGroup: React.ReactNode;
    emptyMessage: string;
    headerLeft?: React.ReactNode;
    headerRight?: React.ReactNode;
    renderParticular: (cell: ProfitLossTableRow['left'] | ProfitLossTableRow['right'], isSkeleton?: boolean) => React.ReactNode;
    renderAmount: (cell: ProfitLossTableRow['left'] | ProfitLossTableRow['right'], isSkeleton?: boolean) => React.ReactNode;
};

export function ProfitLossSectionTable({
    rows,
    hasApplied,
    reportLoading,
    columnFilters,
    onFilter,
    globalSearchValue,
    onGlobalSearchValueChange,
    globalSearchMatchCase,
    onGlobalSearchMatchCaseChange,
    globalSearchWholeWord,
    onGlobalSearchWholeWordChange,
    headerColumnGroup,
    emptyMessage,
    headerLeft,
    headerRight,
    renderParticular,
    renderAmount
}: ProfitLossSectionTableProps) {
    return (
        <ReportDataTable
            value={rows}
            dataKey="rowKey"
            stripedRows
            size="small"
            loadingState={reportLoading}
            loadingSummaryEnabled={hasApplied}
            filters={columnFilters}
            onFilter={onFilter}
            globalSearchRenderInTableHeader={false}
            globalSearchValue={globalSearchValue}
            onGlobalSearchValueChange={onGlobalSearchValueChange}
            globalSearchMatchCase={globalSearchMatchCase}
            onGlobalSearchMatchCaseChange={onGlobalSearchMatchCaseChange}
            globalSearchWholeWord={globalSearchWholeWord}
            onGlobalSearchWholeWordChange={onGlobalSearchWholeWordChange}
            filterDisplay="menu"
            filterDelay={400}
            lazy
            headerLeft={headerLeft}
            headerRight={headerRight}
            headerColumnGroup={headerColumnGroup}
            emptyMessage={emptyMessage}
            className="summary-table profit-loss-table"
        >
            <Column header="Particulars" body={(row: ProfitLossTableRow) => renderParticular(row.left, row.isSkeleton)} />
            <Column
                header="Amount"
                bodyClassName="summary-number"
                body={(row: ProfitLossTableRow) => renderAmount(row.left, row.isSkeleton)}
            />
            <Column header="" bodyClassName="profit-loss-gap-cell" className="profit-loss-gap-cell" body={() => ''} />
            <Column header="Particulars" body={(row: ProfitLossTableRow) => renderParticular(row.right, row.isSkeleton)} />
            <Column
                header="Amount"
                bodyClassName="summary-number"
                body={(row: ProfitLossTableRow) => renderAmount(row.right, row.isSkeleton)}
            />
        </ReportDataTable>
    );
}
