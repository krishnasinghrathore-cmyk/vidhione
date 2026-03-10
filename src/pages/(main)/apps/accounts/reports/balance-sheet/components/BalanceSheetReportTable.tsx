import type React from 'react';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import AppReportActions from '@/components/AppReportActions';
import { ReportDataTable } from '@/components/ReportDataTable';

import type { BalanceSheetTableRow } from '../types';

type RowBodyTemplate = (row: BalanceSheetTableRow) => React.ReactNode;

type BalanceSheetReportTableProps = {
    tableRows: BalanceSheetTableRow[];
    isPrinting: boolean;
    tablePageSize: number;
    reportLoadingApplied: boolean;
    hasApplied: boolean;
    globalSearchValue: string;
    onGlobalSearchValueChange: (nextValue: string) => void;
    globalSearchMatchCase: boolean;
    onGlobalSearchMatchCaseChange: (nextValue: boolean) => void;
    globalSearchWholeWord: boolean;
    onGlobalSearchWholeWordChange: (nextValue: boolean) => void;
    headerColumnGroup: React.ReactNode;
    emptyMessage: string;
    headerLeft: React.ReactNode;
    balanceTag: {
        value: string;
        severity: 'success' | 'warning' | 'info' | 'danger';
    };
    canToggleExpand: boolean;
    expandAllDisabled: boolean;
    collapseAllDisabled: boolean;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onRefresh: () => void;
    onPrint: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onExportCsv: () => void;
    onExportExcel: () => void;
    onExportPdf: () => void;
    refreshDisabled: boolean;
    printDisabled: boolean;
    exportDisabled: boolean;
    refreshButtonId: string;
    recordSummary: string;
    showLedgerColumn: boolean;
    columnWidths: {
        group: string;
        ledger: string;
        annexure: string;
        amount: string;
        gap: string;
    };
    leftGroupBody: RowBodyTemplate;
    leftLedgerBody: RowBodyTemplate;
    leftAnnexureBody: RowBodyTemplate;
    leftAmountBody: RowBodyTemplate;
    gapBody: () => null;
    rightGroupBody: RowBodyTemplate;
    rightLedgerBody: RowBodyTemplate;
    rightAnnexureBody: RowBodyTemplate;
    rightAmountBody: RowBodyTemplate;
};

export function BalanceSheetReportTable({
    tableRows,
    isPrinting,
    tablePageSize,
    reportLoadingApplied,
    hasApplied,
    globalSearchValue,
    onGlobalSearchValueChange,
    globalSearchMatchCase,
    onGlobalSearchMatchCaseChange,
    globalSearchWholeWord,
    onGlobalSearchWholeWordChange,
    headerColumnGroup,
    emptyMessage,
    headerLeft,
    balanceTag,
    canToggleExpand,
    expandAllDisabled,
    collapseAllDisabled,
    onExpandAll,
    onCollapseAll,
    onRefresh,
    onPrint,
    onExportCsv,
    onExportExcel,
    onExportPdf,
    refreshDisabled,
    printDisabled,
    exportDisabled,
    refreshButtonId,
    recordSummary,
    showLedgerColumn,
    columnWidths,
    leftGroupBody,
    leftLedgerBody,
    leftAnnexureBody,
    leftAmountBody,
    gapBody,
    rightGroupBody,
    rightLedgerBody,
    rightAnnexureBody,
    rightAmountBody
}: BalanceSheetReportTableProps) {
    return (
        <ReportDataTable
            value={tableRows}
            paginator={!isPrinting}
            rows={tablePageSize}
            rowsPerPageOptions={isPrinting ? undefined : [10, 12, 24, 50]}
            dataKey="rowKey"
            stripedRows
            size="small"
            loadingState={reportLoadingApplied}
            loadingSummaryEnabled={hasApplied}
            globalSearchRenderInTableHeader={false}
            globalSearchValue={globalSearchValue}
            onGlobalSearchValueChange={onGlobalSearchValueChange}
            globalSearchMatchCase={globalSearchMatchCase}
            onGlobalSearchMatchCaseChange={onGlobalSearchMatchCaseChange}
            globalSearchWholeWord={globalSearchWholeWord}
            onGlobalSearchWholeWordChange={onGlobalSearchWholeWordChange}
            headerColumnGroup={headerColumnGroup}
            emptyMessage={emptyMessage}
            className="summary-table balance-sheet-table"
            headerLeft={headerLeft}
            headerRight={
                <>
                    <Tag value={balanceTag.value} severity={balanceTag.severity} />
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
                        onExportCsv={onExportCsv}
                        onExportExcel={onExportExcel}
                        onExportPdf={onExportPdf}
                        loadingState={reportLoadingApplied}
                        refreshDisabled={refreshDisabled}
                        printDisabled={printDisabled}
                        exportDisabled={exportDisabled}
                        refreshButtonId={refreshButtonId}
                    />
                </>
            }
            recordSummary={recordSummary}
        >
            <Column header="Ledger Group" body={leftGroupBody} style={{ width: columnWidths.group }} />
            {showLedgerColumn && <Column header="Ledger" body={leftLedgerBody} style={{ width: columnWidths.ledger }} />}
            <Column
                header="Annexure"
                body={leftAnnexureBody}
                headerClassName="summary-center"
                bodyClassName="summary-center"
                style={{ width: columnWidths.annexure }}
            />
            <Column
                header="Amount"
                body={leftAmountBody}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                style={{ width: columnWidths.amount }}
            />
            <Column
                header=""
                body={gapBody}
                headerClassName="balance-sheet-gap-header"
                bodyClassName="balance-sheet-gap-cell"
                style={{ width: columnWidths.gap }}
            />
            <Column header="Ledger Group" body={rightGroupBody} style={{ width: columnWidths.group }} />
            {showLedgerColumn && <Column header="Ledger" body={rightLedgerBody} style={{ width: columnWidths.ledger }} />}
            <Column
                header="Annexure"
                body={rightAnnexureBody}
                headerClassName="summary-center"
                bodyClassName="summary-center"
                style={{ width: columnWidths.annexure }}
            />
            <Column
                header="Amount"
                body={rightAmountBody}
                headerClassName="summary-number"
                bodyClassName="summary-number"
                style={{ width: columnWidths.amount }}
            />
        </ReportDataTable>
    );
}
