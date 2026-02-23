'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import type { DataTablePageEvent } from 'primereact/datatable';
import type { Dropdown } from 'primereact/dropdown';
import { useQuery } from '@apollo/client';
import AppDropdown from '@/components/AppDropdown';
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
import { GST_GSTR1_BOOK_QUERY } from './graphql';
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

type Gstr1SectionKey = 'b2b' | 'b2cl' | 'b2cs' | 'cdnr' | 'cdnur';
type Gstr1SectionFilter = 'all' | Gstr1SectionKey;

const GSTR1_SECTION_LABELS: Record<Gstr1SectionKey, string> = {
    b2b: 'B2B',
    b2cl: 'B2CL',
    b2cs: 'B2CS',
    cdnr: 'CDNR',
    cdnur: 'CDNUR'
};

const GSTR1_SECTION_OPTIONS: Array<{ label: string; value: Gstr1SectionFilter }> = [
    { label: 'All Sections', value: 'all' },
    { label: 'B2B (Registered)', value: 'b2b' },
    { label: 'B2CL (Unregistered > 2.5L)', value: 'b2cl' },
    { label: 'B2CS (Other B2C)', value: 'b2cs' },
    { label: 'CDNR (Notes - Registered)', value: 'cdnr' },
    { label: 'CDNUR (Notes - Unregistered)', value: 'cdnur' }
];

const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;
const GSTR1_RETURN_TYPE_IDS = new Set([6, 10, 15, 18, 24]);

type Gstr1BookItem = {
    voucherId: number;
    voucherTypeId: number | null;
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerId: number | null;
    ledgerName: string | null;
    gstin: string | null;
    placeOfSupply: string | null;
    section: string | null;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
    isCancelled: boolean;
};

type Gstr1BookPage = {
    items: Gstr1BookItem[];
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
};

type Gstr1QueryData = {
    gstGstr1Book: Gstr1BookPage;
};

type Gstr1QueryVariables = {
    fromDate: string;
    toDate: string;
    cancelled: number;
    section?: string | null;
    limit: number;
    offset: number;
};

type Gstr1Row = {
    rowKey: string;
    section: Gstr1SectionKey;
    source: 'Invoice' | 'Sales Return';
    voucherNumber: string | null;
    voucherDateText: string | null;
    ledgerName: string | null;
    gstin: string | null;
    placeOfSupply: string;
    taxableValue: number;
    taxValue: number;
    invoiceValue: number;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

const toNumber = (value: number | null | undefined) => Number(value ?? 0);

const normalizeGstin = (value: string | null | undefined) => {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    if (!normalized) return null;
    return GSTIN_PATTERN.test(normalized) ? normalized : null;
};

const resolveSalesSection = (isRegistered: boolean, invoiceValue: number): Gstr1SectionKey => {
    if (isRegistered) return 'b2b';
    if (invoiceValue > 250000) return 'b2cl';
    return 'b2cs';
};

const resolveSectionLabel = (section: Gstr1SectionFilter) =>
    section === 'all' ? 'All Sections' : GSTR1_SECTION_LABELS[section];

const parseSection = (
    section: string | null,
    voucherTypeId: number | null,
    gstin: string | null,
    invoiceValue: number
): Gstr1SectionKey => {
    const normalized = section?.trim().toLowerCase();
    if (normalized === 'b2b' || normalized === 'b2cl' || normalized === 'b2cs' || normalized === 'cdnr' || normalized === 'cdnur') {
        return normalized;
    }
    if (GSTR1_RETURN_TYPE_IDS.has(Number(voucherTypeId ?? 0))) {
        return gstin ? 'cdnr' : 'cdnur';
    }
    return resolveSalesSection(Boolean(gstin), invoiceValue);
};

const mapGstr1Rows = (items: Gstr1BookItem[]): Gstr1Row[] =>
    items.map((item) => {
        const gstin = normalizeGstin(item.gstin);
        const invoiceValue = toNumber(item.totalNetAmount);
        const section = parseSection(item.section, item.voucherTypeId, gstin, invoiceValue);
        const source: Gstr1Row['source'] = GSTR1_RETURN_TYPE_IDS.has(Number(item.voucherTypeId ?? 0)) ? 'Sales Return' : 'Invoice';

        return {
            rowKey: String(item.voucherId),
            section,
            source,
            voucherNumber: item.voucherNumber ?? null,
            voucherDateText: item.voucherDateText ?? null,
            ledgerName: item.ledgerName ?? null,
            gstin,
            placeOfSupply: item.placeOfSupply?.trim() || (gstin ? 'Registered' : 'Unregistered'),
            taxableValue: toNumber(item.totalAmount),
            taxValue: toNumber(item.totalTaxAmount),
            invoiceValue,
            isCancelled: Boolean(item.isCancelled)
        };
    });

export function Gstr1Report() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();

    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [cancelled, setCancelled] = useState<GstCancelledFilter>(0);
    const [sectionFilter, setSectionFilter] = useState<Gstr1SectionFilter>('all');
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
    const sectionRef = useRef<Dropdown>(null);
    const refreshButtonId = 'gst-gstr1-refresh';

    useEffect(() => {
        setPageTitle('GSTR-1');
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

    useEffect(() => {
        setFirst(0);
    }, [sectionFilter]);

    const queryVariables = useMemo<Gstr1QueryVariables | undefined>(
        () =>
            appliedFilters
                ? {
                      fromDate: toDateText(appliedFilters.fromDate),
                      toDate: toDateText(appliedFilters.toDate),
                      cancelled: appliedFilters.cancelled,
                      section: sectionFilter === 'all' ? null : sectionFilter,
                      limit: rowsPerPage,
                      offset: first
                  }
                : undefined,
        [appliedFilters, first, rowsPerPage, sectionFilter]
    );

    const { data, loading, error } = useQuery<Gstr1QueryData, Gstr1QueryVariables>(GST_GSTR1_BOOK_QUERY, {
        client: apolloClient,
        skip: !appliedFilters,
        variables: queryVariables,
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const hasApplied = Boolean(appliedFilters);
    const pageData = hasApplied ? data?.gstGstr1Book : undefined;
    const displayRows = useMemo(() => mapGstr1Rows(pageData?.items ?? []), [pageData?.items]);
    const totalRecords = hasApplied ? Number(pageData?.totalCount ?? 0) : 0;
    const totalTaxableValue = hasApplied ? toNumber(pageData?.totalAmount) : 0;
    const totalTaxValue = hasApplied ? toNumber(pageData?.totalTaxAmount) : 0;
    const totalInvoiceValue = hasApplied ? toNumber(pageData?.totalNetAmount) : 0;

    const showSkeleton = hasApplied && loading && displayRows.length === 0;
    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(rowsPerPage, (index) => ({
                rowKey: `skeleton-${index}`,
                section: 'b2b' as const,
                source: 'Invoice' as const,
                voucherNumber: '',
                voucherDateText: '',
                ledgerName: '',
                gstin: '',
                placeOfSupply: '',
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
            const { data: fullData } = await apolloClient.query<Gstr1QueryData, Gstr1QueryVariables>({
                query: GST_GSTR1_BOOK_QUERY,
                fetchPolicy: 'network-only',
                variables: {
                    fromDate: toDateText(appliedFilters.fromDate),
                    toDate: toDateText(appliedFilters.toDate),
                    cancelled: appliedFilters.cancelled,
                    section: sectionFilter === 'all' ? null : sectionFilter,
                    limit: totalRecords,
                    offset: 0
                }
            });
            return mapGstr1Rows(fullData?.gstGstr1Book?.items ?? []);
        } catch {
            return displayRows;
        }
    };

    const { isPrinting, printRows, triggerPrint } = useReportPrint<Gstr1Row>({
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

    const handleSectionChange = (value: Gstr1SectionFilter) => {
        setSectionFilter(value);
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

    const focusSectionFilter = () => {
        const element = sectionRef.current?.getInput?.();
        if (element instanceof HTMLElement) {
            element.focus();
            return;
        }
        focusRefreshButton();
    };

    const reportPeriod = hasApplied ? formatDateRangeLabel(appliedFilters?.fromDate ?? null, appliedFilters?.toDate ?? null) : '';
    const sectionLabel = resolveSectionLabel(sectionFilter);
    const reportTitle = reportPeriod ? `GSTR-1 ${sectionLabel} (${reportPeriod})` : `GSTR-1 ${sectionLabel}`;
    const printFooterLeft = [
        lastRefreshedAt ? `Refreshed: ${formatReportTimestamp(lastRefreshedAt)}` : null,
        reportPeriod ? `Period: ${reportPeriod}` : null
    ]
        .filter(Boolean)
        .join(' | ');
    const filterSummary = hasApplied
        ? `Status: ${resolveStatusLabel(appliedFilters?.cancelled ?? -1)} | Section: ${sectionLabel} | Source: Accounts vouchers`
        : null;

    const exportColumns = useMemo<ReportExportColumn<Gstr1Row>[]>(
        () => [
            { header: 'Section', value: (row) => GSTR1_SECTION_LABELS[row.section] },
            { header: 'Source', value: (row) => row.source },
            { header: 'Voucher No.', value: (row) => row.voucherNumber ?? '' },
            { header: 'Voucher Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Party', value: (row) => row.ledgerName ?? '' },
            { header: 'GSTIN', value: (row) => row.gstin ?? '' },
            { header: 'Place of Supply', value: (row) => row.placeOfSupply },
            { header: 'Taxable Value', value: (row) => row.taxableValue.toFixed(2) },
            { header: 'Tax Amount', value: (row) => row.taxValue.toFixed(2) },
            { header: 'Invoice Value', value: (row) => row.invoiceValue.toFixed(2) },
            { header: 'Status', value: (row) => (row.isCancelled ? 'Cancelled' : 'Active') }
        ],
        []
    );

    const exportFileName = `gstr1_${sectionFilter}_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
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
    const recordSummary = hasApplied
        ? `${totalRecords} row${totalRecords === 1 ? '' : 's'} | Taxable ${formatAmount(totalTaxableValue)} | Tax ${formatAmount(totalTaxValue)} | Invoice ${formatAmount(totalInvoiceValue)}`
        : 'Press Refresh to load GSTR-1';

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
                title="GSTR-1"
                subtitle="Section-wise outward supplies and notes (accounts-driven)."
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
            {error && <p className="text-red-500 m-0 mb-3">Error loading GSTR-1: {error.message}</p>}

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
                emptyMessage={showSkeleton ? '' : hasApplied ? 'No results found' : 'Press Refresh to load GSTR-1'}
                headerLeft={
                    <div className="flex flex-wrap gap-3 align-items-end">
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
                            onStatusEnterNext={focusSectionFilter}
                            dateErrors={dateErrors}
                        />
                        <div className="flex flex-column gap-2" style={{ minWidth: '260px' }}>
                            <label htmlFor="gst-gstr1-section" className="font-medium text-sm">
                                Section
                            </label>
                            <AppDropdown
                                id="gst-gstr1-section"
                                ref={sectionRef}
                                value={sectionFilter}
                                options={GSTR1_SECTION_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) =>
                                    handleSectionChange((event.value as Gstr1SectionFilter | null) ?? 'all')
                                }
                                onEnterNext={focusRefreshButton}
                            />
                        </div>
                    </div>
                }
                headerRight={actions}
                recordSummary={recordSummary}
            >
                <Column
                    field="section"
                    header="Section"
                    style={{ minWidth: '110px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : GSTR1_SECTION_LABELS[row.section])}
                />
                <Column
                    field="source"
                    header="Source"
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.source)}
                />
                <Column
                    field="voucherNumber"
                    header="Voucher No."
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('5rem') : row.voucherNumber || '-')}
                />
                <Column
                    field="voucherDateText"
                    header="Voucher Date"
                    style={{ minWidth: '130px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('5rem') : formatVoucherDate(row.voucherDateText))}
                />
                <Column
                    field="ledgerName"
                    header="Party"
                    style={{ minWidth: '220px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('9rem') : row.ledgerName || '-')}
                />
                <Column
                    field="gstin"
                    header="GSTIN"
                    style={{ minWidth: '160px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('8rem') : row.gstin || '-')}
                />
                <Column
                    field="placeOfSupply"
                    header="Place of Supply"
                    style={{ minWidth: '140px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('6rem') : row.placeOfSupply || '-')}
                />
                <Column
                    field="taxableValue"
                    header="Taxable Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '140px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.taxableValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalTaxableValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="taxValue"
                    header="Tax Amount"
                    bodyClassName="summary-number"
                    style={{ minWidth: '130px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.taxValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalTaxValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="invoiceValue"
                    header="Invoice Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '140px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.invoiceValue))}
                    footer={hasApplied && !reportLoading ? formatAmount(totalInvoiceValue) : ''}
                    footerClassName="summary-number"
                />
                <Column
                    field="isCancelled"
                    header="Status"
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr1Row) => (isSkeletonRow(row) ? skeletonCell('3rem') : row.isCancelled ? 'Cancelled' : 'Active')}
                />
            </ReportDataTable>
        </div>
    );
}
