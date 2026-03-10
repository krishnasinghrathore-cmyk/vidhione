'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { formatAmount, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { resolveIdentifierCode } from '@/lib/crm/api';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { LayoutContext } from '@/layout/context/layoutcontext';

type Option = { label: string; value: number | null; productBrandId?: number | null };
type ProductRow = { productId: number; name: string | null; productBrandId: number | null; units?: Array<{ unitId: number | null }> | null };
type DraftLine = { lineId: string; itemId: number; itemName: string; unitId: number | null; systemQuantity: number; actualQuantity: number; varianceQuantity: number; mrp: number; rate: number; varianceAmount: number; remarks: string };

const PRODUCT_BRANDS = gql`query ProductBrands { productBrands { productBrandId name } }`;
const PRODUCTS = gql`query Products($limit: Int) { products(limit: $limit) { productId name productBrandId units { unitId } } }`;
const GODOWNS = gql`query Godowns { godowns { godownId name } }`;
const STOCK_POSITION = gql`query StockPosition($input: StockPositionReportInput) { stockPositionReport(input: $input) { items { itemId mrp balanceQty rate } } }`;
const STOCK_TAKING_BY_ID = gql`query StockTakingById($stockTakingId: Int!) { stockTakingById(stockTakingId: $stockTakingId) { stockTakingId voucherNumber voucherDateText itemBrandId godownId isCancelledFlag remarks lines { stockTakingLineId itemId unitId systemQuantity actualQuantity varianceQuantity mrp rate varianceAmount remarks } } }`;
const CREATE_STOCK_TAKING = gql`mutation CreateStockTaking($voucherNumber: String, $voucherDateText: String!, $itemBrandId: Int, $godownId: Int, $isCancelledFlag: Int, $remarks: String, $lines: [StockTakingLineInput!]!) { createStockTaking(voucherNumber: $voucherNumber, voucherDateText: $voucherDateText, itemBrandId: $itemBrandId, godownId: $godownId, isCancelledFlag: $isCancelledFlag, remarks: $remarks, lines: $lines) { stockTakingId } }`;
const UPDATE_STOCK_TAKING = gql`mutation UpdateStockTaking($stockTakingId: Int!, $voucherNumber: String, $voucherDateText: String, $itemBrandId: Int, $godownId: Int, $isCancelledFlag: Int, $remarks: String, $lines: [StockTakingLineInput!]) { updateStockTaking(stockTakingId: $stockTakingId, voucherNumber: $voucherNumber, voucherDateText: $voucherDateText, itemBrandId: $itemBrandId, godownId: $godownId, isCancelledFlag: $isCancelledFlag, remarks: $remarks, lines: $lines) { stockTakingId } }`;
const DELETE_STOCK_TAKING = gql`mutation DeleteStockTaking($stockTakingId: Int!) { deleteStockTaking(stockTakingId: $stockTakingId) }`;

const parseDateText = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed) return new Date();
    if (/^\d{8}$/.test(trimmed)) return new Date(Number(trimmed.slice(0, 4)), Number(trimmed.slice(4, 6)) - 1, Number(trimmed.slice(6, 8)));
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-').map(Number);
        return new Date(yyyy, mm - 1, dd);
    }
    return new Date(trimmed);
};
const parseNumber = (value: string) => {
    const numeric = Number(value.trim());
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

export default function InventoryStockTakingPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const toastRef = useRef<Toast>(null);
    const [voucherNumber, setVoucherNumber] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(new Date());
    const [itemBrandId, setItemBrandId] = useState<number | null>(null);
    const [godownId, setGodownId] = useState<number | null>(null);
    const [isCancelled, setIsCancelled] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [draftBarcode, setDraftBarcode] = useState('');
    const [draftItemId, setDraftItemId] = useState<number | null>(null);
    const [draftSystemQty, setDraftSystemQty] = useState('');
    const [draftActualQty, setDraftActualQty] = useState('');
    const [draftMrp, setDraftMrp] = useState('');
    const [draftRate, setDraftRate] = useState('');
    const [draftRemarks, setDraftRemarks] = useState('');
    const [lines, setLines] = useState<DraftLine[]>([]);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [lastSavedId, setLastSavedId] = useState<number | null>(null);
    const [editEntryNo, setEditEntryNo] = useState('');

    useEffect(() => { setPageTitle('Stock Taking'); return () => setPageTitle(null); }, [setPageTitle]);

    const { data: brandData, loading: brandLoading, error: brandError } = useQuery(PRODUCT_BRANDS, { client: inventoryApolloClient, fetchPolicy: 'cache-first' });
    const { data: productData, loading: productLoading, error: productError } = useQuery<{ products: ProductRow[] }>(PRODUCTS, { client: inventoryApolloClient, variables: { limit: 3000 }, fetchPolicy: 'cache-first' });
    const { data: godownData, loading: godownLoading, error: godownError } = useQuery(GODOWNS, { client: inventoryApolloClient, fetchPolicy: 'cache-first' });
    const [loadStockTakingById, { loading: loadingEntry }] = useLazyQuery(STOCK_TAKING_BY_ID, { client: inventoryApolloClient, fetchPolicy: 'network-only' });
    const [loadStockPosition, { loading: prefilling }] = useLazyQuery(STOCK_POSITION, { client: inventoryApolloClient, fetchPolicy: 'network-only' });
    const [createStockTaking, { loading: creating }] = useMutation(CREATE_STOCK_TAKING, { client: inventoryApolloClient });
    const [updateStockTaking, { loading: updating }] = useMutation(UPDATE_STOCK_TAKING, { client: inventoryApolloClient });
    const [deleteStockTaking, { loading: deleting }] = useMutation(DELETE_STOCK_TAKING, { client: inventoryApolloClient });
    const saving = creating || updating;

    const productMap = useMemo(() => new Map((productData?.products ?? []).map((row) => [Number(row.productId), row])), [productData?.products]);
    const brandOptions = useMemo<Option[]>(() => [{ label: 'Select brand', value: null }, ...((brandData?.productBrands ?? []).map((row: any) => ({ label: row.name?.trim() || `Brand ${row.productBrandId}`, value: Number(row.productBrandId) })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))], [brandData?.productBrands]);
    const godownOptions = useMemo<Option[]>(() => [{ label: 'Select godown', value: null }, ...((godownData?.godowns ?? []).map((row: any) => ({ label: row.name?.trim() || `Godown ${row.godownId}`, value: Number(row.godownId) })).sort((a: Option, b: Option) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })))], [godownData?.godowns]);
    const itemOptions = useMemo<Option[]>(() => (productData?.products ?? []).filter((row) => itemBrandId == null || Number(row.productBrandId ?? 0) === itemBrandId).map((row) => ({ label: row.name?.trim() || `Item ${row.productId}`, value: Number(row.productId), productBrandId: row.productBrandId })).sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })), [itemBrandId, productData?.products]);
    const selectedItem = draftItemId ? productMap.get(draftItemId) ?? null : null;

    const resetDraft = () => { setDraftBarcode(''); setDraftItemId(null); setDraftSystemQty(''); setDraftActualQty(''); setDraftMrp(''); setDraftRate(''); setDraftRemarks(''); };
    const resetForm = () => { setVoucherNumber(''); setVoucherDate(new Date()); setItemBrandId(null); setGodownId(null); setIsCancelled(false); setRemarks(''); setLines([]); setCurrentId(null); setEditEntryNo(''); resetDraft(); };

    const prefillDraft = async (itemId: number) => {
        if (!voucherDate) return;
        try {
            const result = await loadStockPosition({ variables: { input: { toDate: toDateText(voucherDate), itemId } } });
            const row = result.data?.stockPositionReport?.items?.find((entry: any) => Number(entry.itemId ?? 0) === itemId);
            if (!row) return;
            setDraftSystemQty(String(Number(row.balanceQty ?? 0)));
            if (!draftMrp.trim()) setDraftMrp(String(Number(row.mrp ?? 0)));
            if (!draftRate.trim()) setDraftRate(String(Number(row.rate ?? 0)));
        } catch (error: any) {
            toastRef.current?.show({ severity: 'warn', summary: 'System quantity unavailable', detail: error?.message ?? 'Unable to fetch stock position.' });
        }
    };

    const selectItem = (nextItemId: number | null) => {
        setDraftItemId(nextItemId);
        if (!nextItemId) return;
        const product = productMap.get(nextItemId) ?? null;
        const nextBrandId = product?.productBrandId != null ? Number(product.productBrandId) : null;
        if (nextBrandId && itemBrandId !== nextBrandId) setItemBrandId(nextBrandId);
        void prefillDraft(nextItemId);
    };

    const resolveBarcode = async () => {
        const code = draftBarcode.trim();
        if (!code) return toastRef.current?.show({ severity: 'warn', summary: 'Enter a barcode first' });
        try {
            const match = await resolveIdentifierCode(code);
            if (!match) return toastRef.current?.show({ severity: 'warn', summary: 'Barcode not found', detail: `No product barcode matched ${code}.` });
            if (match.entityType !== 'PRODUCT') return toastRef.current?.show({ severity: 'warn', summary: 'Unsupported barcode', detail: `Barcode ${code} belongs to ${match.entityType}.` });
            const productId = Number(match.entityId ?? 0);
            if (!productMap.has(productId)) return toastRef.current?.show({ severity: 'warn', summary: 'Product not loaded', detail: `Product ${productId} is not available in the current product cache.` });
            selectItem(productId);
            toastRef.current?.show({ severity: 'success', summary: 'Barcode resolved', detail: `${productMap.get(productId)?.name?.trim() || `Item ${productId}`} selected from barcode.` });
        } catch (error: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Barcode lookup failed', detail: error?.message ?? 'Unable to resolve barcode.' });
        }
    };

    const addLine = () => {
        if (!selectedItem || !draftItemId) return toastRef.current?.show({ severity: 'warn', summary: 'Select an item first' });
        const systemQuantity = parseNumber(draftSystemQty) ?? 0;
        const actualQuantity = parseNumber(draftActualQty);
        const mrp = parseNumber(draftMrp) ?? 0;
        const rate = parseNumber(draftRate) ?? 0;
        if (actualQuantity == null) return toastRef.current?.show({ severity: 'warn', summary: 'Invalid actual quantity' });
        const varianceQuantity = actualQuantity - systemQuantity;
        setLines((current) => [...current, { lineId: `${Date.now()}-${draftItemId}`, itemId: draftItemId, itemName: selectedItem.name?.trim() || `Item ${draftItemId}`, unitId: selectedItem.units?.[0]?.unitId != null ? Number(selectedItem.units[0].unitId) : null, systemQuantity, actualQuantity, varianceQuantity, mrp, rate, varianceAmount: varianceQuantity * rate, remarks: draftRemarks.trim() }]);
        resetDraft();
    };

    const loadForEdit = async () => {
        const stockTakingId = Number(editEntryNo.trim());
        if (!Number.isFinite(stockTakingId) || stockTakingId <= 0) return toastRef.current?.show({ severity: 'warn', summary: 'Enter a valid entry number' });
        try {
            const result = await loadStockTakingById({ variables: { stockTakingId } });
            const entry = result.data?.stockTakingById;
            if (!entry) return toastRef.current?.show({ severity: 'warn', summary: 'Entry not found', detail: `No stock-taking entry found for #${stockTakingId}.` });
            setCurrentId(entry.stockTakingId); setEditEntryNo(String(entry.stockTakingId)); setVoucherNumber(entry.voucherNumber ?? ''); setVoucherDate(parseDateText(entry.voucherDateText)); setItemBrandId(entry.itemBrandId ?? null); setGodownId(entry.godownId ?? null); setIsCancelled(Number(entry.isCancelledFlag ?? 0) === 1); setRemarks(entry.remarks ?? ''); resetDraft();
            setLines((entry.lines ?? []).filter((line: any) => Number(line.itemId ?? 0) > 0).map((line: any) => { const itemId = Number(line.itemId ?? 0); const systemQuantity = Number(line.systemQuantity ?? 0); const actualQuantity = Number(line.actualQuantity ?? 0); const varianceQuantity = Number(line.varianceQuantity ?? actualQuantity - systemQuantity); const rate = Number(line.rate ?? 0); return { lineId: `loaded-${line.stockTakingLineId}`, itemId, itemName: productMap.get(itemId)?.name?.trim() || `Item ${itemId}`, unitId: line.unitId != null ? Number(line.unitId) : null, systemQuantity, actualQuantity, varianceQuantity, mrp: Number(line.mrp ?? 0), rate, varianceAmount: Number(line.varianceAmount ?? varianceQuantity * rate), remarks: line.remarks ?? '' }; }));
            toastRef.current?.show({ severity: 'success', summary: 'Loaded', detail: `Entry #${entry.stockTakingId} loaded for edit.` });
        } catch (error: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Load failed', detail: error?.message ?? 'Unable to load stock-taking entry.' });
        }
    };

    const linePayload = (line: DraftLine) => ({ itemId: line.itemId, unitId: line.unitId, systemQuantity: line.systemQuantity, actualQuantity: line.actualQuantity, varianceQuantity: line.varianceQuantity, mrp: line.mrp, rate: line.rate, varianceAmount: line.varianceAmount, remarks: line.remarks || null });
    const saveEntry = async () => {
        if (!voucherDate) return toastRef.current?.show({ severity: 'warn', summary: 'Voucher date is required' });
        if (lines.length === 0) return toastRef.current?.show({ severity: 'warn', summary: 'Add at least one line before save' });
        const variables = { voucherNumber: voucherNumber.trim() || null, voucherDateText: toDateText(voucherDate), itemBrandId, godownId, isCancelledFlag: isCancelled ? 1 : 0, remarks: remarks.trim() || null, lines: lines.map(linePayload) };
        try {
            if (currentId) {
                const result = await updateStockTaking({ variables: { stockTakingId: currentId, ...variables } });
                const nextId = result.data?.updateStockTaking?.stockTakingId ?? currentId; setLastSavedId(nextId); toastRef.current?.show({ severity: 'success', summary: 'Updated', detail: `Stock Taking entry #${nextId} updated.` }); return;
            }
            const result = await createStockTaking({ variables });
            const nextId = result.data?.createStockTaking?.stockTakingId ?? null; setLastSavedId(nextId); setCurrentId(nextId); if (nextId) setEditEntryNo(String(nextId)); toastRef.current?.show({ severity: 'success', summary: 'Saved', detail: nextId ? `Stock Taking entry #${nextId} saved.` : 'Stock Taking entry saved.' });
        } catch (error: any) {
            toastRef.current?.show({ severity: 'error', summary: currentId ? 'Update failed' : 'Save failed', detail: error?.message ?? 'Unable to save stock-taking entry.' });
        }
    };

    const deleteCurrent = async () => {
        if (!currentId || !window.confirm(`Delete stock-taking entry #${currentId}?`)) return;
        try { const id = currentId; await deleteStockTaking({ variables: { stockTakingId: id } }); toastRef.current?.show({ severity: 'success', summary: 'Deleted', detail: `Stock Taking entry #${id} deleted.` }); resetForm(); } catch (error: any) { toastRef.current?.show({ severity: 'error', summary: 'Delete failed', detail: error?.message ?? 'Unable to delete stock-taking entry.' }); }
    };

    const totals = useMemo(() => lines.reduce((sum, line) => ({ qty: sum.qty + line.varianceQuantity, amount: sum.amount + line.varianceAmount }), { qty: 0, amount: 0 }), [lines]);
    const loadingError = brandError || productError || godownError;

    return <div className="card app-gradient-card">
        <Toast ref={toastRef} />
        <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
            <div><h2 className="m-0">Stock Taking</h2><p className="mt-2 mb-0 text-600">Capture barcode or item-based stock counts with system quantity, variance, and godown context.</p></div>
            <div className="flex gap-2 align-items-center flex-wrap">{lastSavedId ? <Tag severity="success" value={`Last Saved #${lastSavedId}`} /> : null}{currentId ? <Tag severity="info" value={`Edit Mode #${currentId}`} /> : <Tag severity="info" value="Create Mode" />}</div>
        </div>
        {loadingError ? <p className="text-red-500 m-0 mb-2">Error loading masters: {loadingError.message}</p> : null}
        <div className="surface-50 border-1 surface-border border-round p-3 mb-3"><div className="grid align-items-end"><div className="col-12 md:col-4"><label htmlFor="stock-taking-edit-entry" className="block text-600 mb-1">Entry No (Load for Edit)</label><AppInput id="stock-taking-edit-entry" value={editEntryNo} onChange={(event) => setEditEntryNo(event.target.value)} placeholder="Enter entry no" /></div><div className="col-12 md:col-8"><div className="flex flex-wrap gap-2"><Button type="button" className="app-action-compact" icon="pi pi-search" label={loadingEntry ? 'Loading...' : 'Load Entry'} onClick={() => void loadForEdit()} disabled={loadingEntry || saving || deleting} /><Button type="button" className="p-button-text" icon="pi pi-plus-circle" label="New Entry" onClick={resetForm} disabled={loadingEntry || saving || deleting} /></div></div></div></div>
        <div className="grid"><div className="col-12 md:col-3"><label htmlFor="stock-taking-voucher-no" className="block text-600 mb-1">Voucher No</label><AppInput id="stock-taking-voucher-no" value={voucherNumber} onChange={(event) => setVoucherNumber(event.target.value)} placeholder="Auto/Manual" /></div><div className="col-12 md:col-3"><label htmlFor="stock-taking-voucher-date" className="block text-600 mb-1">Voucher Date</label><AppDateInput inputId="stock-taking-voucher-date" value={voucherDate} onChange={setVoucherDate} /></div><div className="col-12 md:col-3"><label htmlFor="stock-taking-brand" className="block text-600 mb-1">Item Brand</label><AppDropdown inputId="stock-taking-brand" value={itemBrandId} options={brandOptions} optionLabel="label" optionValue="value" placeholder={brandLoading ? 'Loading brands...' : 'Brand'} filter onChange={(event) => { setItemBrandId((event.value as number | null) ?? null); setDraftItemId(null); }} /></div><div className="col-12 md:col-3"><label htmlFor="stock-taking-godown" className="block text-600 mb-1">Godown</label><AppDropdown inputId="stock-taking-godown" value={godownId} options={godownOptions} optionLabel="label" optionValue="value" placeholder={godownLoading ? 'Loading godowns...' : 'Godown'} filter onChange={(event) => setGodownId((event.value as number | null) ?? null)} /></div><div className="col-12 md:col-9"><label htmlFor="stock-taking-remarks" className="block text-600 mb-1">Remarks</label><AppInput id="stock-taking-remarks" value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Header remarks" /></div><div className="col-12 md:col-3 flex align-items-end"><div className="flex align-items-center gap-2 mb-2"><Checkbox inputId="stock-taking-cancelled" checked={isCancelled} onChange={(event) => setIsCancelled(Boolean(event.checked))} /><label htmlFor="stock-taking-cancelled">Cancelled</label></div></div></div>
        <div className="surface-50 border-1 surface-border border-round p-3 mt-2 mb-3"><h3 className="m-0 mb-2 text-900">Add Count Line</h3><div className="grid"><div className="col-12 md:col-4"><label htmlFor="stock-taking-barcode" className="block text-600 mb-1">Barcode</label><div className="flex gap-2"><AppInput id="stock-taking-barcode" value={draftBarcode} onChange={(event) => setDraftBarcode(event.target.value)} placeholder="Scan barcode" /><Button type="button" className="p-button-text" icon="pi pi-barcode" label="Resolve" onClick={() => void resolveBarcode()} disabled={saving || deleting} /></div></div><div className="col-12 md:col-4"><label htmlFor="stock-taking-item" className="block text-600 mb-1">Item</label><AppDropdown inputId="stock-taking-item" value={draftItemId} options={itemOptions} optionLabel="label" optionValue="value" placeholder={productLoading ? 'Loading items...' : 'Item'} filter onChange={(event) => selectItem((event.value as number | null) ?? null)} /></div><div className="col-12 md:col-4 flex align-items-end"><div className="text-600 text-sm">{selectedItem ? `Resolved item: ${selectedItem.name?.trim() || `Item ${draftItemId}`}` : 'Select or scan a product to add a stock-taking line.'}</div></div><div className="col-12 md:col-3"><label htmlFor="stock-taking-system-qty" className="block text-600 mb-1">System Qty</label><AppInput id="stock-taking-system-qty" value={draftSystemQty} onChange={(event) => setDraftSystemQty(event.target.value)} placeholder="0" /></div><div className="col-12 md:col-3"><label htmlFor="stock-taking-actual-qty" className="block text-600 mb-1">Actual Qty</label><AppInput id="stock-taking-actual-qty" value={draftActualQty} onChange={(event) => setDraftActualQty(event.target.value)} placeholder="0" /></div><div className="col-12 md:col-2"><label htmlFor="stock-taking-mrp" className="block text-600 mb-1">MRP</label><AppInput id="stock-taking-mrp" value={draftMrp} onChange={(event) => setDraftMrp(event.target.value)} placeholder="0.00" /></div><div className="col-12 md:col-2"><label htmlFor="stock-taking-rate" className="block text-600 mb-1">Rate</label><AppInput id="stock-taking-rate" value={draftRate} onChange={(event) => setDraftRate(event.target.value)} placeholder="0.00" /></div><div className="col-12 md:col-2 flex align-items-end"><Button type="button" className="p-button-text" icon={prefilling ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'} label="Load System" onClick={() => (draftItemId ? void prefillDraft(draftItemId) : undefined)} disabled={!draftItemId || prefilling || saving || deleting} /></div><div className="col-12 md:col-9"><label htmlFor="stock-taking-line-remarks" className="block text-600 mb-1">Line Remarks</label><AppInput id="stock-taking-line-remarks" value={draftRemarks} onChange={(event) => setDraftRemarks(event.target.value)} placeholder="Line remarks" /></div><div className="col-12 md:col-3 flex align-items-end justify-content-end"><Button type="button" className="app-action-compact" icon="pi pi-plus" label="Add Line" onClick={addLine} disabled={saving || deleting || prefilling} /></div></div></div>
        <AppDataTable value={lines} dataKey="lineId" size="small" stripedRows paginator rows={8} rowsPerPageOptions={[8, 16, 25]} emptyMessage="No lines added yet" headerRight={<div className="text-700 text-sm">Variance Qty: <strong>{formatAmount(totals.qty)}</strong> | Variance Amount: <strong>{formatAmount(totals.amount)}</strong></div>}><Column field="itemName" header="Item" style={{ minWidth: '16rem' }} /><Column field="unitId" header="Unit Id" style={{ width: '7rem' }} /><Column field="systemQuantity" header="System Qty" body={(row: DraftLine) => formatAmount(row.systemQuantity)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="actualQuantity" header="Actual Qty" body={(row: DraftLine) => formatAmount(row.actualQuantity)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="varianceQuantity" header="Variance Qty" body={(row: DraftLine) => formatAmount(row.varianceQuantity)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} /><Column field="mrp" header="MRP" body={(row: DraftLine) => formatAmount(row.mrp)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} /><Column field="rate" header="Rate" body={(row: DraftLine) => formatAmount(row.rate)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} /><Column field="varianceAmount" header="Variance Amt" body={(row: DraftLine) => formatAmount(row.varianceAmount)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '9rem' }} /><Column field="remarks" header="Remarks" style={{ minWidth: '14rem' }} /><Column header="Actions" body={(row: DraftLine) => <Button type="button" icon="pi pi-trash" className="p-button-text p-button-sm p-button-danger" onClick={() => setLines((current) => current.filter((line) => line.lineId !== row.lineId))} disabled={saving || deleting} />} style={{ width: '6rem' }} /></AppDataTable>
        <div className="flex flex-wrap gap-2 mt-3"><Button type="button" className="app-action-compact" icon="pi pi-save" label={saving ? (currentId ? 'Updating...' : 'Saving...') : currentId ? 'Update' : 'Save'} onClick={() => void saveEntry()} disabled={saving || deleting || !voucherDate || lines.length === 0} />{currentId ? <Button type="button" className="p-button-danger p-button-text" icon="pi pi-trash" label={deleting ? 'Deleting...' : 'Delete'} onClick={() => void deleteCurrent()} disabled={saving || deleting} /> : null}<Button type="button" className="p-button-text" icon="pi pi-refresh" label="Reset Draft" onClick={resetForm} disabled={saving || deleting} /></div>
    </div>;
}
