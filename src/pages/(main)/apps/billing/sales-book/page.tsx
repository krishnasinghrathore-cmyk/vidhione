'use client';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type NormalizedCacheObject, useApolloClient } from '@apollo/client';
import { type AutoCompleteChangeEvent, type AutoCompleteCompleteEvent } from 'primereact/autocomplete';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import type { MenuItem } from 'primereact/menuitem';
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
import type { SalesBookPage } from '@/lib/invoicing/api';
import * as invoicingApi from '@/lib/invoicing/api';
import { buildLoadingSheetRowsFromSaleInvoiceIds } from '@/lib/loadingSheetRows';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { printRowsWithReportTemplate } from '@/lib/reportTemplatePrint';
import { buildSalesBookDetailedRowsFromInvoiceHeaders } from '@/lib/salesBookDetailedRows';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { formatAmount, formatVoucherDate, toDateText } from '../helpers';
import { useLedgerLookup } from '../useLedgerLookup';

type LedgerOption = {
    label: string;
    value: number;
};

type SalesBookRow = {
    rowKey: string;
    saleInvoiceId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    estimateId: number | null;
    ledgerId: number | null;
    ledgerName: string | null;
    ledgerGroupId: number | null;
    ledgerGroupName: string | null;
    otherLedgerId: number | null;
    remarks: string | null;
    billNumber: string | null;
    isVatIncluded: boolean;
    isOtherState: boolean;
    hasScheme: boolean;
    isChecked: boolean;
    deliveryStatus: string | null;
    totalProductDiscountAmount: number;
    totalDisplayAmount: number;
    totalCashDiscountAmount: number;
    totalReplacementAmount: number;
    totalLessSpecialAmount: number;
    totalGrossAmount: number;
    totalQpsDiscountAmount: number;
    totalFinalAmount: number;
    totalQuantity: number;
    totalFreeQuantity: number;
    totalQuantityRateAmount: number;
    totalAdditionalTaxAmount: number;
    totalAmount: number;
    totalTaxAmount: number;
    roundOffAmount: number;
    totalNetAmount: number;
    gridTaxAmount: number;
    diffTaxAmount: number;
    gridFinalAmount: number;
    diffFinalAmount: number;
    cashReceiptAmount: number;
    bankReceiptAmount: number;
    loyaltyAppliedAmount: number;
    loyaltyPointsRedeemed: number;
    giftCertificateAppliedAmount: number;
    giftCertificateApplicationCount: number;
    settlementAppliedAmount: number;
    paidAmount: number;
    returnAmount: number;
    dueAmount: number;
    cashReceiptIds: string | null;
    bankReceiptIds: string | null;
    cashReceiptNumbers: string | null;
    bankReceiptNumbers: string | null;
    creditNoteAmount: number;
    voucherBillAmount: number;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

type SalesBookFilters = {
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
type SalesBookPrintMode = 'summary' | 'book' | 'loading_sheet';

const toTemplateRows = (rows: SalesBookRow[]) =>
    rows.map((row) => ({
        ...row,
        grossAmount: Number(row.totalGrossAmount ?? 0),
        totalTaxAmount: Number(row.totalTaxAmount ?? 0),
        roundOffAmount: Number(row.roundOffAmount ?? 0),
        totalNetAmount: Number(row.totalNetAmount ?? 0),
        isCancelledFlag: row.isCancelled ? 1 : 0,
        statusText: row.isCancelled ? 'Cancelled' : row.deliveryStatus ?? 'Pending'
    })) as Array<Record<string, unknown>>;

export default function BillingSalesBookPage() {
    const apolloClient = useApolloClient();
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
    const [appliedFilters, setAppliedFilters] = useState<SalesBookFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [loading, setLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportData, setReportData] = useState<SalesBookPage | null>(null);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);
    const statusInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'sales-book-refresh';

    useEffect(() => {
        setPageTitle('Sales Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const hasApplied = Boolean(appliedFilters);
    const reportLoading = Boolean(loading && hasApplied);

    const totalRecords = hasApplied ? reportData?.totalCount ?? 0 : 0;
    const totalProductDiscountAmount = hasApplied ? reportData?.totalProductDiscountAmount ?? 0 : 0;
    const totalDisplayAmount = hasApplied ? reportData?.totalDisplayAmount ?? 0 : 0;
    const totalCashDiscountAmount = hasApplied ? reportData?.totalCashDiscountAmount ?? 0 : 0;
    const totalReplacementAmount = hasApplied ? reportData?.totalReplacementAmount ?? 0 : 0;
    const totalLessSpecialAmount = hasApplied ? reportData?.totalLessSpecialAmount ?? 0 : 0;
    const totalGrossAmount = hasApplied ? reportData?.totalGrossAmount ?? 0 : 0;
    const totalQpsDiscountAmount = hasApplied ? reportData?.totalQpsDiscountAmount ?? 0 : 0;
    const totalFinalAmount = hasApplied ? reportData?.totalFinalAmount ?? 0 : 0;
    const totalQuantity = hasApplied ? reportData?.totalQuantity ?? 0 : 0;
    const totalFreeQuantity = hasApplied ? reportData?.totalFreeQuantity ?? 0 : 0;
    const totalQuantityRateAmount = hasApplied ? reportData?.totalQuantityRateAmount ?? 0 : 0;
    const totalAdditionalTaxAmount = hasApplied ? reportData?.totalAdditionalTaxAmount ?? 0 : 0;
    const totalAmount = hasApplied ? reportData?.totalAmount ?? 0 : 0;
    const totalTaxAmount = hasApplied ? reportData?.totalTaxAmount ?? 0 : 0;
    const totalNetAmount = hasApplied ? reportData?.totalNetAmount ?? 0 : 0;
    const roundOffTotal = hasApplied ? reportData?.roundOffTotal ?? 0 : 0;

    const rawRows = useMemo(() => (hasApplied ? reportData?.items ?? [] : []), [hasApplied, reportData?.items]);

    const displayRows = useMemo<SalesBookRow[]>(() => {
        return rawRows.map((row) => ({
            rowKey: String(row.saleInvoiceId),
            saleInvoiceId: Number(row.saleInvoiceId),
            voucherNumber: row.voucherNumber ?? null,
            voucherDateText: row.voucherDateText ?? null,
            estimateId: row.estimateId != null ? Number(row.estimateId) : null,
            ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
            ledgerName: row.ledgerName ?? null,
            ledgerGroupId: row.ledgerGroupId != null ? Number(row.ledgerGroupId) : null,
            ledgerGroupName: row.ledgerGroupName ?? null,
            otherLedgerId: row.otherLedgerId != null ? Number(row.otherLedgerId) : null,
            remarks: row.remarks ?? null,
            billNumber: row.billNumber ?? null,
            isVatIncluded: Boolean(row.isVatIncluded),
            isOtherState: Boolean(row.isOtherState),
            hasScheme: Boolean(row.hasScheme),
            isChecked: Boolean(row.isChecked),
            deliveryStatus: row.deliveryStatus ?? null,
            totalProductDiscountAmount: Number(row.totalProductDiscountAmount ?? 0),
            totalDisplayAmount: Number(row.totalDisplayAmount ?? 0),
            totalCashDiscountAmount: Number(row.totalCashDiscountAmount ?? 0),
            totalReplacementAmount: Number(row.totalReplacementAmount ?? 0),
            totalLessSpecialAmount: Number(row.totalLessSpecialAmount ?? 0),
            totalGrossAmount: Number(row.totalGrossAmount ?? 0),
            totalQpsDiscountAmount: Number(row.totalQpsDiscountAmount ?? 0),
            totalFinalAmount: Number(row.totalFinalAmount ?? 0),
            totalQuantity: Number(row.totalQuantity ?? 0),
            totalFreeQuantity: Number(row.totalFreeQuantity ?? 0),
            totalQuantityRateAmount: Number(row.totalQuantityRateAmount ?? 0),
            totalAdditionalTaxAmount: Number(row.totalAdditionalTaxAmount ?? 0),
            totalAmount: row.totalAmount != null ? Number(row.totalAmount) : 0,
            totalTaxAmount: row.totalTaxAmount != null ? Number(row.totalTaxAmount) : 0,
            roundOffAmount: row.roundOffAmount != null ? Number(row.roundOffAmount) : 0,
            totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
            gridTaxAmount: Number(row.gridTaxAmount ?? 0),
            diffTaxAmount: Number(row.diffTaxAmount ?? 0),
            gridFinalAmount: Number(row.gridFinalAmount ?? 0),
            diffFinalAmount: Number(row.diffFinalAmount ?? 0),
            cashReceiptAmount: Number(row.cashReceiptAmount ?? 0),
            bankReceiptAmount: Number(row.bankReceiptAmount ?? 0),
            loyaltyAppliedAmount: Number(row.loyaltyAppliedAmount ?? 0),
            loyaltyPointsRedeemed: Number(row.loyaltyPointsRedeemed ?? 0),
            giftCertificateAppliedAmount: Number(row.giftCertificateAppliedAmount ?? 0),
            giftCertificateApplicationCount: Number(row.giftCertificateApplicationCount ?? 0),
            settlementAppliedAmount: Number(row.settlementAppliedAmount ?? 0),
            paidAmount: Number(row.paidAmount ?? 0),
            returnAmount: Number(row.returnAmount ?? 0),
            dueAmount: Number(row.dueAmount ?? 0),
            cashReceiptIds: row.cashReceiptIds ?? null,
            bankReceiptIds: row.bankReceiptIds ?? null,
            cashReceiptNumbers: row.cashReceiptNumbers ?? null,
            bankReceiptNumbers: row.bankReceiptNumbers ?? null,
            creditNoteAmount: Number(row.creditNoteAmount ?? 0),
            voucherBillAmount: Number(row.voucherBillAmount ?? 0),
            isCancelled: Boolean(row.isCancelled)
        }));
    }, [rawRows]);

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(rowsPerPage, (index) => ({
                rowKey: `skeleton-${index}`,
                saleInvoiceId: 0,
                voucherNumber: '',
                voucherDateText: '',
                estimateId: null,
                ledgerId: null,
                ledgerName: '',
                ledgerGroupId: null,
                ledgerGroupName: '',
                otherLedgerId: null,
                remarks: '',
                billNumber: '',
                isVatIncluded: false,
                isOtherState: false,
                hasScheme: false,
                isChecked: false,
                deliveryStatus: '',
                totalProductDiscountAmount: 0,
                totalDisplayAmount: 0,
                totalCashDiscountAmount: 0,
                totalReplacementAmount: 0,
                totalLessSpecialAmount: 0,
                totalGrossAmount: 0,
                totalQpsDiscountAmount: 0,
                totalFinalAmount: 0,
                totalQuantity: 0,
                totalFreeQuantity: 0,
                totalQuantityRateAmount: 0,
                totalAdditionalTaxAmount: 0,
                totalAmount: 0,
                totalTaxAmount: 0,
                roundOffAmount: 0,
                totalNetAmount: 0,
                gridTaxAmount: 0,
                diffTaxAmount: 0,
                gridFinalAmount: 0,
                diffFinalAmount: 0,
                cashReceiptAmount: 0,
                bankReceiptAmount: 0,
                loyaltyAppliedAmount: 0,
                loyaltyPointsRedeemed: 0,
                giftCertificateAppliedAmount: 0,
                giftCertificateApplicationCount: 0,
                settlementAppliedAmount: 0,
                paidAmount: 0,
                returnAmount: 0,
                dueAmount: 0,
                cashReceiptIds: null,
                bankReceiptIds: null,
                cashReceiptNumbers: null,
                bankReceiptNumbers: null,
                creditNoteAmount: 0,
                voucherBillAmount: 0,
                isCancelled: false,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const fetchAllSalesBookRows = useCallback(async (): Promise<SalesBookRow[]> => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        try {
            const response = await invoicingApi.fetchSalesBook(buildQueryVariables(appliedFilters, 0, totalRecords));
            const rows = response?.items ?? [];
            return rows.map((row) => ({
                rowKey: String(row.saleInvoiceId),
                saleInvoiceId: Number(row.saleInvoiceId),
                voucherNumber: row.voucherNumber ?? null,
                voucherDateText: row.voucherDateText ?? null,
                estimateId: row.estimateId != null ? Number(row.estimateId) : null,
                ledgerId: row.ledgerId != null ? Number(row.ledgerId) : null,
                ledgerName: row.ledgerName ?? null,
                ledgerGroupId: row.ledgerGroupId != null ? Number(row.ledgerGroupId) : null,
                ledgerGroupName: row.ledgerGroupName ?? null,
                otherLedgerId: row.otherLedgerId != null ? Number(row.otherLedgerId) : null,
                remarks: row.remarks ?? null,
                billNumber: row.billNumber ?? null,
                isVatIncluded: Boolean(row.isVatIncluded),
                isOtherState: Boolean(row.isOtherState),
                hasScheme: Boolean(row.hasScheme),
                isChecked: Boolean(row.isChecked),
                deliveryStatus: row.deliveryStatus ?? null,
                totalProductDiscountAmount: Number(row.totalProductDiscountAmount ?? 0),
                totalDisplayAmount: Number(row.totalDisplayAmount ?? 0),
                totalCashDiscountAmount: Number(row.totalCashDiscountAmount ?? 0),
                totalReplacementAmount: Number(row.totalReplacementAmount ?? 0),
                totalLessSpecialAmount: Number(row.totalLessSpecialAmount ?? 0),
                totalGrossAmount: Number(row.totalGrossAmount ?? 0),
                totalQpsDiscountAmount: Number(row.totalQpsDiscountAmount ?? 0),
                totalFinalAmount: Number(row.totalFinalAmount ?? 0),
                totalQuantity: Number(row.totalQuantity ?? 0),
                totalFreeQuantity: Number(row.totalFreeQuantity ?? 0),
                totalQuantityRateAmount: Number(row.totalQuantityRateAmount ?? 0),
                totalAdditionalTaxAmount: Number(row.totalAdditionalTaxAmount ?? 0),
                totalAmount: row.totalAmount != null ? Number(row.totalAmount) : 0,
                totalTaxAmount: row.totalTaxAmount != null ? Number(row.totalTaxAmount) : 0,
                roundOffAmount: row.roundOffAmount != null ? Number(row.roundOffAmount) : 0,
                totalNetAmount: row.totalNetAmount != null ? Number(row.totalNetAmount) : 0,
                gridTaxAmount: Number(row.gridTaxAmount ?? 0),
                diffTaxAmount: Number(row.diffTaxAmount ?? 0),
                gridFinalAmount: Number(row.gridFinalAmount ?? 0),
                diffFinalAmount: Number(row.diffFinalAmount ?? 0),
                cashReceiptAmount: Number(row.cashReceiptAmount ?? 0),
                bankReceiptAmount: Number(row.bankReceiptAmount ?? 0),
                loyaltyAppliedAmount: Number(row.loyaltyAppliedAmount ?? 0),
                loyaltyPointsRedeemed: Number(row.loyaltyPointsRedeemed ?? 0),
                giftCertificateAppliedAmount: Number(row.giftCertificateAppliedAmount ?? 0),
                giftCertificateApplicationCount: Number(row.giftCertificateApplicationCount ?? 0),
                settlementAppliedAmount: Number(row.settlementAppliedAmount ?? 0),
                paidAmount: Number(row.paidAmount ?? 0),
                returnAmount: Number(row.returnAmount ?? 0),
                dueAmount: Number(row.dueAmount ?? 0),
                cashReceiptIds: row.cashReceiptIds ?? null,
                bankReceiptIds: row.bankReceiptIds ?? null,
                cashReceiptNumbers: row.cashReceiptNumbers ?? null,
                bankReceiptNumbers: row.bankReceiptNumbers ?? null,
                creditNoteAmount: Number(row.creditNoteAmount ?? 0),
                voucherBillAmount: Number(row.voucherBillAmount ?? 0),
                isCancelled: Boolean(row.isCancelled)
            }));
        } catch {
            return displayRows;
        }
    }, [appliedFilters, displayRows, totalRecords]);

    const { isPrinting, printRows, triggerPrint } = useReportPrint<SalesBookRow>({
        rows: displayRows,
        getPrintRows: fetchAllSalesBookRows
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

    const buildFilters = (): SalesBookFilters => ({
        fromDate,
        toDate,
        ledgerId,
        ledgerLabel: selectedLedger?.label ?? null,
        cancelled
    });

    const buildQueryVariables = (filters: SalesBookFilters, offset: number, limit: number) => ({
        fromDate: filters.fromDate ? toDateText(filters.fromDate) : null,
        toDate: filters.toDate ? toDateText(filters.toDate) : null,
        ledgerId: filters.ledgerId,
        cancelled: filters.cancelled,
        limit,
        offset
    });

    const loadSalesBook = async (filters: SalesBookFilters, offset: number, limit: number) => {
        setLoading(true);
        setReportError(null);
        try {
            const response = await invoicingApi.fetchSalesBook(buildQueryVariables(filters, offset, limit));
            setReportData(response);
        } catch (err) {
            setReportError(err instanceof Error ? err.message : 'Failed to load sales book');
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
        void loadSalesBook(nextFilters, 0, rowsPerPage);
    };

    const handlePageChange = (event: DataTablePageEvent) => {
        setFirst(event.first);
        setRowsPerPage(event.rows);
        if (!appliedFilters) return;
        void loadSalesBook(appliedFilters, event.first, event.rows);
    };

    const reportPeriod = useMemo(
        () => (appliedFilters ? formatDateRangeLabel(appliedFilters.fromDate, appliedFilters.toDate) : ''),
        [appliedFilters]
    );
    const reportTitle = reportPeriod ? `Sales Book (${reportPeriod})` : 'Sales Book';
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

    const exportColumns = useMemo<ReportExportColumn<SalesBookRow>[]>(
        () => [
            { header: 'Invoice Id', value: (row) => row.saleInvoiceId },
            { header: 'Estimate Id', value: (row) => (row.estimateId != null ? String(row.estimateId) : '') },
            { header: 'Voucher No', value: (row) => row.voucherNumber ?? '' },
            { header: 'Bill No', value: (row) => row.billNumber ?? '' },
            { header: 'Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Party', value: (row) => row.ledgerName ?? '' },
            { header: 'Ledger Id', value: (row) => (row.ledgerId != null ? String(row.ledgerId) : '') },
            { header: 'Ledger Group Id', value: (row) => (row.ledgerGroupId != null ? String(row.ledgerGroupId) : '') },
            { header: 'Ledger Group', value: (row) => row.ledgerGroupName ?? '' },
            { header: 'Other Ledger Id', value: (row) => (row.otherLedgerId != null ? String(row.otherLedgerId) : '') },
            { header: 'Remark', value: (row) => row.remarks ?? '' },
            { header: 'VAT Included', value: (row) => formatFlag(row.isVatIncluded) },
            { header: 'Scheme', value: (row) => formatFlag(row.hasScheme) },
            { header: 'Other State', value: (row) => formatFlag(row.isOtherState) },
            { header: 'Status', value: (row) => (row.isCancelled ? 'Cancelled' : row.deliveryStatus ?? 'Pending') },
            { header: 'QPS Dis Amt', value: (row) => (row.totalQpsDiscountAmount ? row.totalQpsDiscountAmount.toFixed(2) : '') },
            { header: 'Display Amt', value: (row) => (row.totalDisplayAmount ? row.totalDisplayAmount.toFixed(2) : '') },
            { header: 'Pro Dis Amt', value: (row) => (row.totalProductDiscountAmount ? row.totalProductDiscountAmount.toFixed(2) : '') },
            { header: 'Cash Disc Amt', value: (row) => (row.totalCashDiscountAmount ? row.totalCashDiscountAmount.toFixed(2) : '') },
            { header: 'Qty', value: (row) => (row.totalQuantity ? row.totalQuantity.toFixed(2) : '') },
            { header: 'Free Qty', value: (row) => (row.totalFreeQuantity ? row.totalFreeQuantity.toFixed(2) : '') },
            {
                header: 'Qty Rate Amt',
                value: (row) => (row.totalQuantityRateAmount ? row.totalQuantityRateAmount.toFixed(2) : '')
            },
            {
                header: 'Add Tax Amt',
                value: (row) => (row.totalAdditionalTaxAmount ? row.totalAdditionalTaxAmount.toFixed(2) : '')
            },
            { header: 'Amount', value: (row) => (row.totalAmount ? row.totalAmount.toFixed(2) : '') },
            { header: 'Final Amt', value: (row) => (row.totalFinalAmount ? row.totalFinalAmount.toFixed(2) : '') },
            { header: 'Replacement Amt', value: (row) => (row.totalReplacementAmount ? row.totalReplacementAmount.toFixed(2) : '') },
            { header: 'Less Special Amt', value: (row) => (row.totalLessSpecialAmount ? row.totalLessSpecialAmount.toFixed(2) : '') },
            { header: 'Gross Amt', value: (row) => (row.totalGrossAmount ? row.totalGrossAmount.toFixed(2) : '') },
            { header: 'Tax Amt', value: (row) => (row.totalTaxAmount ? row.totalTaxAmount.toFixed(2) : '') },
            { header: 'Grid Tax Amt', value: (row) => (row.gridTaxAmount ? row.gridTaxAmount.toFixed(2) : '') },
            { header: 'Diff Tax Amt', value: (row) => (row.diffTaxAmount ? row.diffTaxAmount.toFixed(2) : '') },
            { header: 'Round Off', value: (row) => (row.roundOffAmount ? row.roundOffAmount.toFixed(2) : '') },
            { header: 'Net Amt', value: (row) => (row.totalNetAmount ? row.totalNetAmount.toFixed(2) : '') },
            { header: 'Grid Final Amt', value: (row) => (row.gridFinalAmount ? row.gridFinalAmount.toFixed(2) : '') },
            { header: 'Diff Final Amt', value: (row) => (row.diffFinalAmount ? row.diffFinalAmount.toFixed(2) : '') },
            { header: 'Cash Receipt Nos', value: (row) => row.cashReceiptNumbers ?? '' },
            { header: 'Bank Receipt Nos', value: (row) => row.bankReceiptNumbers ?? '' },
            { header: 'Cash Receipt Amt', value: (row) => (row.cashReceiptAmount ? row.cashReceiptAmount.toFixed(2) : '') },
            { header: 'Bank Receipt Amt', value: (row) => (row.bankReceiptAmount ? row.bankReceiptAmount.toFixed(2) : '') },
            { header: 'Loyalty Amt', value: (row) => (row.loyaltyAppliedAmount ? row.loyaltyAppliedAmount.toFixed(2) : '') },
            { header: 'Loyalty Pts', value: (row) => (row.loyaltyPointsRedeemed ? row.loyaltyPointsRedeemed.toFixed(3) : '') },
            { header: 'Gift Cert Amt', value: (row) => (row.giftCertificateAppliedAmount ? row.giftCertificateAppliedAmount.toFixed(2) : '') },
            { header: 'Gift Cert Count', value: (row) => (row.giftCertificateApplicationCount ? String(row.giftCertificateApplicationCount) : '') },
            { header: 'Settlement Amt', value: (row) => (row.settlementAppliedAmount ? row.settlementAppliedAmount.toFixed(2) : '') },
            { header: 'Paid Amt', value: (row) => (row.paidAmount ? row.paidAmount.toFixed(2) : '') },
            { header: 'Credit Note Amt', value: (row) => (row.creditNoteAmount ? row.creditNoteAmount.toFixed(2) : '') },
            { header: 'Voucher Bill Amt', value: (row) => (row.voucherBillAmount ? row.voucherBillAmount.toFixed(2) : '') },
            { header: 'Return Amt', value: (row) => (row.returnAmount ? row.returnAmount.toFixed(2) : '') },
            { header: 'Due Amt', value: (row) => (row.dueAmount ? row.dueAmount.toFixed(2) : '') },
            { header: 'Cash Receipt Ids', value: (row) => row.cashReceiptIds ?? '' },
            { header: 'Bank Receipt Ids', value: (row) => row.bankReceiptIds ?? '' },
            { header: 'Checked', value: (row) => formatFlag(row.isChecked) },
            { header: 'Cancelled', value: (row) => formatFlag(row.isCancelled) },
        ],
        []
    );

    const exportFileName = `sales-book_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
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

    const buildExportRows = useCallback(async () => {
        const rows = await fetchAllSalesBookRows();
        return rows.filter((row) => !row.isSkeleton);
    }, [fetchAllSalesBookRows]);

    const tryTemplatePrint = useCallback(
        async (mode: SalesBookPrintMode, rows: SalesBookRow[]) => {
            if (!rows.length) return false;
            const usageKeysByMode: Record<SalesBookPrintMode, string[]> = {
                summary: ['sale_summary', 'sales_summary', 'summary', 'print.sale_summary', 'print.sales_summary', 'print.summary', 'print'],
                book: ['sale_book', 'sales_book', 'book', 'print.sale_book', 'print.sales_book', 'print.book', 'print'],
                loading_sheet: ['loading_sheet', 'loading-sheet', 'print.loading_sheet', 'print.loading-sheet', 'print']
            };
            const titleByMode: Record<SalesBookPrintMode, string> = {
                summary: 'Sale Summary',
                book: 'Sale Book',
                loading_sheet: 'Loading Sheet'
            };
            const templateRows =
                mode === 'loading_sheet'
                    ? await buildLoadingSheetRowsFromSaleInvoiceIds(rows.map((row) => Number(row.saleInvoiceId ?? 0)))
                    : mode === 'book'
                    ? await buildSalesBookDetailedRowsFromInvoiceHeaders(rows)
                    : toTemplateRows(rows);
            if (!templateRows.length) return false;
            const subtitle = filterSummary ?? `${templateRows.length} row${templateRows.length === 1 ? '' : 's'}`;
            return await printRowsWithReportTemplate({
                apolloClient: apolloClient as unknown as import('@apollo/client').ApolloClient<NormalizedCacheObject>,
                moduleKey: 'invoice',
                usageKeys: usageKeysByMode[mode],
                rows: templateRows,
                title: titleByMode[mode],
                subtitle,
                companyName: companyInfo.name,
                companyAddress: companyInfo.address
            });
        },
        [apolloClient, companyInfo.address, companyInfo.name, filterSummary]
    );

    const handlePrintMode = useCallback(
        (mode: SalesBookPrintMode) => {
            void (async () => {
                const rows = await buildExportRows();
                if (!rows.length) return;
                const handledByTemplate = await tryTemplatePrint(mode, rows);
                if (handledByTemplate) return;
                await triggerPrint();
            })();
        },
        [buildExportRows, triggerPrint, tryTemplatePrint]
    );

    const printMenuItems = useMemo<MenuItem[]>(
        () => [
            {
                label: 'Sale Summary',
                icon: 'pi pi-file',
                command: () => handlePrintMode('summary')
            },
            {
                label: 'Sale Book',
                icon: 'pi pi-book',
                command: () => handlePrintMode('book')
            },
            {
                label: 'Loading Sheet',
                icon: 'pi pi-print',
                command: () => handlePrintMode('loading_sheet')
            }
        ],
        [handlePrintMode]
    );

    const handlePrintClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.currentTarget.blur();
        handlePrintMode('summary');
    };

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

    const invoiceBody = (row: SalesBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('5rem'), skeletonCell('6rem'), '');
        }
        return renderTwoLineCell(row.voucherNumber ?? '', formatVoucherDate(row.voucherDateText), '');
    };

    const ledgerAddressBody = (row: SalesBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('10rem'), skeletonCell('12rem'));
        }
        const ledgerId = row.ledgerId != null ? Number(row.ledgerId) : 0;
        const ledgerMeta = ledgerId ? ledgerById.get(ledgerId) : undefined;
        const name = row.ledgerName ?? ledgerMeta?.name ?? '';
        const address = ledgerMeta?.address ?? '';
        return renderTwoLineCell(name, address || '');
    };
    const remarksBody = (row: SalesBookRow) => (isSkeletonRow(row) ? skeletonCell('8rem') : row.remarks ?? '');
    const flagBody = (value: boolean) => (value ? 'Yes' : 'No');
    const billNumberBody = (row: SalesBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.billNumber ?? '');
    const statusBody = (row: SalesBookRow) => {
        if (isSkeletonRow(row)) return skeletonCell('6rem');
        if (row.isCancelled) return 'Cancelled';
        return row.deliveryStatus ?? 'Pending';
    };
    const checkedBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('3rem') : flagBody(row.isChecked);
    const cancelledBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.isCancelled ? 'Yes' : 'No';
    const vatBody = (row: SalesBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : flagBody(row.isVatIncluded));
    const schemeBody = (row: SalesBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : flagBody(row.hasScheme));
    const otherStateBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : flagBody(row.isOtherState);
    const replacementBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalReplacementAmount);
    const lessSpecialBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalLessSpecialAmount);
    const ledgerGroupIdBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.ledgerGroupId != null ? String(row.ledgerGroupId) : '';
    const ledgerGroupNameBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.ledgerGroupName ?? '';
    const ledgerIdBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.ledgerId != null ? String(row.ledgerId) : '';
    const otherLedgerIdBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.otherLedgerId != null ? String(row.otherLedgerId) : '';
    const saleInvoiceIdBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : String(row.saleInvoiceId);
    const estimateIdBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.estimateId != null ? String(row.estimateId) : '';
    const gridTaxBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.gridTaxAmount);
    const diffTaxBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.diffTaxAmount);
    const gridFinalBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.gridFinalAmount);
    const diffFinalBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.diffFinalAmount);
    const cashReceiptNumbersBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.cashReceiptNumbers ?? '';
    const bankReceiptNumbersBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.bankReceiptNumbers ?? '';
    const paidAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.paidAmount);
    const creditNoteBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.creditNoteAmount);
    const voucherBillBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.voucherBillAmount);
    const returnAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.returnAmount);
    const dueAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.dueAmount);
    const cashReceiptIdsBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.cashReceiptIds ?? '';
    const bankReceiptIdsBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('6rem') : row.bankReceiptIds ?? '';
    const quantityBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalQuantity);
    const freeQuantityBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalFreeQuantity);
    const quantityRateAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalQuantityRateAmount);
    const additionalTaxBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalAdditionalTaxAmount);
    const amountBody = (row: SalesBookRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalAmount));
    const finalAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalFinalAmount);
    const cashReceiptAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.cashReceiptAmount);
    const bankReceiptAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.bankReceiptAmount);
    const loyaltyAppliedAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.loyaltyAppliedAmount);
    const giftCertificateAppliedAmountBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.giftCertificateAppliedAmount);
    const qpsDisplayBody = (row: SalesBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('4rem'), skeletonCell('4rem'), '');
        }
        return renderTwoLineCell(
            formatAmount(row.totalQpsDiscountAmount),
            formatAmount(row.totalDisplayAmount),
            ''
        );
    };

    const discountBody = (row: SalesBookRow) => {
        if (isSkeletonRow(row)) {
            return renderTwoLineCell(skeletonCell('4rem'), skeletonCell('4rem'), '');
        }
        return renderTwoLineCell(
            formatAmount(row.totalProductDiscountAmount),
            formatAmount(row.totalCashDiscountAmount),
            ''
        );
    };
    const grossBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalGrossAmount);
    const taxBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalTaxAmount);
    const roundOffBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('3rem') : formatAmount(row.roundOffAmount);
    const netBody = (row: SalesBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.totalNetAmount);

    const totalQpsDisplayFooter = reportLoading
        ? renderTwoLineCell(skeletonCell('4rem'), skeletonCell('4rem'), '')
        : renderTwoLineCell(formatAmount(totalQpsDiscountAmount), formatAmount(totalDisplayAmount), '');
    const totalDiscountFooter = reportLoading
        ? renderTwoLineCell(skeletonCell('4rem'), skeletonCell('4rem'), '')
        : renderTwoLineCell(formatAmount(totalProductDiscountAmount), formatAmount(totalCashDiscountAmount), '');
    const totalReplacementFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalReplacementAmount);
    const totalLessSpecialFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalLessSpecialAmount);
    const totalGrossFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalGrossAmount);
    const totalTaxFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalTaxAmount);
    const roundOffFooter = reportLoading ? skeletonCell('3rem') : formatAmount(roundOffTotal);
    const totalNetFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalNetAmount);
    const totalFinalFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalFinalAmount);
    const totalQuantityFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalQuantity);
    const totalFreeQuantityFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalFreeQuantity);
    const totalQuantityRateFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalQuantityRateAmount);
    const totalAdditionalTaxFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalAdditionalTaxAmount);
    const totalAmountFooter = reportLoading ? skeletonCell('4rem') : formatAmount(totalAmount);

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
                        <h2 className="m-0">Sales Book</h2>
                        <p className="mt-2 mb-0 text-600">Sales invoice register with gross, tax, and net totals.</p>
                    </div>
                </div>
                {(reportError || ledgerError) && (
                    <p className="text-red-500 m-0">
                        Error loading sales book: {reportError || ledgerError?.message}
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
                className="summary-table sales-book-table"
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load sales book'}
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
                                inputId="sales-book-from-date"
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
                                inputId="sales-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="sales-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(e) => handleTodayToggle(Boolean(e.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => ledgerInputRef.current?.focus())
                                        }
                                    }}
                                />
                                <label htmlFor="sales-book-today">Today</label>
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
                                    clearAppliedFilters();
                                    if (value == null) {
                                        setLedgerQuery('');
                                        setSelectedLedger(null);
                                        setLedgerId(null);
                                        if (shouldFocusStatus) focusStatusDropdown();
                                        return;
                                    }
                                    if (typeof value === 'string') {
                                        setLedgerQuery(value);
                                        setSelectedLedger(null);
                                        setLedgerId(null);
                                        if (shouldFocusStatus) focusStatusDropdown();
                                        return;
                                    }
                                    setLedgerQuery('');
                                    setSelectedLedger(value);
                                    setLedgerId(value.value);
                                    if (shouldFocusStatus) focusStatusDropdown();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key !== 'Enter') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    ledgerEnterRef.current = true;
                                    if (!ledgerPanelOpen) {
                                        ledgerEnterRef.current = false;
                                        focusStatusDropdown();
                                    }
                                }}
                                onBlur={() => {
                                    setLedgerQuery('');
                                    if (!ledgerId) {
                                        setSelectedLedger(null);
                                        return;
                                    }
                                    const match =
                                        ledgerOptions.find((option) => Number(option.value) === Number(ledgerId)) ?? null;
                                    setSelectedLedger(match);
                                }}
                                onDropdownClick={() => {
                                    setLedgerQuery('');
                                    setLedgerSuggestions([...ledgerOptions]);
                                }}
                                onShow={() => setLedgerPanelOpen(true)}
                                onHide={() => {
                                    setLedgerPanelOpen(false);
                                    if (ledgerEnterRef.current) {
                                        ledgerEnterRef.current = false;
                                        focusStatusDropdown();
                                    }
                                }}
                                field="label"
                                loading={ledgerLoading}
                                showEmptyMessage
                                placeholder={ledgerLoading ? 'Loading ledgers...' : 'Select party ledger'}
                                inputId="sales-book-ledger"
                                inputRef={ledgerInputRef}
                                style={{ minWidth: '260px' }}
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
                        printMenuItems={printMenuItems}
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
                            ? 'Loading sales book...'
                            : `${totalRecords} invoice${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load sales book'
                }
            >
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Inv. No.</span>
                            <span>Inv. Date</span>
                        </div>
                    }
                    body={invoiceBody}
                    style={{ minWidth: '10rem' }}
                />
                <Column field="saleInvoiceId" header="Inv. Id" body={saleInvoiceIdBody} style={{ width: '7rem' }} />
                <Column field="billNumber" header="Bill No" body={billNumberBody} style={{ width: '8rem' }} />
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
                <Column field="ledgerGroupName" header="Group" body={ledgerGroupNameBody} style={{ minWidth: '10rem' }} />
                <Column field="remarks" header="Remark" body={remarksBody} style={{ minWidth: '12rem' }} />
                <Column field="isVatIncluded" header="VAT Incl." body={vatBody} style={{ width: '7rem' }} />
                <Column field="hasScheme" header="Scheme" body={schemeBody} style={{ width: '7rem' }} />
                <Column field="isOtherState" header="Other State" body={otherStateBody} style={{ width: '8rem' }} />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>QPS Amt</span>
                            <span>Display Amt</span>
                        </div>
                    }
                    body={qpsDisplayBody}
                    footer={totalQpsDisplayFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '10rem' }}
                />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Pro Dis.</span>
                            <span>Cash Disc.</span>
                        </div>
                    }
                    body={discountBody}
                    footer={totalDiscountFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '10rem' }}
                />
                <Column
                    field="totalQuantity"
                    header="Qty"
                    body={quantityBody}
                    footer={totalQuantityFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                />
                <Column
                    field="totalFreeQuantity"
                    header="Free Qty"
                    body={freeQuantityBody}
                    footer={totalFreeQuantityFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
                />
                <Column
                    field="totalQuantityRateAmount"
                    header="Qty Rate"
                    body={quantityRateAmountBody}
                    footer={totalQuantityRateFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalAdditionalTaxAmount"
                    header="Add Tax"
                    body={additionalTaxBody}
                    footer={totalAdditionalTaxFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalAmount"
                    header="Amount"
                    body={amountBody}
                    footer={totalAmountFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalFinalAmount"
                    header="Final"
                    body={finalAmountBody}
                    footer={totalFinalFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalReplacementAmount"
                    header="Replacement"
                    body={replacementBody}
                    footer={totalReplacementFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalLessSpecialAmount"
                    header="Less Special"
                    body={lessSpecialBody}
                    footer={totalLessSpecialFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="totalGrossAmount"
                    header="Gross"
                    body={grossBody}
                    footer={totalGrossFooter}
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
                    field="roundOffAmount"
                    header="R/Off"
                    body={roundOffBody}
                    footer={roundOffFooter}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    footerClassName="summary-number"
                    style={{ width: '7rem' }}
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
                    field="gridFinalAmount"
                    header="Grid Final"
                    body={gridFinalBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="diffFinalAmount"
                    header="Diff Final"
                    body={diffFinalBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column field="cashReceiptNumbers" header="Cash Rcpt No" body={cashReceiptNumbersBody} style={{ width: '10rem' }} />
                <Column field="bankReceiptNumbers" header="Bank Rcpt No" body={bankReceiptNumbersBody} style={{ width: '10rem' }} />
                <Column
                    field="cashReceiptAmount"
                    header="Cash Rcpt Amt"
                    body={cashReceiptAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '9rem' }}
                />
                <Column
                    field="bankReceiptAmount"
                    header="Bank Rcpt Amt"
                    body={bankReceiptAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '9rem' }}
                />
                <Column
                    field="loyaltyAppliedAmount"
                    header="Loyalty"
                    body={loyaltyAppliedAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="giftCertificateAppliedAmount"
                    header="Gift Cert"
                    body={giftCertificateAppliedAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="paidAmount"
                    header="Paid"
                    body={paidAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="creditNoteAmount"
                    header="Credit Note"
                    body={creditNoteBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="voucherBillAmount"
                    header="Voucher Bill"
                    body={voucherBillBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '9rem' }}
                />
                <Column
                    field="returnAmount"
                    header="Return"
                    body={returnAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column
                    field="dueAmount"
                    header="Due"
                    body={dueAmountBody}
                    headerClassName="summary-number"
                    bodyClassName="summary-number"
                    style={{ width: '8rem' }}
                />
                <Column field="cashReceiptIds" header="Cash Rcpt Id" body={cashReceiptIdsBody} style={{ width: '9rem' }} />
                <Column field="bankReceiptIds" header="Bank Rcpt Id" body={bankReceiptIdsBody} style={{ width: '9rem' }} />
                <Column field="ledgerGroupId" header="Group Id" body={ledgerGroupIdBody} style={{ width: '8rem' }} />
                <Column field="ledgerId" header="Ledger Id" body={ledgerIdBody} style={{ width: '8rem' }} />
                <Column field="otherLedgerId" header="Other Ledger Id" body={otherLedgerIdBody} style={{ width: '10rem' }} />
                <Column field="estimateId" header="Estimate Id" body={estimateIdBody} style={{ width: '9rem' }} />
                <Column field="deliveryStatus" header="Status" body={statusBody} style={{ width: '8rem' }} />
                <Column field="isChecked" header="Checked" body={checkedBody} style={{ width: '6rem' }} />
                <Column field="isCancelled" header="Cancelled" body={cancelledBody} style={{ width: '7rem' }} />
            </ReportDataTable>
        </div>
    );
}
