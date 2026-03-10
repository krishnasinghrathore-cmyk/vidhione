export const WEALTH_UNSPECIFIED_SOURCE_DOC = 'Manual / Unspecified';

export type WealthSourceDocBatchRow = {
    sourceDoc?: string | null;
    tdate?: string | null;
    ttype?: string | null;
    accountId?: string | null;
};

export type WealthSourceDocBatchSummary = {
    sourceDoc: string;
    sourceDocFilter: string;
    rowCount: number;
    firstDate: string;
    lastDate: string;
    typeLabels: string[];
    accountLabels: string[];
};

const minDate = (current: string, next: string) => {
    if (!current) return next;
    if (!next) return current;
    return next < current ? next : current;
};

const maxDate = (current: string, next: string) => {
    if (!current) return next;
    if (!next) return current;
    return next > current ? next : current;
};

export const summarizeWealthSourceDocBatches = <TRow extends WealthSourceDocBatchRow>(
    rows: TRow[],
    resolveAccountLabel?: (row: TRow) => string | null | undefined
): WealthSourceDocBatchSummary[] => {
    const summaryBySourceDoc = new Map<
        string,
        {
            sourceDoc: string;
            sourceDocFilter: string;
            rowCount: number;
            firstDate: string;
            lastDate: string;
            typeSet: Set<string>;
            accountSet: Set<string>;
        }
    >();

    rows.forEach((row) => {
        const normalizedSourceDoc = row.sourceDoc?.trim() || '';
        const displaySourceDoc = normalizedSourceDoc || WEALTH_UNSPECIFIED_SOURCE_DOC;
        const accountLabel = resolveAccountLabel?.(row)?.trim() || '';
        const txDate = row.tdate?.trim() || '';
        const txType = row.ttype?.trim() || '';
        const existing = summaryBySourceDoc.get(displaySourceDoc);

        if (existing) {
            existing.rowCount += 1;
            existing.firstDate = minDate(existing.firstDate, txDate);
            existing.lastDate = maxDate(existing.lastDate, txDate);
            if (txType) existing.typeSet.add(txType);
            if (accountLabel) existing.accountSet.add(accountLabel);
            return;
        }

        summaryBySourceDoc.set(displaySourceDoc, {
            sourceDoc: displaySourceDoc,
            sourceDocFilter: normalizedSourceDoc,
            rowCount: 1,
            firstDate: txDate,
            lastDate: txDate,
            typeSet: new Set(txType ? [txType] : []),
            accountSet: new Set(accountLabel ? [accountLabel] : [])
        });
    });

    return Array.from(summaryBySourceDoc.values())
        .map((summary) => ({
            sourceDoc: summary.sourceDoc,
            sourceDocFilter: summary.sourceDocFilter,
            rowCount: summary.rowCount,
            firstDate: summary.firstDate,
            lastDate: summary.lastDate,
            typeLabels: Array.from(summary.typeSet),
            accountLabels: Array.from(summary.accountSet)
        }))
        .sort((left, right) => right.lastDate.localeCompare(left.lastDate) || right.rowCount - left.rowCount || left.sourceDoc.localeCompare(right.sourceDoc));
};
