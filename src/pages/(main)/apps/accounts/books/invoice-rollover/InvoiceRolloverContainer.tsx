'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import type { DataTableFilterEvent, DataTableFilterMeta } from 'primereact/datatable';
import { Tag } from 'primereact/tag';
import type { MultiSelect } from 'primereact/multiselect';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows } from '@/components/reportSkeleton';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import AppDateInput from '@/components/AppDateInput';
import LedgerMetaPanel from '@/components/LedgerMetaPanel';
import AppReportActions from '@/components/AppReportActions';
import AppMultiSelect from '@/components/AppMultiSelect';
import { ACCOUNT_MASTER_LAZY_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { buildDefaultColumnFilters, useInvoiceRolloverColumns } from './components/InvoiceRolloverColumns';
import { AREAS, LEDGER_CURRENT_BALANCE, LEDGER_LOOKUP, INVOICE_ROLLOVER } from './graphql';
import type {
    AreaOption,
    AreaRow,
    InvoiceRolloverFilters,
    InvoiceRolloverRow,
    LedgerOption,
    LedgerSummaryRow
} from './types';
import {
    formatAmount,
    formatDate,
    formatDateRangeLabel,
    resolveFiscalRange,
    resolveOptionLabels,
    toDateText
} from './utils';

const AREA_FETCH_LIMIT = 200;
const LEDGER_FETCH_LIMIT = 200;
const FILTER_DEBOUNCE_MS = 250;
export function InvoiceRolloverContainer() {
    const { companyContext } = useAuth();
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [areaIds, setAreaIds] = useState<number[]>([]);
    const [ledgerIds, setLedgerIds] = useState<number[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<InvoiceRolloverFilters | null>(null);
    const [columnFilters, setColumnFilters] = useState<DataTableFilterMeta>(() => buildDefaultColumnFilters());
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);

    useEffect(() => {
        setPageTitle('Invoice Rollover');
        return () => setPageTitle(null);
    }, [setPageTitle]);
    const [areaLookupRows, setAreaLookupRows] = useState<AreaRow[]>([]);
    const [selectedAreaOptions, setSelectedAreaOptions] = useState<AreaOption[]>([]);
    const [isAreaLoading, setIsAreaLoading] = useState(false);
    const [ledgerLookupRows, setLedgerLookupRows] = useState<LedgerSummaryRow[]>([]);
    const [selectedLedgerOptions, setSelectedLedgerOptions] = useState<LedgerOption[]>([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
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
    const hasTouchedDatesRef = useRef(false);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const areaInputRef = useRef<MultiSelect>(null);
    const areaRequestRef = useRef(0);
    const areaLastFetchRef = useRef<{ search: string | null; mode: 'all' | 'search' } | null>(null);
    const areaFilterValueRef = useRef('');
    const areaFilterTimerRef = useRef<number | null>(null);
    const ledgerRequestRef = useRef(0);
    const ledgerLastFetchRef = useRef<{ search: string | null; mode: 'all' | 'search'; areaKey: string } | null>(
        null
    );
    const ledgerFilterValueRef = useRef('');
    const ledgerFilterTimerRef = useRef<number | null>(null);

    const [loadAreas] = useLazyQuery(AREAS, { ...ACCOUNT_MASTER_LAZY_QUERY_OPTIONS });
    const [loadLedgerLookup] = useLazyQuery(LEDGER_LOOKUP, { ...ACCOUNT_MASTER_LAZY_QUERY_OPTIONS });

    const areaOptions = useMemo<AreaOption[]>(() => {
        const options = new Map<number, AreaOption>();
        selectedAreaOptions.forEach((option) => {
            options.set(Number(option.value), option);
        });
        areaLookupRows.forEach((row) => {
            options.set(Number(row.areaId), {
                label: row.name ?? `Area ${row.areaId}`,
                value: Number(row.areaId)
            });
        });
        return Array.from(options.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
        );
    }, [areaLookupRows, selectedAreaOptions]);

    const ledgerOptions = useMemo<LedgerOption[]>(() => {
        const options = new Map<number, LedgerOption>();
        selectedLedgerOptions.forEach((option) => {
            options.set(Number(option.value), option);
        });
        ledgerLookupRows.forEach((row) => {
            const label =
                `${row.name ?? ''}${row.groupName ? ` (${row.groupName})` : ''}`.trim() ||
                `Ledger ${row.ledgerId}`;
            options.set(Number(row.ledgerId), {
                ...row,
                label,
                value: Number(row.ledgerId)
            });
        });
        return Array.from(options.values()).sort((a, b) =>
            a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
        );
    }, [ledgerLookupRows, selectedLedgerOptions]);

    const selectedLedger = useMemo(() => {
        if (ledgerIds.length !== 1) return null;
        const ledgerId = ledgerIds[0];
        return ledgerOptions.find((l) => Number(l.value) === Number(ledgerId)) ?? null;
    }, [ledgerIds, ledgerOptions]);

    const balanceToDateText = useMemo(() => toDateText(new Date()), []);
    const { data: balanceData, loading: balanceLoading } = useQuery(LEDGER_CURRENT_BALANCE, {
        skip: ledgerIds.length !== 1,
        variables: {
            ledgerId: ledgerIds.length === 1 ? ledgerIds[0] : 0,
            toDate: balanceToDateText
        }
    });

    const currentBalanceLabel = useMemo(() => {
        if (ledgerIds.length !== 1) return null;
        if (balanceLoading) return 'Loading...';
        const balance = balanceData?.ledgerCurrentBalance;
        if (!balance) return '0.00 Dr';
        return `${formatAmount(Number(balance.amount ?? 0))} ${balance.drCr ?? 'Dr'}`;
    }, [balanceData, balanceLoading, ledgerIds.length]);

    const currentBalanceSeverity = useMemo(() => {
        if (balanceLoading) return 'warning';
        const drCr = balanceData?.ledgerCurrentBalance?.drCr ?? 'Dr';
        return drCr === 'Cr' ? 'danger' : 'success';
    }, [balanceData, balanceLoading]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const initialRange = useMemo(() => {
        const start = fiscalRange?.start ?? null;
        const end = fiscalRange?.end ?? null;
        if (!start && !end) return null;
        const today = new Date();
        let nextToDate = end;
        if (start && end && today >= start && today <= end) {
            nextToDate = today;
        } else if (!end) {
            nextToDate = today;
        }
        return [start ?? null, nextToDate ?? null] as [Date | null, Date | null];
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

    const focusAreaInput = () => {
        if (typeof document === 'undefined') return;
        const control = areaInputRef.current;
        if (!control) return;
        const element = control.getElement?.();
        const isFocusedWithinElement = () => {
            const active = document.activeElement;
            return Boolean(active && element instanceof HTMLElement && (active === element || element.contains(active)));
        };

        if (typeof control.focus === 'function') {
            control.focus();
            if (isFocusedWithinElement()) return;
        }

        if (!(element instanceof HTMLElement)) return;
        const focusTargets = [
            element.querySelector<HTMLElement>(
                '.p-hidden-accessible input[role="combobox"], .p-hidden-accessible input[aria-haspopup="listbox"]'
            ),
            element,
            element.querySelector<HTMLElement>('[tabindex]:not([tabindex="-1"]), input, button, select, textarea')
        ].filter((target): target is HTMLElement => Boolean(target));

        for (const target of focusTargets) {
            target.focus();
            if (document.activeElement === target || isFocusedWithinElement()) return;
        }
    };

    useEffect(() => {
        return () => {
            if (typeof window === 'undefined') return;
            if (areaFilterTimerRef.current) window.clearTimeout(areaFilterTimerRef.current);
            if (ledgerFilterTimerRef.current) window.clearTimeout(ledgerFilterTimerRef.current);
        };
    }, []);

    const fetchAreas = useCallback(
        async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
            const trimmed = args?.search?.trim() ?? '';
            const mode = args?.mode ?? 'search';
            const search = trimmed.length ? trimmed : null;
            const lastFetch = areaLastFetchRef.current;

            if (!search && mode !== 'all') {
                setAreaLookupRows([]);
                areaLastFetchRef.current = { search: null, mode };
                return;
            }
            if (lastFetch && lastFetch.search === search && lastFetch.mode === mode) {
                return;
            }

            const requestId = ++areaRequestRef.current;
            setIsAreaLoading(true);
            try {
                const result = await loadAreas({
                    variables: { search, limit: AREA_FETCH_LIMIT }
                });
                if (areaRequestRef.current !== requestId) return;
                const rows = (result.data?.areas ?? []) as AreaRow[];
                setAreaLookupRows(Array.isArray(rows) ? [...rows] : []);
                areaLastFetchRef.current = { search, mode };
            } catch {
                if (areaRequestRef.current === requestId) {
                    setAreaLookupRows([]);
                }
            } finally {
                if (areaRequestRef.current === requestId) {
                    setIsAreaLoading(false);
                }
            }
        },
        [loadAreas]
    );

    const fetchLedgers = useCallback(
        async (args?: { search?: string | null; mode?: 'all' | 'search' }) => {
            const trimmed = args?.search?.trim() ?? '';
            const mode = args?.mode ?? 'search';
            const search = trimmed.length ? trimmed : null;
            const areaKey = areaIds.length > 0 ? [...areaIds].sort((a, b) => a - b).join(',') : '';
            const lastFetch = ledgerLastFetchRef.current;

            if (!search && mode !== 'all') {
                setLedgerLookupRows([]);
                ledgerLastFetchRef.current = { search: null, mode, areaKey };
                return;
            }
            if (
                lastFetch &&
                lastFetch.search === search &&
                lastFetch.mode === mode &&
                lastFetch.areaKey === areaKey
            ) {
                return;
            }

            const requestId = ++ledgerRequestRef.current;
            setIsLedgerLoading(true);
            try {
                const result = await loadLedgerLookup({
                    variables: {
                        search,
                        areaIds: areaIds.length > 0 ? areaIds : null,
                        limit: LEDGER_FETCH_LIMIT
                    }
                });
                if (ledgerRequestRef.current !== requestId) return;
                const rows = (result.data?.ledgerSummaries?.items ?? []) as LedgerSummaryRow[];
                setLedgerLookupRows(Array.isArray(rows) ? [...rows] : []);
                ledgerLastFetchRef.current = { search, mode, areaKey };
            } catch {
                if (ledgerRequestRef.current === requestId) {
                    setLedgerLookupRows([]);
                }
            } finally {
                if (ledgerRequestRef.current === requestId) {
                    setIsLedgerLoading(false);
                }
            }
        },
        [areaIds, loadLedgerLookup]
    );

    const scheduleAreaFetch = useCallback(
        (query: string) => {
            if (typeof window === 'undefined') return;
            if (areaFilterTimerRef.current) window.clearTimeout(areaFilterTimerRef.current);
            areaFilterTimerRef.current = window.setTimeout(() => {
                void fetchAreas({ search: query, mode: query.trim() ? 'search' : 'all' });
            }, FILTER_DEBOUNCE_MS);
        },
        [fetchAreas]
    );

    const scheduleLedgerFetch = useCallback(
        (query: string) => {
            if (typeof window === 'undefined') return;
            if (ledgerFilterTimerRef.current) window.clearTimeout(ledgerFilterTimerRef.current);
            ledgerFilterTimerRef.current = window.setTimeout(() => {
                void fetchLedgers({ search: query, mode: query.trim() ? 'search' : 'all' });
            }, FILTER_DEBOUNCE_MS);
        },
        [fetchLedgers]
    );

    const handleAreaShow = useCallback(() => {
        const search = areaFilterValueRef.current ?? '';
        void fetchAreas({ search, mode: search.trim() ? 'search' : 'all' });
    }, [fetchAreas]);

    const handleLedgerShow = useCallback(() => {
        const search = ledgerFilterValueRef.current ?? '';
        void fetchLedgers({ search, mode: search.trim() ? 'search' : 'all' });
    }, [fetchLedgers]);

    const handleAreaFilter = useCallback(
        (event: { filter: string }) => {
            const query = event.filter ?? '';
            areaFilterValueRef.current = query;
            scheduleAreaFetch(query);
        },
        [scheduleAreaFetch]
    );

    const handleLedgerFilter = useCallback(
        (event: { filter: string }) => {
            const query = event.filter ?? '';
            ledgerFilterValueRef.current = query;
            scheduleLedgerFetch(query);
        },
        [scheduleLedgerFetch]
    );

    const fromDateTextValue = fromDate ? toDateText(fromDate) : null;
    const toDateTextValue = toDate ? toDateText(toDate) : null;

    const pendingFilters = useMemo<InvoiceRolloverFilters>(
        () => ({
            ledgerIds: ledgerIds.length > 0 ? ledgerIds : null,
            areaIds: areaIds.length > 0 ? areaIds : null,
            fromDate: fromDateTextValue,
            toDate: toDateTextValue,
            removeZeroLines: 0
        }),
        [areaIds, fromDateTextValue, ledgerIds, toDateTextValue]
    );

    const [loadReport, { data, loading, error }] = useLazyQuery(INVOICE_ROLLOVER, {
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const hasApplied = appliedFilters != null;
    const reportLoading = loading && hasApplied;

    const rows: InvoiceRolloverRow[] = useMemo(
        () => (hasApplied ? data?.invoiceRollover?.items ?? [] : []),
        [data, hasApplied]
    );
    const showSkeletonRows = reportLoading && rows.length === 0;

    const totals = useMemo(
        () => ({
            invoice: hasApplied ? Number(data?.invoiceRollover?.invoiceTotal ?? 0) : 0,
            applied: hasApplied ? Number(data?.invoiceRollover?.appliedTotal ?? 0) : 0,
            diff: hasApplied ? Number(data?.invoiceRollover?.differenceTotal ?? 0) : 0
        }),
        [data, hasApplied]
    );

    const invoiceCount = hasApplied ? Number(data?.invoiceRollover?.totalCount ?? 0) : 0;

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(8, (idx) => ({
                rowKey: `sk-${idx}`,
                ledgerId: null,
                ledgerName: null,
                ledgerGroupId: null,
                ledgerGroupName: null,
                invoiceId: null,
                invoiceNumber: null,
                invoiceDate: null,
                voucherTypeId: null,
                voucherType: null,
                agLedger: null,
                narration: null,
                debit: 0,
                credit: 0,
                difference: null,
                receiptDate: null,
                receiptType: null,
                receiptVoucherNo: null,
                receiptAmount: null,
                totalPaid: null,
                isReceiptRow: false,
                isSkeleton: true
            })),
        []
    );

    const displayRows = showSkeletonRows ? skeletonRows : rows;
    const rowsPerPage = 10;
    const { isPrinting, printRows, triggerPrint } = useReportPrint<InvoiceRolloverRow>({ rows });
    const tableRows = isPrinting && printRows ? printRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const columns = useInvoiceRolloverColumns({
        rows,
        reportLoading: showSkeletonRows,
        totals
    });

    const handleColumnFilter = (event: DataTableFilterEvent) => {
        setColumnFilters(event.filters);
    };

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
    };

    const handleAreaChange = useCallback(
        (nextIds: number[]) => {
            setAreaIds(nextIds);
            setSelectedAreaOptions(areaOptions.filter((option) => nextIds.includes(Number(option.value))));
            setLedgerIds([]);
            setSelectedLedgerOptions([]);
            setLedgerLookupRows([]);
            ledgerLastFetchRef.current = null;
            setAppliedFilters(null);
        },
        [areaOptions]
    );

    const handleLedgerChange = useCallback(
        (nextIds: number[]) => {
            setLedgerIds(nextIds);
            setSelectedLedgerOptions(ledgerOptions.filter((option) => nextIds.includes(Number(option.value))));
            setAppliedFilters(null);
        },
        [ledgerOptions]
    );

    const handleFromDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(nextValue);
        clearAppliedFilters();
        setDateErrors({});
    };

    const handleToDateChange = (nextValue: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(nextValue);
        clearAppliedFilters();
        setDateErrors({});
    };

    const handleRefreshClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        const validation = validateDateRange({ fromDate, toDate });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        if (!fromDateTextValue || !toDateTextValue) return;
        setAppliedFilters(pendingFilters);
        setLastRefreshedAt(new Date());
        loadReport({ variables: pendingFilters });
        event.currentTarget.blur();
    };

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        void triggerPrint();
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Invoice Rollover (${reportPeriod})` : 'Invoice Rollover';
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
        const ledgerFilterIds = appliedFilters.ledgerIds ?? [];
        const areaFilterIds = appliedFilters.areaIds ?? [];
        const parts: string[] = [];
        if (ledgerFilterIds.length) {
            parts.push(`Ledgers: ${resolveOptionLabels(ledgerFilterIds, ledgerOptions, 'Ledger')}`);
        }
        if (areaFilterIds.length) {
            parts.push(`Areas: ${resolveOptionLabels(areaFilterIds, areaOptions, 'Area')}`);
        }
        return parts.length ? parts.join(' | ') : null;
    }, [appliedFilters, areaOptions, ledgerOptions]);

    const exportColumns = useMemo<ReportExportColumn<InvoiceRolloverRow>[]>(
        () => [
            { header: 'Ledger', value: (row) => row.ledgerName ?? '' },
            { header: 'Invoice Date', value: (row) => formatDate(row.invoiceDate ?? null) },
            { header: 'Invoice No', value: (row) => row.invoiceNumber ?? '' },
            { header: 'Voucher Type', value: (row) => row.voucherType ?? '' },
            { header: 'Ag. Ledger', value: (row) => row.agLedger ?? '' },
            { header: 'Dr Amt', value: (row) => (row.isReceiptRow ? '' : row.debit ? Number(row.debit).toFixed(2) : '') },
            { header: 'Cr Amt', value: (row) => (row.isReceiptRow ? '' : row.credit ? Number(row.credit).toFixed(2) : '') },
            {
                header: 'Due',
                value: (row) =>
                    row.isReceiptRow ? '' : row.difference != null ? Number(row.difference).toFixed(2) : ''
            },
            { header: 'Receipt Date', value: (row) => formatDate(row.receiptDate ?? null) },
            { header: 'Receipt Type', value: (row) => row.receiptType ?? '' },
            { header: 'Receipt No', value: (row) => row.receiptVoucherNo ?? '' },
            {
                header: 'Receipt Amount',
                value: (row) => (row.receiptAmount != null ? Number(row.receiptAmount).toFixed(2) : '')
            },
            {
                header: 'Total Paid',
                value: (row) => (row.isReceiptRow ? '' : row.totalPaid != null ? Number(row.totalPaid).toFixed(2) : '')
            }
        ],
        []
    );
    const exportFileName = `invoice-rollover_${appliedFilters?.fromDate ?? 'all'}_${appliedFilters?.toDate ?? 'all'}`;
    const exportContext = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            rows,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft
        }),
        [exportColumns, exportFileName, rows, filterSummary, reportTitle, companyInfo.name, companyInfo.address, printFooterLeft]
    );

    const handleExportCsv = () => exportReportCsv(exportContext);
    const handleExportExcel = () => {
        void exportReportExcel(exportContext);
    };
    const handleExportPdf = () => exportReportPdf(exportContext);

    const canQuery = Boolean(fromDateTextValue && toDateTextValue && ledgerIds.length > 0);
    const showBalanceBadges = Boolean(currentBalanceLabel && selectedLedger && ledgerIds.length === 1);

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
                title="Invoice Rollover"
                subtitle="Invoice vs applied receipts summary (ported from legacy Agency Manager workflow)."
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
            {error && <p className="text-red-500 m-0 mb-3">Error loading invoice rollover: {error.message}</p>}

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100, 200]}
                dataKey="rowKey"
                loading={false}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                filters={columnFilters}
                onFilter={handleColumnFilter}
                filterDisplay="menu"
                filterDelay={400}
                globalSearchRenderInTableHeader={false}
                globalSearchValue={globalSearchText}
                onGlobalSearchValueChange={setGlobalSearchText}
                globalSearchMatchCase={globalSearchMatchCase}
                onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                globalSearchWholeWord={globalSearchWholeWord}
                onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                className="summary-table invoice-rollover-table"
                emptyMessage={reportLoading || !hasApplied ? '' : 'No results found'}
                headerLeft={
                    <div className="flex flex-column gap-2 w-full">
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDateInput
                                value={fromDate}
                                onChange={handleFromDateChange}
                                placeholder="From date"
                                fiscalYearStart={fiscalYearStartDate}
                                fiscalYearEnd={fiscalYearEndDate}
                                autoFocus
                                selectOnFocus
                                inputRef={fromDateInputRef}
                                onEnterNext={() => toDateInputRef.current?.focus()}
                                inputId="invoice-rollover-from-date"
                                style={{ width: '150px' }}
                            />
                            <AppDateInput
                                value={toDate}
                                onChange={handleToDateChange}
                                placeholder="To date"
                                fiscalYearStart={fiscalYearStartDate}
                                fiscalYearEnd={fiscalYearEndDate}
                                inputRef={toDateInputRef}
                                onEnterNext={focusAreaInput}
                                inputId="invoice-rollover-to-date"
                                style={{ width: '150px' }}
                            />
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppMultiSelect
                                value={areaIds}
                                options={areaOptions}
                                optionLabel="label"
                                optionValue="value"
                                ref={areaInputRef}
                                loading={isAreaLoading}
                                onShow={handleAreaShow}
                                onFilter={handleAreaFilter}
                                onChange={(e) => handleAreaChange((e.value ?? []) as number[])}
                                placeholder={isAreaLoading ? 'Loading areas...' : 'All areas'}
                                emptyMessage={isAreaLoading ? 'Loading...' : 'Type to search'}
                                emptyFilterMessage={isAreaLoading ? 'Loading...' : 'No results found'}
                                filterInputAutoFocus
                                style={{ width: '220px' }}
                            />
                            <div className="flex align-items-center gap-2 ledger-ledger-meta">
                                <AppMultiSelect
                                    value={ledgerIds}
                                    options={ledgerOptions}
                                    optionLabel="label"
                                    optionValue="value"
                                    loading={isLedgerLoading}
                                    enterSelectOnEnter
                                    enterFocusNext
                                    onShow={handleLedgerShow}
                                    onFilter={handleLedgerFilter}
                                    onChange={(e) => handleLedgerChange((e.value ?? []) as number[])}
                                    placeholder={isLedgerLoading ? 'Loading parties...' : 'Multiple parties'}
                                    emptyMessage={isLedgerLoading ? 'Loading...' : 'Type to search'}
                                    emptyFilterMessage={isLedgerLoading ? 'Loading...' : 'No results found'}
                                    filterInputAutoFocus
                                    itemTemplate={(option: LedgerOption) => {
                                        const address = option.address?.trim();
                                        return (
                                            <div className="flex flex-column">
                                                <span className="font-medium">{option.label}</span>
                                                {address && <small className="text-600">{address}</small>}
                                            </div>
                                        );
                                    }}
                                    style={{ width: '320px' }}
                                />
                                {selectedLedger && (
                                    <LedgerMetaPanel
                                        address={selectedLedger.address}
                                        balanceLabel={currentBalanceLabel ?? null}
                                        balanceSeverity={currentBalanceSeverity}
                                        showBalance={showBalanceBadges}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                }
                headerRight={
                    <>
                        <Tag value={`Inv ${formatAmount(totals.invoice)}`} severity="info" />
                        <Tag value={`Applied ${formatAmount(totals.applied)}`} severity="success" />
                        <Tag
                            value={`Due ${formatAmount(totals.diff)}`}
                            severity={totals.diff > 0 ? 'danger' : totals.diff < 0 ? 'success' : 'secondary'}
                        />
                        <AppReportActions
                            onRefresh={handleRefreshClick}
                            onPrint={handlePrintClick}
                            onExportCsv={handleExportCsv}
                            onExportExcel={handleExportExcel}
                            onExportPdf={handleExportPdf}
                            loadingState={reportLoading}
                            refreshDisabled={!canQuery}
                            exportDisabled={!hasApplied || rows.length === 0}
                        />
                    </>
                }
                recordSummary={
                    hasApplied
                        ? `${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'}`
                        : 'Press Refresh to load report'
                }
            >
                {columns}
            </ReportDataTable>
        </div>
    );
}
