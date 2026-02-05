'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Button } from 'primereact/button';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Row } from 'primereact/row';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import AppMultiSelect from '@/components/AppMultiSelect';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

type ProfitLossSection = 'Trading' | 'ProfitLoss';
type ProfitLossSide = 'Dr' | 'Cr';

type ProfitLossLine = {
    id: number;
    section: ProfitLossSection;
    side: ProfitLossSide;
    ledgerGroupId?: number | null;
    ledgerGroupName?: string | null;
    ledgerId?: number | null;
    ledgerName?: string | null;
    annexureName?: string | null;
    amount: number;
};

type ProfitLossReportPayload = {
    lines: ProfitLossLine[];
    grossProfit: number;
    grossLoss: number;
    netProfit: number;
    netLoss: number;
};

type ProfitLossFilters = {
    fromDate: Date | null;
    toDate: Date | null;
};

type ProfitLossSideRow = {
    rowType: 'group' | 'ledger' | 'gross' | 'net' | 'total' | 'carry';
    label: string;
    amount: number;
    groupId?: number | null;
    isExpandable?: boolean;
    section?: ProfitLossSection;
};

type ProfitLossTableRow = {
    rowKey: string;
    left: ProfitLossSideRow | null;
    right: ProfitLossSideRow | null;
    leftParticular?: string | null;
    leftAmount?: number | null;
    rightParticular?: string | null;
    rightAmount?: number | null;
    isSkeleton?: boolean;
};

type ProfitLossExportRow = {
    section: string;
    side: ProfitLossSide;
    particulars: string;
    amount: number;
    rowType: ProfitLossSideRow['rowType'];
};

type FilterOption<T extends string | number> = {
    label: string;
    value: T;
};

type ColumnFilterConstraint = {
    value?: unknown;
    matchMode?: string;
};

type ColumnFilterMeta = {
    operator?: string;
    constraints?: ColumnFilterConstraint[];
    value?: unknown;
    matchMode?: string;
};

type ProfitLossSideFilters = {
    particulars: string[];
    amounts: number[];
};

const PROFIT_LOSS_REPORT = gql`
    query ProfitLossReport(
        $fromDate: String
        $toDate: String
        $cancelled: Int
    ) {
        profitLossReport(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
        ) {
            grossProfit
            grossLoss
            netProfit
            netLoss
            lines {
                id
                section
                side
                ledgerGroupId
                ledgerGroupName
                ledgerId
                ledgerName
                annexureName
                amount
            }
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

const EMPTY_SIDE_FILTERS: ProfitLossSideFilters = { particulars: [], amounts: [] };

const MULTISELECT_COLUMN_PROPS = {
    filter: true,
    filterMatchMode: FilterMatchMode.IN,
    showFilterMatchModes: false,
    showFilterOperator: false,
    showAddButton: false,
    showApplyButton: true,
    showClearButton: true
};

const buildTextFilterOptions = (values: Array<string | null | undefined>): FilterOption<string>[] => {
    const unique = new Map<string, true>();
    values.forEach((value) => {
        if (!value) return;
        const trimmed = value.trim();
        if (!trimmed) return;
        unique.set(trimmed, true);
    });
    return Array.from(unique.keys())
        .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
        .map((value) => ({ label: value, value }));
};

const buildNumberFilterOptions = (values: Array<number | null | undefined>): FilterOption<number>[] => {
    const unique = new Set<number>();
    values.forEach((value) => {
        if (value == null || !Number.isFinite(value)) return;
        unique.add(value);
    });
    return Array.from(unique.values())
        .sort((a, b) => a - b)
        .map((value) => ({ label: formatAmount(value), value }));
};

const buildDefaultColumnFilters = (): DataTableFilterMeta => ({
    leftParticular: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    leftAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    rightParticular: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    },
    rightAmount: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.IN }]
    }
});

const buildMultiSelectFilterElement =
    <T extends string | number>(items: FilterOption<T>[], placeholder = 'Any') =>
    (options: ColumnFilterElementTemplateOptions) => (
        <AppMultiSelect
            value={(options.value ?? []) as T[]}
            options={items}
            optionLabel="label"
            optionValue="value"
            onChange={(event) => options.filterCallback(event.value)}
            filter
            filterInputAutoFocus
            showSelectAll
            placeholder={placeholder}
            className="p-column-filter"
            display="comma"
            maxSelectedLabels={1}
            emptyMessage={items.length ? 'No values found' : 'No values'}
            emptyFilterMessage="No results found"
            disabled={items.length === 0}
        />
    );

const resolveFilterValues = (filters: DataTableFilterMeta, field: string): unknown[] => {
    const meta = filters[field] as ColumnFilterMeta | undefined;
    if (!meta) return [];
    const normalize = (value: unknown) => {
        if (value == null) return [];
        return Array.isArray(value) ? value : [value];
    };
    if (Array.isArray(meta.constraints)) {
        return meta.constraints.flatMap((constraint) => normalize(constraint.value));
    }
    return normalize(meta.value);
};

const resolveTextFilterValues = (filters: DataTableFilterMeta, field: string): string[] =>
    resolveFilterValues(filters, field).flatMap((value) => {
        if (typeof value !== 'string') return [];
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    });

const resolveNumberFilterValues = (filters: DataTableFilterMeta, field: string): number[] =>
    resolveFilterValues(filters, field)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));

const matchesAmountFilter = (amount: number, selections: number[]) =>
    selections.length === 0 || selections.some((value) => Math.abs(value - amount) < 0.005);

const matchesSideFilters = (label: string, amount: number, filters: ProfitLossSideFilters) => {
    const { particulars, amounts } = filters;
    if (particulars.length) {
        const normalized = label.trim();
        if (!normalized || !particulars.includes(normalized)) return false;
    }
    if (amounts.length && !matchesAmountFilter(amount, amounts)) return false;
    return true;
};

const resolveSideFilters = (
    filters: DataTableFilterMeta,
    prefix: 'left' | 'right'
): ProfitLossSideFilters => ({
    particulars: resolveTextFilterValues(filters, `${prefix}Particular`),
    amounts: resolveNumberFilterValues(filters, `${prefix}Amount`)
});

const toDateText = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateRangeLabel = (from: Date | null, to: Date | null) => {
    const fromText = formatDateLabel(from);
    const toText = formatDateLabel(to);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

const parseDateText = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const toLocalDate = (year: number, month: number, day: number) => {
        if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
        return new Date(year, month - 1, day);
    };

    if (/^\d{8}$/.test(trimmed)) {
        const year = Number(trimmed.slice(0, 4));
        const month = Number(trimmed.slice(4, 6));
        const day = Number(trimmed.slice(6, 8));
        return toLocalDate(year, month, day);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        return toLocalDate(year, month, day);
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const day = Number(slash[1]);
        const month = Number(slash[2]);
        const year = Number(slash[3]);
        return toLocalDate(year, month, day);
    }
    return null;
};

const parseFiscalYearRange = (value: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/(\d{4})\D+(\d{2,4})/);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endText = match[2];
    const endYear = endText.length === 2 ? Number(`${String(startYear).slice(0, 2)}${endText}`) : Number(endText);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
    return { startYear, endYear };
};

const buildDefaultFiscalRange = (baseDate = new Date()) => {
    const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
    return {
        start: new Date(startYear, 3, 1),
        end: new Date(startYear + 1, 2, 31)
    };
};

const resolveFiscalRange = (startText: string | null, endText: string | null) => {
    let start = parseDateText(startText);
    let end = parseDateText(endText);

    if (start || end) {
        if (start && !end) {
            end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
        } else if (!start && end) {
            start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate() + 1);
        }
        return { start: start ?? null, end: end ?? null };
    }

    const range = parseFiscalYearRange(startText ?? endText);
    if (range) {
        return {
            start: new Date(range.startYear, 3, 1),
            end: new Date(range.endYear, 2, 31)
        };
    }

    return buildDefaultFiscalRange();
};

const sumBySide = (lines: ProfitLossLine[], side: ProfitLossSide) =>
    lines.reduce((sum, line) => (line.side === side ? sum + Number(line.amount ?? 0) : sum), 0);

export default function ProfitLossReport() {
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const { setPageTitle } = useContext(LayoutContext);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [tradingColumnFilters, setTradingColumnFilters] = useState<DataTableFilterMeta>(() =>
        buildDefaultColumnFilters()
    );
    const [profitLossColumnFilters, setProfitLossColumnFilters] = useState<DataTableFilterMeta>(() =>
        buildDefaultColumnFilters()
    );
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const cancelled = 0;
    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);
    const [appliedFilters, setAppliedFilters] = useState<ProfitLossFilters | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'profit-loss-refresh';

    useEffect(() => {
        setPageTitle('Profit & Loss');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const [loadProfitLoss, { data, loading, error }] = useLazyQuery(PROFIT_LOSS_REPORT, {
        fetchPolicy: 'network-only'
    });

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
    };
    const focusRefreshButton = () => {
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

    const handleFromDateChange = (nextValue: Date | null) => {
        clearAppliedFilters();
        setFromDate(nextValue);
        setDateErrors({});
    };

    const handleToDateChange = (nextValue: Date | null) => {
        clearAppliedFilters();
        setToDate(nextValue);
        setDateErrors({});
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, initialRangeRef.current);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const nextFilters: ProfitLossFilters = {
            fromDate,
            toDate
        };
        setAppliedFilters(nextFilters);
        setLastRefreshedAt(new Date());
        void loadProfitLoss({
            variables: {
                fromDate: toDateText(fromDate),
                toDate: toDateText(toDate),
                cancelled
            }
        });
    };

    const hasApplied = appliedFilters != null;
    const reportLoading = hasApplied && loading;

    const report = useMemo(() => {
        if (!hasApplied) return null;
        return (data?.profitLossReport ?? null) as ProfitLossReportPayload | null;
    }, [data, hasApplied]);

    const lines = useMemo(() => report?.lines ?? [], [report?.lines]);
    const grossProfit = report?.grossProfit ?? 0;
    const grossLoss = report?.grossLoss ?? 0;
    const netProfit = report?.netProfit ?? 0;
    const netLoss = report?.netLoss ?? 0;

    const tradingLines = useMemo(
        () => lines.filter((line) => line.section === 'Trading'),
        [lines]
    );
    const profitLossLines = useMemo(
        () => lines.filter((line) => line.section === 'ProfitLoss'),
        [lines]
    );

    const groupKeys = useMemo(() => {
        if (!hasApplied) return [] as string[];
        const keys = new Set<string>();
        lines.forEach((line) => {
            const groupId = Number(line.ledgerGroupId ?? 0);
            if (groupId > 0 && (line.ledgerName ?? '').trim()) {
                keys.add(`${line.section}-${groupId}`);
            }
        });
        return Array.from(keys);
    }, [hasApplied, lines]);

    useEffect(() => {
        if (!hasApplied) {
            setExpandedGroups(new Set());
            return;
        }
        setExpandedGroups(new Set());
    }, [groupKeys, hasApplied]);

    const canToggleExpand = hasApplied && groupKeys.length > 0;
    const allGroupsExpanded = groupKeys.length > 0 && expandedGroups.size === groupKeys.length;
    const expandAllDisabled = !canToggleExpand || allGroupsExpanded;
    const collapseAllDisabled = !canToggleExpand || expandedGroups.size === 0;

    const toggleGroupExpansion = useCallback((groupKey: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) {
                next.delete(groupKey);
            } else {
                next.add(groupKey);
            }
            return next;
        });
    }, []);

    const expandAllGroups = useCallback(() => {
        setExpandedGroups(new Set(groupKeys));
    }, [groupKeys]);

    const collapseAllGroups = useCallback(() => {
        setExpandedGroups(new Set());
    }, []);

    const buildSideRows = useCallback(
        (
            sectionLines: ProfitLossLine[],
            side: ProfitLossSide,
            section: ProfitLossSection,
            filters: ProfitLossSideFilters
        ): ProfitLossSideRow[] => {
            const grouped = new Map<
                string,
                { groupId: number | null; groupName: string; lines: ProfitLossLine[] }
            >();

            sectionLines
                .filter((line) => line.side === side)
                .forEach((line) => {
                    const groupId = line.ledgerGroupId ?? null;
                    const groupName = line.ledgerGroupName ?? `Group ${groupId ?? 0}`;
                    const key = `${groupId ?? 0}-${groupName}`;
                    const entry = grouped.get(key) ?? { groupId, groupName, lines: [] };
                    entry.lines.push(line);
                    grouped.set(key, entry);
                });

            return Array.from(grouped.values())
                .sort((a, b) => a.groupName.localeCompare(b.groupName, 'en', { sensitivity: 'base' }))
                .flatMap((group) => {
                    const sortedLines = [...group.lines].sort((a, b) =>
                        (a.ledgerName ?? '').localeCompare(b.ledgerName ?? '', 'en', { sensitivity: 'base' })
                    );
                    const groupTotal = sortedLines.reduce(
                        (sum, line) => sum + Number(line.amount ?? 0),
                        0
                    );
                    const ledgerRows = sortedLines.map((line) => ({
                        rowType: 'ledger' as const,
                        label: line.ledgerName ?? `Ledger ${line.ledgerId ?? 0}`,
                        amount: Number(line.amount ?? 0)
                    }));
                    const hasFilters = filters.particulars.length > 0 || filters.amounts.length > 0;
                    const filteredLedgerRows = hasFilters
                        ? ledgerRows.filter((row) => matchesSideFilters(row.label, row.amount, filters))
                        : ledgerRows;
                    const groupMatches = !hasFilters || matchesSideFilters(group.groupName, groupTotal, filters);
                    const hasLedgerMatch = filteredLedgerRows.length > 0;
                    if (hasFilters && !groupMatches && !hasLedgerMatch) {
                        return [];
                    }

                    const groupId = group.groupId ?? null;
                    const groupKey = groupId ? `${section}-${groupId}` : '';
                    const isExpanded = groupKey ? expandedGroups.has(groupKey) : false;
                    const groupRow: ProfitLossSideRow = {
                        rowType: 'group',
                        label: group.groupName,
                        amount: groupTotal,
                        groupId,
                        isExpandable: groupId != null && groupId > 0 && ledgerRows.length > 0,
                        section
                    };
                    const rows: ProfitLossSideRow[] = [groupRow];
                    if (isExpanded) {
                        rows.push(...filteredLedgerRows);
                    }
                    return rows;
                });
        },
        [expandedGroups]
    );

    const tradingLeftFilters = useMemo(
        () => resolveSideFilters(tradingColumnFilters, 'left'),
        [tradingColumnFilters]
    );
    const tradingRightFilters = useMemo(
        () => resolveSideFilters(tradingColumnFilters, 'right'),
        [tradingColumnFilters]
    );
    const profitLossLeftFilters = useMemo(
        () => resolveSideFilters(profitLossColumnFilters, 'left'),
        [profitLossColumnFilters]
    );
    const profitLossRightFilters = useMemo(
        () => resolveSideFilters(profitLossColumnFilters, 'right'),
        [profitLossColumnFilters]
    );

    const tradingSection = useMemo(() => {
        if (!hasApplied) {
            return { left: [], right: [], rows: [] as ProfitLossTableRow[] };
        }
        const baseLeft = buildSideRows(tradingLines, 'Dr', 'Trading', tradingLeftFilters);
        const baseRight = buildSideRows(tradingLines, 'Cr', 'Trading', tradingRightFilters);
        const left: ProfitLossSideRow[] = [...baseLeft];
        const right: ProfitLossSideRow[] = [...baseRight];

        if (grossProfit > 0) {
            left.push({ rowType: 'gross', label: 'Gross Profit (C/F)', amount: grossProfit });
        } else if (grossLoss > 0) {
            right.push({ rowType: 'gross', label: 'Gross Loss (C/F)', amount: grossLoss });
        }

        const debitTotal = sumBySide(tradingLines, 'Dr') + (grossProfit > 0 ? grossProfit : 0);
        const creditTotal = sumBySide(tradingLines, 'Cr') + (grossLoss > 0 ? grossLoss : 0);
        const total = Math.max(debitTotal, creditTotal);

        left.push({ rowType: 'total', label: 'Total', amount: total });
        right.push({ rowType: 'total', label: 'Total', amount: total });

        const maxRows = Math.max(left.length, right.length);
        const rows = Array.from({ length: maxRows }, (_, idx) => {
            const leftCell = left[idx] ?? null;
            const rightCell = right[idx] ?? null;
            return {
                rowKey: `trading-${idx}`,
                left: leftCell,
                right: rightCell,
                leftParticular: leftCell?.label ?? null,
                leftAmount: leftCell ? Number(leftCell.amount ?? 0) : null,
                rightParticular: rightCell?.label ?? null,
                rightAmount: rightCell ? Number(rightCell.amount ?? 0) : null
            };
        });

        return { left, right, rows };
    }, [buildSideRows, grossLoss, grossProfit, hasApplied, tradingLeftFilters, tradingLines, tradingRightFilters]);

    const profitLossSection = useMemo(() => {
        if (!hasApplied) {
            return { left: [], right: [], rows: [] as ProfitLossTableRow[] };
        }
        const baseLeft = buildSideRows(profitLossLines, 'Dr', 'ProfitLoss', profitLossLeftFilters);
        const baseRight = buildSideRows(profitLossLines, 'Cr', 'ProfitLoss', profitLossRightFilters);
        const left: ProfitLossSideRow[] = [];
        const right: ProfitLossSideRow[] = [];

        if (grossLoss > 0) {
            left.push({ rowType: 'carry', label: 'Gross Loss (B/F)', amount: grossLoss });
        } else if (grossProfit > 0) {
            right.push({ rowType: 'carry', label: 'Gross Profit (B/F)', amount: grossProfit });
        }

        left.push(...baseLeft);
        right.push(...baseRight);

        if (netProfit > 0) {
            left.push({ rowType: 'net', label: 'Net Profit (C/F)', amount: netProfit });
        } else if (netLoss > 0) {
            right.push({ rowType: 'net', label: 'Net Loss (C/F)', amount: netLoss });
        }

        const debitTotal =
            sumBySide(profitLossLines, 'Dr') + (grossLoss > 0 ? grossLoss : 0) + (netProfit > 0 ? netProfit : 0);
        const creditTotal =
            sumBySide(profitLossLines, 'Cr') + (grossProfit > 0 ? grossProfit : 0) + (netLoss > 0 ? netLoss : 0);
        const total = Math.max(debitTotal, creditTotal);

        left.push({ rowType: 'total', label: 'Total', amount: total });
        right.push({ rowType: 'total', label: 'Total', amount: total });

        const maxRows = Math.max(left.length, right.length);
        const rows = Array.from({ length: maxRows }, (_, idx) => {
            const leftCell = left[idx] ?? null;
            const rightCell = right[idx] ?? null;
            return {
                rowKey: `profit-loss-${idx}`,
                left: leftCell,
                right: rightCell,
                leftParticular: leftCell?.label ?? null,
                leftAmount: leftCell ? Number(leftCell.amount ?? 0) : null,
                rightParticular: rightCell?.label ?? null,
                rightAmount: rightCell ? Number(rightCell.amount ?? 0) : null
            };
        });

        return { left, right, rows };
    }, [
        buildSideRows,
        grossLoss,
        grossProfit,
        hasApplied,
        netLoss,
        netProfit,
        profitLossLeftFilters,
        profitLossLines,
        profitLossRightFilters
    ]);

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `skeleton-${idx}`,
                left: { rowType: 'ledger', label: '', amount: 0 },
                right: { rowType: 'ledger', label: '', amount: 0 },
                leftParticular: null,
                leftAmount: null,
                rightParticular: null,
                rightAmount: null,
                isSkeleton: true
            })),
        []
    );

    const tradingFilterRows = useMemo(() => {
        if (!hasApplied) {
            return { left: [] as ProfitLossSideRow[], right: [] as ProfitLossSideRow[] };
        }
        return {
            left: buildSideRows(tradingLines, 'Dr', 'Trading', EMPTY_SIDE_FILTERS),
            right: buildSideRows(tradingLines, 'Cr', 'Trading', EMPTY_SIDE_FILTERS)
        };
    }, [buildSideRows, hasApplied, tradingLines]);

    const profitLossFilterRows = useMemo(() => {
        if (!hasApplied) {
            return { left: [] as ProfitLossSideRow[], right: [] as ProfitLossSideRow[] };
        }
        return {
            left: buildSideRows(profitLossLines, 'Dr', 'ProfitLoss', EMPTY_SIDE_FILTERS),
            right: buildSideRows(profitLossLines, 'Cr', 'ProfitLoss', EMPTY_SIDE_FILTERS)
        };
    }, [buildSideRows, hasApplied, profitLossLines]);

    const tradingLeftParticularOptions = useMemo(
        () => buildTextFilterOptions(tradingFilterRows.left.map((row) => row.label)),
        [tradingFilterRows.left]
    );
    const tradingLeftAmountOptions = useMemo(
        () => buildNumberFilterOptions(tradingFilterRows.left.map((row) => row.amount)),
        [tradingFilterRows.left]
    );
    const tradingRightParticularOptions = useMemo(
        () => buildTextFilterOptions(tradingFilterRows.right.map((row) => row.label)),
        [tradingFilterRows.right]
    );
    const tradingRightAmountOptions = useMemo(
        () => buildNumberFilterOptions(tradingFilterRows.right.map((row) => row.amount)),
        [tradingFilterRows.right]
    );

    const profitLossLeftParticularOptions = useMemo(
        () => buildTextFilterOptions(profitLossFilterRows.left.map((row) => row.label)),
        [profitLossFilterRows.left]
    );
    const profitLossLeftAmountOptions = useMemo(
        () => buildNumberFilterOptions(profitLossFilterRows.left.map((row) => row.amount)),
        [profitLossFilterRows.left]
    );
    const profitLossRightParticularOptions = useMemo(
        () => buildTextFilterOptions(profitLossFilterRows.right.map((row) => row.label)),
        [profitLossFilterRows.right]
    );
    const profitLossRightAmountOptions = useMemo(
        () => buildNumberFilterOptions(profitLossFilterRows.right.map((row) => row.amount)),
        [profitLossFilterRows.right]
    );

    const tradingLeftParticularFilterElement = useMemo(
        () => buildMultiSelectFilterElement(tradingLeftParticularOptions),
        [tradingLeftParticularOptions]
    );
    const tradingLeftAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(tradingLeftAmountOptions),
        [tradingLeftAmountOptions]
    );
    const tradingRightParticularFilterElement = useMemo(
        () => buildMultiSelectFilterElement(tradingRightParticularOptions),
        [tradingRightParticularOptions]
    );
    const tradingRightAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(tradingRightAmountOptions),
        [tradingRightAmountOptions]
    );

    const profitLossLeftParticularFilterElement = useMemo(
        () => buildMultiSelectFilterElement(profitLossLeftParticularOptions),
        [profitLossLeftParticularOptions]
    );
    const profitLossLeftAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(profitLossLeftAmountOptions),
        [profitLossLeftAmountOptions]
    );
    const profitLossRightParticularFilterElement = useMemo(
        () => buildMultiSelectFilterElement(profitLossRightParticularOptions),
        [profitLossRightParticularOptions]
    );
    const profitLossRightAmountFilterElement = useMemo(
        () => buildMultiSelectFilterElement(profitLossRightAmountOptions),
        [profitLossRightAmountOptions]
    );

    const handleTradingColumnFilter = (event: DataTableFilterEvent) => {
        setTradingColumnFilters(event.filters);
    };

    const handleProfitLossColumnFilter = (event: DataTableFilterEvent) => {
        setProfitLossColumnFilters(event.filters);
    };

    const tradingTableRows = reportLoading ? skeletonRows : tradingSection.rows;
    const profitLossTableRows = reportLoading ? skeletonRows : profitLossSection.rows;

    const netTag = useMemo(() => {
        if (!hasApplied) return { value: 'Net Profit/Loss', severity: 'info' as const };
        if (netProfit > 0) {
            return { value: `Net Profit ${formatAmount(netProfit)}`, severity: 'success' as const };
        }
        if (netLoss > 0) {
            return { value: `Net Loss ${formatAmount(netLoss)}`, severity: 'danger' as const };
        }
        return { value: 'Break-even', severity: 'info' as const };
    }, [hasApplied, netLoss, netProfit]);

    const filterSummary = useMemo(() => {
        if (!hasApplied) return null;
        const applied = appliedFilters;
        if (!applied) return null;
        const parts = [`Range: ${formatDateRangeLabel(applied.fromDate, applied.toDate)}`];
        return parts.filter(Boolean).join(' | ');
    }, [appliedFilters, hasApplied]);

    const printFooterLeft = useMemo(() => {
        const parts: string[] = [];
        if (lastRefreshedAt) {
            parts.push(`Refreshed: ${formatReportTimestamp(lastRefreshedAt)}`);
        }
        if (filterSummary) {
            parts.push(filterSummary);
        }
        return parts.length ? parts.join(' | ') : undefined;
    }, [filterSummary, lastRefreshedAt]);

    const exportRows = useMemo<ProfitLossExportRow[]>(() => {
        if (!hasApplied) return [];
        const buildRows = (section: string, side: ProfitLossSide, rows: ProfitLossSideRow[]) =>
            rows.map((row) => ({
                section,
                side,
                particulars: row.label,
                amount: Number(row.amount ?? 0),
                rowType: row.rowType
            }));

        return [
            ...buildRows('Trading', 'Dr', tradingSection.left),
            ...buildRows('Trading', 'Cr', tradingSection.right),
            ...buildRows('Profit & Loss', 'Dr', profitLossSection.left),
            ...buildRows('Profit & Loss', 'Cr', profitLossSection.right)
        ];
    }, [hasApplied, profitLossSection.left, profitLossSection.right, tradingSection.left, tradingSection.right]);

    const exportColumns = useMemo<ReportExportColumn<ProfitLossExportRow>[]>(
        () => [
            { header: 'Section', value: (row) => row.section },
            { header: 'Side', value: (row) => row.side },
            { header: 'Particulars', value: (row) => row.particulars },
            { header: 'Amount', value: (row) => Number(row.amount ?? 0).toFixed(2) },
            { header: 'Row Type', value: (row) => row.rowType }
        ],
        []
    );

    const exportFileName = useMemo(() => {
        const from = fromDate ? toDateText(fromDate) : 'all';
        const to = toDate ? toDateText(toDate) : 'all';
        return `profit-loss_${from}_${to}`;
    }, [fromDate, toDate]);

    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows: exportRows,
            title: 'Profit & Loss',
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [companyInfo.address, companyInfo.name, exportColumns, exportFileName, exportRows, filterSummary, printFooterLeft]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        window.print();
    };

    const handleExportCsv = () => exportReportCsv(exportContext);
    const handleExportExcel = () => {
        void exportReportExcel(exportContext);
    };
    const handleExportPdf = () => exportReportPdf(exportContext);

    const canRefresh = Boolean(fromDate && toDate);

    const formatLabelText = (text: string, rowType?: ProfitLossSideRow['rowType']) => {
        const className = classNames({
            'profit-loss-detail-text': rowType === 'ledger',
            'profit-loss-strong': rowType === 'total' || rowType === 'gross' || rowType === 'net',
            'profit-loss-group-text': rowType === 'group',
            'profit-loss-carry-text': rowType === 'carry'
        });
        return <span className={className}>{text}</span>;
    };

    const formatAmountText = (text: string, rowType?: ProfitLossSideRow['rowType']) => {
        const className = classNames({
            'profit-loss-strong':
                rowType === 'total' || rowType === 'gross' || rowType === 'net' || rowType === 'carry' || rowType === 'group'
        });
        return <span className={className}>{text}</span>;
    };

    const renderGroupCell = (cell: ProfitLossSideRow) => {
        const groupId = cell.groupId != null ? Number(cell.groupId) : 0;
        const section = cell.section ?? null;
        const groupKey = groupId > 0 && section ? `${section}-${groupId}` : '';
        const isExpandable = Boolean(cell.isExpandable && groupKey);
        const isExpanded = isExpandable && groupKey && expandedGroups.has(groupKey);
        return (
            <div className="flex align-items-center profit-loss-group-cell">
                {isExpandable && (
                    <Button
                        type="button"
                        icon={isExpanded ? 'pi pi-minus' : 'pi pi-plus'}
                        className="p-button-text p-button-sm p-0 profit-loss-group-toggle"
                        aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleGroupExpansion(groupKey);
                        }}
                    />
                )}
                {formatLabelText(cell.label, cell.rowType)}
            </div>
        );
    };

    const renderParticular = (cell: ProfitLossSideRow | null, isSkeleton?: boolean) => {
        if (isSkeleton) return skeletonCell('12rem');
        if (!cell) return '';
        if (cell.rowType === 'group') {
            return renderGroupCell(cell);
        }
        return formatLabelText(cell.label, cell.rowType);
    };

    const renderAmount = (cell: ProfitLossSideRow | null, isSkeleton?: boolean) => {
        if (isSkeleton) return skeletonCell('6rem');
        if (!cell) return '';
        return formatAmountText(formatAmount(Number(cell.amount ?? 0)), cell.rowType);
    };

    const buildHeaderGroup = useCallback(
        (
            sectionTitle: string,
            leftParticularFilterElement: (options: ColumnFilterElementTemplateOptions) => React.ReactNode,
            leftAmountFilterElement: (options: ColumnFilterElementTemplateOptions) => React.ReactNode,
            rightParticularFilterElement: (options: ColumnFilterElementTemplateOptions) => React.ReactNode,
            rightAmountFilterElement: (options: ColumnFilterElementTemplateOptions) => React.ReactNode
        ) => (
            <ColumnGroup>
                <Row>
                    <Column header={sectionTitle} colSpan={5} headerClassName="profit-loss-section-header" />
                </Row>
                <Row>
                    <Column header="Dr" colSpan={2} headerClassName="profit-loss-side-header" />
                    <Column header="" headerClassName="profit-loss-gap-header" style={{ width: '4%' }} />
                    <Column header="Cr" colSpan={2} headerClassName="profit-loss-side-header" />
                </Row>
                <Row>
                    <Column
                        field="leftParticular"
                        header="Particulars"
                        headerClassName="profit-loss-header-left"
                        style={{ width: '34%' }}
                        filterElement={leftParticularFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                    <Column
                        field="leftAmount"
                        header="Amount"
                        headerClassName="summary-number"
                        style={{ width: '12%' }}
                        dataType="numeric"
                        filterElement={leftAmountFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                    <Column header="" headerClassName="profit-loss-gap-header" style={{ width: '4%' }} />
                    <Column
                        field="rightParticular"
                        header="Particulars"
                        headerClassName="profit-loss-header-left"
                        style={{ width: '34%' }}
                        filterElement={rightParticularFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                    <Column
                        field="rightAmount"
                        header="Amount"
                        headerClassName="summary-number"
                        style={{ width: '12%' }}
                        dataType="numeric"
                        filterElement={rightAmountFilterElement}
                        {...MULTISELECT_COLUMN_PROPS}
                    />
                </Row>
            </ColumnGroup>
        ),
        []
    );

    const tradingHeaderGroup = useMemo(
        () =>
            buildHeaderGroup(
                'Trading Account',
                tradingLeftParticularFilterElement,
                tradingLeftAmountFilterElement,
                tradingRightParticularFilterElement,
                tradingRightAmountFilterElement
            ),
        [
            buildHeaderGroup,
            tradingLeftParticularFilterElement,
            tradingLeftAmountFilterElement,
            tradingRightParticularFilterElement,
            tradingRightAmountFilterElement
        ]
    );

    const profitLossHeaderGroup = useMemo(
        () =>
            buildHeaderGroup(
                'Profit & Loss Account',
                profitLossLeftParticularFilterElement,
                profitLossLeftAmountFilterElement,
                profitLossRightParticularFilterElement,
                profitLossRightAmountFilterElement
            ),
        [
            buildHeaderGroup,
            profitLossLeftParticularFilterElement,
            profitLossLeftAmountFilterElement,
            profitLossRightParticularFilterElement,
            profitLossRightAmountFilterElement
        ]
    );

    const headerFilters = (
        <div className="flex flex-column gap-2 w-full">
            <div className="flex align-items-center gap-2 flex-wrap">
                <AppDateInput
                    value={fromDate}
                    onChange={handleFromDateChange}
                    placeholder="From date"
                    fiscalYearStart={initialRangeRef.current?.start ?? null}
                    fiscalYearEnd={initialRangeRef.current?.end ?? null}
                    autoFocus
                    selectOnFocus
                    inputRef={fromDateInputRef}
                    onEnterNext={() => toDateInputRef.current?.focus()}
                    style={{ width: '150px' }}
                />
                <AppDateInput
                    value={toDate}
                    onChange={handleToDateChange}
                    placeholder="To date"
                    fiscalYearStart={initialRangeRef.current?.start ?? null}
                    fiscalYearEnd={initialRangeRef.current?.end ?? null}
                    inputRef={toDateInputRef}
                    onEnterNext={focusRefreshButton}
                    style={{ width: '150px' }}
                />
            </div>
            {(dateErrors.fromDate || dateErrors.toDate) && (
                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
            )}
        </div>
    );

    const headerActions = (
        <>
            <Tag value={netTag.value} severity={netTag.severity} />
            {canToggleExpand && (
                <div className="flex align-items-center gap-2">
                    <Button
                        type="button"
                        label="Expand all"
                        icon="pi pi-plus"
                        className="p-button-text p-button-sm"
                        onClick={expandAllGroups}
                        disabled={expandAllDisabled}
                    />
                    <Button
                        type="button"
                        label="Collapse all"
                        icon="pi pi-minus"
                        className="p-button-text p-button-sm"
                        onClick={collapseAllGroups}
                        disabled={collapseAllDisabled}
                    />
                </div>
            )}
            <AppReportActions
                onRefresh={handleRefresh}
                onPrint={handlePrintClick}
                onExportCsv={handleExportCsv}
                onExportExcel={handleExportExcel}
                onExportPdf={handleExportPdf}
                refreshDisabled={!canRefresh}
                printDisabled={!hasApplied || reportLoading || exportRows.length === 0}
                exportDisabled={!hasApplied || reportLoading || exportRows.length === 0}
                refreshButtonId={refreshButtonId}
            />
        </>
    );

    return (
        <div className="card app-gradient-card">
            <ReportPrintHeader
                className="mb-3"
                companyName={companyInfo.name}
                companyAddress={companyInfo.address}
                title="Trading & Profit Loss"
                subtitle={filterSummary ?? undefined}
            />
            <ReportPrintFooter left={printFooterLeft} />
            <div className="flex flex-column gap-2 mb-3 report-screen-header">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Trading &amp; Profit Loss</h2>
                        <p className="mt-2 mb-0 text-600">
                            Trading and P&amp;L account based on ledger postings for the selected period.
                        </p>
                    </div>
                </div>
                {error && (
                    <p className="text-red-500 m-0">
                        Error loading profit &amp; loss: {error.message}
                    </p>
                )}
            </div>

            <div className="flex flex-column gap-4">
                <div>
                    <ReportDataTable
                        value={tradingTableRows}
                        dataKey="rowKey"
                        stripedRows
                        size="small"
                        loadingState={reportLoading}
                        loadingSummaryEnabled={hasApplied}
                        filters={tradingColumnFilters}
                        onFilter={handleTradingColumnFilter}
                        filterDisplay="menu"
                        filterDelay={400}
                        lazy
                        headerLeft={headerFilters}
                        headerRight={headerActions}
                        headerColumnGroup={tradingHeaderGroup}
                        emptyMessage={
                            reportLoading
                                ? ''
                                : hasApplied
                                  ? 'No trading entries found'
                                  : 'Press Refresh to load trading account'
                        }
                        className="summary-table profit-loss-table"
                    >
                        <Column
                            header="Particulars"
                            body={(row: ProfitLossTableRow) => renderParticular(row.left, row.isSkeleton)}
                        />
                        <Column
                            header="Amount"
                            bodyClassName="summary-number"
                            body={(row: ProfitLossTableRow) => renderAmount(row.left, row.isSkeleton)}
                        />
                        <Column
                            header=""
                            bodyClassName="profit-loss-gap-cell"
                            className="profit-loss-gap-cell"
                            body={() => ''}
                        />
                        <Column
                            header="Particulars"
                            body={(row: ProfitLossTableRow) => renderParticular(row.right, row.isSkeleton)}
                        />
                        <Column
                            header="Amount"
                            bodyClassName="summary-number"
                            body={(row: ProfitLossTableRow) => renderAmount(row.right, row.isSkeleton)}
                        />
                    </ReportDataTable>
                </div>

                <div>
                    <ReportDataTable
                        value={profitLossTableRows}
                        dataKey="rowKey"
                        stripedRows
                        size="small"
                        loadingState={reportLoading}
                        loadingSummaryEnabled={hasApplied}
                        filters={profitLossColumnFilters}
                        onFilter={handleProfitLossColumnFilter}
                        filterDisplay="menu"
                        filterDelay={400}
                        lazy
                        headerColumnGroup={profitLossHeaderGroup}
                        emptyMessage={
                            reportLoading
                                ? ''
                                : hasApplied
                                  ? 'No profit & loss entries found'
                                  : 'Press Refresh to load profit & loss account'
                        }
                        className="summary-table profit-loss-table"
                    >
                        <Column
                            header="Particulars"
                            body={(row: ProfitLossTableRow) => renderParticular(row.left, row.isSkeleton)}
                        />
                        <Column
                            header="Amount"
                            bodyClassName="summary-number"
                            body={(row: ProfitLossTableRow) => renderAmount(row.left, row.isSkeleton)}
                        />
                        <Column
                            header=""
                            bodyClassName="profit-loss-gap-cell"
                            className="profit-loss-gap-cell"
                            body={() => ''}
                        />
                        <Column
                            header="Particulars"
                            body={(row: ProfitLossTableRow) => renderParticular(row.right, row.isSkeleton)}
                        />
                        <Column
                            header="Amount"
                            bodyClassName="summary-number"
                            body={(row: ProfitLossTableRow) => renderAmount(row.right, row.isSkeleton)}
                        />
                    </ReportDataTable>
                </div>
            </div>
        </div>
    );
}
