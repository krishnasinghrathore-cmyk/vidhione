'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery } from '@apollo/client';
import { Column } from 'primereact/column';
import { ColumnGroup } from 'primereact/columngroup';
import { Row } from 'primereact/row';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';

type BalanceSheetViewMode = 'summarized' | 'detailed';

type BalanceSheetFilters = {
    viewMode: BalanceSheetViewMode;
    fromDate: Date | null;
    toDate: Date | null;
    openingOnly: boolean;
};

type BalanceSheetDetailedRow = {
    id: number;
    ledgerId: number;
    ledgerGroupId?: number | null;
    ledgerName: string;
    groupName: string;
    annexureName?: string | null;
    side: 'Assets' | 'Liabilities';
    amount: number;
};

type BalanceSheetDisplayRow = {
    rowKey: string;
    ledgerId?: number | null;
    ledgerGroupId?: number | null;
    groupName: string;
    ledgerName?: string | null;
    annexureName?: string | null;
    side: 'Assets' | 'Liabilities';
    amount: number;
    isSkeleton?: boolean;
};

type BalanceSheetSideRow = {
    rowType: 'group' | 'detail' | 'total';
    groupId?: number | null;
    groupName: string;
    ledgerName?: string | null;
    annexureName?: string | null;
    amount: number;
    isExpandable?: boolean;
    detailGroupName?: string | null;
    isSplitGroup?: boolean;
};

type BalanceSheetTableRow = {
    rowKey: string;
    left: BalanceSheetSideRow | null;
    right: BalanceSheetSideRow | null;
    isSkeleton?: boolean;
};

const BALANCE_SHEET_DETAILED = gql`
    query BalanceSheetDetailed(
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $ledgerGroupId: Int
        $ledgerId: Int
        $openingOnly: Boolean
    ) {
        balanceSheetDetailed(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            ledgerGroupId: $ledgerGroupId
            ledgerId: $ledgerId
            openingOnly: $openingOnly
        ) {
            id
            ledgerId
            ledgerGroupId
            ledgerName
            groupName
            annexureName
            side
            amount
        }
    }
`;

const formatAmount = (value: number) =>
    new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

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

const BALANCE_DIFFERENCE_LABEL = 'Balance Difference';
const NET_PROFIT_LABEL = 'Net Profit As Per P/L';
const NET_LOSS_LABEL = 'Net Loss As Per P/L';

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

type BalanceSheetReportProps = {
    initialView?: BalanceSheetViewMode;
};

export default function BalanceSheetReport({ initialView = 'detailed' }: BalanceSheetReportProps) {
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const { setPageTitle } = useContext(LayoutContext);
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [viewMode] = useState<BalanceSheetViewMode>(initialView);
    const [openingOnly, setOpeningOnly] = useState(false);
    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [appliedFilters, setAppliedFilters] = useState<BalanceSheetFilters | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const openingInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'balance-sheet-refresh';

    useEffect(() => {
        const title = viewMode === 'summarized' ? 'Balance Sheet (Summarized)' : 'Balance Sheet (Detailed)';
        setPageTitle(title);
        return () => setPageTitle(null);
    }, [setPageTitle, viewMode]);

    const [loadDetailed, { data: detailedData, loading: detailedLoading, error: detailedError }] = useLazyQuery(
        BALANCE_SHEET_DETAILED,
        { fetchPolicy: 'network-only' }
    );

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
    };

    const focusInputAndSelect = (ref: React.RefObject<HTMLInputElement>) => {
        const input = ref.current;
        if (!input) return;
        input.focus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                if (document.activeElement !== input) return;
                if (typeof input.select === 'function') input.select();
            }, 160);
        } else if (typeof input.select === 'function') {
            input.select();
        }
    };

    const focusOpeningInput = () => focusInputAndSelect(openingInputRef);

    const handleFromDateChange = (nextValue: Date | null) => {
        clearAppliedFilters();
        setFromDate(nextValue);
        setDateErrors({});
        if (openingOnly && nextValue) {
            setToDate(nextValue);
        }
    };

    const handleToDateChange = (nextValue: Date | null) => {
        clearAppliedFilters();
        if (openingOnly) return;
        setToDate(nextValue);
        setDateErrors({});
    };

    const handleRefresh = () => {
        if (!fromDate || !toDate) return;
        const effectiveTo = openingOnly ? fromDate : toDate;
        const validation = validateDateRange({ fromDate, toDate: effectiveTo }, initialRangeRef.current);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const nextFilters: BalanceSheetFilters = {
            viewMode,
            fromDate,
            toDate: effectiveTo,
            openingOnly
        };
        setAppliedFilters(nextFilters);
        setLastRefreshedAt(new Date());
        const variables = {
            fromDate: toDateText(fromDate),
            toDate: toDateText(effectiveTo),
            cancelled: 0,
            ledgerGroupId: null,
            ledgerId: null,
            openingOnly
        };
        void loadDetailed({ variables });
    };

    const hasApplied = appliedFilters != null;
    const reportLoading = detailedLoading;
    const reportLoadingApplied = hasApplied && reportLoading;

    const rawRows = useMemo(() => {
        if (!hasApplied) return [];
        return (detailedData?.balanceSheetDetailed ?? []) as BalanceSheetDetailedRow[];
    }, [hasApplied, detailedData]);

    const filteredRows = useMemo(() => {
        if (!hasApplied) return [] as BalanceSheetDisplayRow[];
        return rawRows
            .map((row, idx) => ({
                rowKey: `detail-${row.ledgerId}-${idx}`,
                ledgerId: row.ledgerId,
                ledgerGroupId: row.ledgerGroupId ?? null,
                groupName: row.groupName ?? '',
                ledgerName: row.ledgerName ?? '',
                annexureName: row.annexureName ?? null,
                side: row.side,
                amount: Number(row.amount ?? 0)
            }));
    }, [hasApplied, rawRows]);

    const balanceDifferenceRow = useMemo(
        () => filteredRows.find((row) => row.groupName === BALANCE_DIFFERENCE_LABEL) ?? null,
        [filteredRows]
    );
    const netProfitRow = useMemo(
        () => filteredRows.find((row) => row.groupName === NET_PROFIT_LABEL) ?? null,
        [filteredRows]
    );
    const netLossRow = useMemo(
        () => filteredRows.find((row) => row.groupName === NET_LOSS_LABEL) ?? null,
        [filteredRows]
    );

    const displayRows = useMemo(
        () =>
            filteredRows.filter(
                (row) =>
                    row.groupName !== BALANCE_DIFFERENCE_LABEL &&
                    row.groupName !== NET_PROFIT_LABEL &&
                    row.groupName !== NET_LOSS_LABEL
            ),
        [filteredRows]
    );

    const groupIds = useMemo(() => {
        if (!hasApplied) return [] as number[];
        const ids = new Set<number>();
        displayRows.forEach((row) => {
            const groupId = Number(row.ledgerGroupId ?? 0);
            const hasDetails = Boolean(row.ledgerName && row.ledgerName.trim().length > 0);
            if (groupId > 0 && hasDetails) ids.add(groupId);
        });
        return Array.from(ids);
    }, [displayRows, hasApplied]);

    useEffect(() => {
        if (!hasApplied) {
            setExpandedGroups(new Set());
            return;
        }
        setExpandedGroups(new Set());
    }, [groupIds, hasApplied]);

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `skeleton-${idx}`,
                left: null,
                right: null,
                isSkeleton: true
            })),
        []
    );

    const collapsedGroupRows = useMemo(() => {
        const grouped = new Map<
            number,
            {
                id: number;
                name: string;
                annexureName: string | null;
                assetRows: BalanceSheetDisplayRow[];
                liabilityRows: BalanceSheetDisplayRow[];
                assetTotal: number;
                liabilityTotal: number;
                netSigned: number;
            }
        >();
        const specialRows: BalanceSheetDisplayRow[] = [];
        const liabilities: BalanceSheetSideRow[] = [];
        const assets: BalanceSheetSideRow[] = [];

        displayRows.forEach((row) => {
            const groupId = Number(row.ledgerGroupId ?? 0);
            const ledgerName = row.ledgerName ?? '';
            if (!ledgerName.trim() || !groupId) {
                specialRows.push(row);
                return;
            }

            const entry = grouped.get(groupId) ?? {
                id: groupId,
                name: row.groupName ?? '',
                annexureName: row.annexureName ?? null,
                assetRows: [],
                liabilityRows: [],
                assetTotal: 0,
                liabilityTotal: 0,
                netSigned: 0
            };
            const amount = Number(row.amount ?? 0);
            if (row.side === 'Assets') {
                entry.assetRows.push(row);
                entry.assetTotal += amount;
                entry.netSigned += amount;
            } else {
                entry.liabilityRows.push(row);
                entry.liabilityTotal += amount;
                entry.netSigned -= amount;
            }
            if (!entry.annexureName && row.annexureName) {
                entry.annexureName = row.annexureName;
            }
            grouped.set(groupId, entry);
        });

        grouped.forEach((group) => {
            const netSide = group.netSigned < 0 ? 'Liabilities' : 'Assets';
            const netTarget = netSide === 'Liabilities' ? liabilities : assets;
            const netRows = netSide === 'Liabilities' ? group.liabilityRows : group.assetRows;
            const splitRows = netSide === 'Liabilities' ? group.assetRows : group.liabilityRows;
            const splitTotal = netSide === 'Liabilities' ? group.assetTotal : group.liabilityTotal;
            const splitTarget = netSide === 'Liabilities' ? assets : liabilities;
            const isExpanded = expandedGroups.has(group.id);
            const netTotal = netSide === 'Liabilities' ? group.liabilityTotal : group.assetTotal;
            const netAmount = isExpanded ? netTotal : Math.abs(group.netSigned);

            netTarget.push({
                rowType: 'group',
                groupId: group.id,
                groupName: group.name,
                ledgerName: null,
                annexureName: group.annexureName ?? null,
                amount: netAmount,
                isExpandable: group.assetRows.length + group.liabilityRows.length > 0
            });
            if (isExpanded) {
                netRows.forEach((row) => {
                    netTarget.push({
                        rowType: 'detail',
                        groupId: group.id,
                        groupName: row.groupName,
                        ledgerName: row.ledgerName ?? '',
                        annexureName: group.annexureName ?? null,
                        amount: Math.abs(Number(row.amount ?? 0))
                    });
                });
                if (splitRows.length > 0) {
                    splitTarget.push({
                        rowType: 'group',
                        groupId: group.id,
                        groupName: group.name,
                        ledgerName: null,
                        annexureName: group.annexureName ?? null,
                        amount: splitTotal,
                        isExpandable: true,
                        isSplitGroup: true
                    });
                    splitRows.forEach((row) => {
                        splitTarget.push({
                            rowType: 'detail',
                            groupId: group.id,
                            groupName: row.groupName,
                            ledgerName: row.ledgerName ?? '',
                            annexureName: group.annexureName ?? null,
                            amount: Math.abs(Number(row.amount ?? 0))
                        });
                    });
                }
            }
        });

        specialRows.forEach((row) => {
            const target = row.side === 'Liabilities' ? liabilities : assets;
            target.push({
                rowType: 'group',
                groupId: row.ledgerGroupId ?? null,
                groupName: row.groupName,
                ledgerName: null,
                annexureName: row.annexureName ?? null,
                amount: Number(row.amount ?? 0),
                isExpandable: false
            });
        });

        return { liabilities, assets };
    }, [displayRows, expandedGroups]);

    const liabilitiesRows = useMemo(() => collapsedGroupRows.liabilities, [collapsedGroupRows.liabilities]);
    const assetsRows = useMemo(() => collapsedGroupRows.assets, [collapsedGroupRows.assets]);

    const allGroupsExpanded = groupIds.length > 0 && expandedGroups.size === groupIds.length;
    const hasExpandedGroups = expandedGroups.size > 0;
    const showLedgerColumn = viewMode === 'detailed' || hasExpandedGroups;
    const canToggleExpand = hasApplied && groupIds.length > 0;
    const expandAllDisabled = !canToggleExpand || allGroupsExpanded;
    const collapseAllDisabled = !canToggleExpand || expandedGroups.size === 0;

    const toggleGroupExpansion = useCallback((groupId: number) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    }, []);

    const expandAllGroups = useCallback(() => {
        setExpandedGroups(new Set(groupIds));
    }, [groupIds]);

    const collapseAllGroups = useCallback(() => {
        setExpandedGroups(new Set());
    }, []);

    const collapsedTotals = useMemo(
        () => ({
            liabilities: collapsedGroupRows.liabilities.reduce(
                (sum, row) => (row.rowType === 'detail' ? sum : sum + Number(row.amount ?? 0)),
                0
            ),
            assets: collapsedGroupRows.assets.reduce(
                (sum, row) => (row.rowType === 'detail' ? sum : sum + Number(row.amount ?? 0)),
                0
            )
        }),
        [collapsedGroupRows.assets, collapsedGroupRows.liabilities]
    );

    const balanceDifferenceAmount = Number(balanceDifferenceRow?.amount ?? 0);
    const netProfitAmount = Number(netProfitRow?.amount ?? 0);
    const netLossAmount = Number(netLossRow?.amount ?? 0);
    const totalLiabilities = useMemo(() => {
        const base = collapsedTotals.liabilities;
        const netProfit = netProfitRow?.side === 'Liabilities' ? netProfitAmount : 0;
        const netLoss = netLossRow?.side === 'Liabilities' ? netLossAmount : 0;
        if (balanceDifferenceRow?.side === 'Liabilities') {
            return base + balanceDifferenceAmount + netProfit + netLoss;
        }
        return base + netProfit + netLoss;
    }, [
        balanceDifferenceAmount,
        balanceDifferenceRow?.side,
        collapsedTotals.liabilities,
        netLossAmount,
        netLossRow?.side,
        netProfitAmount,
        netProfitRow?.side
    ]);
    const totalAssets = useMemo(() => {
        const base = collapsedTotals.assets;
        const netProfit = netProfitRow?.side === 'Assets' ? netProfitAmount : 0;
        const netLoss = netLossRow?.side === 'Assets' ? netLossAmount : 0;
        if (balanceDifferenceRow?.side === 'Assets') {
            return base + balanceDifferenceAmount + netProfit + netLoss;
        }
        return base + netProfit + netLoss;
    }, [
        balanceDifferenceAmount,
        balanceDifferenceRow?.side,
        collapsedTotals.assets,
        netLossAmount,
        netLossRow?.side,
        netProfitAmount,
        netProfitRow?.side
    ]);

    const zippedRows = useMemo(() => {
        if (!hasApplied) return [] as BalanceSheetTableRow[];
        const maxRows = Math.max(liabilitiesRows.length, assetsRows.length);
        const rows: BalanceSheetTableRow[] = Array.from({ length: maxRows }, (_, idx) => ({
            rowKey: `row-${idx}`,
            left: liabilitiesRows[idx] ?? null,
            right: assetsRows[idx] ?? null
        }));
        if (!reportLoadingApplied && (netProfitRow || netLossRow)) {
            const specialRows = [netProfitRow, netLossRow].filter(Boolean) as BalanceSheetDisplayRow[];
            specialRows.forEach((row) => {
                const specialCell: BalanceSheetSideRow = {
                    rowType: 'group',
                    groupName: row.groupName,
                    ledgerName: null,
                    annexureName: row.annexureName ?? null,
                    amount: Number(row.amount ?? 0),
                    isExpandable: false
                };
                rows.push({
                    rowKey: row.groupName === NET_LOSS_LABEL ? 'net-loss' : 'net-profit',
                    left: row.side === 'Liabilities' ? specialCell : null,
                    right: row.side === 'Assets' ? specialCell : null
                });
            });
        }
        if (!reportLoadingApplied && balanceDifferenceRow) {
            const diffCell: BalanceSheetSideRow = {
                rowType: 'group',
                groupName: balanceDifferenceRow.groupName,
                ledgerName: null,
                annexureName: balanceDifferenceRow.annexureName ?? null,
                amount: Number(balanceDifferenceRow.amount ?? 0),
                isExpandable: false
            };
            rows.push({
                rowKey: 'balance-difference',
                left: balanceDifferenceRow.side === 'Liabilities' ? diffCell : null,
                right: balanceDifferenceRow.side === 'Assets' ? diffCell : null
            });
        }
        if (!reportLoadingApplied) {
            rows.push({
                rowKey: 'totals',
                left: {
                    rowType: 'total',
                    groupName: 'Total Liabilities',
                    ledgerName: null,
                    annexureName: null,
                    amount: totalLiabilities
                },
                right: {
                    rowType: 'total',
                    groupName: 'Total Assets',
                    ledgerName: null,
                    annexureName: null,
                    amount: totalAssets
                }
            });
        }
        return rows;
    }, [
        assetsRows,
        balanceDifferenceRow,
        hasApplied,
        liabilitiesRows,
        netLossRow,
        netProfitRow,
        reportLoadingApplied,
        totalAssets,
        totalLiabilities
    ]);

    const rowsPerPage = 10;
    const { isPrinting, printRows, triggerPrint } = useReportPrint({ rows: zippedRows });
    const tableRows = isPrinting && printRows ? printRows : reportLoadingApplied ? skeletonRows : zippedRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const visibleRows = useMemo(() => {
        if (!hasApplied) return [] as BalanceSheetDisplayRow[];
        const mapSideRows = (sideRows: BalanceSheetSideRow[], side: BalanceSheetDisplayRow['side']) =>
            sideRows.map((row, idx) => ({
                rowKey: `${side}-${row.groupId ?? row.groupName}-${idx}`,
                ledgerGroupId: row.groupId ?? null,
                groupName: row.groupName,
                ledgerName: row.rowType === 'detail' ? row.ledgerName ?? '' : null,
                annexureName: row.rowType === 'total' ? null : row.annexureName ?? null,
                side,
                amount: Number(row.amount ?? 0)
            }));
        const rows = [...mapSideRows(liabilitiesRows, 'Liabilities'), ...mapSideRows(assetsRows, 'Assets')];
        if (netProfitRow) {
            rows.push({
                rowKey: 'net-profit',
                ledgerGroupId: null,
                groupName: netProfitRow.groupName ?? NET_PROFIT_LABEL,
                ledgerName: null,
                annexureName: netProfitRow.annexureName ?? null,
                side: netProfitRow.side,
                amount: Number(netProfitRow.amount ?? 0)
            });
        }
        if (netLossRow) {
            rows.push({
                rowKey: 'net-loss',
                ledgerGroupId: null,
                groupName: netLossRow.groupName ?? NET_LOSS_LABEL,
                ledgerName: null,
                annexureName: netLossRow.annexureName ?? null,
                side: netLossRow.side,
                amount: Number(netLossRow.amount ?? 0)
            });
        }
        if (balanceDifferenceRow) {
            rows.push({
                rowKey: 'balance-difference',
                ledgerGroupId: null,
                groupName: balanceDifferenceRow.groupName ?? BALANCE_DIFFERENCE_LABEL,
                ledgerName: null,
                annexureName: balanceDifferenceRow.annexureName ?? null,
                side: balanceDifferenceRow.side,
                amount: Number(balanceDifferenceRow.amount ?? 0)
            });
        }
        return rows;
    }, [assetsRows, balanceDifferenceRow, hasApplied, liabilitiesRows, netLossRow, netProfitRow]);

    const totals = useMemo(() => {
        if (!hasApplied) return { assets: 0, liabilities: 0 };
        return { assets: totalAssets, liabilities: totalLiabilities };
    }, [hasApplied, totalAssets, totalLiabilities]);

    const diff = totals.assets - totals.liabilities;
    const balanceTag =
        diff === 0
            ? { value: 'Balanced', severity: 'success' as const }
            : { value: `Diff ${formatAmount(Math.abs(diff))}`, severity: 'warning' as const };

    const expandState = useMemo(() => {
        if (!hasApplied) return viewMode === 'summarized' ? 'summarized' : 'detailed';
        if (groupIds.length === 0) return viewMode === 'summarized' ? 'summarized' : 'detailed';
        if (expandedGroups.size === 0) return 'summarized';
        if (expandedGroups.size === groupIds.length) return 'detailed';
        return 'custom';
    }, [expandedGroups.size, groupIds.length, hasApplied, viewMode]);

    const expandStateLabel = useMemo(() => {
        if (expandState === 'summarized') return 'Summarized';
        if (expandState === 'detailed') return 'Detailed';
        return 'Custom';
    }, [expandState]);

    const columnWidths = useMemo(
        () => ({
            group: showLedgerColumn ? '14%' : '28%',
            ledger: '18%',
            annexure: showLedgerColumn ? '8%' : '10%',
            amount: showLedgerColumn ? '8%' : '10%',
            gap: '4%'
        }),
        [showLedgerColumn]
    );

    const reportTitle = `Balance Sheet (${expandStateLabel})`;
    const filterSummary = useMemo(() => {
        if (!hasApplied) return null;
        const applied = appliedFilters;
        if (!applied) return null;
        const parts = [`Range: ${formatDateRangeLabel(applied.fromDate, applied.toDate)}`];
        parts.push(`View: ${expandStateLabel}`);
        if (applied.openingOnly) {
            parts.push('Opening balance only');
        }
        return parts.filter(Boolean).join(' | ');
    }, [appliedFilters, expandStateLabel, hasApplied]);

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

    const exportColumns = useMemo<ReportExportColumn<BalanceSheetDisplayRow>[]>(() => {
        const base = [
            { header: 'Group', value: (row: BalanceSheetDisplayRow) => row.groupName ?? '' },
            ...(showLedgerColumn
                ? [{ header: 'Ledger', value: (row: BalanceSheetDisplayRow) => row.ledgerName ?? '' }]
                : []),
            { header: 'Annexure', value: (row: BalanceSheetDisplayRow) => row.annexureName ?? '' },
            { header: 'Side', value: (row: BalanceSheetDisplayRow) => row.side ?? '' },
            { header: 'Amount', value: (row: BalanceSheetDisplayRow) => Number(row.amount ?? 0).toFixed(2) }
        ];
        return base;
    }, [showLedgerColumn]);

    const exportFileName = useMemo(() => {
        const from = fromDate ? toDateText(fromDate) : 'all';
        const to = toDate ? toDateText(toDate) : 'all';
        return `balance-sheet_${expandStateLabel.toLowerCase()}_${from}_${to}`;
    }, [expandStateLabel, fromDate, toDate]);

    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows: visibleRows,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [
            exportColumns,
            exportFileName,
            visibleRows,
            reportTitle,
            filterSummary,
            companyInfo.name,
            companyInfo.address,
            printFooterLeft
        ]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const handleExportCsv = () => exportReportCsv(exportContext);
    const handleExportExcel = () => {
        void exportReportExcel(exportContext);
    };
    const handleExportPdf = () => exportReportPdf(exportContext);

    const canRefresh = Boolean(fromDate && toDate);

    const formatCellText = (text: string, rowType?: BalanceSheetSideRow['rowType']) => {
        if (rowType === 'group' || rowType === 'total') {
            return <span className="font-semibold">{text}</span>;
        }
        return text;
    };

    const renderGroupCell = (cell: BalanceSheetSideRow | null, isSkeleton?: boolean) => {
        if (isSkeleton) return skeletonCell('10rem');
        if (!cell) return '';
        if (cell.rowType === 'detail') {
            if (cell.detailGroupName) {
                return (
                    <span className="balance-sheet-detail-group-label text-600 text-sm">
                        {cell.detailGroupName}
                    </span>
                );
            }
            return <span className="balance-sheet-detail-spacer" aria-hidden="true" />;
        }
        const groupId = cell.groupId != null ? Number(cell.groupId) : 0;
        const isExpandable = Boolean(cell.isExpandable && groupId > 0);
        const isExpanded = isExpandable && expandedGroups.has(groupId);
        return (
            <div className="flex align-items-center balance-sheet-group-cell">
                {isExpandable && (
                    <Button
                        type="button"
                        icon={isExpanded ? 'pi pi-minus' : 'pi pi-plus'}
                        className="p-button-text p-button-sm p-0 balance-sheet-group-toggle"
                        aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleGroupExpansion(groupId);
                        }}
                    />
                )}
                {formatCellText(cell.groupName, cell.rowType)}
            </div>
        );
    };

    const leftGroupBody = (row: BalanceSheetTableRow) => renderGroupCell(row.left, row.isSkeleton);
    const leftLedgerBody = (row: BalanceSheetTableRow) => {
        if (row.isSkeleton) return skeletonCell('10rem');
        if (!row.left?.ledgerName) return '';
        if (row.left.rowType === 'detail') {
            return <span className="balance-sheet-detail-text">{row.left.ledgerName}</span>;
        }
        return row.left.ledgerName;
    };
    const leftAnnexureBody = (row: BalanceSheetTableRow) =>
        row.isSkeleton ? skeletonCell('6rem') : row.left?.annexureName ?? '';
    const leftAmountBody = (row: BalanceSheetTableRow) =>
        row.isSkeleton
            ? skeletonCell('6rem')
            : row.left
              ? formatCellText(formatAmount(Number(row.left.amount ?? 0)), row.left.rowType)
              : '';
    const gapBody = () => null;

    const rightGroupBody = (row: BalanceSheetTableRow) => renderGroupCell(row.right, row.isSkeleton);
    const rightLedgerBody = (row: BalanceSheetTableRow) => {
        if (row.isSkeleton) return skeletonCell('10rem');
        if (!row.right?.ledgerName) return '';
        if (row.right.rowType === 'detail') {
            return <span className="balance-sheet-detail-text">{row.right.ledgerName}</span>;
        }
        return row.right.ledgerName;
    };
    const rightAnnexureBody = (row: BalanceSheetTableRow) =>
        row.isSkeleton ? skeletonCell('6rem') : row.right?.annexureName ?? '';
    const rightAmountBody = (row: BalanceSheetTableRow) =>
        row.isSkeleton
            ? skeletonCell('6rem')
            : row.right
              ? formatCellText(formatAmount(Number(row.right.amount ?? 0)), row.right.rowType)
              : '';

    const headerGroup = useMemo(() => {
        const span = showLedgerColumn ? 4 : 3;
        return (
            <ColumnGroup>
                <Row>
                    <Column header="Liabilities" colSpan={span} headerClassName="balance-sheet-side-header" />
                    <Column header="" headerClassName="balance-sheet-gap-header" style={{ width: columnWidths.gap }} />
                    <Column header="Assets" colSpan={span} headerClassName="balance-sheet-side-header" />
                </Row>
                <Row>
                    <Column
                        header="Ledger Group"
                        headerClassName="balance-sheet-header-left balance-sheet-header-group"
                        style={{ width: columnWidths.group }}
                    />
                    {showLedgerColumn && (
                        <Column
                            header="Ledger"
                            headerClassName="balance-sheet-header-left balance-sheet-header-ledger"
                            style={{ width: columnWidths.ledger }}
                        />
                    )}
                    <Column
                        header="Annexure"
                        headerClassName="summary-center"
                        style={{ width: columnWidths.annexure }}
                    />
                    <Column
                        header="Amount"
                        headerClassName="summary-number"
                        style={{ width: columnWidths.amount }}
                    />
                    <Column
                        header=""
                        headerClassName="balance-sheet-gap-header"
                        style={{ width: columnWidths.gap }}
                    />
                    <Column
                        header="Ledger Group"
                        headerClassName="balance-sheet-header-left balance-sheet-header-group"
                        style={{ width: columnWidths.group }}
                    />
                    {showLedgerColumn && (
                        <Column
                            header="Ledger"
                            headerClassName="balance-sheet-header-left balance-sheet-header-ledger"
                            style={{ width: columnWidths.ledger }}
                        />
                    )}
                    <Column
                        header="Annexure"
                        headerClassName="summary-center"
                        style={{ width: columnWidths.annexure }}
                    />
                    <Column
                        header="Amount"
                        headerClassName="summary-number"
                        style={{ width: columnWidths.amount }}
                    />
                </Row>
            </ColumnGroup>
        );
    }, [
        columnWidths.annexure,
        columnWidths.amount,
        columnWidths.gap,
        columnWidths.group,
        columnWidths.ledger,
        showLedgerColumn
    ]);

    return (
        <div className="card app-gradient-card">
            <ReportPrintHeader
                className="mb-3"
                companyName={companyInfo.name}
                companyAddress={companyInfo.address}
                title={reportTitle}
                subtitle={filterSummary ?? undefined}
            />
            <ReportPrintFooter left={printFooterLeft} />
            <div className="flex flex-column gap-2 mb-3 report-screen-header">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Balance Sheet</h2>
                        <p className="mt-2 mb-0 text-600">
                            Balance sheet grouped by ledger group with optional ledger detail.
                        </p>
                    </div>
                </div>
                {detailedError && (
                    <p className="text-red-500 m-0">Error loading balance sheet: {detailedError.message}</p>
                )}
            </div>

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
                headerColumnGroup={headerGroup}
                emptyMessage={
                    reportLoadingApplied ? '' : hasApplied ? 'No results found' : 'Press Refresh to load balance sheet'
                }
                className="summary-table balance-sheet-table"
                headerLeft={
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
                                onEnterNext={focusOpeningInput}
                                readOnlyInput={openingOnly}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="balance-sheet-opening"
                                    inputRef={openingInputRef}
                                    checked={openingOnly}
                                    onChange={(event) => {
                                        clearAppliedFilters();
                                        const nextValue = Boolean(event.checked);
                                        setDateErrors({});
                                        setOpeningOnly(nextValue);
                                        if (nextValue && fromDate) {
                                            setToDate(fromDate);
                                        }
                                    }}
                                />
                                <label htmlFor="balance-sheet-opening">Opening balance</label>
                            </div>
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                    </div>
                }
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
                            printDisabled={!hasApplied || reportLoadingApplied || visibleRows.length === 0}
                            exportDisabled={!hasApplied || reportLoadingApplied || visibleRows.length === 0}
                            refreshButtonId={refreshButtonId}
                        />
                    </>
                }
                recordSummary={
                    hasApplied
                        ? reportLoadingApplied
                            ? 'Loading balance sheet...'
                            : `${visibleRows.length} line${visibleRows.length === 1 ? '' : 's'} | Assets ${formatAmount(
                                  totals.assets
                              )} | Liab ${formatAmount(totals.liabilities)}`
                        : 'Press Refresh to load balance sheet'
                }
            >
                <Column header="Ledger Group" body={leftGroupBody} style={{ width: columnWidths.group }} />
                {showLedgerColumn && (
                    <Column header="Ledger" body={leftLedgerBody} style={{ width: columnWidths.ledger }} />
                )}
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
                {showLedgerColumn && (
                    <Column header="Ledger" body={rightLedgerBody} style={{ width: columnWidths.ledger }} />
                )}
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
        </div>
    );
}
