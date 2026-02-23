import React, { forwardRef, useMemo, useState } from 'react';
import AppDataTable from './AppDataTable';
import { AppRegisterSearch } from './AppRegisterSearch';

export type ReportDataTableProps = React.ComponentProps<typeof AppDataTable> & {
    loadingState?: boolean;
    loadingSummaryEnabled?: boolean;
    loadingSummaryLabel?: string;
    globalSearchEnabled?: boolean;
    globalSearchRenderInTableHeader?: boolean;
    globalSearchPlaceholder?: string;
    globalSearchHelperText?: React.ReactNode;
    globalSearchClassName?: string;
    globalSearchValue?: string;
    onGlobalSearchValueChange?: (nextValue: string) => void;
    globalSearchMatchCase?: boolean;
    onGlobalSearchMatchCaseChange?: (nextValue: boolean) => void;
    globalSearchWholeWord?: boolean;
    onGlobalSearchWholeWordChange?: (nextValue: boolean) => void;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const flattenSearchText = (value: unknown): string => {
    const parts: string[] = [];
    const visited = new WeakSet<object>();

    const visit = (node: unknown) => {
        if (node == null) return;
        if (typeof node === 'string') {
            if (node) parts.push(node);
            return;
        }
        if (typeof node === 'number' || typeof node === 'boolean' || typeof node === 'bigint') {
            parts.push(String(node));
            return;
        }
        if (node instanceof Date) {
            if (!Number.isNaN(node.getTime())) {
                parts.push(node.toISOString());
            }
            return;
        }
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (React.isValidElement(node) || typeof node !== 'object') return;
        if (visited.has(node)) return;
        visited.add(node);
        Object.values(node as Record<string, unknown>).forEach(visit);
    };

    visit(value);
    return parts.join(' ');
};

export const ReportDataTable = forwardRef(function ReportDataTable(
    {
        size = 'small',
        stripedRows = true,
        loadingState: _loadingState,
        loadingSummaryEnabled: _loadingSummaryEnabled = true,
        loadingSummaryLabel: _loadingSummaryLabel = 'Load',
        globalSearchEnabled = true,
        globalSearchRenderInTableHeader = true,
        globalSearchPlaceholder = 'Search register...',
        globalSearchHelperText = 'Aa: Match Case · W: Whole Word',
        globalSearchClassName,
        globalSearchValue,
        onGlobalSearchValueChange,
        globalSearchMatchCase,
        onGlobalSearchMatchCaseChange,
        globalSearchWholeWord,
        onGlobalSearchWholeWordChange,
        headerRight,
        recordSummary,
        ...rest
    }: ReportDataTableProps,
    ref: React.ForwardedRef<any>
) {
    const [internalGlobalSearchText, setInternalGlobalSearchText] = useState('');
    const [internalGlobalSearchMatchCase, setInternalGlobalSearchMatchCase] = useState(false);
    const [internalGlobalSearchWholeWord, setInternalGlobalSearchWholeWord] = useState(false);

    const resolvedGlobalSearchText = globalSearchValue ?? internalGlobalSearchText;
    const resolvedGlobalSearchMatchCase = globalSearchMatchCase ?? internalGlobalSearchMatchCase;
    const resolvedGlobalSearchWholeWord = globalSearchWholeWord ?? internalGlobalSearchWholeWord;
    const handleGlobalSearchTextChange = onGlobalSearchValueChange ?? setInternalGlobalSearchText;
    const handleGlobalSearchMatchCaseChange = onGlobalSearchMatchCaseChange ?? setInternalGlobalSearchMatchCase;
    const handleGlobalSearchWholeWordChange = onGlobalSearchWholeWordChange ?? setInternalGlobalSearchWholeWord;

    const sourceRows = useMemo(() => {
        return Array.isArray(rest.value) ? (rest.value as unknown[]) : [];
    }, [rest.value]);

    const searchableRows = useMemo(
        () =>
            sourceRows.map((row) => {
                const searchableText = flattenSearchText(row);
                return {
                    row,
                    searchableText,
                    searchableTextLower: searchableText.toLowerCase()
                };
            }),
        [sourceRows]
    );

    const hasGlobalSearch = globalSearchEnabled && resolvedGlobalSearchText.trim().length > 0;

    const filteredRows = useMemo(() => {
        if (!hasGlobalSearch) return sourceRows;
        const needle = resolvedGlobalSearchText.trim();
        if (!needle) return sourceRows;

        if (resolvedGlobalSearchWholeWord) {
            const escapedNeedle = escapeRegExp(needle);
            const flags = resolvedGlobalSearchMatchCase ? '' : 'i';
            const wholeWordPattern = new RegExp(`(^|[^A-Za-z0-9])${escapedNeedle}(?=$|[^A-Za-z0-9])`, flags);
            return searchableRows
                .filter((item) => wholeWordPattern.test(item.searchableText))
                .map((item) => item.row);
        }

        if (resolvedGlobalSearchMatchCase) {
            return searchableRows
                .filter((item) => item.searchableText.includes(needle))
                .map((item) => item.row);
        }

        const loweredNeedle = needle.toLowerCase();
        return searchableRows
            .filter((item) => item.searchableTextLower.includes(loweredNeedle))
            .map((item) => item.row);
    }, [hasGlobalSearch, resolvedGlobalSearchMatchCase, resolvedGlobalSearchText, resolvedGlobalSearchWholeWord, searchableRows, sourceRows]);

    const searchControl = globalSearchEnabled ? (
        <AppRegisterSearch
            value={resolvedGlobalSearchText}
            onValueChange={handleGlobalSearchTextChange}
            matchCase={resolvedGlobalSearchMatchCase}
            onMatchCaseChange={handleGlobalSearchMatchCaseChange}
            wholeWord={resolvedGlobalSearchWholeWord}
            onWholeWordChange={handleGlobalSearchWholeWordChange}
            placeholder={globalSearchPlaceholder}
            helperText={globalSearchHelperText}
            className={`app-report-table-search app-register-search--compact${globalSearchClassName ? ` ${globalSearchClassName}` : ''}`}
            disabled={Boolean(rest.loading) && sourceRows.length === 0}
        />
    ) : null;

    const combinedHeaderRight = globalSearchEnabled && globalSearchRenderInTableHeader ? (
        <div className="app-report-table-actions-stack">
            {searchControl ? <div className="app-report-table-search-row">{searchControl}</div> : null}
            {headerRight ? <div className="app-report-table-actions-row">{headerRight}</div> : null}
        </div>
    ) : (
        headerRight
    );

    return (
        <AppDataTable
            {...rest}
            ref={ref}
            size={size}
            stripedRows={stripedRows}
            headerRight={combinedHeaderRight}
            recordSummary={recordSummary}
            value={hasGlobalSearch ? filteredRows : rest.value}
            paginator={hasGlobalSearch ? false : rest.paginator}
        />
    );
});
