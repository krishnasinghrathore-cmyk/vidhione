'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import type { Dropdown } from 'primereact/dropdown';
import { ReportPrintHeader } from '@/components/ReportPrintHeader';
import { ReportPrintFooter } from '@/components/ReportPrintFooter';
import { ReportDataTable } from '@/components/ReportDataTable';
import { buildSkeletonRows, isSkeletonRow, skeletonCell } from '@/components/reportSkeleton';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import AppReportActions from '@/components/AppReportActions';
import { useAuth } from '@/lib/auth/context';
import { formatAmount, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { useLedgerLookup } from '@/pages/(main)/apps/billing/useLedgerLookup';
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
    productGroupId?: number | null;
};

type StockAnalysisFilters = {
    fromDate: Date;
    toDate: Date;
    ledgerId: number | null;
    itemId: number | null;
    itemBrandId: number | null;
    itemGroupId: number | null;
    type: -1 | 0 | 1 | 2;
    mrp: number | null;
    autoValuation: boolean;
};

type StockAnalysisRow = {
    rowKey: string;
    itemId: number | null;
    itemName: string | null;
    mrp: number | null;
    openingQty: number;
    inQty: number;
    outQty: number;
    balanceQty: number;
    actualBalance: number;
    rate: number;
    amount: number;
    taxAmount: number;
    isSkeleton?: boolean;
};

type StockPositionReportQueryData = {
    stockPositionReport: {
        items: Array<{
            itemId: number | null;
            itemName: string | null;
            mrp: number | null;
            openingQty: number | null;
            inQty: number | null;
            outQty: number | null;
            balanceQty: number | null;
            actualBalance: number | null;
            rate: number | null;
            amount: number | null;
            taxAmount: number | null;
        }>;
    };
};

type StockPositionReportQueryVariables = {
    input?: {
        fromDate?: string | null;
        toDate?: string | null;
        ledgerId?: number | null;
        itemId?: number | null;
        itemBrandId?: number | null;
        itemGroupId?: number | null;
        type?: number | null;
        mrp?: number | null;
        autoValuation?: boolean | null;
    } | null;
};

type ProductGroupsQueryData = {
    productGroups: Array<{
        productGroupId: number;
        name: string | null;
    }>;
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
        productGroupId: number | null;
    }>;
};

const STOCK_POSITION_REPORT = gql`
    query StockPositionReport($input: StockPositionReportInput) {
        stockPositionReport(input: $input) {
            items {
                itemId
                itemName
                mrp
                openingQty
                inQty
                outQty
                balanceQty
                actualBalance
                rate
                amount
                taxAmount
            }
        }
    }
`;

const PRODUCT_GROUPS = gql`
    query ProductGroups {
        productGroups {
            productGroupId
            name
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
            productGroupId
        }
    }
`;

const typeOptions: Array<{ label: string; value: -1 | 0 | 1 | 2 }> = [
    { label: 'All', value: -1 },
    { label: 'Non-zero Balance', value: 0 },
    { label: 'With Movement', value: 1 },
    { label: 'No Movement', value: 2 }
];

const resolveTypeLabel = (value: number) => typeOptions.find((option) => option.value === value)?.label ?? 'All';

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

const toNumber = (value: number | null | undefined) => (value == null ? 0 : Number(value));

const buildReportInput = (filters: StockAnalysisFilters): StockPositionReportQueryVariables['input'] => ({
    fromDate: toDateText(filters.fromDate),
    toDate: toDateText(filters.toDate),
    ledgerId: filters.ledgerId,
    itemId: filters.itemId,
    itemBrandId: filters.itemBrandId,
    itemGroupId: filters.itemGroupId,
    type: filters.type,
    mrp: filters.mrp,
    autoValuation: filters.autoValuation
});

export default function InventoryTransportStockAnalysisPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const companyInfo = useReportCompanyInfo();
    const { companyContext } = useAuth();
    const { ledgerOptions, loading: ledgerLoading, error: ledgerError } = useLedgerLookup();

    const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [todayOnly, setTodayOnly] = useState(true);
    const [ledgerId, setLedgerId] = useState<number | null>(null);
    const [itemBrandId, setItemBrandId] = useState<number | null>(null);
    const [itemGroupId, setItemGroupId] = useState<number | null>(null);
    const [itemId, setItemId] = useState<number | null>(null);
    const [mrpText, setMrpText] = useState('');
    const [type, setType] = useState<-1 | 0 | 1 | 2>(-1);
    const [autoValuation, setAutoValuation] = useState(false);
    const [mrpError, setMrpError] = useState<string | null>(null);
    const [dateErrors, setDateErrors] = useState<DateRangeErrors>({});
    const [appliedFilters, setAppliedFilters] = useState<StockAnalysisFilters | null>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [first, setFirst] = useState(0);

    const fromDateInputRef = useRef<HTMLInputElement>(null);
    const toDateInputRef = useRef<HTMLInputElement>(null);
    const todayInputRef = useRef<HTMLInputElement>(null);
    const ledgerInputRef = useRef<Dropdown>(null);
    const brandInputRef = useRef<Dropdown>(null);
    const groupInputRef = useRef<Dropdown>(null);
    const itemInputRef = useRef<Dropdown>(null);
    const typeInputRef = useRef<Dropdown>(null);
    const autoValueInputRef = useRef<HTMLInputElement>(null);
    const refreshButtonId = 'transport-stock-analysis-refresh';

    useEffect(() => {
        setPageTitle('Transport Stock Analysis');
        return () => setPageTitle(null);
    }, [setPageTitle]);

    const {
        data: groupData,
        loading: groupLoading,
        error: groupError
    } = useQuery<ProductGroupsQueryData>(PRODUCT_GROUPS, {
        client: inventoryApolloClient,
        fetchPolicy: 'cache-first'
    });

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

    const queryVariables = useMemo<StockPositionReportQueryVariables>(() => ({
        input: appliedFilters ? buildReportInput(appliedFilters) : null
    }), [appliedFilters]);

    const {
        data,
        loading,
        error,
        refetch
    } = useQuery<StockPositionReportQueryData, StockPositionReportQueryVariables>(STOCK_POSITION_REPORT, {
        client: inventoryApolloClient,
        variables: queryVariables,
        skip: !appliedFilters,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearEnd, companyContext?.fiscalYearStart]
    );

    const ledgerFilterOptions = useMemo<SelectOption[]>(() => {
        const mapped = ledgerOptions.map((option) => ({ label: option.label, value: option.value }));
        return [{ label: 'All ledgers', value: null }, ...mapped];
    }, [ledgerOptions]);

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

    const groupOptions = useMemo<SelectOption[]>(() => {
        const rows = groupData?.productGroups ?? [];
        const mapped = rows
            .map((row) => ({
                label: row.name?.trim() || `Group ${row.productGroupId}`,
                value: Number(row.productGroupId)
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
        return [{ label: 'All groups', value: null }, ...mapped];
    }, [groupData?.productGroups]);

    const itemOptions = useMemo<SelectOption[]>(() => {
        const rows = productData?.products ?? [];
        const mapped = rows
            .filter((row) => (itemBrandId == null ? true : Number(row.productBrandId ?? 0) === itemBrandId))
            .filter((row) => (itemGroupId == null ? true : Number(row.productGroupId ?? 0) === itemGroupId))
            .map((row) => ({
                label: row.name?.trim() || `Item ${row.productId}`,
                value: Number(row.productId),
                productBrandId: row.productBrandId,
                productGroupId: row.productGroupId
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
        return [{ label: 'All items', value: null }, ...mapped];
    }, [itemBrandId, itemGroupId, productData?.products]);

    const hasApplied = Boolean(appliedFilters);
    const rawRows = useMemo(() => (hasApplied ? data?.stockPositionReport?.items ?? [] : []), [data, hasApplied]);

    const displayRows = useMemo<StockAnalysisRow[]>(() => {
        return rawRows.map((row, idx) => ({
            rowKey: row.itemId != null ? String(row.itemId) : `row-${idx}`,
            itemId: row.itemId != null ? Number(row.itemId) : null,
            itemName: row.itemName ?? null,
            mrp: row.mrp != null ? Number(row.mrp) : null,
            openingQty: toNumber(row.openingQty),
            inQty: toNumber(row.inQty),
            outQty: toNumber(row.outQty),
            balanceQty: toNumber(row.balanceQty),
            actualBalance: toNumber(row.actualBalance),
            rate: toNumber(row.rate),
            amount: toNumber(row.amount),
            taxAmount: toNumber(row.taxAmount)
        }));
    }, [rawRows]);

    const reportLoading = Boolean(hasApplied && loading);
    const showSkeletonRows = reportLoading && displayRows.length === 0;

    const skeletonRows = useMemo(
        () =>
            buildSkeletonRows(Math.min(rowsPerPage, 10), (idx) => ({
                rowKey: `skeleton-${idx}`,
                itemId: null,
                itemName: null,
                mrp: null,
                openingQty: 0,
                inQty: 0,
                outQty: 0,
                balanceQty: 0,
                actualBalance: 0,
                rate: 0,
                amount: 0,
                taxAmount: 0,
                isSkeleton: true
            })),
        [rowsPerPage]
    );

    const tableRows = showSkeletonRows ? skeletonRows : displayRows;
    const totalRecords = hasApplied ? displayRows.length : 0;

    const totals = useMemo(() => {
        return displayRows.reduce(
            (acc, row) => {
                acc.openingQty += row.openingQty;
                acc.inQty += row.inQty;
                acc.outQty += row.outQty;
                acc.balanceQty += row.balanceQty;
                acc.actualBalance += row.actualBalance;
                acc.amount += row.amount;
                acc.taxAmount += row.taxAmount;
                return acc;
            },
            {
                openingQty: 0,
                inQty: 0,
                outQty: 0,
                balanceQty: 0,
                actualBalance: 0,
                amount: 0,
                taxAmount: 0
            }
        );
    }, [displayRows]);

    const clearAppliedFilters = () => {
        setAppliedFilters(null);
        setFirst(0);
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

    const parseMrpInput = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return { value: null as number | null, error: null as string | null };
        const numeric = Number(trimmed);
        if (!Number.isFinite(numeric) || numeric < 0) {
            return { value: null as number | null, error: 'MRP must be a valid non-negative number' };
        }
        return { value: numeric, error: null as string | null };
    };

    const handleRefresh = () => {
        const validation = validateDateRange({ fromDate, toDate }, fiscalRange ?? null);
        if (!validation.ok) {
            setDateErrors(validation.errors);
            return;
        }

        const parsedMrp = parseMrpInput(mrpText);
        if (parsedMrp.error) {
            setMrpError(parsedMrp.error);
            return;
        }

        const nextFilters: StockAnalysisFilters = {
            fromDate: validation.data.fromDate,
            toDate: validation.data.toDate,
            ledgerId,
            itemId,
            itemBrandId,
            itemGroupId,
            type,
            mrp: parsedMrp.value,
            autoValuation
        };

        const nextVariables: StockPositionReportQueryVariables = {
            input: buildReportInput(nextFilters)
        };

        setDateErrors({});
        setMrpError(null);
        setAppliedFilters(nextFilters);
        setFirst(0);
        setLastRefreshedAt(new Date());
        if (hasApplied) {
            void refetch(nextVariables);
        }
    };

    const handlePageChange = (event: { first: number; rows: number }) => {
        setFirst(event.first);
        setRowsPerPage(event.rows);
    };

    const reportTitle = 'Transport Stock Analysis';
    const filterSummary = hasApplied
        ? [
              `Date: ${formatDateRangeLabel(appliedFilters?.fromDate ?? null, appliedFilters?.toDate ?? null)}`,
              `Ledger: ${ledgerFilterOptions.find((option) => option.value === (appliedFilters?.ledgerId ?? null))?.label ?? 'All ledgers'}`,
              `Brand: ${brandOptions.find((option) => option.value === (appliedFilters?.itemBrandId ?? null))?.label ?? 'All brands'}`,
              `Group: ${groupOptions.find((option) => option.value === (appliedFilters?.itemGroupId ?? null))?.label ?? 'All groups'}`,
              `Item: ${itemOptions.find((option) => option.value === (appliedFilters?.itemId ?? null))?.label ?? 'All items'}`,
              `Type: ${resolveTypeLabel(appliedFilters?.type ?? -1)}`,
              `MRP: ${appliedFilters?.mrp == null ? 'All' : formatAmount(appliedFilters.mrp)}`,
              `Auto Valuation: ${appliedFilters?.autoValuation ? 'Yes' : 'No'}`,
              `Refreshed: ${formatReportTimestamp(lastRefreshedAt) || '-'}`
          ].join(' | ')
        : '';

    const printFooterLeft = `Records: ${totalRecords}`;

    const exportColumns = useMemo<ReportExportColumn<StockAnalysisRow>[]>(
        () => [
            { header: 'Item', value: (row) => row.itemName ?? '' },
            { header: 'MRP', value: (row) => row.mrp != null ? formatAmount(row.mrp) : '' },
            { header: 'Opening Qty', value: (row) => formatAmount(row.openingQty) },
            { header: 'In Qty', value: (row) => formatAmount(row.inQty) },
            { header: 'Out Qty', value: (row) => formatAmount(row.outQty) },
            { header: 'Balance Qty', value: (row) => formatAmount(row.balanceQty) },
            { header: 'Actual Balance', value: (row) => formatAmount(row.actualBalance) },
            { header: 'Rate', value: (row) => formatAmount(row.rate) },
            { header: 'Amount', value: (row) => formatAmount(row.amount) },
            { header: 'Tax Amount', value: (row) => formatAmount(row.taxAmount) }
        ],
        []
    );

    const exportFileBase = 'transport-stock-analysis';

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

    const itemBody = (row: StockAnalysisRow) =>
        isSkeletonRow(row) ? skeletonCell('10rem') : (row.itemName ?? '-');

    const mrpBody = (row: StockAnalysisRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : row.mrp != null ? formatAmount(row.mrp) : '';

    const numericBody = (value: number, row: StockAnalysisRow) =>
        isSkeletonRow(row) ? skeletonCell('5rem') : formatAmount(value);

    const openingFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.openingQty);
    const inFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.inQty);
    const outFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.outQty);
    const balanceFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.balanceQty);
    const actualFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.actualBalance);
    const amountFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.amount);
    const taxFooter = reportLoading ? skeletonCell('5rem') : formatAmount(totals.taxAmount);

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
                        <h2 className="m-0">Transport Stock Analysis</h2>
                        <p className="mt-2 mb-0 text-600">
                            Product-wise transport stock analysis with quantity, valuation, and tax summary.
                        </p>
                    </div>
                </div>
                {(error || ledgerError || groupError || brandError || productError) && (
                    <p className="text-red-500 m-0">
                        Error loading report: {error?.message || ledgerError?.message || groupError?.message || brandError?.message || productError?.message}
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
                className="summary-table transport-stock-analysis-table"
                loading={false}
                emptyMessage={reportLoading ? '' : hasApplied ? 'No results found' : 'Press Refresh to load transport stock analysis'}
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
                                inputRef={fromDateInputRef}
                                inputId="transport-stock-analysis-from-date"
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
                                inputRef={toDateInputRef}
                                inputId="transport-stock-analysis-to-date"
                                onEnterNext={() => todayInputRef.current?.focus()}
                                style={{ width: '150px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="transport-stock-analysis-today"
                                    inputRef={todayInputRef}
                                    checked={todayOnly}
                                    onChange={(event) => handleTodayToggle(Boolean(event.checked))}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => focusDropdown(ledgerInputRef))
                                        }
                                    }}
                                />
                                <label htmlFor="transport-stock-analysis-today">Today</label>
                            </div>
                        </div>
                        {(dateErrors.fromDate || dateErrors.toDate) && (
                            <small className="text-red-500">{dateErrors.fromDate || dateErrors.toDate}</small>
                        )}
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <AppDropdown
                                ref={ledgerInputRef}
                                value={ledgerId}
                                options={ledgerFilterOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder={ledgerLoading ? 'Loading ledgers...' : 'Ledger'}
                                filter
                                showClear
                                onChange={(event) => {
                                    setLedgerId((event.value as number | null) ?? null);
                                    clearAppliedFilters();
                                }}
                                onEnterNext={() => focusDropdown(brandInputRef)}
                                style={{ minWidth: '220px' }}
                            />
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
                                onEnterNext={() => focusDropdown(groupInputRef)}
                                style={{ minWidth: '190px' }}
                            />
                            <AppDropdown
                                ref={groupInputRef}
                                value={itemGroupId}
                                options={groupOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder={groupLoading ? 'Loading groups...' : 'Group'}
                                filter
                                showClear
                                onChange={(event) => {
                                    setItemGroupId((event.value as number | null) ?? null);
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
                                onEnterNext={() => focusElementById('transport-stock-analysis-mrp')}
                                style={{ minWidth: '230px' }}
                            />
                        </div>
                        <div className="flex align-items-center gap-2 flex-wrap">
                            <div className="flex flex-column" style={{ minWidth: '130px' }}>
                                <AppInput
                                    id="transport-stock-analysis-mrp"
                                    value={mrpText}
                                    onChange={(event) => {
                                        setMrpText(event.target.value);
                                        setMrpError(null);
                                        clearAppliedFilters();
                                    }}
                                    placeholder="MRP"
                                    onEnterNext={() => focusDropdown(typeInputRef)}
                                    className={mrpError ? 'p-invalid' : undefined}
                                />
                                {mrpError && <small className="text-red-500">{mrpError}</small>}
                            </div>
                            <AppDropdown
                                ref={typeInputRef}
                                value={type}
                                options={typeOptions}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Type"
                                onChange={(event) => {
                                    setType(event.value as -1 | 0 | 1 | 2);
                                    clearAppliedFilters();
                                }}
                                onEnterNext={() => autoValueInputRef.current?.focus()}
                                style={{ minWidth: '180px' }}
                            />
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="transport-stock-analysis-auto-valuation"
                                    inputRef={autoValueInputRef}
                                    checked={autoValuation}
                                    onChange={(event) => {
                                        setAutoValuation(Boolean(event.checked));
                                        clearAppliedFilters();
                                    }}
                                    pt={{
                                        hiddenInput: {
                                            onKeyDown: handleCheckboxEnter(() => focusElementById(refreshButtonId))
                                        }
                                    }}
                                />
                                <label htmlFor="transport-stock-analysis-auto-valuation">Auto valuation</label>
                            </div>
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
                            ? 'Loading transport stock analysis...'
                            : `${totalRecords} item${totalRecords === 1 ? '' : 's'}`
                        : 'Press Refresh to load transport stock analysis'
                }
            >
                <Column field="itemName" header="Item" body={itemBody} style={{ minWidth: '17rem' }} />
                <Column field="mrp" header="MRP" body={mrpBody} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="openingQty" header="Opening Qty" body={(row: StockAnalysisRow) => numericBody(row.openingQty, row)} footer={openingFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '8rem' }} />
                <Column field="inQty" header="In Qty" body={(row: StockAnalysisRow) => numericBody(row.inQty, row)} footer={inFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="outQty" header="Out Qty" body={(row: StockAnalysisRow) => numericBody(row.outQty, row)} footer={outFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="balanceQty" header="Balance Qty" body={(row: StockAnalysisRow) => numericBody(row.balanceQty, row)} footer={balanceFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '8rem' }} />
                <Column field="actualBalance" header="Actual Balance" body={(row: StockAnalysisRow) => numericBody(row.actualBalance, row)} footer={actualFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '9rem' }} />
                <Column field="rate" header="Rate" body={(row: StockAnalysisRow) => numericBody(row.rate, row)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="amount" header="Amount" body={(row: StockAnalysisRow) => numericBody(row.amount, row)} footer={amountFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '8rem' }} />
                <Column field="taxAmount" header="Tax Amount" body={(row: StockAnalysisRow) => numericBody(row.taxAmount, row)} footer={taxFooter} headerClassName="summary-number" bodyClassName="summary-number" footerClassName="summary-number" style={{ width: '8rem' }} />
            </ReportDataTable>
        </div>
    );
}
