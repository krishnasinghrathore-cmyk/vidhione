'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppAutoComplete from '@/components/AppAutoComplete';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import type { PurchaseBookPage } from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { formatAmount, formatVoucherDate, toDateText } from '../helpers';
import { useLedgerLookup } from '../useLedgerLookup';

type LedgerOption = {
    label: string;
    value: number;
};

type PurchaseBookRow = {
    rowKey: string;
    purchaseInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    remarks: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    gridTaxAmount: number;
    diffTaxAmount: number;
    gridLineAmount: number;
    diffLineAmount: number;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

type PurchaseBookFilters = {
    fromDate: Date | null;
    toDate: Date | null;
    ledgerId: number | null;
    ledgerLabel: string | null;
    cancelled: -1 | 0 | 1;
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

export default function BillingPurchaseBookPage() {
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
    const [appliedFilters, setAppliedFilters] = useState<PurchaseBookFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [loading, setLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<PurchaseBookPage | null>(null);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const statusInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'purchase-book-refresh';

    useEffect(() => {
        setPageTitle('Purchase Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const hasApplied = Boolean(appliedFilters);
    const reportLoading = Boolean(loading && hasApplied);

    const totalRecords = hasApplied ? reportData?.totalCount ?? 0 : 0;
    const totalAmount = hasApplied ? reportData?.totalAmount ?? 0 : 0;
    const totalTaxAmount = hasApplied ? reportData?.totalTaxAmount ?? 0 : 0;
    const totalNetAmount = hasApplied ? reportData?.totalNetAmount ?? 0 : 0;

    const rawRows = useMemo(() => (hasApplied ? reportData?.items ?? [] : []), [hasApplied, reportData?.items]);

    const displayRows = useMemo<PurchaseBookRow[]>(() => {
        return rawRows.map((row) => ({
            rowKey: String(row.purchaseInvoiceId),
            purchaseInvoiceId: Number(row.purchaseInvoiceId),
            voucherNumber: row.voucherNumber ?? null,
            voucherDateText: row.voucherDateText ?? null,
            ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
            ledgerName: row.ledgerName ?? null,
            remarks: row.remarks ?? null,
            totalAmount: row.totalAmount != null ? Number(row.totalAmount) : 0,
            totalTaxAmount: row.totalTaxAmount != null ? Number(row.totalTaxAmount) : 0,
            totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
            gridTaxAmount: Number(row.gridTaxAmount ?? 0),
            diffTaxAmount: Number(row.diffTaxAmount ?? 0),
            gridLineAmount: Number(row.gridLineAmount ?? 0),
            diffLineAmount: Number(row.diffLineAmount ?? 0),
            isCancelled: Boolean(row.isCancelled)
        }));
    }, [rawRows]);

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(rowsPerPage, (index) => ({
                rowKey: `skeleton-${index}`,
                purchaseInvoiceId: 0,
                voucherNumber: '',
                voucherDateText: '',
                ledgerId: null,
                ledgerName: '',
                remarks: '',
                totalAmount: 0,
                totalTaxAmount: 0,
                totalNetAmount: 0,
                gridTaxAmount: 0,
                diffTaxAmount: 0,
                gridLineAmount: 0,
                diffLineAmount: 0,
                isCancelled: false,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const buildQueryVariables = (filters: PurchaseBookFilters, offset: number, limit: number) => ({
        fromDate: filters.fromDate ? toDateText(filters.fromDate) : null,
        toDate: filters.toDate ? toDateText(filters.toDate) : null,
        ledgerId: filters.ledgerId,
        cancelled: filters.cancelled,
        limit,
        offset
    });

    const fetchAllPurchaseBookRows = useCallback(async () => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        try {
            const response = await invoicingApi.fetchPurchaseBook(
                buildQueryVariables(appliedFilters, 0, totalRecords)
            );
            const rows = response?.items ?? [];
            return rows.map((row) => ({
                rowKey: String(row.purchaseInvoiceId),
                purchaseInvoiceId: Number(row.purchaseInvoiceId),
                voucherNumber: row.voucherNumber ?? null,
                voucherDateText: row.voucherDateText ?? null,
                ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
                ledgerName: row.ledgerName ?? null,
                remarks: row.remarks ?? null,
                totalAmount: row.totalAmount != null ? Number(row.totalAmount) : 0,
                totalTaxAmount: row.totalTaxAmount != null ? Number(row.totalTaxAmount) : 0,
                totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
                gridTaxAmount: Number(row.gridTaxAmount ?? 0),
                diffTaxAmount: Number(row.diffTaxAmount ?? 0),
                gridLineAmount: Number(row.gridLineAmount ?? 0),
                diffLineAmount: Number(row.diffLineAmount ?? 0),
                isCancelled: Boolean(row.isCancelled)
            }));
        } catch {
            return displayRows;
        }
    }, [appliedFilters, displayRows, totalRecords]);

    const { isPrinting, printRows, triggerPrint } = useReportPrint<PurchaseBookRow>({
        rows: displayRows,
        getPrintRows: fetchAllPurchaseBookRows
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

    const buildFilters = (): PurchaseBookFilters => ({
        fromDate,
        toDate,
        ledgerId,
        ledgerLabel: selectedLedger?.label ?? null,
        cancelled
    });

    const loadPurchaseBook = async (filters: PurchaseBookFilters, offset: number, limit: number) => {
        setLoading(true);
        setReportError(null);
        try {
            const response = await invoicingApi.fetchPurchaseBook(buildQueryVariables(filters, offset, limit));
            setReportData(response);
        } catch (err) {
            setReportError(err instanceof Error ? err.message : 'Failed to load purchase book');
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
        void loadPurchaseBook(nextFilters, 0, rowsPerPage);
    };

    const handlePageChange = (event: DataTablePageEvent) => {
        setFirst(event.first);
        setRowsPerPage(event.rows);
        if (!appliedFilters) return;
        void loadPurchaseBook(appliedFilters, event.first, event.rows);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Purchase Book (${reportPeriod})` : 'Purchase Book';
    const filterSummary = useMemo(() => {
        if (!appliedFilters) return null;
        const parts: string[] = [];
        const period = formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate);
        if (period) parts.push(`Period: ${period}`);
        if (appliedFilters.ledgerLabel) parts.push(`Party: ${appliedFilters.ledgerLabel}`);
        const statusLabel = resolveStatusLabel(appliedFilters.cancelled);
        if (statusLabel !== 'All') parts.push(`Status: ${statusLabel}`);
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

    const exportColumns = useMemo<ReportExportColumn<PurchaseBookRow>[]>(
        () => [
            { header: 'Entry Id', value: (row) => row.purchaseInvoiceId },
            { header: 'Voucher No', value: (row) => row.voucherNumber ?? '' },
            { header: 'Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Party', value: (row) => row.ledgerName ?? '' },
            { header: 'Ledger Id', value: (row) => (row.ledgerId != null ? String(row.ledgerId) : '') },
            { header: 'Remark', value: (row) => row.remarks ?? '' },
            { header: 'Total Amt', value: (row) => (row.totalAmount ? row.totalAmount.toFixed(2) : '') },
            { header: 'Tax Amt', value: (row) => (row.totalTaxAmount ? row.totalTaxAmount.toFixed(2) : '') },
            { header: 'Grid Tax Amt', value: (row) => (row.gridTaxAmount ? row.gridTaxAmount.toFixed(2) : '') },
            { header: 'Diff Tax Amt', value: (row) => (row.diffTaxAmount ? row.diffTaxAmount.toFixed(2) : '') },
            { header: 'Net Amt', value: (row) => (row.totalNetAmount ? row.totalNetAmount.toFixed(2) : '') },
            { header: 'Grid Line Amt', value: (row) => (row.gridLineAmount ? row.gridLineAmount.toFixed(2) : '') },
            { header: 'Diff Line Amt', value: (row) => (row.diffLineAmount ? row.diffLineAmount.toFixed(2) : '') },
            { header: 'Cancelled', value: (row) => formatFlag(row.isCancelled) },
        ],
        []
    );

    const exportFileName = `purchase-book_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
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
        const rows = await fetchAllPurchaseBookRows();
        return rows.filter((row) => !row.isSkeleton);
    }, [fetchAllPurchaseBookRows]);

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

    const entryBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.purchaseInvoiceId ? String(row.purchaseInvoiceId) : '';

    const invoiceBody = (row: PurchaseBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('5rem'), skeletonCell('6rem'), '');
        }
        return renderTwoLineCell(row.voucherNumber ?? '', formatVoucherDate(row.voucherDateText), '');
    };

    const ledgerAddressBody = (row: PurchaseBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('10rem'), skeletonCell('12rem'));
        }
        const ledgerId = row.ledgerId != null ? Number(row.ledgerId) : 0;
        const ledgerMeta = ledgerId ? ledgerById.get(ledgerId) : undefined;
        const name = row.ledgerName ?? ledgerMeta?.name ?? '';
        const address = ledgerMeta?.address ?? '';
        return renderTwoLineCell(name, address || '');
    };
    const remarksBody = (row: PurchaseBookRow) => (isSkeletonRow(row) ? skeletonCell('8rem') : row.remarks ?? '');
    const amountBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalAmount);
    const taxBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalTaxAmount);
    const netBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalNetAmount);
    const gridTaxBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.gridTaxAmount);
    const diffTaxBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.diffTaxAmount);
    const gridLineBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.gridLineAmount);
    const diffLineBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.diffLineAmount);
    const cancelledBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatFlag(row.isCancelled);
    const ledgerIdBody = (row: PurchaseBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.ledgerId != null ? String(row.ledgerId) : '';

    const totalAmountFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalAmount);
    const totalTaxFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalTaxAmount);
    const totalNetFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalNetAmount);

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
                        <h2 className="m-0">Purchase Book</h2>
                        <p className="mt-2 mb-0 text-600">Purchase invoice register with tax and net totals.</p>
                    </div>
                </div>
                {(reportError || ledgerError) && (
                    <p className="text-red-500 m-0">
                        Error loading purchase book: {reportError || ledgerError?.message}
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
                className="summary-table purchase-book-table"
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load purchase book'}
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
                                inputId="purchase-book-from-date"
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
                                inputId="purchase-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="purchase-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => ledgerInputRef.current?.focus())
                                        }
                                    }}
                                />
                                <label htmlFor="purchase-book-today">Today</label>
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
                                    focusElementById(refreshButtonId);
                                }}
                                style={{ minWidth: '160px' }}
                            />
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
                        refreshDisabled={!canRefresh}
                        printDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        exportDisabled={!hasApplied || reportLoading || totalRecords === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading purchase book...'
                            : `${totalRecords} invoice${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load purchase book'
                }
            >
                <Column field="purchaseInvoiceId" header="Entry No." body={entryBody} style={{ width: '7rem' }} />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Voucher No.</span>
                            <span>Voucher Date</span>
                        </div>
                    }
                    body={invoiceBody}
                    style={{ minWidth: '10rem' }}
                />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Ledger</span>
                            <span className="text-600 text-sm">Address</span>
                        </div>
                    }
                    body={ledgerAddressBody}
                    style={{ minWidth: '18rem' }}
                />
                <Column field="remarks" header="Remark" body={remarksBody} style={{ minWidth: '12rem' }} />
                <Column
                    field="totalAmount"
                    header="Gross"
                    body={amountBody}
                    footer={totalAmountFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalTaxAmount"
                    header="Tax"
                    body={taxBody}
                    footer={totalTaxFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                />
                <Column
                    field="gridTaxAmount"
                    header="Grid Tax"
                    body={gridTaxBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="diffTaxAmount"
                    header="Diff Tax"
                    body={diffTaxBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalNetAmount"
                    header="Net"
                    body={netBody}
                    footer={totalNetFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="gridLineAmount"
                    header="Grid Line"
                    body={gridLineBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="diffLineAmount"
                    header="Diff Line"
                    body={diffLineBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column field="ledgerId" header="Ledger Id" body={ledgerIdBody} style={{ width: '8rem' }} />
                <Column field="isCancelled" header="Cancelled" body={cancelledBody} style={{ width: '7rem' }} />
            </ReportDataTable>
        </div>
    );
}
