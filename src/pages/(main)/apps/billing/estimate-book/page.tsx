'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportDataTable } from '@/components/ReportDataTable';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppReportActions from '@/components/AppReportActions';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import { useAuth } from '@/lib/auth/context';
import type { EstimateBookPage } from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { formatAmount, formatVoucherDate, toDateText } from '../helpers';
import { useLedgerLookup } from '../useLedgerLookup';

type LedgerOption = {
    label: string;
    value: number;
};

type EstimateBookRow = {
    rowKey: string;
    estimateId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    totalNetAmount: number;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

type EstimateBookFilters = {
    fromDate: Date | null;
    toDate: Date | null;
    ledgerId: number | null;
    ledgerLabel: string | null;
    cancelled: -1 | 0 | 1;
    search: string;
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

    return buildDefaultFiscalRange();
};

const formatDateLabel = (value: Date | null) => {
    if (!value) return '';
    return value.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateRangeLabel = (fromDate: Date | null, toDate: Date | null) => {
    const fromText = formatDateLabel(fromDate);
    const toText = formatDateLabel(toDate);
    if (fromText && toText) return `${fromText} - ${toText}`;
    return fromText || toText || '';
};

const formatFlag = (value: boolean) => (value ? 'Yes' : 'No');

const statusOptions = [
    { label: 'All', value: -1 },
    { label: 'Active', value: 0 },
    { label: 'Cancelled', value: 1 }
];

const resolveStatusLabel = (value: number) => statusOptions.find((option) => option.value === value)?.label ?? 'All';

export default function BillingEstimateBookPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const { ledgerOptions, ledgerById, loading: ledgerLoading, error: ledgerError } = useLedgerLookup();

    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [todayOnly, setTodayOnly] = useState(true);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [ledgerQuery, setLedgerQuery] = useState('');
    const [ledgerSuggestions, setLedgerSuggestions] = useState<LedgerOption[]>([]);
    const [selectedLedger, setSelectedLedger] = useState<LedgerOption | null>(null);
    const [ledgerPanelOpen, setLedgerPanelOpen] = useState(false);
    const ledgerEnterRef = useRef(false);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [search, setSearch] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<EstimateBookFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [loading, setLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<EstimateBookPage | null>(null);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const statusInputRef = useRef<Dropdown>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'estimate-book-refresh';

    useEffect(() => {
        setPageTitle('Estimate Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const hasApplied = Boolean(appliedFilters);
    const reportLoading = Boolean(loading && hasApplied);

    const totalRecords = hasApplied ? reportData?.totalCount ?? 0 : 0;
    const totalNetAmount = hasApplied ? reportData?.totalNetAmount ?? 0 : 0;

    const rawRows = useMemo(() => (hasApplied ? reportData?.items ?? [] : []), [hasApplied, reportData?.items]);

    const displayRows = useMemo<EstimateBookRow[]>(() => {
        return rawRows.map((row) => ({
            rowKey: String(row.estimateId),
            estimateId: Number(row.estimateId),
            voucherNumber: row.voucherNumber ?? null,
            voucherDateText: row.voucherDateText ?? null,
            ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
            ledgerName: row.ledgerName ?? null,
            totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
            isCancelled: Boolean(row.isCancelled)
        }));
    }, [rawRows]);

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(rowsPerPage, (index) => ({
                rowKey: `skeleton-${index}`,
                estimateId: 0,
                voucherNumber: '',
                voucherDateText: '',
                ledgerId: null,
                ledgerName: '',
                totalNetAmount: 0,
                isCancelled: false,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const buildQueryVariables = (filters: EstimateBookFilters, offset: number, limit: number) => ({
        fromDate: filters.fromDate ? toDateText(filters.fromDate) : null,
        toDate: filters.toDate ? toDateText(filters.toDate) : null,
        ledgerId: filters.ledgerId,
        cancelled: filters.cancelled,
        search: filters.search.trim() || null,
        limit,
        offset
    });

    const fetchAllEstimateBookRows = useCallback(async () => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        try {
            const response = await invoicingApi.fetchEstimateBook(buildQueryVariables(appliedFilters, 0, totalRecords));
            const rows = response?.items ?? [];
            return rows.map((row) => ({
                rowKey: String(row.estimateId),
                estimateId: Number(row.estimateId),
                voucherNumber: row.voucherNumber ?? null,
                voucherDateText: row.voucherDateText ?? null,
                ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
                ledgerName: row.ledgerName ?? null,
                totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
                isCancelled: Boolean(row.isCancelled)
            }));
        } catch {
            return displayRows;
        }
    }, [appliedFilters, displayRows, totalRecords]);

    const { isPrinting, printRows, triggerPrint } = useReportPrint<EstimateBookRow>({
        rows: displayRows,
        getPrintRows: fetchAllEstimateBookRows
    });

    const tableRows = isPrinting && printRows ? printRows : reportLoading ? skeletonRows : displayRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const focusElementById = (id: string) => {
        if (typeof document === 'undefined') return;
        const element = document.getElementById(id);
        if (element instanceof HTMLElement) {
            element.focus();
        }
    };

    const focusDropdown = (ref: React.RefObject<Dropdown>) => {
        ref.current?.focus?.();
    };

    const focusStatusDropdown = () => focusDropdown(statusInputRef);

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setFirst(0);
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

    const filterLedgerOptions = (query: string) => {
        const needle = query.trim().toLowerCase();
        const filtered = needle
            ? ledgerOptions.filter((ledger) => ledger.label.toLowerCase().includes(needle))
            : ledgerOptions;
        setLedgerSuggestions(filtered);
    };

    const buildFilters = (): EstimateBookFilters => ({
        fromDate,
        toDate,
        ledgerId,
        ledgerLabel: selectedLedger?.label ?? null,
        cancelled,
        search
    });

    const loadEstimateBook = async (filters: EstimateBookFilters, offset: number, limit: number) => {
        setLoading(true);
        setReportError(null);
        try {
            const response = await invoicingApi.fetchEstimateBook(buildQueryVariables(filters, offset, limit));
            setReportData(response);
        } catch (err) {
            setReportError(err instanceof Error ? err.message : 'Failed to load estimate book');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, fiscalRange);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        const nextFilters = buildFilters();
        setAppliedFilters(nextFilters);
        setFirst(0);
        setLastRefreshedAt(new Date());
        void loadEstimateBook(nextFilters, 0, rowsPerPage);
    };

    const handlePageChange = (event: DataTablePageEvent) => {
        setFirst(event.first);
        setRowsPerPage(event.rows);
        if (!appliedFilters) return;
        void loadEstimateBook(appliedFilters, event.first, event.rows);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Estimate Book (${reportPeriod})` : 'Estimate Book';
    const filterSummary = useMemo(() => {
        if (!appliedFilters) return null;
        const parts: string[] = [];
        const period = formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate);
        if (period) parts.push(`Period: ${period}`);
        if (appliedFilters.ledgerLabel) parts.push(`Party: ${appliedFilters.ledgerLabel}`);
        const statusLabel = resolveStatusLabel(appliedFilters.cancelled);
        if (statusLabel !== 'All') parts.push(`Status: ${statusLabel}`);
        if (appliedFilters.search.trim()) parts.push(`Search: ${appliedFilters.search.trim()}`);
        return parts.join(' | ');
    }, [appliedFilters]);

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

    const exportColumns = useMemo<ReportExportColumn<EstimateBookRow>[]>(
        () => [
            { header: 'Estimate Id', value: (row) => row.estimateId },
            { header: 'Estimate No', value: (row) => row.voucherNumber ?? '' },
            { header: 'Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Party', value: (row) => row.ledgerName ?? '' },
            { header: 'Ledger Id', value: (row) => (row.ledgerId != null ? String(row.ledgerId) : '') },
            { header: 'Net Amt', value: (row) => row.totalNetAmount.toFixed(2) },
            { header: 'Cancelled', value: (row) => formatFlag(row.isCancelled) }
        ],
        []
    );

    const exportFileName = `estimate-book_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
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
        return await fetchAllEstimateBookRows();
    }, [fetchAllEstimateBookRows]);

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

    const renderTwoLineCell = (
        primary: React.ReactNode,
        secondary: React.ReactNode,
        secondaryClassName: string = 'text-600 text-sm'
    ) => (
        <div className="flex flex-column gap-1">
            <div>{primary}</div>
            <div className={secondaryClassName}>{secondary}</div>
        </div>
    );

    const estimateBody = (row: EstimateBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('5rem'), skeletonCell('6rem'), '');
        }
        const primary = row.voucherNumber?.trim() || `Estimate ${row.estimateId}`;
        return renderTwoLineCell(primary, `ID: ${row.estimateId}`, 'text-600 text-sm');
    };

    const dateBody = (row: EstimateBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : formatVoucherDate(row.voucherDateText);

    const ledgerBody = (row: EstimateBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('10rem'), skeletonCell('12rem'));
        }
        const ledgerMeta = row.ledgerId != null ? ledgerById.get(row.ledgerId) : undefined;
        const name = row.ledgerName ?? ledgerMeta?.name ?? '';
        const address = ledgerMeta?.address ?? '';
        return renderTwoLineCell(name || '-', address || '');
    };

    const totalBody = (row: EstimateBookRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : formatAmount(row.totalNetAmount);
    const ledgerIdBody = (row: EstimateBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.ledgerId != null ? String(row.ledgerId) : '';
    const cancelledBody = (row: EstimateBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatFlag(row.isCancelled);

    const totalNetFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totalNetAmount);
    const canRefresh = Boolean(fromDate && toDate);

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
                        <h2 className="m-0">Estimate Book</h2>
                        <p className="mt-2 mb-0 text-600">Estimate register with party linkage and net totals.</p>
                    </div>
                </div>
                {(reportError || ledgerError) && (
                    <p className="text-red-500 m-0">
                        Error loading estimate book: {reportError || ledgerError?.message}
                    </p>
                )}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100]}
                totalRecords={hasApplied ? totalRecords : 0}
                lazy={!isPrinting}
                first={isPrinting ? 0 : first}
                onPage={handlePageChange}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                dataKey="rowKey"
                stripedRows
                size="small"
                loading={false}
                className="summary-table estimate-book-table"
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load estimate book'}
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
                                inputId="estimate-book-from-date"
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
                                inputId="estimate-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="estimate-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => ledgerInputRef.current?.focus())
                                        }
                                    }}
                                />
                                <label htmlFor="estimate-book-today">Today</label>
                            </div>
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppAutoComplete
                                value={ledgerQuery.length ? ledgerQuery : selectedLedger}
                                suggestions={ledgerSuggestions}
                                completeMethod={(event: AutoCompleteCompleteEvent) => {
                                    const query = event.query ?? '';
                                    setLedgerQuery(query);
                                    filterLedgerOptions(query);
                                }}
                                onChange={(event: AutoCompleteChangeEvent) => {
                                    const value = event.value as LedgerOption | string | null;
                                    const shouldFocusStatus = ledgerEnterRef.current;
                                    ledgerEnterRef.current = false;

                                    if (typeof value === 'string') {
                                        setLedgerQuery(value);
                                        setLedgerId(null);
                                        setSelectedLedger(null);
                                    } else if (value) {
                                        setLedgerQuery('');
                                        setLedgerId(value.value);
                                        setSelectedLedger(value);
                                    } else {
                                        setLedgerQuery('');
                                        setLedgerId(null);
                                        setSelectedLedger(null);
                                    }
                                    clearAppliedFilters();
                                    if (shouldFocusStatus) focusStatusDropdown();
                                }}
                                inputRef={ledgerInputRef}
                                field="label"
                                placeholder={ledgerLoading ? 'Loading...' : 'Party'}
                                dropdown
                                dropdownMode="blank"
                                forceSelection={false}
                                onShow={() => setLedgerPanelOpen(true)}
                                onHide={() => setLedgerPanelOpen(false)}
                                onDropdownClick={() => filterLedgerOptions('')}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        ledgerEnterRef.current = true;
                                        if (ledgerPanelOpen) return;
                                        focusStatusDropdown();
                                    }
                                }}
                                style={{ minWidth: '220px' }}
                            />
                            <AppDropdown
                                ref={statusInputRef}
                                value={cancelled}
                                options={statusOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Status"
                                onChange={(event) => {
                                    setCancelled(event.value as -1 | 0 | 1);
                                    clearAppliedFilters();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    searchInputRef.current?.focus();
                                }}
                                style={{ minWidth: '160px' }}
                            />
                            <span className="p-input-icon-left" style={{ minWidth: '240px' }}>
                                <i className="pi pi-search" />
                                <InputText
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        clearAppliedFilters();
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter') return;
                                        event.preventDefault();
                                        focusElementById(refreshButtonId);
                                    }}
                                    placeholder="Estimate no, date, party"
                                    className="w-full"
                                    ref={searchInputRef}
                                />
                            </span>
                        </div>
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefresh}
                        onPrint={handlePrintClick}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        loadingState={reportLoading}
                        refreshDisabled={!canRefresh}
                        printDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        exportDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading estimate book...'
                            : `${totalRecords} estimate${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load estimate book'
                }
            >
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Estimate No.</span>
                            <span className="text-600 text-sm">Estimate Id</span>
                        </div>
                    }
                    body={estimateBody}
                    style={{ minWidth: '11rem' }}
                />
                <Column field="voucherDateText" header="Date" body={dateBody} style={{ width: '9rem' }} />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Party</span>
                            <span className="text-600 text-sm">Address</span>
                        </div>
                    }
                    body={ledgerBody}
                    style={{ minWidth: '18rem' }}
                />
                <Column
                    field="totalNetAmount"
                    header="Net"
                    body={totalBody}
                    footer={totalNetFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column field="ledgerId" header="Ledger Id" body={ledgerIdBody} style={{ width: '8rem' }} />
                <Column field="isCancelled" header="Cancelled" body={cancelledBody} style={{ width: '7rem' }} />
            </ReportDataTable>
        </div>
    );
}