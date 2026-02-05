import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import AppDataTable from './AppDataTable';

export type ReportDataTableProps = React.ComponentProps<typeof AppDataTable> & {
    loadingState?: boolean;
    loadingSummaryEnabled?: boolean;
    loadingSummaryLabel?: string;
};

const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const formatDuration = (ms: number) => {
    const safe = Math.max(0, ms);
    if (safe < 1000) {
        return `${Math.round(safe)} ms`;
    }
    return `${(safe / 1000).toFixed(2)} s`;
};

export const ReportDataTable = forwardRef(function ReportDataTable(
    {
        size = 'small',
        stripedRows = true,
        loadingState,
        loadingSummaryEnabled = true,
        loadingSummaryLabel = 'Load',
        recordSummary,
        ...rest
    }: ReportDataTableProps,
    ref: React.ForwardedRef<any>
) {
    const loadingStartRef = useRef<number | null>(null);
    const [lastLoadMs, setLastLoadMs] = useState<number | null>(null);

    useEffect(() => {
        if (!loadingSummaryEnabled || loadingState === undefined) return;
        if (loadingState) {
            if (loadingStartRef.current == null) {
                loadingStartRef.current = nowMs();
            }
            return;
        }
        if (loadingStartRef.current != null) {
            const elapsed = nowMs() - loadingStartRef.current;
            loadingStartRef.current = null;
            setLastLoadMs(elapsed);
        }
    }, [loadingState, loadingSummaryEnabled]);

    const loadingSummary = useMemo(() => {
        if (!loadingSummaryEnabled || lastLoadMs == null) return null;
        if (loadingState) return null;
        return `${loadingSummaryLabel}: ${formatDuration(lastLoadMs)}`;
    }, [lastLoadMs, loadingSummaryEnabled, loadingSummaryLabel, loadingState]);

    const mergedSummary = useMemo(() => {
        if (!loadingSummary) return recordSummary;
        if (recordSummary) return `${recordSummary} | ${loadingSummary}`;
        return loadingSummary;
    }, [loadingSummary, recordSummary]);

    return (
        <AppDataTable
            ref={ref}
            size={size}
            stripedRows={stripedRows}
            recordSummary={mergedSummary}
            {...rest}
        />
    );
});
