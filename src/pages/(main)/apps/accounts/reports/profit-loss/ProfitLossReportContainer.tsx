'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Column, type ColumnFilterElementTemplateOptions } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Row } from 'primereact/row';
import { classNames } from 'primereact/utils';
import { AppRegisterSearch } from '@/components/AppRegisterSearch';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { buildSkeletonRows, skeletonCell } from '@/components/reportSkeleton';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { ProfitLossReportActions } from './components/ProfitLossReportActions';
import { ProfitLossReportFilters } from './components/ProfitLossReportFilters';
import { ProfitLossReportSummary } from './components/ProfitLossReportSummary';
import { ProfitLossSectionTable } from './components/ProfitLossSectionTable';

import type {
    ProfitLossExportRow,
    ProfitLossFilters,
    ProfitLossLine,
    ProfitLossReportPayload,
    ProfitLossSection,
    ProfitLossSide,
    ProfitLossSideRow,
    ProfitLossTableRow
} from './types';
import { PROFIT_LOSS_REPORT } from './graphql';
import {
    EMPTY_SIDE_FILTERS,
    MULTISELECT_COLUMN_PROPS,
    buildDefaultColumnFilters,
    buildMultiSelectFilterElement,
    buildNumberFilterOptions,
    buildTextFilterOptions,
    formatAmount,
    formatDateRangeLabel,
    matchesSideFilters,
    resolveFiscalRange,
    resolveSideFilters,
    sumBySide,
    toDateText
} from './utils';

export function ProfitLossReportContainer() {
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
    const [globalSearchValue, setGlobalSearchValue] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
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
        const validation = validateDateRange({ fromDate, toDate });
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
        <ProfitLossReportFilters
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={handleFromDateChange}
            onToDateChange={handleToDateChange}
            fiscalYearStart={initialRangeRef.current?.start ?? null}
            fiscalYearEnd={initialRangeRef.current?.end ?? null}
            fromDateInputRef={fromDateInputRef}
            toDateInputRef={toDateInputRef}
            onFromDateEnterNext={() => toDateInputRef.current?.focus()}
            onToDateEnterNext={focusRefreshButton}
            dateErrors={dateErrors}
        />
    );

    const headerActions = (
        <ProfitLossReportActions
            netTag={netTag}
            canToggleExpand={canToggleExpand}
            onExpandAll={expandAllGroups}
            onCollapseAll={collapseAllGroups}
            expandAllDisabled={expandAllDisabled}
            collapseAllDisabled={collapseAllDisabled}
            onRefresh={handleRefresh}
            onPrint={handlePrintClick}
            onExportCsv={handleExportCsv}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            refreshDisabled={!canRefresh}
            printDisabled={!hasApplied || reportLoading || exportRows.length === 0}
            exportDisabled={!hasApplied || reportLoading || exportRows.length === 0}
            refreshButtonId={refreshButtonId}
            loadingState={reportLoading}
        />
    );

    const errorMessage = error?.message ?? null;
    const headerSearch = (
        <AppRegisterSearch
            value={globalSearchValue}
            onValueChange={setGlobalSearchValue}
            matchCase={globalSearchMatchCase}
            onMatchCaseChange={setGlobalSearchMatchCase}
            wholeWord={globalSearchWholeWord}
            onWholeWordChange={setGlobalSearchWholeWord}
            placeholder="Search register..."
            helperText="Aa: Match Case · W: Whole Word"
            className="app-report-header-search app-register-search--compact"
            disabled={reportLoading && !hasApplied}
        />
    );
    const tradingEmptyMessage = reportLoading
        ? ''
        : hasApplied
          ? 'No trading entries found'
          : 'Press Refresh to load trading account';
    const profitLossEmptyMessage = reportLoading
        ? ''
        : hasApplied
          ? 'No profit & loss entries found'
          : 'Press Refresh to load profit & loss account';

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
            <ProfitLossReportSummary errorMessage={errorMessage} rightSlot={headerSearch} />

            <div className="flex flex-column gap-4">
                <div>
                    <ProfitLossSectionTable
                        rows={tradingTableRows}
                        hasApplied={hasApplied}
                        reportLoading={reportLoading}
                        columnFilters={tradingColumnFilters}
                        onFilter={handleTradingColumnFilter}
                        globalSearchValue={globalSearchValue}
                        onGlobalSearchValueChange={setGlobalSearchValue}
                        globalSearchMatchCase={globalSearchMatchCase}
                        onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                        globalSearchWholeWord={globalSearchWholeWord}
                        onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                        headerColumnGroup={tradingHeaderGroup}
                        emptyMessage={tradingEmptyMessage}
                        headerLeft={headerFilters}
                        headerRight={headerActions}
                        renderParticular={renderParticular}
                        renderAmount={renderAmount}
                    />
                </div>

                <div>
                    <ProfitLossSectionTable
                        rows={profitLossTableRows}
                        hasApplied={hasApplied}
                        reportLoading={reportLoading}
                        columnFilters={profitLossColumnFilters}
                        onFilter={handleProfitLossColumnFilter}
                        globalSearchValue={globalSearchValue}
                        onGlobalSearchValueChange={setGlobalSearchValue}
                        globalSearchMatchCase={globalSearchMatchCase}
                        onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                        globalSearchWholeWord={globalSearchWholeWord}
                        onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                        headerColumnGroup={profitLossHeaderGroup}
                        emptyMessage={profitLossEmptyMessage}
                        renderParticular={renderParticular}
                        renderAmount={renderAmount}
                    />
                </div>
            </div>
        </div>
    );
}
