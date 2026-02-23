'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type AutoComplete, AutoCompleteChangeEvent, AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { useNavigate } from 'react-router-dom';
import { useLazyQuery, useQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import { buildSkeletonRows } from '@/components/reportSkeleton';
import AppReportActions from '@/components/AppReportActions';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { resolveLedgerGroupFilter } from '@/lib/accounts/ledgerGroupFilter';
import { ACCOUNT_MASTER_LAZY_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { LEDGER_CURRENT_BALANCE, LEDGER_LOOKUP, LEDGER_MONTH_SUMMARY } from './graphql';
import { LedgerMonthWiseSummaryFilters } from './components/LedgerMonthWiseSummaryFilters';
import {
    buildDefaultColumnFilters,
    useLedgerMonthWiseSummaryColumns
} from './components/LedgerMonthWiseSummaryColumns';
import {
    formatAmount,
    formatDateRangeLabel,
    monthLabel,
    monthRangeFromKey,
    resolveFiscalRange,
    resolveOptionLabel,
    toDateText
} from './utils';
import type {
    LedgerLookupOption,
    LedgerLookupRow,
    MonthDisplayRow,
    MonthRow,
    SummaryFilters
} from './types';

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;

export function LedgerMonthWiseSummaryContainer() {
    const navigate = useNavigate();
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [ledgerGroupId, setLedgerGroupId] = useState<number | null>(null);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerLookupRow[]>([]);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerLookupOption[]>([]);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [selectedLedger, setSelectedLedger] = useState<LedgerLookupOption | null>(null);
    const [previewLedger, setPreviewLedger] = useState<LedgerLookupOption | null>(null);
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const initialRangeRef = useRef<ReturnType<typeof resolveFiscalRange> | null>(null);
    if (!initialRangeRef.current) {
        initialRangeRef.current = resolveFiscalRange(
            companyContext?.fiscalYearStart ?? null,
            companyContext?.fiscalYearEnd ?? null
        );
    }

    useEffect(() => {
        setPageTitle('Ledger Month-wise Summary');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current?.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current?.end ?? null);
    const [appliedFilters, setAppliedFilters] = useState<SummaryFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ groupId: number | null; search: string; mode: 'all' | 'search' } | null>(
        null
    );
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const ledgerGroupInputRef = useRef<AutoComplete>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const ledgerEnterRef = useRef(false);
    const hasTouchedDatesRef = useRef(false);
    const refreshButtonId = 'ledger-month-summary-refresh';

    const { options: ledgerGroupOptions, loading: groupsLoading } = useLedgerGroupOptions();
    const ledgerGroupFilter = useMemo(
        () => resolveLedgerGroupFilter(ledgerGroupId, ledgerGroupOptions),
        [ledgerGroupId, ledgerGroupOptions]
    );
    const [loadLedgerLookup, { error: ledgerError }] = useLazyQuery(LEDGER_LOOKUP, {
        ...ACCOUNT_MASTER_LAZY_QUERY_OPTIONS
    });

    const fetchLedgers = async (args?: { search?: string | null; groupId?: number | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const groupId = args?.groupId ?? ledgerGroupFilter.fetchGroupId;
        const resolvedGroupId = groupId != null && groupId > 0 ? groupId : null;
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!resolvedGroupId && !trimmed && mode !== 'all') {
            setLedgerLookupRows([]);
            setIsLedgerLoading(false);
            return;
        }
        if (
            mode === 'all' &&
            trimmed.length === 0 &&
            lastFetch &&
            lastFetch.mode === 'all' &&
            lastFetch.search === '' &&
            lastFetch.groupId === resolvedGroupId &&
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit =
            mode === 'all'
                ? resolvedGroupId
                    ? 2000
                    : ALL_LEDGER_LIMIT
                : resolvedGroupId
                  ? 2000
                  : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerLookup({
                variables: {
                    search: trimmed ? trimmed : null,
                    ledgerGroupId: resolvedGroupId,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerSummaries?.items ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerLookupRow[])] : []);
            ledgerLastFetchRef.current = { groupId: resolvedGroupId, search: trimmed, mode };
        } catch {
            if (ledgerRequestRef.current === requestId) {
                setLedgerLookupRows([]);
            }
        } finally {
            if (ledgerRequestRef.current === requestId) {
                setIsLedgerLoading(false);
            }
        }
    };

    const [loadSummary, { data: summaryData, loading: summaryLoading, error: summaryError }] = useLazyQuery(
        LEDGER_MONTH_SUMMARY,
        {
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first',
            notifyOnNetworkStatusChange: true
        }
    );

    const todayText = useMemo(() => toDateText(new Date()), []);
    const balanceToDateText = todayText;
    const { data: balanceData, loading: balanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: ledgerId == null,
        variables: {
            ledgerId: ledgerId ?? 0,
            toDate: balanceToDateText
        }
    });

    const ledgerRows = useMemo(() => ledgerLookupRows, [ledgerLookupRows]);

    const ledgerOptions = useMemo<LedgerLookupOption[]>(() => {
        const filterIds = ledgerGroupFilter.filterIds;
        const filtered =
            filterIds.length > 0
                ? ledgerRows.filter((l) => filterIds.includes(Number(l.ledgerGroupId)))
                : ledgerRows;
        return filtered
            .map((l) => ({
                ...l,
                label: `${l.name ?? ''}`.trim() || `Ledger ${l.ledgerId}`
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerRows, ledgerGroupFilter.filterIds]);

    const showLedgerSpinner = isLedgerLoading && ledgerPanelOpen;

    const focusInputAndSelect = (ref: React.RefObject<HTMLInputElement>) => {
        const input = ref.current;
        if (!input) return;
        input.focus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => {
                if (document.activeElement !== input) return;
                input.select();
            }, 160);
        } else if (typeof input.select === 'function') {
            input.select();
        }
    };

    const focusAutoComplete = (ref: React.RefObject<AutoComplete>) => {
        ref.current?.focus();
    };

    const focusRefreshButton = () => {
        const button = document.getElementById(refreshButtonId) as HTMLButtonElement | null;
        button?.focus();
    };

    const focusLedgerGroupInput = () => {
        focusAutoComplete(ledgerGroupInputRef);
    };

    const focusLedgerInput = () => {
        focusInputAndSelect(ledgerInputRef);
    };

    const clearLedgerGroupSelection = () => {
        setLedgerGroupId(null);
        setLedgerId(null);
        setSelectedLedger(null);
        setPreviewLedger(null);
        setLedgerQuery('');
        setLedgerLookupRows([]);
        setLedgerPanelOpen(false);
    };

    const handleLedgerGroupChange = (value: number | null) => {
        if (value == null) {
            clearLedgerGroupSelection();
            return;
        }
        setLedgerGroupId(value);
        setLedgerId(null);
        setSelectedLedger(null);
        setPreviewLedger(null);
        setLedgerQuery('');
        setLedgerLookupRows([]);
        setLedgerPanelOpen(false);
        const nextFilter = resolveLedgerGroupFilter(value, ledgerGroupOptions);
        void fetchLedgers({ groupId: nextFilter.fetchGroupId, mode: 'all' });
    };

    const syncLedgerPreviewFromHighlight = () => {
        if (typeof document === 'undefined') return;
        const input = ledgerInputRef.current;
        if (!input) return;
        const fallback = selectedLedger ?? null;
        const listId = input.getAttribute('aria-controls');
        if (!listId) {
            setPreviewLedger(fallback);
            return;
        }
        const list = document.getElementById(listId);
        if (!list) {
            setPreviewLedger(fallback);
            return;
        }
        const highlighted = list.querySelector('li[data-p-highlight="true"] [data-ledger-id]') as HTMLElement | null;
        if (!highlighted) {
            setPreviewLedger(fallback);
            return;
        }
        const ledgerId = highlighted.getAttribute('data-ledger-id');
        if (!ledgerId) {
            setPreviewLedger(fallback);
            return;
        }
        const match = ledgerSuggestions.find((item) => Number(item.ledgerId) === Number(ledgerId)) ?? null;
        setPreviewLedger(match ?? fallback);
    };

    useEffect(() => {
        setLedgerSuggestions(ledgerOptions);
    }, [ledgerOptions]);

    useEffect(() => {
        if (!ledgerPanelOpen) return;
        if (!ledgerSuggestions.length) {
            setPreviewLedger(selectedLedger ?? null);
            return;
        }
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
    }, [ledgerSuggestions, ledgerPanelOpen]);

    useEffect(() => {
        if (ledgerId == null) {
            setSelectedLedger(null);
            return;
        }
        if (selectedLedger && Number(selectedLedger.ledgerId) === Number(ledgerId)) return;
        const match = ledgerOptions.find((l) => Number(l.ledgerId) === Number(ledgerId)) ?? null;
        if (match) setSelectedLedger(match);
    }, [ledgerId, ledgerOptions, selectedLedger]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const initialRange = useMemo(() => {
        const start = fiscalRange?.start ?? null;
        const end = fiscalRange?.end ?? null;
        if (!start && !end) return null;
        const today = new Date();
        let toDate = end;
        if (start && end && today >= start && today <= end) {
            toDate = today;
        } else if (!end) {
            toDate = today;
        }
        return [start ?? null, toDate ?? null] as [Date | null, Date | null];
    }, [fiscalRange]);
    const fiscalYearStartDate = fiscalRange?.start ?? null;
    const fiscalYearEndDate = fiscalRange?.end ?? null;

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        if (!initialRange) return;
        setFromDate(initialRange[0] ?? null);
        setToDate(initialRange[1] ?? null);
    }, [initialRange]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const timer = window.setTimeout(() => {
            const input = fromDateInputRef.current;
            if (!input) return;
            const active = document.activeElement;
            if (active && active !== document.body && active !== document.documentElement) return;
            try {
                input.focus({ preventScroll: true });
            } catch {
                input.focus();
            }
        }, 50);
        return () => window.clearTimeout(timer);
    }, []);

    const handleFromDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(nextValue);
        setDateErrors((prev) => ({ ...prev, fromDate: undefined }));
    };

    const handleToDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(nextValue);
        setDateErrors((prev) => ({ ...prev, toDate: undefined }));
    };

    const canQuery = Boolean(fromDate && toDate);
    const hasApplied = appliedFilters != null;
    const appliedLedgerId = appliedFilters?.ledgerId ?? null;

    const currentBalanceLabel = useMemo(() => {
        if (!ledgerId) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [ledgerId, balanceLoading, balanceData]);

    const currentBalanceSeverity = useMemo(() => {
        if (balanceLoading) return 'warning';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [balanceData, balanceLoading]);

    const displayLedger = previewLedger ?? selectedLedger;
    const showBalanceBadges = Boolean(
        currentBalanceLabel &&
            selectedLedger &&
            displayLedger &&
            Number(displayLedger.ledgerId) === Number(selectedLedger.ledgerId)
    );
    const summaryLoadingApplied = hasApplied && summaryLoading;
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `skeleton-${idx}`,
                isSkeleton: true,
                monthKey: '',
                label: '',
                debit: 0,
                credit: 0,
                balance: 0,
                drCr: '',
                isOpening: false,
                closing: 0,
                closingAbs: 0
            })),
        []
    );

    const rawRows: MonthRow[] = useMemo(
        () => (hasApplied ? summaryData?.ledgerMonthWiseSummary ?? [] : []),
        [summaryData, hasApplied]
    );

    const openingSigned = useMemo(() => {
        if (!hasApplied) return 0;
        const openingRow = rawRows.find((row) => row.isOpening);
        if (!openingRow) return 0;
        const amount = Number(openingRow.balance ?? 0);
        if (Number.isNaN(amount)) return 0;
        return openingRow.drCr === 'Cr' ? -Math.abs(amount) : Math.abs(amount);
    }, [hasApplied, rawRows]);

    const displayRows = useMemo<MonthDisplayRow[]>(() => {
        if (!hasApplied) return [];
        return rawRows.map((row, idx) => {
            const balance = Number(row.balance ?? 0);
            const signedBalance = row.drCr === 'Cr' ? -Math.abs(balance) : Math.abs(balance);
            return {
                rowKey: row.isOpening ? 'opening' : `month-${row.monthKey || idx}`,
                closing: signedBalance,
                closingAbs: Math.abs(signedBalance),
                ...row,
                label: row.label || monthLabel(row.monthKey)
            };
        });
    }, [hasApplied, rawRows]);
    const showSkeletonRows = summaryLoadingApplied && displayRows.length === 0;

    const { isPrinting, printRows, triggerPrint } = useReportPrint<MonthDisplayRow>({ rows: displayRows });
    const tableRows = isPrinting && printRows ? printRows : showSkeletonRows ? skeletonRows : displayRows;

    const totals = useMemo(() => {
        if (!hasApplied) return { debit: 0, credit: 0, closing: 0 };
        const debit = rawRows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
        const credit = rawRows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
        const lastRow = rawRows.length ? rawRows[rawRows.length - 1] : null;
        const lastBalance = Number(lastRow?.balance ?? 0);
        const closing =
            lastRow && !Number.isNaN(lastBalance)
                ? lastRow.drCr === 'Cr'
                    ? -Math.abs(lastBalance)
                    : Math.abs(lastBalance)
                : openingSigned;
        return { debit, credit, closing };
    }, [hasApplied, rawRows, openingSigned]);

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const openLedgerStatement = (row: MonthDisplayRow) => {
        if (!appliedLedgerId || row.isOpening) return;
        const range = monthRangeFromKey(row.monthKey);
        if (!range) return;
        const params = new URLSearchParams({
            ledgerId: String(appliedLedgerId),
            fromDate: range.from,
            toDate: range.to
        });
        navigate(`/apps/accounts/ledger?${params.toString()}`);
    };

    const onRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const fromDateText = fromDate ? toDateText(fromDate) : null;
        const toDateTextValue = toDate ? toDateText(toDate) : null;
        setAppliedFilters({
            ledgerId,
            ledgerGroupId,
            fromDate,
            toDate
        });
        setLastRefreshedAt(new Date());
        loadSummary({
            variables: {
                ledgerId: ledgerId ?? 0,
                ledgerGroupId,
                fromDate: fromDateText,
                toDate: toDateTextValue
            }
        });
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onRefresh();
        event.currentTarget.blur();
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Ledger Month-wise Summary (${reportPeriod})` : 'Ledger Month-wise Summary';
    const printFooterLeft = useMemo(() => {
        const parts: string[] = [];
        if (lastRefreshedAt) {
            parts.push(`Refreshed: ${formatReportTimestamp(lastRefreshedAt)}`);
        }
        if (reportPeriod) {
            parts.push(`Period: ${reportPeriod}`);
        }
        return parts.length ? parts.join(' | ') : undefined;
    }, [lastRefreshedAt, reportPeriod]);
    const filterSummary = useMemo(() => {
        if (!appliedFilters) return null;
        const parts: string[] = [];
        if (appliedFilters.ledgerGroupId != null && appliedFilters.ledgerGroupId > 0) {
            parts.push(
                `Ledger Group: ${resolveOptionLabel(appliedFilters.ledgerGroupId, ledgerGroupOptions, 'Group')}`
            );
        }
        if (appliedFilters.ledgerId != null && appliedFilters.ledgerId > 0) {
            parts.push(`Ledger: ${resolveOptionLabel(appliedFilters.ledgerId, ledgerOptions, 'Ledger')}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, ledgerGroupOptions, ledgerOptions]);

    const exportColumns = useMemo<ReportExportColumn<MonthDisplayRow>[]>(
        () => [
            { header: 'Month', value: (row) => row.label ?? '' },
            { header: 'Debit', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Credit', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
            { header: 'Closing', value: (row) => (row.closing ? Number(Math.abs(row.closing)).toFixed(2) : '') },
            { header: 'Dr/Cr', value: (row) => row.drCr ?? '' }
        ],
        []
    );
    const exportFileName = `ledger-month-summary_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows: displayRows,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, displayRows, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
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

    const summaryCount = rawRows.filter((row) => !row.isOpening).length;

    const handleLedgerComplete = (e: AutoCompleteCompleteEvent) => {
        const query = e.query ?? '';
        void fetchLedgers({
            search: query,
            groupId: ledgerGroupFilter.fetchGroupId,
            mode: query.trim().length === 0 ? 'all' : 'search'
        });
    };

    const handleLedgerDropdown = () => {
        setLedgerSuggestions([...ledgerOptions]);
        void fetchLedgers({ groupId: ledgerGroupFilter.fetchGroupId, mode: 'all' });
    };

    const handleLedgerChange = (e: AutoCompleteChangeEvent) => {
        const value = e.value as LedgerLookupOption | string | null;
        const shouldFocusRefresh = ledgerEnterRef.current;
        ledgerEnterRef.current = false;
        if (value == null) {
            setLedgerQuery('');
            setSelectedLedger(null);
            setLedgerId(null);
            setPreviewLedger(null);
            return;
        }
        if (typeof value === 'string') {
            setLedgerQuery(value);
            setSelectedLedger(null);
            setLedgerId(null);
            setPreviewLedger(null);
            if (shouldFocusRefresh) {
                focusRefreshButton();
            }
            return;
        }
        setLedgerQuery('');
        setSelectedLedger(value);
        setLedgerId(Number(value.ledgerId));
        setPreviewLedger(null);
        if (shouldFocusRefresh) {
            focusRefreshButton();
        }
    };

    const handleLedgerShow = () => {
        setLedgerPanelOpen(true);
        setPreviewLedger(selectedLedger ?? null);
        if (typeof window !== 'undefined') {
            window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
        }
    };

    const handleLedgerHide = () => {
        setLedgerPanelOpen(false);
        setPreviewLedger(null);
        if (ledgerEnterRef.current) {
            ledgerEnterRef.current = false;
            focusRefreshButton();
        }
    };

    const handleLedgerKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (typeof window !== 'undefined') {
                window.requestAnimationFrame(syncLedgerPreviewFromHighlight);
            }
        }
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        ledgerEnterRef.current = true;
        if (!ledgerPanelOpen) {
            ledgerEnterRef.current = false;
            focusRefreshButton();
        }
    };

    const columns = useLedgerMonthWiseSummaryColumns({
        rows: displayRows,
        summaryLoadingApplied: showSkeletonRows,
        totals
    });

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
            <ReportHeader
                title="Ledger Month-wise Summary"
                subtitle="Month-wise debit/credit totals for the selected ledger or group."
                rightSlot={
                    <ReportRegisterSearch
                        value={globalSearchText}
                        onValueChange={setGlobalSearchText}
                        matchCase={globalSearchMatchCase}
                        onMatchCaseChange={setGlobalSearchMatchCase}
                        wholeWord={globalSearchWholeWord}
                        onWholeWordChange={setGlobalSearchWholeWord}
                    />
                }
                className="mb-3"
            />
            {(ledgerError || summaryError) && (
                <p className="text-red-500 m-0 mb-3">
                    Error loading month summary: {ledgerError?.message || summaryError?.message}
                </p>
            )}

            <ReportDataTable
                value={tableRows}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                dataKey="rowKey"
                stripedRows
                size="small"
                loadingState={summaryLoadingApplied}
                loadingSummaryEnabled={hasApplied}
                globalSearchRenderInTableHeader={false}
                globalSearchValue={globalSearchText}
                onGlobalSearchValueChange={setGlobalSearchText}
                globalSearchMatchCase={globalSearchMatchCase}
                onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                globalSearchWholeWord={globalSearchWholeWord}
                onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                emptyMessage={
                    summaryLoadingApplied ? '' : hasApplied ? 'No results found' : 'Press Refresh to load summary'
                }
                onRowDoubleClick={(e) => openLedgerStatement(e.data as MonthDisplayRow)}
                className="summary-table ledger-month-summary-table"
                headerLeft={
                    <LedgerMonthWiseSummaryFilters
                        fromDate={fromDate}
                        toDate={toDate}
                        onFromDateChange={handleFromDateChange}
                        onToDateChange={handleToDateChange}
                        dateErrors={dateErrors}
                        fiscalYearStartDate={fiscalYearStartDate}
                        fiscalYearEndDate={fiscalYearEndDate}
                        fromDateInputRef={fromDateInputRef}
                        toDateInputRef={toDateInputRef}
                        onFromDateEnterNext={() => toDateInputRef.current?.focus()}
                        onToDateEnterNext={focusLedgerGroupInput}
                        ledgerGroupId={ledgerGroupId}
                        ledgerGroupOptions={ledgerGroupOptions}
                        groupsLoading={groupsLoading}
                        onLedgerGroupChange={handleLedgerGroupChange}
                        onLedgerGroupSelectNext={focusLedgerInput}
                        ledgerGroupInputRef={ledgerGroupInputRef}
                        ledgerQuery={ledgerQuery}
                        selectedLedger={selectedLedger}
                        ledgerSuggestions={ledgerSuggestions}
                        showLedgerSpinner={showLedgerSpinner}
                        onLedgerComplete={handleLedgerComplete}
                        onLedgerDropdownClick={handleLedgerDropdown}
                        onLedgerChange={handleLedgerChange}
                        onLedgerShow={handleLedgerShow}
                        onLedgerHide={handleLedgerHide}
                        onLedgerKeyDown={handleLedgerKeyDown}
                        onLedgerPreview={setPreviewLedger}
                        ledgerInputRef={ledgerInputRef}
                        displayLedger={displayLedger}
                        currentBalanceLabel={currentBalanceLabel}
                        currentBalanceSeverity={currentBalanceSeverity}
                        showBalanceBadges={showBalanceBadges}
                    />
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefreshClick}
                        onPrint={handlePrintClick}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        loadingState={summaryLoadingApplied}
                        refreshDisabled={!canQuery}
                        exportDisabled={!hasApplied || summaryLoading || displayRows.length === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? summaryLoadingApplied
                            ? 'Loading summary...'
                            : `${summaryCount} month${summaryCount === 1 ? '' : 's'}`
                        : 'Press Refresh to load summary'
                }
            >
                {columns}
            </ReportDataTable>
        </div>
    );
}
