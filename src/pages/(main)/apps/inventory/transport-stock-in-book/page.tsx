'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { Dialog } from 'primereact/dialog';
import type { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatAmount, formatVoucherDate, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { validateDateRange, type DateRangeErrors } from '@/lib/reportDateValidation';
import { formatReportTimestamp } from '@/lib/reportPrint';
import { useReportCompanyInfo } from '@/lib/reportCompany';
import { exportReportCsv, exportReportExcel, exportReportPdf, type ReportExportColumn } from '@/lib/reportExport';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { LayoutContext } from '@/layout/context/layoutcontext';

type SelectOption = {
    label: string;
    value: number | null;
    productBrandId?: number | null;
};

type StockInBookFilters = {
    fromDate: Date;
    toDate: Date;
    itemBrandId: number | null;
    itemId: number | null;
    cancelled: -1 | 0 | 1;
};

type ClosingStockBookRow = {
    rowKey: string;
    stockInId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    itemBrandName: string | null;
    isCancelled: boolean;
    isSkeleton?: boolean;
};

type ClosingStockLineRow = {
    itemName: string | null;
    hsnCode: string | null;
    unitName: string | null;
    quantity: number | null;
    mrp: number | null;
    margin: number | null;
    sellingRate: number | null;
    dMargin: number | null;
    cost: number | null;
    taxName: string | null;
    beforeVatRate: number | null;
    schemeRate: number | null;
    schemeAmount: number | null;
    landingCost: number | null;
    landingAmount: number | null;
};

type ClosingStockBookQueryData = {
    closingStockBook: {
        items: Array<{
            stockInId: number;
            voucherNumber: string | null;
            voucherDateText: string | null;
            itemBrandName: string | null;
            isCancelled: boolean;
        }>;
    };
};

type ClosingStockBookQueryVariables = {
    input?: {
        fromDate?: string | null;
        toDate?: string | null;
        itemBrandId?: number | null;
        itemId?: number | null;
        cancelled?: number | null;
    } | null;
};

type ClosingStockLinesQueryData = {
    closingStockLines: ClosingStockLineRow[];
};

type ClosingStockLinesQueryVariables = {
    stockInId: number;
    itemId?: number | null;
};

type ProductBrandsQueryData = {
    productBrands: Array<{
        productBrandId: number;
        name: string | null;
    }>;
};

type ProductsQueryData = {
    products: Array<{
        productId: number;
        name: string | null;
        productBrandId: number | null;
    }>;
};

const CLOSING_STOCK_BOOK = gql`
    query ClosingStockBook($input: ClosingStockBookInput) {
        closingStockBook(input: $input) {
            items {
                stockInId
                voucherNumber
                voucherDateText
                itemBrandName
                isCancelled
            }
        }
    }
`;

const CLOSING_STOCK_LINES = gql`
    query ClosingStockLines($stockInId: Int!, $itemId: Int) {
        closingStockLines(stockInId: $stockInId, itemId: $itemId) {
            itemName
            hsnCode
            unitName
            quantity
            mrp
            margin
            sellingRate
            dMargin
            cost
            taxName
            beforeVatRate
            schemeRate
            schemeAmount
            landingCost
            landingAmount
        }
    }
`;

const PRODUCT_BRANDS = gql`
    query ProductBrands {
        productBrands {
            productBrandId
            name
        }
    }
`;

const PRODUCTS = gql`
    query Products($limit: Int) {
        products(limit: $limit) {
            productId
            name
            productBrandId
        }
    }
`;

const statusOptions: Array<{ label: string; value: -1 | 0 | 1 }> = [
    { label: 'All', value: -1 },
    { label: 'Active', value: 0 },
    { label: 'Cancelled', value: 1 }
];

const resolveStatusLabel = (value: number) => statusOptions.find((option) => option.value === value)?.label ?? 'All';

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

const parseNumber = (value: number | null | undefined) => (value == null ? null : Number(value));

const buildBookInput = (filters: StockInBookFilters): ClosingStockBookQueryVariables['input'] => ({
    fromDate: toDateText(filters.fromDate),
    toDate: toDateText(filters.toDate),
    itemBrandId: filters.itemBrandId,
    itemId: filters.itemId,
    cancelled: filters.cancelled
});

export default function InventoryTransportStockInBookPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const { companyContext } = useAuth();

    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [todayOnly, setTodayOnly] = useState(true);
    const [itemBrandId, setItemBrandId] = useState<number | null>(null);
    const [itemId, setItemId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [appliedFilters, setAppliedFilters] = useState<StockInBookFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);
    const [selectedHeader, setSelectedHeader] = useState<ClosingStockBookRow | null>(null);
    const [linesDialogVisible, setLinesDialogVisible] = useState(false);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const brandInputRef = useRef<Dropdown>(null);
    const itemInputRef = useRef<Dropdown>(null);
    const statusInputRef = useRef<Dropdown>(null);
    const refreshButtonId = 'transport-stock-in-book-refresh';

    useEffect(() => {
        setPageTitle('Transport Stock In Book');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const {
        data: brandData,
        loading: brandLoading,
        error: brandError
    } = useQuery<ProductBrandsQueryData>(PRODUCT_BRANDS, {
        client: inventoryApolloClient,
        fetchPolicy: 'cache-first'
    });

    const {
        data: productData,
        loading: productLoading,
        error: productError
    } = useQuery<ProductsQueryData>(PRODUCTS, {
        client: inventoryApolloClient,
        variables: { limit: 3000 },
        fetchPolicy: 'cache-first'
    });

    const queryVariables = useMemo<ClosingStockBookQueryVariables>(() => ({
        input: appliedFilters ? buildBookInput(appliedFilters) : null
    }), [appliedFilters]);

    const {
        data,
        loading,
        error,
        refetch
    } = useQuery<ClosingStockBookQueryData, ClosingStockBookQueryVariables>(CLOSING_STOCK_BOOK, {
        client: inventoryApolloClient,
        variables: queryVariables,
        skip: !appliedFilters,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const [loadLines, { data: linesData, loading: linesLoading, error: linesError }] = useLazyQuery<
        ClosingStockLinesQueryData,
        ClosingStockLinesQueryVariables
    >(CLOSING_STOCK_LINES, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const brandOptions = useMemo<SelectOption[]>(() => {
        const rows = brandData?.productBrands ?? [];
        const mapped = rows
            .map((row) => ({
                label: row.name?.trim() || `Brand ${row.productBrandId}`,
                value: Number(row.productBrandId)
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
        return [{ label: 'All brands', value: null }, ...mapped];
    }, [brandData?.productBrands]);

    const itemOptions = useMemo<SelectOption[]>(() => {
        const rows = productData?.products ?? [];
        const mapped = rows
            .filter((row) => (itemBrandId == null ? true : Number(row.productBrandId ?? 0) === itemBrandId))
            .map((row) => ({
                label: row.name?.trim() || `Item ${row.productId}`,
                value: Number(row.productId),
                productBrandId: parseNumber(row.productBrandId)
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
        return [{ label: 'All items', value: null }, ...mapped];
    }, [itemBrandId, productData?.products]);

    const hasApplied = Boolean(appliedFilters);
    const rawRows = useMemo(() => (hasApplied ? data?.closingStockBook?.items ?? [] : []), [data, hasApplied]);

    const displayRows = useMemo<ClosingStockBookRow[]>(() => {
        return rawRows.map((row) => ({
            rowKey: String(row.stockInId),
            stockInId: Number(row.stockInId),
            voucherNumber: row.voucherNumber ?? null,
            voucherDateText: row.voucherDateText ?? null,
            itemBrandName: row.itemBrandName ?? null,
            isCancelled: Boolean(row.isCancelled)
        }));
    }, [rawRows]);

    const reportLoading = Boolean(hasApplied && loading);
    const showSkeletonRows = reportLoading && displayRows.length === 0;

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(Math.min(rowsPerPage, 10), (idx) => ({
                rowKey: `skeleton-${idx}`,
                stockInId: 0,
                voucherNumber: null,
                voucherDateText: null,
                itemBrandName: null,
                isCancelled: false,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const tableRows = showSkeletonRows ? skeletonRows : displayRows;
    const totalRecords = hasApplied ? displayRows.length : 0;
    const cancelledCount = hasApplied ? displayRows.filter((row) => row.isCancelled).length : 0;

    const detailLines = useMemo(() => linesData?.closingStockLines ?? [], [linesData?.closingStockLines]);

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setFirst(0);
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
        setFromDate(fiscalRange.start ?? null);
        setToDate(fiscalRange.end ?? new Date());
    };

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

    const handleCheckboxEnter = (next: () => void) => (event: React.KeyboardEvent<HTMLInputElement>) => {
        const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter' || event.which === 13;
        if (!isEnter) return;
        event.preventDefault();
        event.stopPropagation();
        next();
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, fiscalRange ?? null);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }

        const nextFilters: StockInBookFilters = {
            fromDate: validation.data.fromDate,
            toDate: validation.data.toDate,
            itemBrandId,
            itemId,
            cancelled
        };

        const nextVariables: ClosingStockBookQueryVariables = {
            input: buildBookInput(nextFilters)
        };

        setDateErrors({});
        setAppliedFilters(nextFilters);
        setLastRefreshedAt(new Date());
        setFirst(0);
        if (hasApplied) {
            void refetch(nextVariables);
        }
    };

    const handlePageChange = (event: { first: number; rows: number }) => {
        setFirst(event.first);
        setRowsPerPage(event.rows);
    };

    const openLinesDialog = (row: ClosingStockBookRow) => {
        setSelectedHeader(row);
        setLinesDialogVisible(true);
        void loadLines({
            variables: {
                stockInId: row.stockInId,
                itemId: appliedFilters?.itemId ?? null
            }
        });
    };

    const reportTitle = 'Transport Stock In Book';
    const filterSummary = hasApplied
        ? [
              `Date: ${formatDateRangeLabel(appliedFilters?.fromDate ?? null, appliedFilters?.toDate ?? null)}`,
              `Brand: ${brandOptions.find((option) => option.value === (appliedFilters?.itemBrandId ?? null))?.label ?? 'All brands'}`,
              `Item: ${itemOptions.find((option) => option.value === (appliedFilters?.itemId ?? null))?.label ?? 'All items'}`,
              `Status: ${resolveStatusLabel(appliedFilters?.cancelled ?? -1)}`,
              `Refreshed: ${formatReportTimestamp(lastRefreshedAt) || '-'}`
          ].join(' | ')
        : '';

    const printFooterLeft = `Records: ${totalRecords}`;

    const exportColumns = useMemo<ReportExportColumn<ClosingStockBookRow>[]>(
        () => [
            { header: 'Entry No', value: (row) => row.stockInId },
            { header: 'Voucher No', value: (row) => row.voucherNumber ?? '' },
            { header: 'Voucher Date', value: (row) => formatVoucherDate(row.voucherDateText) },
            { header: 'Item Brand', value: (row) => row.itemBrandName ?? '' },
            { header: 'Cancelled', value: (row) => (row.isCancelled ? 'Yes' : 'No') }
        ],
        []
    );

    const exportFileBase = 'transport-stock-in-book';

    const handleExportCsv = () => {
        exportReportCsv({
            fileName: exportFileBase,
            rows: displayRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address
        });
    };

    const handleExportExcel = () => {
        void exportReportExcel({
            fileName: exportFileBase,
            rows: displayRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft,
            footerRight: 'Page'
        });
    };

    const handleExportPdf = () => {
        exportReportPdf({
            fileName: exportFileBase,
            rows: displayRows,
            columns: exportColumns,
            title: reportTitle,
            subtitle: filterSummary,
            companyName: companyInfo.name,
            companyAddress: companyInfo.address,
            footerLeft: printFooterLeft,
            footerRight: 'Page'
        });
    };

    const entryBody = (row: ClosingStockBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : String(row.stockInId);

    const voucherBody = (row: ClosingStockBookRow) => {
        if (isSkeletonRow(row)) {
            return (
                <div className="flex flex-column gap-1">
                    {skeletonCell('7rem')}
                    {skeletonCell('6rem')}
                </div>
            );
        }
        return (
            <div className="flex flex-column gap-1">
                <span className="font-medium">{row.voucherNumber || '-'}</span>
                <span className="text-600 text-sm">{formatVoucherDate(row.voucherDateText)}</span>
            </div>
        );
    };

    const brandBody = (row: ClosingStockBookRow) =>
        isSkeletonRow(row) ? skeletonCell('8rem') : (row.itemBrandName ?? '-');

    const cancelledBody = (row: ClosingStockBookRow) =>
        isSkeletonRow(row) ? skeletonCell('4rem') : row.isCancelled ? 'Yes' : 'No';

    const actionsBody = (row: ClosingStockBookRow) => {
        if (isSkeletonRow(row)) return skeletonCell('5rem');
        return (
            <Button
                type="button"
                icon="pi pi-eye"
                label="Lines"
                className="p-button-text p-button-sm"
                onClick={() => openLinesDialog(row)}
            />
        );
    };

    const canRefresh = Boolean(fromDate && toDate);

    return (
        <div className="card app-gradient-card">
            <ReportPrintHeader
                className="mb-3"
                companyName={companyInfo.name}
                companyAddress={companyInfo.address}
                title={reportTitle}
                subtitle={filterSummary || undefined}
            />
            <ReportPrintFooter left={printFooterLeft} />

            <div className="flex flex-column gap-2 mb-3 report-screen-header">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Transport Stock In Book</h2>
                        <p className="mt-2 mb-0 text-600">
                            Transport stock-in voucher register with line-level drill-down.
                        </p>
                    </div>
                </div>
                {(error || brandError || productError) && (
                    <p className="text-red-500 m-0">
                        Error loading report: {error?.message || brandError?.message || productError?.message}
                    </p>
                )}
            </div>

            <ReportDataTable
                value={tableRows}
                paginator
                rows={rowsPerPage}
                rowsPerPageOptions={[10, 20, 50, 100]}
                first={first}
                onPage={handlePageChange}
                loadingState={reportLoading}
                loadingSummaryEnabled={hasApplied}
                dataKey="rowKey"
                stripedRows
                size="small"
                className="summary-table transport-stock-in-book-table"
                loading={false}
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load transport stock-in book'}
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
                                fiscalYearStart={fiscalRange.start ?? null}
                                fiscalYearEnd={fiscalRange.end ?? null}
                                autoFocus
                                selectOnFocus
                                inputId="transport-stock-in-book-from-date"
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
                                fiscalYearStart={fiscalRange.start ?? null}
                                fiscalYearEnd={fiscalRange.end ?? null}
                                inputId="transport-stock-in-book-to-date"
                                inputRef={toDateInputRef}
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="transport-stock-in-book-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(event) => handleTodayToggle(Boolean(event.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => focusDropdown(brandInputRef))
                                        }
                                    }}
                                />
                                <label htmlFor="transport-stock-in-book-today">Today</label>
                            </div>
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDropdown
                                ref={brandInputRef}
                                value={itemBrandId}
                                options={brandOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder={brandLoading ? 'Loading brands...' : 'Brand'}
                                filter
                                showClear
                                onChange={(event) => {
                                    setItemBrandId((event.value as number | null) ?? null);
                                    setItemId(null);
                                    clearAppliedFilters();
                                }}
                                onEnterNext={() => focusDropdown(itemInputRef)}
                                style={{ minWidth: '190px' }}
                            />
                            <AppDropdown
                                ref={itemInputRef}
                                value={itemId}
                                options={itemOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder={productLoading ? 'Loading items...' : 'Item'}
                                filter
                                showClear
                                onChange={(event) => {
                                    setItemId((event.value as number | null) ?? null);
                                    clearAppliedFilters();
                                }}
                                onEnterNext={() => focusDropdown(statusInputRef)}
                                style={{ minWidth: '240px' }}
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
                                onEnterNext={() => focusElementById(refreshButtonId)}
                                style={{ minWidth: '160px' }}
                            />
                        </div>
                    </div>
                }
                headerRight={
                    <AppReportActions
                        onRefresh={handleRefresh}
                        onPrint={() => window.print()}
                        onExportCsv={handleExportCsv}
                        onExportExcel={handleExportExcel}
                        onExportPdf={handleExportPdf}
                        loadingState={reportLoading}
                        refreshDisabled={!canRefresh}
                        printDisabled={!hasApplied || reportLoading || displayRows.length === 0}
                        exportDisabled={!hasApplied || reportLoading || displayRows.length === 0}
                        refreshButtonId={refreshButtonId}
                    />
                }
                recordSummary={
                    hasApplied
                        ? reportLoading
                            ? 'Loading transport stock-in book...'
                            : `${totalRecords} voucher${totalRecords === 1 ? '' : 's'} • Cancelled ${cancelledCount}`
                        : 'Press Refresh to load transport stock-in book'
                }
            >
                <Column field="stockInId" header="Entry No." body={entryBody} style={{ width: '7rem' }} />
                <Column
                    header={
                        <div className="flex flex-column">
                            <span>Voucher No.</span>
                            <span>Voucher Date</span>
                        </div>
                    }
                    body={voucherBody}
                    style={{ minWidth: '11rem' }}
                />
                <Column field="itemBrandName" header="Item Brand" body={brandBody} style={{ minWidth: '14rem' }} />
                <Column field="isCancelled" header="Cancelled" body={cancelledBody} style={{ width: '7rem' }} />
                <Column header="Lines" body={actionsBody} style={{ width: '8rem' }} />
            </ReportDataTable>

            <Dialog
                header={selectedHeader ? `Stock In Lines - Entry #${selectedHeader.stockInId}` : 'Stock In Lines'}
                visible={linesDialogVisible}
                style={{ width: 'min(1200px, 98vw)' }}
                onHide={() => {
                    setLinesDialogVisible(false);
                    setSelectedHeader(null);
                }}
                footer={
                    <div className="flex justify-content-end w-full">
                        <Button label="Close" icon="pi pi-times" className="app-action-compact" onClick={() => setLinesDialogVisible(false)} />
                    </div>
                }
            >
                {linesError && <p className="text-red-500 m-0 mb-2">Error loading lines: {linesError.message}</p>}
                <AppDataTable
                    value={detailLines}
                    loading={linesLoading}
                    rows={8}
                    paginator
                    rowsPerPageOptions={[8, 16, 25]}
                    size="small"
                    stripedRows
                    emptyMessage={linesLoading ? '' : 'No lines found'}
                >
                    <Column field="itemName" header="Item" style={{ minWidth: '16rem' }} />
                    <Column field="hsnCode" header="HSN" style={{ width: '7rem' }} />
                    <Column field="unitName" header="Unit" style={{ width: '6rem' }} />
                    <Column field="quantity" header="Qty" body={(row: ClosingStockLineRow) => formatAmount(Number(row.quantity ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="mrp" header="MRP" body={(row: ClosingStockLineRow) => formatAmount(Number(row.mrp ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="margin" header="Margin" body={(row: ClosingStockLineRow) => formatAmount(Number(row.margin ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="sellingRate" header="S.Rate" body={(row: ClosingStockLineRow) => formatAmount(Number(row.sellingRate ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="dMargin" header="D.Margin" body={(row: ClosingStockLineRow) => formatAmount(Number(row.dMargin ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="cost" header="Cost" body={(row: ClosingStockLineRow) => formatAmount(Number(row.cost ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                    <Column field="taxName" header="Tax" style={{ width: '8rem' }} />
                    <Column field="beforeVatRate" header="Before VAT" body={(row: ClosingStockLineRow) => formatAmount(Number(row.beforeVatRate ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                    <Column field="schemeRate" header="Sch.Rate" body={(row: ClosingStockLineRow) => formatAmount(Number(row.schemeRate ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                    <Column field="schemeAmount" header="Sch.Amount" body={(row: ClosingStockLineRow) => formatAmount(Number(row.schemeAmount ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                    <Column field="landingCost" header="Landing Cost" body={(row: ClosingStockLineRow) => formatAmount(Number(row.landingCost ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                    <Column field="landingAmount" header="Landing Amt" body={(row: ClosingStockLineRow) => formatAmount(Number(row.landingAmount ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                </AppDataTable>
            </Dialog>
        </div>
    );
}
