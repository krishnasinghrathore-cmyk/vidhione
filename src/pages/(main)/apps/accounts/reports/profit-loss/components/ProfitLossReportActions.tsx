import type React from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import AppReportActions from '@/components/AppReportActions';

type ProfitLossReportActionsProps = {
    netTag: {
        value: string;
        severity: 'success' | 'warning' | 'info' | 'danger';
    };
    canToggleExpand: boolean;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    expandAllDisabled: boolean;
    collapseAllDisabled: boolean;
    onRefresh: () => void;
    onPrint: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onExportCsv: () => void;
    onExportExcel: () => void;
    onExportPdf: () => void;
    refreshDisabled: boolean;
    printDisabled: boolean;
    exportDisabled: boolean;
    refreshButtonId: string;
    loadingState: boolean;
};

export function ProfitLossReportActions({
    netTag,
    canToggleExpand,
    onExpandAll,
    onCollapseAll,
    expandAllDisabled,
    collapseAllDisabled,
    onRefresh,
    onPrint,
    onExportCsv,
    onExportExcel,
    onExportPdf,
    refreshDisabled,
    printDisabled,
    exportDisabled,
    refreshButtonId,
    loadingState
}: ProfitLossReportActionsProps) {
    return (
        <>
            <Tag value={netTag.value} severity={netTag.severity} />
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
                loadingState={loadingState}
                refreshDisabled={refreshDisabled}
                printDisabled={printDisabled}
                exportDisabled={exportDisabled}
                refreshButtonId={refreshButtonId}
            />
        </>
    );
}
