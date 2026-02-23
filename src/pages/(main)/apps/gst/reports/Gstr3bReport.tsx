'use client';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import type { Dropdown } from 'primereact/dropdown';
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
import { GST_GSTR3B_SUMMARY_QUERY } from './graphql';
import { GstReportFilters } from './GstReportFilters';
import {
    formatAmount,
    formatDateRangeLabel,
    resolveFiscalRange,
    resolveStatusLabel,
    toDateText,
    type GstAppliedFilters,
    type GstCancelledFilter
} from './utils';

const VARIANCE_TOLERANCE = 0.01;

type Gstr3bTotals = {
    totalCount: number;
    totalAmount: number;
    totalTaxAmount: number;
    totalNetAmount: number;
};

type Gstr3bSummaryPayload = {
    sales: Gstr3bTotals;
    salesReturn: Gstr3bTotals;
    purchase: Gstr3bTotals;
    purchaseReturn: Gstr3bTotals;
};

type Gstr3bSummaryQueryData = {
    gstGstr3bSummary: Gstr3bSummaryPayload;
};

type Gstr3bSummaryQueryVariables = {
    fromDate: string;
    toDate: string;
    cancelled: number;
};

type Gstr3bReconTotals = {
    salesHeaderTax: number;
    salesGridTax: number;
    salesRows: number;
    purchaseHeaderTax: number;
    purchaseGridTax: number;
    purchaseRows: number;
};

type Gstr3bWorkingRow = {
    rowKey: string;
    section: string;
    particulars: string;
    taxableValue: number;
    taxValue: number;
    note: string;
    isSkeleton?: boolean;
};

type Gstr3bReconRow = {
    rowKey: string;
    check: string;
    sourceA: string;
    sourceAValue: number;
    sourceB: string;
    sourceBValue: number;
    variance: number;
    status: 'Matched' | 'Review';
    note: string;
    isSkeleton?: boolean;
};

type Gstr3bExportRow = {
    rowType: string;
    section: string;
    particulars: string;
    taxableValue: string;
    referenceTaxValue: string;
    taxValue: string;
    variance: string;
    status: string;
    note: string;
};

const toNumber = (value: number | null | undefined) => Number(value ?? 0);
const isVarianceMatched = (value: number) => Math.abs(value) <= VARIANCE_TOLERANCE;
const resolveVarianceStatus = (value: number): 'Matched' | 'Review' => (isVarianceMatched(value) ? 'Matched' : 'Review');
const formatSignedAmount = (value: number) => `${value < 0 ? '-' : ''}${formatAmount(Math.abs(value))}`;

export function Gstr3bReport() {
    const { setPageTitle } = useContext(LayoutContext);
    const { companyContext } = useAuth();
    const companyInfo = useReportCompanyInfo();

    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [cancelled, setCancelled] = useState<GstCancelledFilter>(0);
    const [appliedFilters, setAppliedFilters] = useState<GstAppliedFilters | null>(null);
    const [summaryData, setSummaryData] = useState<Gstr3bSummaryPayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
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
    const refreshButtonId = 'gst-gstr3b-refresh';

    useEffect(() => {
        setPageTitle('GSTR-3B');
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
        if (!appliedFilters) {
            setSummaryData(null);
            setLoading(false);
            setReportError(null);
            return;
        }

        let isCancelled = false;

        const loadReport = async () => {
            setLoading(true);
            setReportError(null);
            setSummaryData(null);
            try {
                const queryVariables: Gstr3bSummaryQueryVariables = {
                    fromDate: toDateText(appliedFilters.fromDate),
                    toDate: toDateText(appliedFilters.toDate),
                    cancelled: appliedFilters.cancelled
                };

                const summaryResponse = await apolloClient.query<Gstr3bSummaryQueryData, Gstr3bSummaryQueryVariables>({
                    query: GST_GSTR3B_SUMMARY_QUERY,
                    variables: queryVariables,
                    fetchPolicy: 'network-only'
                });
                if (isCancelled) return;
                setSummaryData(summaryResponse.data?.gstGstr3bSummary ?? null);
            } catch (error) {
                if (isCancelled) return;
                const message = error instanceof Error ? error.message : 'Unable to load GSTR-3B data';
                setReportError(message);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        void loadReport();

        return () => {
            isCancelled = true;
        };
    }, [appliedFilters]);

    const reconTotals = useMemo<Gstr3bReconTotals | null>(() => {
        if (!summaryData) return null;
        return {
            salesHeaderTax: toNumber(summaryData.sales.totalTaxAmount),
            salesGridTax: toNumber(summaryData.sales.totalTaxAmount),
            salesRows: toNumber(summaryData.sales.totalCount),
            purchaseHeaderTax: toNumber(summaryData.purchase.totalTaxAmount),
            purchaseGridTax: toNumber(summaryData.purchase.totalTaxAmount),
            purchaseRows: toNumber(summaryData.purchase.totalCount)
        };
    }, [summaryData]);

    const hasApplied = Boolean(appliedFilters);
    const reportLoading = hasApplied && loading;
    const actionBusy = hasApplied && loading;

    const salesTaxable = toNumber(summaryData?.sales?.totalAmount);
    const salesTax = toNumber(summaryData?.sales?.totalTaxAmount);
    const salesReturnTaxable = toNumber(summaryData?.salesReturn?.totalAmount);
    const salesReturnTax = toNumber(summaryData?.salesReturn?.totalTaxAmount);
    const purchaseTaxable = toNumber(summaryData?.purchase?.totalAmount);
    const purchaseTax = toNumber(summaryData?.purchase?.totalTaxAmount);
    const purchaseReturnTaxable = toNumber(summaryData?.purchaseReturn?.totalAmount);
    const purchaseReturnTax = toNumber(summaryData?.purchaseReturn?.totalTaxAmount);

    const outwardTaxable = salesTaxable - salesReturnTaxable;
    const outwardTax = salesTax - salesReturnTax;
    const inwardTaxable = purchaseTaxable - purchaseReturnTaxable;
    const inputTaxCredit = purchaseTax - purchaseReturnTax;
    const netTaxPayable = outwardTax - inputTaxCredit;

    const workingRows = useMemo<Gstr3bWorkingRow[]>(
        () => [
            {
                rowKey: '3.1-gross',
                section: '3.1(a)',
                particulars: 'Gross outward taxable supplies (accounts)',
                taxableValue: salesTaxable,
                taxValue: salesTax,
                note: 'Before sales return adjustment'
            },
            {
                rowKey: '3.1-notes',
                section: '3.1(a)-Adj',
                particulars: 'Less: Sales returns / credit notes (accounts)',
                taxableValue: -salesReturnTaxable,
                taxValue: -salesReturnTax,
                note: 'Adjustment from sales return vouchers'
            },
            {
                rowKey: '3.1-net',
                section: '3.1(a)',
                particulars: 'Net outward taxable supplies',
                taxableValue: outwardTaxable,
                taxValue: outwardTax,
                note: 'Used for output GST liability'
            },
            {
                rowKey: '4a-net',
                section: '4(A)',
                particulars: 'Eligible ITC (net purchase tax)',
                taxableValue: inwardTaxable,
                taxValue: inputTaxCredit,
                note: 'Purchase tax minus purchase return tax'
            },
            {
                rowKey: '5.1-net',
                section: '5.1',
                particulars: 'Net GST liability',
                taxableValue: 0,
                taxValue: netTaxPayable,
                note: netTaxPayable >= 0 ? 'Payable' : 'ITC exceeds output liability'
            }
        ],
        [inputTaxCredit, inwardTaxable, netTaxPayable, outwardTax, outwardTaxable, purchaseReturnTax, purchaseReturnTaxable, purchaseTax, purchaseTaxable, salesReturnTax, salesReturnTaxable, salesTax, salesTaxable]
    );

    const salesHeaderTax = toNumber(reconTotals?.salesHeaderTax);
    const salesGridTax = toNumber(reconTotals?.salesGridTax);
    const purchaseHeaderTax = toNumber(reconTotals?.purchaseHeaderTax);
    const purchaseGridTax = toNumber(reconTotals?.purchaseGridTax);

    const salesHeaderVsGridVariance = salesHeaderTax - salesGridTax;
    const salesSummaryVsRowsVariance = salesTax - salesHeaderTax;
    const purchaseHeaderVsGridVariance = purchaseHeaderTax - purchaseGridTax;
    const purchaseSummaryVsRowsVariance = purchaseTax - purchaseHeaderTax;
    const liabilityCheckVariance = netTaxPayable - (outwardTax - inputTaxCredit);

    const reconRows = useMemo<Gstr3bReconRow[]>(
        () => [
            {
                rowKey: 'recon-output-grid',
                check: 'Output Tax Consistency',
                sourceA: 'Sales Header Tax',
                sourceAValue: salesHeaderTax,
                sourceB: 'Sales Line Tax (Accounts)',
                sourceBValue: salesGridTax,
                variance: salesHeaderVsGridVariance,
                status: resolveVarianceStatus(salesHeaderVsGridVariance),
                note: `Loaded sales vouchers: ${toNumber(reconTotals?.salesRows)}`
            },
            {
                rowKey: 'recon-output-summary',
                check: 'Output Tax Coverage',
                sourceA: 'Summary Output Tax',
                sourceAValue: salesTax,
                sourceB: 'Loaded Sales Header Tax',
                sourceBValue: salesHeaderTax,
                variance: salesSummaryVsRowsVariance,
                status: resolveVarianceStatus(salesSummaryVsRowsVariance),
                note: 'Verifies summary coverage from accounts vouchers'
            },
            {
                rowKey: 'recon-input-grid',
                check: 'ITC Tax Consistency',
                sourceA: 'Purchase Header Tax',
                sourceAValue: purchaseHeaderTax,
                sourceB: 'Purchase Line Tax (Accounts)',
                sourceBValue: purchaseGridTax,
                variance: purchaseHeaderVsGridVariance,
                status: resolveVarianceStatus(purchaseHeaderVsGridVariance),
                note: `Loaded purchase vouchers: ${toNumber(reconTotals?.purchaseRows)}`
            },
            {
                rowKey: 'recon-input-summary',
                check: 'ITC Tax Coverage',
                sourceA: 'Summary ITC Tax',
                sourceAValue: purchaseTax,
                sourceB: 'Loaded Purchase Header Tax',
                sourceBValue: purchaseHeaderTax,
                variance: purchaseSummaryVsRowsVariance,
                status: resolveVarianceStatus(purchaseSummaryVsRowsVariance),
                note: 'Verifies summary coverage from accounts vouchers'
            },
            {
                rowKey: 'recon-net-liability',
                check: 'Net Liability Formula',
                sourceA: 'Outward Tax - ITC',
                sourceAValue: outwardTax - inputTaxCredit,
                sourceB: 'Computed Net Liability',
                sourceBValue: netTaxPayable,
                variance: liabilityCheckVariance,
                status: resolveVarianceStatus(liabilityCheckVariance),
                note: 'Internal control check for 3B working sheet'
            }
        ],
        [inputTaxCredit, liabilityCheckVariance, netTaxPayable, outwardTax, purchaseHeaderTax, purchaseHeaderVsGridVariance, purchaseGridTax, purchaseSummaryVsRowsVariance, purchaseTax, reconTotals?.purchaseRows, reconTotals?.salesRows, salesHeaderTax, salesHeaderVsGridVariance, salesGridTax, salesSummaryVsRowsVariance, salesTax]
    );

    const workingSkeletonRows = useMemo(
        () =>
            buildSkeletonRows(5, (index) => ({
                rowKey: `working-skeleton-${index}`,
                section: '',
                particulars: '',
                taxableValue: 0,
                taxValue: 0,
                note: '',
                isSkeleton: true
            })),
        []
    );
    const reconSkeletonRows = useMemo(
        () =>
            buildSkeletonRows(5, (index) => ({
                rowKey: `recon-skeleton-${index}`,
                check: '',
                sourceA: '',
                sourceAValue: 0,
                sourceB: '',
                sourceBValue: 0,
                variance: 0,
                status: 'Matched' as const,
                note: '',
                isSkeleton: true
            })),
        []
    );

    const showWorkingSkeleton = hasApplied && loading && !summaryData;
    const showReconSkeleton = hasApplied && loading && !reconTotals;
    const workingTableRows = showWorkingSkeleton ? workingSkeletonRows : hasApplied && summaryData ? workingRows : [];
    const reconTableRows = showReconSkeleton ? reconSkeletonRows : hasApplied && reconTotals ? reconRows : [];

    const { isPrinting, printRows, triggerPrint } = useReportPrint<Gstr3bWorkingRow>({
        rows: workingRows
    });
    const printedWorkingRows = isPrinting && printRows ? printRows : workingTableRows;

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
        setAppliedFilters({
            fromDate: fromDate as Date,
            toDate: toDate as Date,
            cancelled
        });
        setLastRefreshedAt(new Date());
    };

    const focusRefreshButton = () => {
        const element = document.getElementById(refreshButtonId);
        if (element instanceof HTMLElement) element.focus();
    };

    const reportPeriod = hasApplied ? formatDateRangeLabel(appliedFilters?.fromDate ?? null, appliedFilters?.toDate ?? null) : '';
    const reportTitle = reportPeriod ? `GSTR-3B Working (${reportPeriod})` : 'GSTR-3B Working';
    const printFooterLeft = [
        lastRefreshedAt ? `Refreshed: ${formatReportTimestamp(lastRefreshedAt)}` : null,
        reportPeriod ? `Period: ${reportPeriod}` : null
    ]
        .filter(Boolean)
        .join(' | ');
    const filterSummary = hasApplied
        ? `Status: ${resolveStatusLabel(appliedFilters?.cancelled ?? -1)} | Working + reconciliation from accounts vouchers`
        : null;

    const exportRows = useMemo<Gstr3bExportRow[]>(
        () => [
            ...workingRows.map((row) => ({
                rowType: 'Working',
                section: row.section,
                particulars: row.particulars,
                taxableValue: row.taxableValue.toFixed(2),
                referenceTaxValue: '',
                taxValue: row.taxValue.toFixed(2),
                variance: '',
                status: '',
                note: row.note
            })),
            ...reconRows.map((row) => ({
                rowType: 'Reconciliation',
                section: row.check,
                particulars: `${row.sourceA} vs ${row.sourceB}`,
                taxableValue: '',
                referenceTaxValue: row.sourceAValue.toFixed(2),
                taxValue: row.sourceBValue.toFixed(2),
                variance: row.variance.toFixed(2),
                status: row.status,
                note: row.note
            }))
        ],
        [reconRows, workingRows]
    );

    const exportColumns = useMemo<ReportExportColumn<Gstr3bExportRow>[]>(
        () => [
            { header: 'Row Type', value: (row) => row.rowType },
            { header: 'Section / Check', value: (row) => row.section },
            { header: 'Particulars', value: (row) => row.particulars },
            { header: 'Taxable Value', value: (row) => row.taxableValue },
            { header: 'Reference Tax', value: (row) => row.referenceTaxValue },
            { header: 'Tax Value', value: (row) => row.taxValue },
            { header: 'Variance', value: (row) => row.variance },
            { header: 'Status', value: (row) => row.status },
            { header: 'Note', value: (row) => row.note }
        ],
        []
    );

    const exportFileName = `gstr3b_working_${fromDate ? toDateText(fromDate) : 'all'}_${toDate ? toDateText(toDate) : 'all'}`;
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

    const matchedChecks = reconTotals ? reconRows.filter((row) => row.status === 'Matched').length : 0;
    const canRefresh = Boolean(fromDate && toDate);
    const hasData = Boolean(summaryData && reconTotals);

    const actions = (
        <AppReportActions
            onRefresh={() => handleRefresh()}
            onPrint={(event) => {
                event.currentTarget.blur();
                void triggerPrint();
            }}
            onExportCsv={async () => exportReportCsv({ ...exportContextBase, rows: exportRows })}
            onExportExcel={async () => exportReportExcel({ ...exportContextBase, rows: exportRows })}
            onExportPdf={async () => exportReportPdf({ ...exportContextBase, rows: exportRows })}
            loadingState={reportLoading}
            refreshDisabled={!canRefresh}
            printDisabled={!hasApplied || actionBusy || !hasData}
            exportDisabled={!hasApplied || actionBusy || !hasData}
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
                title="GSTR-3B"
                subtitle="Accounts-based 3B working sheet with reconciliation checks before filing."
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
            {reportError && <p className="text-red-500 m-0 mb-3">Error loading GSTR-3B: {reportError}</p>}

            <ReportDataTable
                value={printedWorkingRows}
                paginator={false}
                rows={Math.max(printedWorkingRows.length, 1)}
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
                emptyMessage={showWorkingSkeleton ? '' : hasApplied ? 'No results found' : 'Press Refresh to load GSTR-3B'}
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
                        ? loading
                            ? 'Loading summary from accounts vouchers...'
                            : `Outward Tax ${formatAmount(outwardTax)} | ITC ${formatAmount(inputTaxCredit)} | Net ${formatAmount(netTaxPayable)}`
                        : 'Press Refresh to load GSTR-3B'
                }
            >
                <Column
                    field="section"
                    header="Section"
                    style={{ minWidth: '100px' }}
                    body={(row: Gstr3bWorkingRow) => (isSkeletonRow(row) ? skeletonCell('3rem') : row.section)}
                />
                <Column
                    field="particulars"
                    header="Particulars"
                    style={{ minWidth: '300px' }}
                    body={(row: Gstr3bWorkingRow) => (isSkeletonRow(row) ? skeletonCell('10rem') : row.particulars)}
                />
                <Column
                    field="taxableValue"
                    header="Taxable Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '150px' }}
                    body={(row: Gstr3bWorkingRow) =>
                        isSkeletonRow(row) ? skeletonCell('4rem') : row.taxableValue < 0 ? formatSignedAmount(row.taxableValue) : formatAmount(row.taxableValue)
                    }
                />
                <Column
                    field="taxValue"
                    header="Tax Value"
                    bodyClassName="summary-number"
                    style={{ minWidth: '150px' }}
                    body={(row: Gstr3bWorkingRow) =>
                        isSkeletonRow(row) ? skeletonCell('4rem') : row.taxValue < 0 ? formatSignedAmount(row.taxValue) : formatAmount(row.taxValue)
                    }
                />
                <Column
                    field="note"
                    header="Notes"
                    style={{ minWidth: '220px' }}
                    body={(row: Gstr3bWorkingRow) => (isSkeletonRow(row) ? skeletonCell('7rem') : row.note)}
                />
            </ReportDataTable>

            <ReportDataTable
                value={reconTableRows}
                paginator={false}
                rows={Math.max(reconTableRows.length, 1)}
                loading={false}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                globalSearchEnabled={false}
                className="summary-table mt-4"
                emptyMessage={showReconSkeleton ? '' : hasApplied ? 'No reconciliation checks available' : 'Press Refresh to run reconciliation checks'}
                recordSummary={
                    hasApplied
                        ? `${matchedChecks}/${reconRows.length} checks matched`
                        : 'Press Refresh to run reconciliation checks'
                }
            >
                <Column
                    field="check"
                    header="Check"
                    style={{ minWidth: '220px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('6rem') : row.check)}
                />
                <Column
                    field="sourceA"
                    header="Reference"
                    style={{ minWidth: '240px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('7rem') : row.sourceA)}
                />
                <Column
                    field="sourceAValue"
                    header="Reference Tax"
                    bodyClassName="summary-number"
                    style={{ minWidth: '150px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.sourceAValue))}
                />
                <Column
                    field="sourceB"
                    header="Compared Against"
                    style={{ minWidth: '240px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('7rem') : row.sourceB)}
                />
                <Column
                    field="sourceBValue"
                    header="Compared Tax"
                    bodyClassName="summary-number"
                    style={{ minWidth: '150px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : formatAmount(row.sourceBValue))}
                />
                <Column
                    field="variance"
                    header="Variance"
                    bodyClassName="summary-number"
                    style={{ minWidth: '130px' }}
                    body={(row: Gstr3bReconRow) => {
                        if (isSkeletonRow(row)) return skeletonCell('4rem');
                        if (Math.abs(row.variance) <= VARIANCE_TOLERANCE) return formatAmount(0);
                        return row.variance < 0 ? formatSignedAmount(row.variance) : formatAmount(row.variance);
                    }}
                />
                <Column
                    field="status"
                    header="Status"
                    style={{ minWidth: '120px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('4rem') : row.status)}
                />
                <Column
                    field="note"
                    header="Notes"
                    style={{ minWidth: '240px' }}
                    body={(row: Gstr3bReconRow) => (isSkeletonRow(row) ? skeletonCell('8rem') : row.note)}
                />
            </ReportDataTable>
        </div>
    );
}
