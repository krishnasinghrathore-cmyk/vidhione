'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Checkbox } from 'primereact/checkbox';
import { useApolloClient, useLazyQuery } from '@apollo/client';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { ReportHeader } from '@/components/ReportHeader';
import { buildSkeletonRows } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { buildDefaultColumnFilters, useDayBookColumns } from './components/DayBookColumns';
import { DAY_BOOK, LEDGER_OPTIONS } from './graphql';
import type {
    DayBookDisplayRow,
    DayBookFilters,
    DayBookFilterOptions,
    DayBookRow,
    LedgerOptionRow,
    SelectOption
} from './types';
import {
    buildDefaultFiscalRange,
    formatDate,
    formatDateRangeLabel,
    resolveFiscalRange,
    serializeColumnFilters,
    summarizeColumnFilters,
    toDateText
} from './utils';

const ALL_LEDGER_LIMIT = 10000;
const SEARCH_LEDGER_LIMIT = 200;

export function DayBookContainer() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const apolloClient = useApolloClient();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [todayOnly, setTodayOnly] = useState(true);
    const [showCancelledOnly, setShowCancelledOnly] = useState(false);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [appliedFilters, setAppliedFilters] = useState<DayBookFilters | null>(null);
    const [filterOptions, setFilterOptions] = useState<DayBookFilterOptions | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const defaultSortField = 'date';
    const defaultSortOrder = 1;
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<number | null>(null);
    const hasApplied = Boolean(appliedFilters);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerOptionRow[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ search: string; mode: 'all' | 'search' } | null>(null);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const statusInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'day-book-refresh';

    useEffect(() => {
        setPageTitle('Day Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const [loadLedgerOptions] = useLazyQuery(LEDGER_OPTIONS, { fetchPolicy: 'network-only' });
    const [loadDayBook, { data, loading, error }] = useLazyQuery(DAY_BOOK, { fetchPolicy: 'network-only' });

    useEffect(() => {
        const nextOptions = data?.dayBook?.filterOptions ?? null;
        if (!nextOptions) return;
        setFilterOptions(nextOptions);
    }, [data?.dayBook?.filterOptions]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const ledgerOptions = useMemo(() => {
        const options = new Map<number, SelectOption>();
        ledgerLookupRows.forEach((l) => {
            options.set(Number(l.ledgerId), {
                label: l.name ?? `Ledger ${l.ledgerId}`,
                value: Number(l.ledgerId),
                address: l.address ?? null
            });
        });
        return Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [ledgerLookupRows]);

    const ledgerAddressMap = useMemo(() => {
        const map = new Map<string, string>();
        ledgerOptions.forEach((option) => {
            const name = option.label?.trim();
            const address = option.address?.trim();
            if (!name || !address) return;
            map.set(name.toLowerCase(), address);
        });
        return map;
    }, [ledgerOptions]);

    const rawRows = useMemo(() => (hasApplied ? data?.dayBook?.items ?? [] : []), [data, hasApplied]);
    const displayRows = useMemo<DayBookDisplayRow[]>(
        () =>
            rawRows.map((row: DayBookRow) => ({
                ...row,
                rowKey: String(row.id)
            })),
        [rawRows]
    );

    const reportLoading = Boolean(hasApplied && loading);
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(Math.min(rowsPerPage, 10), (idx) => ({
                rowKey: `skeleton-${idx}`,
                id: -1,
                date: null,
                voucherNo: null,
                voucherType: null,
                voucherTypeId: null,
                ledger: null,
                narration: null,
                refNo: null,
                refDate: null,
                debit: 0,
                credit: 0,
                balance: 0,
                drCr: null,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const totalRecords = hasApplied ? data?.dayBook?.totalCount ?? 0 : 0;
    const debitTotal = hasApplied ? data?.dayBook?.debitTotal ?? 0 : 0;
    const creditTotal = hasApplied ? data?.dayBook?.creditTotal ?? 0 : 0;

    const fetchAllDayBookRows = useCallback(async () => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        const querySort = resolveQuerySort();
        try {
            const { data: fullData } = await apolloClient.query({
                query: DAY_BOOK,
                fetchPolicy: 'network-only',
                variables: {
                    voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                    ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                    fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                    toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                    cancelled: appliedFilters.cancelled,
                    sortField: querySort.sortField,
                    sortOrder: querySort.sortOrder,
                    limit: totalRecords,
                    offset: 0,
                    columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                    includeFilterOptions: false
                }
            });
            const rows = (fullData?.dayBook?.items ?? []) as DayBookRow[];
            return rows.map((row) => ({ ...row, rowKey: String(row.id) }));
        } catch {
            return displayRows;
        }
    }, [apolloClient, appliedFilters, displayRows, totalRecords, sortField, sortOrder]);

    const { isPrinting, printRows, triggerPrint } = useReportPrint<DayBookDisplayRow>({
        rows: displayRows,
        getPrintRows: fetchAllDayBookRows
    });

    const tableRows = isPrinting && printRows ? printRows : reportLoading ? skeletonRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setFilterOptions(null);
    };

    const fetchLedgers = async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
        const trimmed = args?.search?.trim() ?? '';
        const mode = args?.mode ?? 'search';
        const lastFetch = ledgerLastFetchRef.current;

        if (!trimmed && mode !== 'all') {
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
            ledgerLookupRows.length > 0
        ) {
            setLedgerLookupRows((prev) => (prev.length ? [...prev] : prev));
            setIsLedgerLoading(false);
            return;
        }

        const requestId = ++ledgerRequestRef.current;
        const limit = mode === 'all' && trimmed.length === 0 ? ALL_LEDGER_LIMIT : SEARCH_LEDGER_LIMIT;
        setIsLedgerLoading(true);
        try {
            const result = await loadLedgerOptions({
                variables: {
                    search: trimmed ? trimmed : null,
                    limit
                }
            });
            if (ledgerRequestRef.current !== requestId) return;
            const items = result.data?.ledgerOptions ?? [];
            setLedgerLookupRows(Array.isArray(items) ? [...(items as LedgerOptionRow[])] : []);
            ledgerLastFetchRef.current = { search: trimmed, mode };
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

    useEffect(() => {
        if (!hasApplied) return;
        if (isLedgerLoading) return;
        if (ledgerLookupRows.length > 0) return;
        const lastFetch = ledgerLastFetchRef.current;
        if (lastFetch?.mode === 'all' && lastFetch.search === '') return;
        void fetchLedgers({ mode: 'all' });
    }, [hasApplied, isLedgerLoading, ledgerLookupRows.length]);

    const focusStatusInput = () => {
        const input = statusInputRef.current;
        if (input) input.focus();
    };

    const focusRefreshButton = () => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) {
            element.focus();
        }
    };

    const handleCheckboxEnter = (next: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (!isEnter) return;
        event.preventDefault();
        event.stopPropagation();
        next();
    };

    const handleTodayToggle = (nextValue: boolean) => {
        clearAppliedFilters();
        setDateErrors({});
        setTodayOnly(nextValue);
        if (nextValue) {
            const today = new Date();
            setFromDate(today);
            setToDate(today);
            return;
        }
        const fallback = fiscalRange ?? buildDefaultFiscalRange();
        setFromDate(fallback.start ?? null);
        setToDate(fallback.end ?? new Date());
    };

    const buildAppliedFilters = (nextColumnFilters: DataTableFilterMeta): DayBookFilters => ({
        voucherTypeIds: [],
        ledgerIds: [],
        fromDate,
        toDate,
        cancelled: showCancelledOnly ? 1 : 0,
        columnFilters: nextColumnFilters
    });

    const resolveQuerySort = (overrides?: { sortField?: string | null; sortOrder?: number | null }) => {
        const hasFieldOverride = Object.prototype.hasOwnProperty.call(overrides ?? {}, 'sortField');
        const hasOrderOverride = Object.prototype.hasOwnProperty.call(overrides ?? {}, 'sortOrder');
        const nextField = hasFieldOverride ? overrides?.sortField ?? null : sortField;
        const nextOrder = hasOrderOverride ? overrides?.sortOrder ?? null : sortOrder;
        if (nextField) {
            return { sortField: nextField, sortOrder: nextOrder ?? defaultSortOrder };
        }
        return { sortField: defaultSortField, sortOrder: defaultSortOrder };
    };

    const applyFilters = (
        nextColumnFilters: DataTableFilterMeta,
        includeFilterOptions = true,
        sortOverrides?: { sortField?: string | null; sortOrder?: number | null }
    ) => {
        if (!fromDate || !toDate) return;
        const nextFilters = buildAppliedFilters(nextColumnFilters);
        const querySort = resolveQuerySort(sortOverrides);
        setAppliedFilters(nextFilters);
        setFirst(0);
        setLastRefreshedAt(new Date());
        loadDayBook({
            variables: {
                voucherTypeIds: nextFilters.voucherTypeIds.length ? nextFilters.voucherTypeIds : null,
                ledgerIds: nextFilters.ledgerIds.length ? nextFilters.ledgerIds : null,
                fromDate: toDateText(fromDate),
                toDate: toDateText(toDate),
                cancelled: nextFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: rowsPerPage,
                offset: 0,
                columnFilters: serializeColumnFilters(nextFilters.columnFilters),
                includeFilterOptions
            }
        });
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const clearedFilters = buildDefaultColumnFilters();
        setColumnFilters(clearedFilters);
        setSortField(null);
        setSortOrder(null);
        applyFilters(clearedFilters, true, { sortField: null, sortOrder: null });
    };

    const handlePageChange = (event: { first: number; rows: number }) => {
        setRowsPerPage(event.rows);
        setFirst(event.first);
        if (!appliedFilters) return;
        const querySort = resolveQuerySort();
        loadDayBook({
            variables: {
                voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                cancelled: appliedFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: event.rows,
                offset: event.first,
                columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                includeFilterOptions: false
            }
        });
    };

    const handleSort = (event: { sortField?: string; sortOrder?: number }) => {
        const nextField = typeof event.sortField === 'string' ? event.sortField : null;
        const nextOrder = event.sortOrder === -1 ? -1 : event.sortOrder === 1 ? 1 : null;
        setSortField(nextField);
        setSortOrder(nextOrder);
        setFirst(0);
        if (!appliedFilters) return;
        const querySort = resolveQuerySort({ sortField: nextField, sortOrder: nextOrder });
        loadDayBook({
            variables: {
                voucherTypeIds: appliedFilters.voucherTypeIds.length ? appliedFilters.voucherTypeIds : null,
                ledgerIds: appliedFilters.ledgerIds.length ? appliedFilters.ledgerIds : null,
                fromDate: appliedFilters.fromDate ? toDateText(appliedFilters.fromDate) : null,
                toDate: appliedFilters.toDate ? toDateText(appliedFilters.toDate) : null,
                cancelled: appliedFilters.cancelled,
                sortField: querySort.sortField,
                sortOrder: querySort.sortOrder,
                limit: rowsPerPage,
                offset: 0,
                columnFilters: serializeColumnFilters(appliedFilters.columnFilters),
                includeFilterOptions: false
            }
        });
    };

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
        applyFilters(event.filters, false);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Day Book (${reportPeriod})` : 'Day Book';
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
        if (appliedFilters.cancelled === 1) {
            parts.push('Status: Cancelled only');
        }
        const columnSummary = summarizeColumnFilters(appliedFilters.columnFilters);
        if (columnSummary) parts.push(`Column Filters: ${columnSummary}`);
        return parts.join(' | ');
    }, [appliedFilters]);

    const exportColumns = useMemo<ReportExportColumn<DayBookDisplayRow>[]>(
        () => [
            { header: 'V. No.', value: (row) => row.voucherNo ?? '' },
            { header: 'Date', value: (row) => formatDate(row.date) },
            { header: 'Ledger', value: (row) => row.ledger ?? '' },
            { header: 'Narration', value: (row) => row.narration ?? '' },
            { header: 'Voucher Type', value: (row) => row.voucherType ?? '' },
            { header: 'Ref. No.', value: (row) => row.refNo ?? '' },
            { header: 'Ref. Date', value: (row) => formatDate(row.refDate) },
            { header: 'Debit Amt', value: (row) => (row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Credit Amt', value: (row) => (row.credit ? Number(row.credit).toFixed(2) : '') },
            { header: 'Balance', value: (row) => (row.balance ? Number(row.balance).toFixed(2) : '') },
            { header: 'Dr/Cr', value: (row) => row.drCr ?? '' }
        ],
        []
    );
    const exportFileName = `day-book_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
    const exportContextBase = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const buildExportRows = useCallback(async () => {
        const rows = await fetchAllDayBookRows();
        return rows.filter((row) => !row.isSkeleton);
    }, [fetchAllDayBookRows]);

    const handleExportCsv = async () => {
        const rows = await buildExportRows();
        exportReportCsv({ ...exportContextBase, rows });
    };
    const handleExportExcel = async () => {
        const rows = await buildExportRows();
        await exportReportExcel({ ...exportContextBase, rows });
    };
    const handleExportPdf = async () => {
        const rows = await buildExportRows();
        exportReportPdf({ ...exportContextBase, rows });
    };

    const canRefresh = Boolean(fromDate && toDate);
    const columns = useDayBookColumns({
        rows: displayRows,
        filterOptions,
        ledgerAddressMap,
        reportLoading,
        totals: { debitTotal, creditTotal }
    });
    const dayBookActions = (
        <AppReportActions
            onRefresh={handleRefresh}
            onPrint={handlePrintClick}
            onExportCsv={handleExportCsv}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            refreshDisabled={!canRefresh}
            printDisabled={!hasApplied || reportLoading || totalRecords === 0}
            exportDisabled={!hasApplied || reportLoading || totalRecords === 0}
            refreshButtonId={refreshButtonId}
        />
    );

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
                title="Day Book Register"
                subtitle="Daily voucher register matching legacy Day Book columns and totals."
                rightSlot={dayBookActions}
                className="mb-3"
            />
            {error && <p className="text-red-500 m-0 mb-3">Error loading day book: {error.message}</p>}

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100]}
                totalRecords={hasApplied ? totalRecords : 0}
                lazy={!isPrinting}
                first={isPrinting ? 0 : first}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                sortField={sortField ?? undefined}
                sortOrder={sortField ? sortOrder : undefined}
                onSort={handleSort}
                onPage={handlePageChange}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                dataKey="rowKey"
                stripedRows
                size="small"
                loading={false}
                className="summary-table day-book-table"
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load day book'}
                headerLeft={
                    <div className="flex flex-column gap-2 w-full">
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDateInput
                                value={fromDate}
                                onChange={(value) => {
                                    setFromDate(value);
                                    clearAppliedFilters();
                                    setDateErrors({});
                                }}
                                placeholder="From date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                autoFocus
                                selectOnFocus
                                inputId="day-book-from-date"
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={(value) => {
                                    setToDate(value);
                                    clearAppliedFilters();
                                    setDateErrors({});
                                }}
                                placeholder="To date"
                                fiscalYearStart={fiscalRange?.start ?? null}
                                fiscalYearEnd={fiscalRange?.end ?? null}
                                inputId="day-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="day-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(focusStatusInput)
                                        }
                                    }}
                                />
                                <label htmlFor="day-book-today">Today</label>
                            </div>
                            {(dateErrors.fromDate || dateErrors.toDate) && (
                                <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                            )}
                        </div>
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="day-book-cancelled-only"
                                    inputRef={statusInputRef}
                                    checked={showCancelledOnly}
                                    onChange={(e) => {
                                        setShowCancelledOnly(Boolean(e.checked));
                                        clearAppliedFilters();
                                    }}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(focusRefreshButton)
                                        }
                                    }}
                                />
                                <label htmlFor="day-book-cancelled-only">Cancelled only</label>
                            </div>
                        </div>
                    </div>
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading day book...'
                            : `${totalRecords} voucher${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load day book'
                }
            >
                {columns}
            </ReportDataTable>
        </div>
    );
}
