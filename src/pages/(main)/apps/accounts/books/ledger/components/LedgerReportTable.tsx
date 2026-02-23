import React from 'react';
import { type DataTableFilterEvent, type DataTableFilterMeta, type DataTablePageEvent } from 'primereact/datatable';
import { ReportDataTable } from '@/components/ReportDataTable';
import type { LedgerReportDisplayRow } from './LedgerReportColumns';

type LedgerReportTableProps = {
    rows: LedgerReportDisplayRow[];
    isPrinting: boolean;
    tablePageSize: number;
    hasApplied: boolean;
    totalRecords: number;
    tableFirst: number;
    reportLoading: boolean;
    onPage: (event: DataTablePageEvent) => void;
    columnFilters: DataTableFilterMeta;
    onFilter: (event: DataTableFilterEvent) => void;
    headerLeft: React.ReactNode;
    headerRight: React.ReactNode;
    recordSummary: string;
    globalSearchValue: string;
    onGlobalSearchValueChange: (nextValue: string) => void;
    globalSearchMatchCase: boolean;
    onGlobalSearchMatchCaseChange: (nextValue: boolean) => void;
    globalSearchWholeWord: boolean;
    onGlobalSearchWholeWordChange: (nextValue: boolean) => void;
    columns: React.ReactNode;
};

export function LedgerReportTable({
    rows,
    isPrinting,
    tablePageSize,
    hasApplied,
    totalRecords,
    tableFirst,
    reportLoading,
    onPage,
    columnFilters,
    onFilter,
    headerLeft,
    headerRight,
    recordSummary,
    globalSearchValue,
    onGlobalSearchValueChange,
    globalSearchMatchCase,
    onGlobalSearchMatchCaseChange,
    globalSearchWholeWord,
    onGlobalSearchWholeWordChange,
    columns
}: LedgerReportTableProps) {
    return (
        <ReportDataTable
            value={rows}
            paginator={!isPrinting}
            rows={tablePageSize}
            lazy={!isPrinting}
            totalRecords={hasApplied ? totalRecords : 0}
            first={isPrinting ? 0 : tableFirst}
            loadingState={reportLoading}
            loadingSummaryEnabled={hasApplied}
            onPage={onPage}
            rowsPerPageOptions={[10, 15, 30, 50, 100]}
            filters={columnFilters}
            onFilter={onFilter}
            filterDisplay="menu"
            filterDelay={400}
            dataKey="id"
            stripedRows
            size="small"
            className="summary-table ledger-statement-table"
            emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load ledger statement'}
            globalSearchRenderInTableHeader={false}
            globalSearchValue={globalSearchValue}
            onGlobalSearchValueChange={onGlobalSearchValueChange}
            globalSearchMatchCase={globalSearchMatchCase}
            onGlobalSearchMatchCaseChange={onGlobalSearchMatchCaseChange}
            globalSearchWholeWord={globalSearchWholeWord}
            onGlobalSearchWholeWordChange={onGlobalSearchWholeWordChange}
            headerLeft={headerLeft}
            headerRight={headerRight}
            recordSummary={recordSummary}
        >
            {columns}
        </ReportDataTable>
    );
}
