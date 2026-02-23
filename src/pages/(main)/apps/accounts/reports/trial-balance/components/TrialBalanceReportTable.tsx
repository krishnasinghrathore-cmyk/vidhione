import type React from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import type { MenuItem } from 'primereact/menuitem';
import AppReportActions from '@/components/AppReportActions';
import { ReportDataTable } from '@/components/ReportDataTable';

import { MULTISELECT_COLUMN_PROPS } from '../utils';
import type { AppliedFilters, TrialBalanceDisplayRow, TrialBalanceViewMode } from '../types';

type RowTemplate = (row: TrialBalanceDisplayRow) => React.ReactNode;

type TrialBalanceReportTableProps = {
    tableRows: TrialBalanceDisplayRow[];
    isPrinting: boolean;
    tablePageSize: number;
    loadingApplied: boolean;
    appliedFilters: AppliedFilters | null;
    reportLoading: boolean;
    baseRowsCount: number;
    columnFilters: DataTableFilterMeta;
    onColumnFilter: (event: DataTableFilterEvent) => void;
    headerLeft: React.ReactNode;
    canToggleExpand: boolean;
    expandAllDisabled: boolean;
    collapseAllDisabled: boolean;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onRefresh: () => void;
    onPrint: () => void;
    printMenuItems: MenuItem[];
    onExportCsv: () => void;
    onExportExcel: () => void;
    onExportPdf: () => void;
    refreshDisabled: boolean;
    printDisabled: boolean;
    exportDisabled: boolean;
    refreshButtonId: string;
    viewMode: TrialBalanceViewMode;
    ledgerGroupBody: RowTemplate;
    annexureBody: RowTemplate;
    ledgerBody: RowTemplate;
    openingBody: RowTemplate;
    openingDrCrBody: RowTemplate;
    debitBody: RowTemplate;
    creditBody: RowTemplate;
    closingBody: RowTemplate;
    closingDrCrBody: RowTemplate;
    openingFooter: React.ReactNode;
    openingDrCrFooter: React.ReactNode;
    debitFooter: React.ReactNode;
    creditFooter: React.ReactNode;
    closingFooter: React.ReactNode;
    closingDrCrFooter: React.ReactNode;
    ledgerGroupFilterElement: React.ReactNode;
    annexureFilterElement: React.ReactNode;
    ledgerFilterElement: React.ReactNode;
    openingBalanceFilterElement: React.ReactNode;
    openingDrCrFilterElement: React.ReactNode;
    debitFilterElement: React.ReactNode;
    creditFilterElement: React.ReactNode;
    closingBalanceFilterElement: React.ReactNode;
    closingDrCrFilterElement: React.ReactNode;
    transferToFilterElement: React.ReactNode;
};

export function TrialBalanceReportTable({
    tableRows,
    isPrinting,
    tablePageSize,
    loadingApplied,
    appliedFilters,
    reportLoading,
    baseRowsCount,
    columnFilters,
    onColumnFilter,
    headerLeft,
    canToggleExpand,
    expandAllDisabled,
    collapseAllDisabled,
    onExpandAll,
    onCollapseAll,
    onRefresh,
    onPrint,
    printMenuItems,
    onExportCsv,
    onExportExcel,
    onExportPdf,
    refreshDisabled,
    printDisabled,
    exportDisabled,
    refreshButtonId,
    viewMode,
    ledgerGroupBody,
    annexureBody,
    ledgerBody,
    openingBody,
    openingDrCrBody,
    debitBody,
    creditBody,
    closingBody,
    closingDrCrBody,
    openingFooter,
    openingDrCrFooter,
    debitFooter,
    creditFooter,
    closingFooter,
    closingDrCrFooter,
    ledgerGroupFilterElement,
    annexureFilterElement,
    ledgerFilterElement,
    openingBalanceFilterElement,
    openingDrCrFilterElement,
    debitFilterElement,
    creditFilterElement,
    closingBalanceFilterElement,
    closingDrCrFilterElement,
    transferToFilterElement
}: TrialBalanceReportTableProps) {
    const headerRight = (
        <div className="flex align-items-center gap-2">
            {canToggleExpand && (
                <div className="flex align-items-center gap-2">
                    <Button
                        type="button"
                        label="Expand all"
                        icon="pi pi-plus"
                        className="p-button-text p-button-sm"
                        onClick={onExpandAll}
                        disabled={expandAllDisabled}
                    />
                    <Button
                        type="button"
                        label="Collapse all"
                        icon="pi pi-minus"
                        className="p-button-text p-button-sm"
                        onClick={onCollapseAll}
                        disabled={collapseAllDisabled}
                    />
                </div>
            )}
            <AppReportActions
                onRefresh={onRefresh}
                onPrint={onPrint}
                printMenuItems={printMenuItems}
                onExportCsv={onExportCsv}
                onExportExcel={onExportExcel}
                onExportPdf={onExportPdf}
                loadingState={loadingApplied}
                refreshDisabled={refreshDisabled}
                printDisabled={printDisabled}
                exportDisabled={exportDisabled}
                refreshButtonId={refreshButtonId}
            />
        </div>
    );

    return (
        <ReportDataTable
            value={tableRows}
            paginator={!isPrinting}
            rows={tablePageSize}
            rowsPerPageOptions={isPrinting ? undefined : [10, 15, 30, 50, 100]}
            dataKey="rowKey"
            size="small"
            stripedRows
            className="summary-table trial-balance-table"
            rowClassName={(row: TrialBalanceDisplayRow) =>
                row.rowType === 'group-summary' || row.isGroupTotal ? 'font-bold' : ''
            }
            loadingState={loadingApplied}
            loadingSummaryEnabled={Boolean(appliedFilters)}
            filters={columnFilters}
            onFilter={onColumnFilter}
            filterDisplay="menu"
            filterDelay={400}
            emptyMessage={reportLoading ? '' : appliedFilters ? 'No results found' : 'Press Refresh to load trial balance'}
            headerLeft={headerLeft}
            headerRight={headerRight}
            recordSummary={
                appliedFilters
                    ? reportLoading
                        ? 'Loading trial balance...'
                        : `${baseRowsCount} row${baseRowsCount === 1 ? '' : 's'}`
                    : 'Press Refresh to load trial balance'
            }
        >
            <Column
                field="ledgerGroupFilter"
                header="Ledger Group"
                body={ledgerGroupBody}
                style={{ width: '14rem' }}
                headerClassName="summary-left trial-balance-header-group"
                bodyClassName="summary-left"
                filterElement={ledgerGroupFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="annexure"
                header="Annuxure"
                body={annexureBody}
                style={{ width: '8rem' }}
                headerClassName="summary-center trial-balance-header-center"
                bodyClassName="summary-center"
                filterElement={annexureFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            {viewMode === 'detailed' && (
                <Column
                    field="ledger"
                    header="Ledger"
                    body={ledgerBody}
                    style={{ width: '16rem' }}
                    headerClassName="summary-left trial-balance-header-ledger"
                    bodyClassName="summary-left"
                    filterElement={ledgerFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            )}
            <Column
                field="openingBalance"
                header="Op. Bal."
                body={openingBody}
                footer={openingFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '7rem' }}
                filterElement={openingBalanceFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="openingDrCr"
                header="DrCr"
                body={openingDrCrBody}
                footer={openingDrCrFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '4rem' }}
                filterElement={openingDrCrFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="debitAmount"
                header="Debit"
                body={debitBody}
                footer={debitFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '7rem' }}
                filterElement={debitFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="creditAmount"
                header="Credit"
                body={creditBody}
                footer={creditFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '7rem' }}
                filterElement={creditFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="closingBalance"
                header="Closing"
                body={closingBody}
                footer={closingFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '7rem' }}
                filterElement={closingBalanceFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            <Column
                field="closingDrCr"
                header="DrCr"
                body={closingDrCrBody}
                footer={closingDrCrFooter}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                footerClassName="summary-number"
                style={{ width: '4rem' }}
                filterElement={closingDrCrFilterElement}
                {...MULTISELECT_COLUMN_PROPS}
            />
            {viewMode === 'detailed' && (
                <Column
                    field="transferTo"
                    header="Transfer To"
                    body={(row) => row.transferTo ?? ''}
                    style={{ width: '10rem' }}
                    filterElement={transferToFilterElement}
                    {...MULTISELECT_COLUMN_PROPS}
                />
            )}
        </ReportDataTable>
    );
}
