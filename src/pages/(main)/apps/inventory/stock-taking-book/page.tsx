'use client';

import React, { useContext, useEffect, useMemo, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { formatAmount, formatVoucherDate, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { LayoutContext } from '@/layout/context/layoutcontext';

type Option = { label: string; value: number | null; productBrandId?: number | null };
type BookRow = { rowKey: string; stockTakingId: number; voucherNumber: string | null; voucherDateText: string | null; itemBrandName: string | null; godownName: string | null; remarks: string | null; isCancelled: boolean; lineCount: number; totalVarianceQty: number; totalVarianceAmount: number };
type LineRow = { itemName: string | null; hsnCode: string | null; unitName: string | null; systemQuantity: number | null; actualQuantity: number | null; varianceQuantity: number | null; mrp: number | null; rate: number | null; varianceAmount: number | null; remarks: string | null };

const STOCK_TAKING_BOOK = gql`query StockTakingBook($input: StockTakingBookInput) { stockTakingBook(input: $input) { items { stockTakingId voucherNumber voucherDateText itemBrandName godownName remarks isCancelled lineCount totalVarianceQty totalVarianceAmount } } }`;
const STOCK_TAKING_LINES = gql`query StockTakingLines($stockTakingId: Int!, $itemId: Int) { stockTakingLines(stockTakingId: $stockTakingId, itemId: $itemId) { itemName hsnCode unitName systemQuantity actualQuantity varianceQuantity mrp rate varianceAmount remarks } }`;
const PRODUCT_BRANDS = gql`query ProductBrands { productBrands { productBrandId name } }`;
const PRODUCTS = gql`query Products($limit: Int) { products(limit: $limit) { productId name productBrandId } }`;
const GODOWNS = gql`query Godowns { godowns { godownId name } }`;

export default function InventoryStockTakingBookPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const [fromDate, setFromDate] = useState<Date | null>(new Date());
    const [toDate, setToDate] = useState<Date | null>(new Date());
    const [todayOnly, setTodayOnly] = useState(true);
    const [itemBrandId, setItemBrandId] = useState<number | null>(null);
    const [godownId, setGodownId] = useState<number | null>(null);
    const [itemId, setItemId] = useState<number | null>(null);
    const [cancelled, setCancelled] = useState<-1 | 0 | 1>(-1);
    const [search, setSearch] = useState('');
    const [appliedFilters, setAppliedFilters] = useState<Record<string, unknown> | null>(null);
    const [selectedHeader, setSelectedHeader] = useState<BookRow | null>(null);
    const [linesDialogVisible, setLinesDialogVisible] = useState(false);

    useEffect(() => { setPageTitle('Stock Taking Book'); return () => setPageTitle(null); }, [setPageTitle]);

    const { data: brandData, loading: brandLoading, error: brandError } = useQuery(PRODUCT_BRANDS, { client: inventoryApolloClient, fetchPolicy: 'cache-first' });
    const { data: productData, loading: productLoading, error: productError } = useQuery(PRODUCTS, { client: inventoryApolloClient, variables: { limit: 3000 }, fetchPolicy: 'cache-first' });
    const { data: godownData, loading: godownLoading, error: godownError } = useQuery(GODOWNS, { client: inventoryApolloClient, fetchPolicy: 'cache-first' });
    const { data, loading, error, refetch } = useQuery(STOCK_TAKING_BOOK, { client: inventoryApolloClient, variables: { input: appliedFilters }, skip: !appliedFilters, fetchPolicy: 'cache-and-network', nextFetchPolicy: 'cache-first', notifyOnNetworkStatusChange: true });
    const [loadLines, { data: linesData, loading: linesLoading, error: linesError }] = useLazyQuery(STOCK_TAKING_LINES, { client: inventoryApolloClient, fetchPolicy: 'network-only' });

    const brandOptions = useMemo<Option[]>(() => [{ label: 'All brands', value: null }, ...((brandData?.productBrands ?? []).map((row: any) => ({ label: row.name?.trim() || `Brand ${row.productBrandId}`, value: Number(row.productBrandId) })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))], [brandData?.productBrands]);
    const godownOptions = useMemo<Option[]>(() => [{ label: 'All godowns', value: null }, ...((godownData?.godowns ?? []).map((row: any) => ({ label: row.name?.trim() || `Godown ${row.godownId}`, value: Number(row.godownId) })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))], [godownData?.godowns]);
    const itemOptions = useMemo<Option[]>(() => [{ label: 'All items', value: null }, ...((productData?.products ?? []).filter((row: any) => itemBrandId == null || Number(row.productBrandId ?? 0) === itemBrandId).map((row: any) => ({ label: row.name?.trim() || `Item ${row.productId}`, value: Number(row.productId), productBrandId: row.productBrandId })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))], [itemBrandId, productData?.products]);

    const rows = useMemo<BookRow[]>(() => {
        const raw = data?.stockTakingBook?.items ?? [];
        const term = search.trim().toLowerCase();
        return raw
            .map((row: any) => ({ rowKey: String(row.stockTakingId), stockTakingId: Number(row.stockTakingId), voucherNumber: row.voucherNumber ?? null, voucherDateText: row.voucherDateText ?? null, itemBrandName: row.itemBrandName ?? null, godownName: row.godownName ?? null, remarks: row.remarks ?? null, isCancelled: Boolean(row.isCancelled), lineCount: Number(row.lineCount ?? 0), totalVarianceQty: Number(row.totalVarianceQty ?? 0), totalVarianceAmount: Number(row.totalVarianceAmount ?? 0) }))
            .filter((row: BookRow) => !term || [row.voucherNumber, row.itemBrandName, row.godownName, row.remarks].some((value) => String(value ?? '').toLowerCase().includes(term)));
    }, [data?.stockTakingBook?.items, search]);

    const detailLines = useMemo<LineRow[]>(() => linesData?.stockTakingLines ?? [], [linesData?.stockTakingLines]);
    const cancelledCount = rows.filter((row) => row.isCancelled).length;
    const totalVarianceAmount = rows.reduce((sum, row) => sum + row.totalVarianceAmount, 0);

    const handleTodayToggle = (checked: boolean) => {
        setTodayOnly(checked);
        if (checked) { const today = new Date(); setFromDate(today); setToDate(today); }
    };

    const handleRefresh = () => {
        if (!fromDate || !toDate) return;
        const nextFilters = { fromDate: toDateText(fromDate), toDate: toDateText(toDate), itemBrandId, godownId, itemId, cancelled };
        setAppliedFilters(nextFilters);
        void refetch({ input: nextFilters });
    };

    const openLines = (row: BookRow) => {
        setSelectedHeader(row);
        setLinesDialogVisible(true);
        void loadLines({ variables: { stockTakingId: row.stockTakingId, itemId: appliedFilters?.itemId ?? null } });
    };

    const loadingError = error || brandError || productError || godownError;

    return <div className="card app-gradient-card">
        <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3"><div><h2 className="m-0">Stock Taking Book</h2><p className="mt-2 mb-0 text-600">Stock-taking voucher register with brand, godown, and variance drill-down.</p></div><div className="text-700 text-sm">Records: <strong>{rows.length}</strong> | Cancelled: <strong>{cancelledCount}</strong> | Variance Amount: <strong>{formatAmount(totalVarianceAmount)}</strong></div></div>
        {loadingError ? <p className="text-red-500 m-0 mb-2">Error loading report: {loadingError.message}</p> : null}
        <div className="surface-50 border-1 surface-border border-round p-3 mb-3"><div className="grid align-items-end"><div className="col-12 md:col-2"><label className="block text-600 mb-1">From Date</label><AppDateInput value={fromDate} onChange={setFromDate} /></div><div className="col-12 md:col-2"><label className="block text-600 mb-1">To Date</label><AppDateInput value={toDate} onChange={setToDate} /></div><div className="col-12 md:col-2 flex align-items-end"><div className="flex align-items-center gap-2 mb-2"><Checkbox inputId="stock-taking-book-today" checked={todayOnly} onChange={(event) => handleTodayToggle(Boolean(event.checked))} /><label htmlFor="stock-taking-book-today">Today</label></div></div><div className="col-12 md:col-2"><label className="block text-600 mb-1">Brand</label><AppDropdown value={itemBrandId} options={brandOptions} optionLabel="label" optionValue="value" placeholder={brandLoading ? 'Loading brands...' : 'Brand'} filter onChange={(event) => { setItemBrandId((event.value as number | null) ?? null); setItemId(null); }} /></div><div className="col-12 md:col-2"><label className="block text-600 mb-1">Godown</label><AppDropdown value={godownId} options={godownOptions} optionLabel="label" optionValue="value" placeholder={godownLoading ? 'Loading godowns...' : 'Godown'} filter onChange={(event) => setGodownId((event.value as number | null) ?? null)} /></div><div className="col-12 md:col-2"><label className="block text-600 mb-1">Status</label><AppDropdown value={cancelled} options={[{ label: 'All', value: -1 }, { label: 'Active', value: 0 }, { label: 'Cancelled', value: 1 }]} optionLabel="label" optionValue="value" onChange={(event) => setCancelled(event.value as -1 | 0 | 1)} /></div><div className="col-12 md:col-4"><label className="block text-600 mb-1">Item</label><AppDropdown value={itemId} options={itemOptions} optionLabel="label" optionValue="value" placeholder={productLoading ? 'Loading items...' : 'Item'} filter onChange={(event) => setItemId((event.value as number | null) ?? null)} /></div><div className="col-12 md:col-4"><label className="block text-600 mb-1">Search</label><AppInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search voucher, brand, godown, remarks" /></div><div className="col-12 md:col-4"><div className="flex gap-2 justify-content-end"><Button type="button" className="app-action-compact" icon="pi pi-refresh" label={loading ? 'Refreshing...' : 'Refresh'} onClick={handleRefresh} disabled={!fromDate || !toDate || loading} /><Button type="button" className="p-button-text" icon="pi pi-print" label="Print" onClick={() => window.print()} disabled={rows.length === 0 || loading} /></div></div></div></div>
        <AppDataTable value={rows} dataKey="rowKey" size="small" stripedRows paginator rows={10} rowsPerPageOptions={[10, 20, 50, 100]} loading={loading} emptyMessage={appliedFilters ? 'No stock-taking entries found' : 'Press Refresh to load stock-taking book'}><Column field="stockTakingId" header="Entry No." style={{ width: '7rem' }} /><Column header="Voucher" body={(row: BookRow) => <div className="flex flex-column gap-1"><span className="font-medium">{row.voucherNumber || '-'}</span><span className="text-600 text-sm">{formatVoucherDate(row.voucherDateText)}</span></div>} style={{ minWidth: '10rem' }} /><Column field="itemBrandName" header="Item Brand" style={{ minWidth: '12rem' }} /><Column field="godownName" header="Godown" style={{ minWidth: '12rem' }} /><Column field="lineCount" header="Lines" body={(row: BookRow) => formatAmount(row.lineCount)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} /><Column field="totalVarianceQty" header="Variance Qty" body={(row: BookRow) => formatAmount(row.totalVarianceQty)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '9rem' }} /><Column field="totalVarianceAmount" header="Variance Amt" body={(row: BookRow) => formatAmount(row.totalVarianceAmount)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '9rem' }} /><Column field="remarks" header="Remarks" style={{ minWidth: '14rem' }} /><Column field="isCancelled" header="Cancelled" body={(row: BookRow) => (row.isCancelled ? 'Yes' : 'No')} style={{ width: '7rem' }} /><Column header="Lines" body={(row: BookRow) => <Button type="button" icon="pi pi-eye" label="Lines" className="p-button-text p-button-sm" onClick={() => openLines(row)} />} style={{ width: '8rem' }} /></AppDataTable>
        <Dialog header={selectedHeader ? `Stock Taking Lines - Entry #${selectedHeader.stockTakingId}` : 'Stock Taking Lines'} visible={linesDialogVisible} style={{ width: 'min(1100px, 98vw)' }} onHide={() => { setLinesDialogVisible(false); setSelectedHeader(null); }} footer={<div className="flex justify-content-end w-full"><Button label="Close" icon="pi pi-times" className="app-action-compact" onClick={() => setLinesDialogVisible(false)} /></div>}>
            {linesError ? <p className="text-red-500 m-0 mb-2">Error loading lines: {linesError.message}</p> : null}
            <AppDataTable value={detailLines} loading={linesLoading} rows={8} paginator rowsPerPageOptions={[8, 16, 25]} size="small" stripedRows emptyMessage={linesLoading ? '' : 'No lines found'}><Column field="itemName" header="Item" style={{ minWidth: '14rem' }} /><Column field="hsnCode" header="HSN" style={{ width: '7rem' }} /><Column field="unitName" header="Unit" style={{ width: '7rem' }} /><Column field="systemQuantity" header="System Qty" body={(row: LineRow) => formatAmount(Number(row.systemQuantity ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="actualQuantity" header="Actual Qty" body={(row: LineRow) => formatAmount(Number(row.actualQuantity ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="varianceQuantity" header="Variance Qty" body={(row: LineRow) => formatAmount(Number(row.varianceQuantity ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="mrp" header="MRP" body={(row: LineRow) => formatAmount(Number(row.mrp ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} /><Column field="rate" header="Rate" body={(row: LineRow) => formatAmount(Number(row.rate ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} /><Column field="varianceAmount" header="Variance Amt" body={(row: LineRow) => formatAmount(Number(row.varianceAmount ?? 0))} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '9rem' }} /><Column field="remarks" header="Remarks" style={{ minWidth: '12rem' }} /></AppDataTable>
        </Dialog>
    </div>;
}


