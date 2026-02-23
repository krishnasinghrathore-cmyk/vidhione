'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { useQuery } from '@apollo/client';
import { ReportDataTable } from '@/components/ReportDataTable';
import { ReportHeader } from '@/components/ReportHeader';
import { ReportRegisterSearch } from '@/components/ReportRegisterSearch';
import AppReportActions from '@/components/AppReportActions';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import { apolloClient } from '@/lib/apolloClient';
import { useAuth } from '@/lib/auth/context';
import { formatReportTimestamp, useReportPrint } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { LayoutContext } from '@/layout/context/layoutcontext';
import { GST_GSTR2_BOOK_QUERY } from './graphql';
import { GstReportFilters } from './GstReportFilters';
import {
    formatAmount,
    formatDateRangeLabel,
    formatVoucherDate,
    resolveFiscalRange,
    resolveStatusLabel,
    toDateText,
    type GstAppliedFilters,
    type GstCancelledFilter
} from './utils';

type Gstr2BookItem = {
    voucherId: number;
    voucherTypeId: number | null;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    isCancelled: boolean;
};

type Gstr2BookPage = {
    items: Gstr2BookItem[];
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
};

type Gstr2QueryData = {
    gstGstr2Book: Gstr2BookPage;
};

type Gstr2QueryVariables = {
    fromDate: string;
    toDate: string;
    cancelled: number;
    limit: number;
    offset: number;
};

type Gstr2Row = {
    rowKey: string;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerName: string | null;
    taxableValue: number;
    taxValue: number;
    invoiceValue: number;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

const mapGstr2Rows = (items: Gstr2BookItem[]): Gstr2Row[] =>
    items.map((item) => ({
        rowKey: String(item.voucherId),
        voucherNumber: item.voucherNumber ?? null,
        voucherDateText: item.voucherDateText ?? null,
        ledgerName: item.ledgerName ?? null,
        taxableValue: Number(item.totalAmount ?? 0),
        taxValue: Number(item.totalTaxAmount ?? 0),
        invoiceValue: Number(item.totalNetAmount ?? 0),
        isCancelled: Boolean(item.isCancelled)
    }));

export function Gstr2Report() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();
    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [cancelled, setCancelled] = useState<GstCancelledFilter>(0);
    const [appliedFilters, setAppliedFilters] = useState<GstAppliedFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(20);
    const [first, setFirst] = useState(0);
    const [globalSearchText, setGlobalSearchText] = useState('');
    const [globalSearchMatchCase, setGlobalSearchMatchCase] = useState(false);
    const [globalSearchWholeWord, setGlobalSearchWholeWord] = useState(false);
    const initialRangeRef = useRef(resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null));
    const [fromDate, setFromDate] = useState<Date | null>(initialRangeRef.current.start ?? null);
    const [toDate, setToDate] = useState<Date | null>(initialRangeRef.current.end ?? null);
    const hasTouchedDatesRef = useRef(false);
    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const statusRef = useRef<Dropdown>(null);
    const refreshButtonId = 'gst-gstr2-refresh';

    useEffect(() => {
        setPageTitle('GSTR-2');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    useEffect(() => {
        if (hasTouchedDatesRef.current) return;
        const range = resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null);
        setFromDate(range.start ?? null);
        setToDate(range.end ?? null);
    }, [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]);

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const queryVariables = useMemo<Gstr2QueryVariables | undefined>(
        () =>
            appliedFilters
                ? {
                      fromDate: toDateText(appliedFilters.fromDate),
                      toDate: toDateText(appliedFilters.toDate),
                      cancelled: appliedFilters.cancelled,
                      limit: rowsPerPage,
                      offset: first
                  }
                : undefined,
        [appliedFilters, first, rowsPerPage]
    );

    const { data, loading, error } = useQuery<Gstr2QueryData, Gstr2QueryVariables>(GST_GSTR2_BOOK_QUERY, {
        client: apolloClient,
        skip: !appliedFilters,
        variables: queryVariables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const hasApplied = Boolean(appliedFilters);
    const pageData = hasApplied ? data?.gstGstr2Book : undefined;
    const displayRows = useMemo(() => mapGstr2Rows(pageData?.items ?? []), [pageData?.items]);
    const totalRecords = hasApplied ? pageData?.totalCount ?? 0 : 0;
    const totalTaxableValue = hasApplied ? Number(pageData?.totalAmount ?? 0) : 0;
    const totalTaxValue = hasApplied ? Number(pageData?.totalTaxAmount ?? 0) : 0;
    const totalInvoiceValue = hasApplied ? Number(pageData?.totalNetAmount ?? 0) : 0;
    const showSkeleton = hasApplied && loading && displayRows.length === 0;
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(rowsPerPage, (index) => ({
                rowKey: `skeleton-${index}`,
                voucherNumber: '',
                voucherDateText: '',
                ledgerName: '',
                taxableValue: 0,
                taxValue: 0,
                invoiceValue: 0,
                isCancelled: false,
                isSkeleton: true
            })),
        [rowsPerPage]
    );
    const reportRows = showSkeleton ? skeletonRows : displayRows;
    const reportLoading = hasApplied && loading;

    const fetchAllRows = async () => {
        if (!appliedFilters) return displayRows;
        if (totalRecords <= displayRows.length) return displayRows;
        try {
            const { data: fullData } = await apolloClient.query<Gstr2QueryData, Gstr2QueryVariables>({
                query: GST_GSTR2_BOOK_QUERY,
                fetchPolicy: 'network-only',
                variables: {
                    fromDate: toDateText(appliedFilters.fromDate),
                    toDate: toDateText(appliedFilters.toDate),
                    cancelled: appliedFilters.cancelled,
                    limit: totalRecords,
                    offset: 0
                }
            });
            return mapGstr2Rows(fullData?.gstGstr2Book?.items ?? []);
        } catch {
            return displayRows;
        }
    };

    const { isPrinting, printRows, triggerPrint } = useReportPrint<Gstr2Row>({
        rows: displayRows,
        getPrintRows: fetchAllRows
    });

    const tableRows = isPrinting && printRows ? printRows : reportRows;
    const tablePageSize = isPrinting ? Math.max(tableRows.length, 1) : rowsPerPage;

    const handleFromDateChange = (value: Date | null) => {
        hasTouchedDatesRef.current = true;
        setFromDate(value);
        setDateErrors({});
        setAppliedFilters(null);
    };

    const handleToDateChange = (value: Date | null) => {
        hasTouchedDatesRef.current = true;
        setToDate(value);
        setDateErrors({});
        setAppliedFilters(null);
    };

    const handleStatusChange = (value: GstCancelledFilter) => {
        setCancelled(value);
        setAppliedFilters(null);
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate });
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }
        setDateErrors({});
        setFirst(0);
        setAppliedFilters({
            fromDate: fromDate as Date,
            toDate: toDate as Date,
            cancelled
        });
        setLastRefreshedAt(new Date());
    };

    const handlePage = (event: DataTablePageEvent) => {
        setRowsPerPage(event.rows);
        setFirst(event.first);
    };

    const focusRefreshButton = () => {
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

    const reportPeriod = hasApplied ? formatDateRangeLabel(appliedFilters?.fromDate ?? null, appliedFilters?.toDate ?? null) : '';
    const reportTitle = reportPeriod ? `GSTR-2 (${reportPeriod})` : 'GSTR-2';
    const printFooterLeft = [
        lastRefreshedAt ? `Refreshed: ${formatReportTimestamp(lastRefreshedAt)}` : null,
        reportPeriod ? `Period: ${reportPeriod}` : null
    ]
        .filter(Boolean)
        .join(' | ');
    const filterSummary = hasApplied ? `Status: ${resolveStatusLabel(appliedFilters?.cancelled ?? -1)} | Source: Accounts vouchers` : null;

    const exportColumns = useMemo<ReportExportColumn<Gstr2Row>[]>(
        () => [
            { header: 'Voucher No.', value: (row) => row.voucherNumber ?? '' },
            { header: 'Voucher Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Party', value: (row) => row.ledgerName ?? '' },
            { header: 'Taxable Value', value: (row) => row.taxableValue.toFixed(2) },
            { header: 'Tax Amount', value: (row) => row.taxValue.toFixed(2) },
            { header: 'Invoice Value', value: (row) => row.invoiceValue.toFixed(2) },
            { header: 'Status', value: (row) => (row.isCancelled ? 'Cancelled' : 'Active') }
        ],
        []
    );
    const exportFileName = `gstr2_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
    const exportContextBase = useMemo(
        () => ({
            fileName: exportFileName,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary ?? undefined,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft || undefined
        }),
        [companyInfo.address, companyInfo.name, exportColumns, exportFileName, filterSummary, printFooterLeft, reportTitle]
    );
    const buildExportRows = async () => {
        const rows = await fetchAllRows();
        return rows.filter((row) => !row.isSkeleton);
    };

    const canRefresh = Boolean(fromDate && toDate);
    const hasData = totalRecords > 0;
    const actions = (
        <AppReportActions
            onRefresh={() => handleRefresh()}
            onPrint={(event) => {
                event.currentTarget.blur();
                void triggerPrint();
            }}
            onExportCsv={async () => exportReportCsv({ ...exportContextBase, rows: await buildExportRows() })}
            onExportExcel={async () => exportReportExcel({ ...exportContextBase, rows: await buildExportRows() })}
            onExportPdf={async () => exportReportPdf({ ...exportContextBase, rows: await buildExportRows() })}
            loadingState={reportLoading}
            refreshDisabled={!canRefresh}
            printDisabled={!hasApplied || reportLoading || !hasData}
            exportDisabled={!hasApplied || reportLoading || !hasData}
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
            <ReportPrintFooter left={printFooterLeft || undefined} />
            <ReportHeader
                title="GSTR-2"
                subtitle="Standardized inward supplies report (accounts-driven)."
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
            {error && <p className="text-red-500 m-0 mb-3">Error loading GSTR-2: {error.message}</p>}

            <ReportDataTable
                value={tableRows}
                paginator={!isPrinting}
                rows={tablePageSize}
                rowsPerPageOptions={isPrinting ? undefined : [10, 20, 50, 100]}
                totalRecords={hasApplied ? totalRecords : 0}
                lazy={!isPrinting}
                first={isPrinting ? 0 : first}
                onPage={handlePage}
                loading={false}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                globalSearchRenderInTableHeader={false}
                globalSearchValue={globalSearchText}
                onGlobalSearchValueChange={setGlobalSearchText}
                globalSearchMatchCase={globalSearchMatchCase}
                onGlobalSearchMatchCaseChange={setGlobalSearchMatchCase}
                globalSearchWholeWord={globalSearchWholeWord}
                onGlobalSearchWholeWordChange={setGlobalSearchWholeWord}
                className="summary-table"
                emptyMessage={showSkeleton ? '' : hasApplied ? 'No results found' : 'Press Refresh to load GSTR-2'}
                headerLeft={
                    <GstReportFilters
                        fromDate={fromDate}
                        toDate={toDate}
                        onFromDateChange={handleFromDateChange}
                        onToDateChange={handleToDateChange}
                        fiscalYearStart={fiscalRange.start}
                        fiscalYearEnd={fiscalRange.end}
                        fromDateInputRef={fromDateInputRef}
                        toDateInputRef={toDateInputRef}
                        statusRef={statusRef}
                        cancelled={cancelled}
                        onCancelledChange={handleStatusChange}
                        onStatusEnterNext={focusRefreshButton}
                        dateErrors={dateErrors}
                    />
                }
                headerRight={actions}
                recordSummary={
                    hasApplied
                        ? `${totalRecords} invoice${totalRecords === 1 ? '' : 's'} | Taxable ${formatAmount(totalTaxableValue)} | Tax ${formatAmount(totalTaxValue)} | Invoice ${formatAmount(totalInvoiceValue)}`
                        : 'Press Refresh to load GSTR-2'
                }
            >
                <Column
                    field="voucherNumber"
                    header="Voucher No."
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherNumber || '-')}
                />
                <Column
                    field="voucherDateText"
                    header="Voucher Date"
                    style={{ minWidth: '130px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('5rem') : formatVoucherDate(row.voucherDateText))}
                />
                <Column
                    field="ledgerName"
                    header="Party"
                    style={{ minWidth: '220px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('9rem') : row.ledgerName || '-')}
                />
                <Column
                    field="taxableValue"
                    header="Taxable Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '140px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.taxableValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalTaxableValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="taxValue"
                    header="Tax Amount"
                    bodyClassName="summary-number"
                    style={{ minWidth: '130px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.taxValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalTaxValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="invoiceValue"
                    header="Invoice Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '140px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.invoiceValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalInvoiceValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="isCancelled"
                    header="Status"
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr2Row) => (isSkeletonRow(row) ? skeletonCell('3rem') : row.isCancelled ? 'Cancelled' : 'Active')}
                />
            </ReportDataTable>
        </div>
    );
}
