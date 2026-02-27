import React, { useRef } from 'react';
import { Button } from 'primereact/button';
import { SplitButton } from 'primereact/splitbutton';
import type { MenuItem } from 'primereact/menuitem';
import { formatReportLoadDuration, useReportLoadTime } from '@/lib/reportLoadTime';
import { dispatchReportTableFilterReset } from '@/lib/reportTableFilterReset';

type AppReportActionsProps = {
    onRefresh?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onStatement?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    onPrint?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    printMenuItems?: MenuItem[];
    onExport?: () => void;
    onExportCsv?: () => void;
    onExportExcel?: () => void;
    onExportPdf?: () => void;
    refreshDisabled?: boolean;
    statementDisabled?: boolean;
    printDisabled?: boolean;
    exportDisabled?: boolean;
    showRefresh?: boolean;
    showStatement?: boolean;
    showPrint?: boolean;
    showExport?: boolean;
    refreshButtonId?: string;
    loadingState?: boolean;
    loadingSummaryEnabled?: boolean;
    loadingSummaryLabel?: string;
    pageLoadingState?: boolean;
    pageLoadingSummaryEnabled?: boolean;
    pageLoadingSummaryLabel?: string;
};

const shouldShow = (explicit: boolean | undefined, handler: unknown) => {
    if (explicit !== undefined) return explicit;
    return Boolean(handler);
};

const blurActiveElement = () => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
};

const AppReportActions = ({
    onRefresh,
    onStatement,
    onPrint,
    printMenuItems,
    onExport,
    onExportCsv,
    onExportExcel,
    onExportPdf,
    refreshDisabled,
    statementDisabled,
    printDisabled,
    exportDisabled,
    showRefresh,
    showStatement,
    showPrint,
    showExport,
    refreshButtonId,
    loadingState,
    loadingSummaryEnabled = true,
    loadingSummaryLabel = 'Load',
    pageLoadingState,
    pageLoadingSummaryEnabled = false,
    pageLoadingSummaryLabel = 'Page'
}: AppReportActionsProps) => {
    const exportMenuRef = useRef<{ show: () => void } | null>(null);
    const { activeLoadMs, lastLoadMs } = useReportLoadTime({
        loadingState,
        enabled: loadingSummaryEnabled
    });
    const { activeLoadMs: activePageLoadMs, lastLoadMs: lastPageLoadMs } = useReportLoadTime({
        loadingState: pageLoadingState,
        enabled: pageLoadingSummaryEnabled
    });
    const renderRefresh = shouldShow(showRefresh, onRefresh);
    const renderStatement = shouldShow(showStatement, onStatement);
    const renderPrint = shouldShow(showPrint, onPrint);
    const renderExport = shouldShow(showExport, onExport || onExportCsv || onExportExcel || onExportPdf);
    const hasPrintMenu = Boolean(printMenuItems?.length);
    const hasExportMenu = Boolean(onExportCsv || onExportExcel || onExportPdf);
    const loadSummaryText =
        loadingSummaryEnabled && loadingState && activeLoadMs != null
            ? `${loadingSummaryLabel}: ${formatReportLoadDuration(activeLoadMs)} (loading...)`
            : loadingSummaryEnabled && lastLoadMs != null
              ? `${loadingSummaryLabel}: ${formatReportLoadDuration(lastLoadMs)}`
              : null;
    const pageLoadSummaryText =
        pageLoadingSummaryEnabled && pageLoadingState && activePageLoadMs != null
            ? `${pageLoadingSummaryLabel}: ${formatReportLoadDuration(activePageLoadMs)} (loading...)`
            : pageLoadingSummaryEnabled && lastPageLoadMs != null
              ? `${pageLoadingSummaryLabel}: ${formatReportLoadDuration(lastPageLoadMs)}`
              : null;
    const exportItems: MenuItem[] = [
        onExportCsv
            ? { label: 'Export CSV', icon: 'pi pi-file', command: () => { onExportCsv(); blurActiveElement(); } }
            : null,
        onExportExcel
            ? { label: 'Export Excel', icon: 'pi pi-file-excel', command: () => { onExportExcel(); blurActiveElement(); } }
            : null,
        onExportPdf
            ? { label: 'Export PDF', icon: 'pi pi-file-pdf', command: () => { onExportPdf(); blurActiveElement(); } }
            : null
    ].filter(Boolean) as MenuItem[];
    const primaryExport = onExport ?? onExportCsv ?? onExportExcel ?? onExportPdf;
    const handleExportClick = () => {
        if (hasExportMenu) {
            exportMenuRef.current?.show();
            blurActiveElement();
            return;
        }
        if (!primaryExport) return;
        primaryExport();
        blurActiveElement();
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        dispatchReportTableFilterReset(event.currentTarget);
        onRefresh?.(event);
    };

    return (
        <>
            {renderRefresh && (
                <Button
                    id={refreshButtonId}
                    label="Refresh"
                    icon="pi pi-refresh"
                    className="p-button-text app-action-refresh"
                    onClick={handleRefreshClick}
                    disabled={refreshDisabled}
                />
            )}
            {loadSummaryText ? (
                <span className="app-report-actions__load-time text-600 text-sm" aria-live="polite">
                    {loadSummaryText}
                </span>
            ) : null}
            {pageLoadSummaryText ? (
                <span className="app-report-actions__load-time text-600 text-sm" aria-live="polite">
                    {pageLoadSummaryText}
                </span>
            ) : null}
            {renderStatement && (
                <Button
                    label="Statement"
                    icon="pi pi-file"
                    className="p-button-text"
                    onClick={onStatement}
                    disabled={statementDisabled}
                />
            )}
            {renderPrint && (
                hasPrintMenu ? (
                    <SplitButton
                        label="Print"
                        icon="pi pi-print"
                        model={printMenuItems}
                        onClick={(event) => {
                            if (onPrint) {
                                onPrint(event);
                                blurActiveElement();
                                return;
                            }
                            const fallback = printMenuItems?.[0]?.command;
                            fallback?.({ originalEvent: event, item: printMenuItems?.[0] } as any);
                            blurActiveElement();
                        }}
                        disabled={printDisabled}
                        text
                        buttonClassName="p-button-text app-action-print"
                        menuButtonClassName="p-button-text"
                    />
                ) : (
                    <Button
                        label="Print"
                        icon="pi pi-print"
                        className="p-button-text app-action-print"
                        onClick={onPrint}
                        disabled={printDisabled}
                    />
                )
            )}
            {renderExport && (
                hasExportMenu ? (
                    <SplitButton
                        ref={exportMenuRef}
                        label="Export"
                        icon="pi pi-download"
                        model={exportItems}
                        onClick={handleExportClick}
                        disabled={exportDisabled}
                        text
                        buttonClassName="p-button-text"
                        menuButtonClassName="p-button-text"
                    />
                ) : (
                    <Button
                        label="Export"
                        icon="pi pi-download"
                        className="p-button-text"
                        onClick={handleExportClick}
                        disabled={exportDisabled}
                    />
                )
            )}
        </>
    );
};

export default AppReportActions;
