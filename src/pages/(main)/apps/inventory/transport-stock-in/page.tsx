'use client';

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { formatAmount, toDateText } from '@/pages/(main)/apps/billing/helpers';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { resolveIdentifierCode } from '@/lib/crm/api';
import { LayoutContext } from '@/layout/context/layoutcontext';

type SelectOption = {
    label: string;
    value: number | null;
    productBrandId?: number | null;
};

type DraftLine = {
    lineId: string;
    itemId: number;
    itemName: string;
    quantity: number;
    mrp: number;
    cost: number;
    unitId?: number | null;
    margin?: number | null;
    sellingRate?: number | null;
    dMargin?: number | null;
    ledgerTaxId?: number | null;
    beforeVatRate?: number | null;
    schRate?: number | null;
    schAmount?: number | null;
    landingCost?: number | null;
    isManualSchemeFlag?: number | null;
    isManualDMarginFlag?: number | null;
    isManualMarginFlag?: number | null;
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

type StockInLineGql = {
    stockInLineId: number;
    itemId: number | null;
    unitId: number | null;
    quantity: number | null;
    mrp: number | null;
    margin: number | null;
    sellingRate: number | null;
    dMargin: number | null;
    cost: number | null;
    ledgerTaxId: number | null;
    beforeVatRate: number | null;
    schRate: number | null;
    schAmount: number | null;
    landingCost: number | null;
    isManualSchemeFlag: number | null;
    isManualDMarginFlag: number | null;
    isManualMarginFlag: number | null;
};

type StockInGql = {
    stockInId: number;
    voucherNumber: string | null;
    voucherDateText: string | null;
    itemBrandId: number | null;
    isCancelledFlag: number | null;
    lines: StockInLineGql[] | null;
};

type StockInByIdQueryData = {
    stockInById: StockInGql | null;
};

type StockInByIdQueryVariables = {
    stockInId: number;
};

type CreateStockInMutationData = {
    createStockIn: StockInGql;
};

type CreateStockInMutationVariables = {
    voucherNumber?: string | null;
    voucherDateText: string;
    itemBrandId?: number | null;
    isCancelledFlag?: number | null;
    lines: Array<{
        itemId: number;
        unitId?: number | null;
        quantity: number;
        mrp?: number | null;
        margin?: number | null;
        sellingRate?: number | null;
        dMargin?: number | null;
        cost?: number | null;
        ledgerTaxId?: number | null;
        beforeVatRate?: number | null;
        schRate?: number | null;
        schAmount?: number | null;
        landingCost?: number | null;
        isManualSchemeFlag?: number | null;
        isManualDMarginFlag?: number | null;
        isManualMarginFlag?: number | null;
    }>;
};

type UpdateStockInMutationData = {
    updateStockIn: StockInGql;
};

type UpdateStockInMutationVariables = {
    stockInId: number;
    voucherNumber?: string | null;
    voucherDateText?: string | null;
    itemBrandId?: number | null;
    isCancelledFlag?: number | null;
    lines?: Array<{
        itemId: number;
        unitId?: number | null;
        quantity: number;
        mrp?: number | null;
        margin?: number | null;
        sellingRate?: number | null;
        dMargin?: number | null;
        cost?: number | null;
        ledgerTaxId?: number | null;
        beforeVatRate?: number | null;
        schRate?: number | null;
        schAmount?: number | null;
        landingCost?: number | null;
        isManualSchemeFlag?: number | null;
        isManualDMarginFlag?: number | null;
        isManualMarginFlag?: number | null;
    }>;
};

type DeleteStockInMutationData = {
    deleteStockIn: boolean;
};

type DeleteStockInMutationVariables = {
    stockInId: number;
};

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

const STOCK_IN_BY_ID = gql`
    query StockInById($stockInId: Int!) {
        stockInById(stockInId: $stockInId) {
            stockInId
            voucherNumber
            voucherDateText
            itemBrandId
            isCancelledFlag
            lines {
                stockInLineId
                itemId
                unitId
                quantity
                mrp
                margin
                sellingRate
                dMargin
                cost
                ledgerTaxId
                beforeVatRate
                schRate
                schAmount
                landingCost
                isManualSchemeFlag
                isManualDMarginFlag
                isManualMarginFlag
            }
        }
    }
`;

const CREATE_STOCK_IN = gql`
    mutation CreateStockIn(
        $voucherNumber: String
        $voucherDateText: String!
        $itemBrandId: Int
        $isCancelledFlag: Int
        $lines: [StockInLineInput!]!
    ) {
        createStockIn(
            voucherNumber: $voucherNumber
            voucherDateText: $voucherDateText
            itemBrandId: $itemBrandId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        ) {
            stockInId
            voucherNumber
            voucherDateText
            itemBrandId
            isCancelledFlag
        }
    }
`;

const UPDATE_STOCK_IN = gql`
    mutation UpdateStockIn(
        $stockInId: Int!
        $voucherNumber: String
        $voucherDateText: String
        $itemBrandId: Int
        $isCancelledFlag: Int
        $lines: [StockInLineInput!]
    ) {
        updateStockIn(
            stockInId: $stockInId
            voucherNumber: $voucherNumber
            voucherDateText: $voucherDateText
            itemBrandId: $itemBrandId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        ) {
            stockInId
            voucherNumber
            voucherDateText
            itemBrandId
            isCancelledFlag
        }
    }
`;

const DELETE_STOCK_IN = gql`
    mutation DeleteStockIn($stockInId: Int!) {
        deleteStockIn(stockInId: $stockInId)
    }
`;

const DEFAULT_VOUCHER_DATE = () => new Date();

const parseDateText = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d{8}$/.test(trimmed)) {
        const yyyy = Number(trimmed.slice(0, 4));
        const mm = Number(trimmed.slice(4, 6));
        const dd = Number(trimmed.slice(6, 8));
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-').map(Number);
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const dd = Number(slash[1]);
        const mm = Number(slash[2]);
        const yyyy = Number(slash[3]);
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

export default function InventoryTransportStockInPage() {
    const { setPageTitle } = useContext(LayoutContext);
    const toastRef = useRef<Toast>(null);

    const [voucherNumber, setVoucherNumber] = useState('');
    const [voucherDate, setVoucherDate] = useState<Date | null>(DEFAULT_VOUCHER_DATE());
    const [itemBrandId, setItemBrandId] = useState<number | null>(null);
    const [isCancelled, setIsCancelled] = useState(false);

    const [draftItemId, setDraftItemId] = useState<number | null>(null);
    const [draftBarcodeValue, setDraftBarcodeValue] = useState('');
    const [draftQuantity, setDraftQuantity] = useState('');
    const [draftMrp, setDraftMrp] = useState('');
    const [draftCost, setDraftCost] = useState('');

    const [lines, setLines] = useState<DraftLine[]>([]);
    const [lastSavedStockInId, setLastSavedStockInId] = useState<number | null>(null);
    const [currentStockInId, setCurrentStockInId] = useState<number | null>(null);
    const [editEntryNo, setEditEntryNo] = useState('');

    useEffect(() => {
        setPageTitle('Transport Stock In');
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

    const [loadStockInById, { loading: loadingEntry }] = useLazyQuery<
        StockInByIdQueryData,
        StockInByIdQueryVariables
    >(STOCK_IN_BY_ID, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });

    const [createStockIn, { loading: creating }] = useMutation<
        CreateStockInMutationData,
        CreateStockInMutationVariables
    >(CREATE_STOCK_IN, {
        client: inventoryApolloClient
    });

    const [updateStockIn, { loading: updating }] = useMutation<
        UpdateStockInMutationData,
        UpdateStockInMutationVariables
    >(UPDATE_STOCK_IN, {
        client: inventoryApolloClient
    });

    const [deleteStockIn, { loading: deleting }] = useMutation<
        DeleteStockInMutationData,
        DeleteStockInMutationVariables
    >(DELETE_STOCK_IN, {
        client: inventoryApolloClient
    });

    const saving = creating || updating;

    const productNameById = useMemo(() => {
        const map = new Map<number, string>();
        const rows = productData?.products ?? [];
        rows.forEach((row) => {
            const id = Number(row.productId ?? 0);
            if (!id) return;
            const name = row.name?.trim() || `Item ${id}`;
            map.set(id, name);
        });
        return map;
    }, [productData?.products]);

    const brandOptions = useMemo<SelectOption[]>(() => {
        const rows = brandData?.productBrands ?? [];
        const mapped = rows
            .map((row) => ({
                label: row.name?.trim() || `Brand ${row.productBrandId}`,
                value: Number(row.productBrandId)
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
        return [{ label: 'Select brand', value: null }, ...mapped];
    }, [brandData?.productBrands]);

    const itemOptions = useMemo<SelectOption[]>(() => {
        const rows = productData?.products ?? [];
        return rows
            .filter((row) => (itemBrandId == null ? true : Number(row.productBrandId ?? 0) === itemBrandId))
            .map((row) => ({
                label: row.name?.trim() || `Item ${row.productId}`,
                value: Number(row.productId),
                productBrandId: row.productBrandId
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
    }, [itemBrandId, productData?.products]);

    const selectedItem = itemOptions.find((option) => option.value === draftItemId) ?? null;

    const parsePositiveNumber = (value: string) => {
        const numeric = Number(value.trim());
        if (!Number.isFinite(numeric) || numeric <= 0) return null;
        return numeric;
    };

    const resolveDraftBarcode = async () => {
        const code = draftBarcodeValue.trim();
        if (!code) {
            toastRef.current?.show({ severity: 'warn', summary: 'Enter a barcode first' });
            return;
        }

        try {
            const match = await resolveIdentifierCode(code);
            if (!match) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Barcode not found',
                    detail: `No product barcode matched ${code}.`
                });
                return;
            }
            if (match.entityType !== 'PRODUCT') {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Unsupported barcode',
                    detail: `Barcode ${code} belongs to ${match.entityType}.`
                });
                return;
            }

            const productId = Number(match.entityId ?? 0);
            const product = (productData?.products ?? []).find((row) => Number(row.productId ?? 0) === productId);
            if (!product) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Product not loaded',
                    detail: `Product ${productId} is not available in the current product cache.`
                });
                return;
            }

            const nextBrandId = product.productBrandId != null ? Number(product.productBrandId) : null;
            if (nextBrandId && itemBrandId !== nextBrandId) {
                setItemBrandId(nextBrandId);
            }
            setDraftItemId(productId);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Barcode resolved',
                detail: `${product.name?.trim() || `Item ${productId}`} selected from barcode.`
            });
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Barcode lookup failed',
                detail: error?.message ?? 'Unable to resolve barcode.'
            });
        }
    };

    const addDraftLine = () => {
        if (!selectedItem || selectedItem.value == null) {
            toastRef.current?.show({ severity: 'warn', summary: 'Select an item first' });
            return;
        }

        const quantity = parsePositiveNumber(draftQuantity);
        const mrp = parsePositiveNumber(draftMrp);
        const cost = parsePositiveNumber(draftCost);
        if (quantity == null || mrp == null || cost == null) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Invalid line values',
                detail: 'Quantity, MRP, and Cost must be valid positive numbers.'
            });
            return;
        }

        const nextLine: DraftLine = {
            lineId: `${Date.now()}-${selectedItem.value}`,
            itemId: selectedItem.value,
            itemName: selectedItem.label,
            quantity,
            mrp,
            cost,
            sellingRate: mrp,
            landingCost: cost
        };

        setLines((prev) => [...prev, nextLine]);
        setDraftItemId(null);
        setDraftQuantity('');
        setDraftMrp('');
        setDraftCost('');
    };

    const removeLine = (lineId: string) => {
        setLines((prev) => prev.filter((line) => line.lineId !== lineId));
    };

    const resetDraft = () => {
        setVoucherNumber('');
        setVoucherDate(DEFAULT_VOUCHER_DATE());
        setItemBrandId(null);
        setIsCancelled(false);
        setDraftItemId(null);
        setDraftQuantity('');
        setDraftMrp('');
        setDraftCost('');
        setLines([]);
        setCurrentStockInId(null);
        setEditEntryNo('');
    };

    const mapStockInToForm = (entry: StockInGql) => {
        setCurrentStockInId(entry.stockInId);
        setEditEntryNo(String(entry.stockInId));
        setVoucherNumber(entry.voucherNumber ?? '');
        setVoucherDate(parseDateText(entry.voucherDateText) ?? DEFAULT_VOUCHER_DATE());
        setItemBrandId(entry.itemBrandId ?? null);
        setIsCancelled(Number(entry.isCancelledFlag ?? 0) === 1);

        const mappedLines: DraftLine[] = (entry.lines ?? [])
            .filter((line) => Number(line.itemId ?? 0) > 0 && Number(line.quantity ?? 0) > 0)
            .map((line) => {
                const itemId = Number(line.itemId ?? 0);
                return {
                    lineId: `loaded-${line.stockInLineId}`,
                    itemId,
                    itemName: productNameById.get(itemId) ?? `Item ${itemId}`,
                    quantity: Number(line.quantity ?? 0),
                    mrp: Number(line.mrp ?? 0),
                    cost: Number(line.cost ?? 0),
                    unitId: line.unitId,
                    margin: line.margin,
                    sellingRate: line.sellingRate,
                    dMargin: line.dMargin,
                    ledgerTaxId: line.ledgerTaxId,
                    beforeVatRate: line.beforeVatRate,
                    schRate: line.schRate,
                    schAmount: line.schAmount,
                    landingCost: line.landingCost,
                    isManualSchemeFlag: line.isManualSchemeFlag,
                    isManualDMarginFlag: line.isManualDMarginFlag,
                    isManualMarginFlag: line.isManualMarginFlag
                };
            });
        setLines(mappedLines);
    };

    const loadForEdit = async () => {
        const stockInId = Number(editEntryNo.trim());
        if (!Number.isFinite(stockInId) || stockInId <= 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Enter a valid entry number'
            });
            return;
        }

        try {
            const response = await loadStockInById({ variables: { stockInId } });
            const entry = response.data?.stockInById ?? null;
            if (!entry) {
                toastRef.current?.show({
                    severity: 'warn',
                    summary: 'Entry not found',
                    detail: `No stock-in entry found for #${stockInId}.`
                });
                return;
            }
            mapStockInToForm(entry);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Loaded',
                detail: `Entry #${entry.stockInId} loaded for edit.`
            });
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Load failed',
                detail: error?.message ?? 'Unable to load stock-in entry.'
            });
        }
    };

    const buildLinePayload = (line: DraftLine) => ({
        itemId: line.itemId,
        unitId: line.unitId ?? null,
        quantity: line.quantity,
        mrp: line.mrp,
        margin: line.margin ?? null,
        sellingRate: line.sellingRate ?? line.mrp,
        dMargin: line.dMargin ?? null,
        cost: line.cost,
        ledgerTaxId: line.ledgerTaxId ?? null,
        beforeVatRate: line.beforeVatRate ?? null,
        schRate: line.schRate ?? null,
        schAmount: line.schAmount ?? null,
        landingCost: line.landingCost ?? line.cost,
        isManualSchemeFlag: line.isManualSchemeFlag ?? null,
        isManualDMarginFlag: line.isManualDMarginFlag ?? null,
        isManualMarginFlag: line.isManualMarginFlag ?? null
    });

    const saveStockIn = async () => {
        if (!voucherDate) {
            toastRef.current?.show({ severity: 'warn', summary: 'Voucher date is required' });
            return;
        }
        if (lines.length === 0) {
            toastRef.current?.show({ severity: 'warn', summary: 'Add at least one line before save' });
            return;
        }

        try {
            if (currentStockInId) {
                const response = await updateStockIn({
                    variables: {
                        stockInId: currentStockInId,
                        voucherNumber: voucherNumber.trim() ? voucherNumber.trim() : null,
                        voucherDateText: toDateText(voucherDate),
                        itemBrandId,
                        isCancelledFlag: isCancelled ? 1 : 0,
                        lines: lines.map(buildLinePayload)
                    }
                });
                const updatedId = response.data?.updateStockIn?.stockInId ?? currentStockInId;
                setLastSavedStockInId(updatedId);
                toastRef.current?.show({
                    severity: 'success',
                    summary: 'Updated',
                    detail: `Stock In entry #${updatedId} updated.`
                });
                return;
            }

            const response = await createStockIn({
                variables: {
                    voucherNumber: voucherNumber.trim() ? voucherNumber.trim() : null,
                    voucherDateText: toDateText(voucherDate),
                    itemBrandId,
                    isCancelledFlag: isCancelled ? 1 : 0,
                    lines: lines.map(buildLinePayload)
                }
            });

            const savedId = response.data?.createStockIn?.stockInId ?? null;
            setLastSavedStockInId(savedId);
            setCurrentStockInId(savedId);
            if (savedId) setEditEntryNo(String(savedId));
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: savedId ? `Stock In entry #${savedId} saved.` : 'Stock In entry saved.'
            });
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: currentStockInId ? 'Update failed' : 'Save failed',
                detail: error?.message ?? 'Unable to save transport stock-in entry.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLElement>) => {
        if (!currentStockInId) return;
        confirmPopup({
            target: event.currentTarget,
            message: `Delete stock-in entry #${currentStockInId}?`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => {
                void handleDeleteCurrent();
            }
        });
    };

    const handleDeleteCurrent = async () => {
        if (!currentStockInId) return;
        try {
            const id = currentStockInId;
            await deleteStockIn({ variables: { stockInId: id } });
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: `Stock In entry #${id} deleted.`
            });
            resetDraft();
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Delete failed',
                detail: error?.message ?? 'Unable to delete stock-in entry.'
            });
        }
    };

    const totalAmount = useMemo(
        () => lines.reduce((sum, line) => sum + line.quantity * line.cost, 0),
        [lines]
    );

    return (
        <div className="card app-gradient-card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="m-0">Transport Stock In</h2>
                    <p className="mt-2 mb-0 text-600">
                        Create and edit transport stock-in entries with voucher header and item lines.
                    </p>
                </div>
                <div className="flex gap-2 align-items-center flex-wrap">
                    {lastSavedStockInId ? <Tag severity="success" value={`Last Saved #${lastSavedStockInId}`} /> : null}
                    {currentStockInId ? <Tag severity="info" value={`Edit Mode #${currentStockInId}`} /> : <Tag severity="info" value="Create Mode" />}
                </div>
            </div>

            {(brandError || productError) && (
                <p className="text-red-500 m-0 mb-2">Error loading masters: {brandError?.message || productError?.message}</p>
            )}

            <div className="surface-50 border-1 surface-border border-round p-3 mb-3">
                <div className="grid align-items-end">
                    <div className="col-12 md:col-4">
                        <label htmlFor="transport-stock-in-edit-entry" className="block text-600 mb-1">
                            Entry No (Load for Edit)
                        </label>
                        <AppInput
                            id="transport-stock-in-edit-entry"
                            value={editEntryNo}
                            onChange={(event) => setEditEntryNo(event.target.value)}
                            placeholder="Enter entry no"
                        />
                    </div>
                    <div className="col-12 md:col-8">
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                className="app-action-compact"
                                icon="pi pi-search"
                                label={loadingEntry ? 'Loading...' : 'Load Entry'}
                                onClick={() => void loadForEdit()}
                                disabled={loadingEntry || saving || deleting}
                            />
                            <Button
                                type="button"
                                className="p-button-text"
                                icon="pi pi-plus-circle"
                                label="New Entry"
                                onClick={resetDraft}
                                disabled={loadingEntry || saving || deleting}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid">
                <div className="col-12 md:col-3">
                    <label htmlFor="transport-stock-in-voucher-no" className="block text-600 mb-1">
                        Voucher No
                    </label>
                    <AppInput
                        id="transport-stock-in-voucher-no"
                        value={voucherNumber}
                        onChange={(event) => setVoucherNumber(event.target.value)}
                        placeholder="Auto/Manual"
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label htmlFor="transport-stock-in-voucher-date" className="block text-600 mb-1">
                        Voucher Date
                    </label>
                    <AppDateInput
                        inputId="transport-stock-in-voucher-date"
                        value={voucherDate}
                        onChange={setVoucherDate}
                    />
                </div>
                <div className="col-12 md:col-3">
                    <label htmlFor="transport-stock-in-brand" className="block text-600 mb-1">
                        Item Brand
                    </label>
                    <AppDropdown
                        inputId="transport-stock-in-brand"
                        value={itemBrandId}
                        options={brandOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder={brandLoading ? 'Loading brands...' : 'Brand'}
                        filter
                        onChange={(event) => {
                            setItemBrandId((event.value as number | null) ?? null);
                            setDraftItemId(null);
                        }}
                    />
                </div>
                <div className="col-12 md:col-3 flex align-items-end">
                    <div className="flex align-items-center gap-2 mb-2">
                        <Checkbox
                            inputId="transport-stock-in-cancelled"
                            checked={isCancelled}
                            onChange={(event) => setIsCancelled(Boolean(event.checked))}
                        />
                        <label htmlFor="transport-stock-in-cancelled">Cancelled</label>
                    </div>
                </div>
            </div>

            <div className="surface-50 border-1 surface-border border-round p-3 mt-2 mb-3">
                <h3 className="m-0 mb-2 text-900">Add Line</h3>
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label htmlFor="transport-stock-in-barcode" className="block text-600 mb-1">
                            Barcode
                        </label>
                        <div className="flex gap-2">
                            <AppInput
                                id="transport-stock-in-barcode"
                                value={draftBarcodeValue}
                                onChange={(event) => setDraftBarcodeValue(event.target.value)}
                                placeholder="Scan barcode"
                            />
                            <Button
                                type="button"
                                className="p-button-text"
                                icon="pi pi-barcode"
                                label="Resolve"
                                onClick={() => void resolveDraftBarcode()}
                                disabled={saving || deleting}
                            />
                        </div>
                    </div>
                    <div className="col-12 md:col-4">
                        <label htmlFor="transport-stock-in-item" className="block text-600 mb-1">
                            Item
                        </label>
                        <AppDropdown
                            inputId="transport-stock-in-item"
                            value={draftItemId}
                            options={itemOptions}
                            optionLabel="label"
                            optionValue="value"
                            placeholder={productLoading ? 'Loading items...' : 'Item'}
                            filter
                            onChange={(event) => setDraftItemId((event.value as number | null) ?? null)}
                        />
                    </div>
                    <div className="col-12 md:col-4 flex align-items-end">
                        <div className="text-600 text-sm">
                            {selectedItem ? `Resolved item: ${selectedItem.label}` : 'Select or scan a product to add a stock-in line.'}
                        </div>
                    </div>
                    <div className="col-12 md:col-3">
                        <label htmlFor="transport-stock-in-qty" className="block text-600 mb-1">
                            Quantity
                        </label>
                        <AppInput
                            id="transport-stock-in-qty"
                            value={draftQuantity}
                            onChange={(event) => setDraftQuantity(event.target.value)}
                            placeholder="0"
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label htmlFor="transport-stock-in-mrp" className="block text-600 mb-1">
                            MRP
                        </label>
                        <AppInput
                            id="transport-stock-in-mrp"
                            value={draftMrp}
                            onChange={(event) => setDraftMrp(event.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="col-12 md:col-3">
                        <label htmlFor="transport-stock-in-cost" className="block text-600 mb-1">
                            Cost
                        </label>
                        <AppInput
                            id="transport-stock-in-cost"
                            value={draftCost}
                            onChange={(event) => setDraftCost(event.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                    <div className="col-12 md:col-3 flex align-items-end">
                        <Button
                            type="button"
                            className="app-action-compact"
                            icon="pi pi-plus"
                            label="Add Line"
                            onClick={addDraftLine}
                            disabled={saving || deleting}
                        />
                    </div>
                </div>
            </div>

            <AppDataTable
                value={lines}
                dataKey="lineId"
                size="small"
                stripedRows
                paginator
                rows={8}
                rowsPerPageOptions={[8, 16, 25]}
                emptyMessage="No lines added yet"
                headerRight={
                    <div className="text-700 text-sm">
                        Line Amount Total: <strong>{formatAmount(totalAmount)}</strong>
                    </div>
                }
            >
                <Column field="itemName" header="Item" style={{ minWidth: '16rem' }} />
                <Column field="quantity" header="Qty" body={(row: DraftLine) => formatAmount(row.quantity)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="mrp" header="MRP" body={(row: DraftLine) => formatAmount(row.mrp)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="cost" header="Cost" body={(row: DraftLine) => formatAmount(row.cost)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '7rem' }} />
                <Column field="lineAmount" header="Amount" body={(row: DraftLine) => formatAmount(row.quantity * row.cost)} headerClassName="summary-number" bodyClassName="summary-number" style={{ width: '8rem' }} />
                <Column
                    header="Actions"
                    body={(row: DraftLine) => (
                        <Button
                            type="button"
                            icon="pi pi-trash"
                            className="p-button-text p-button-sm p-button-danger"
                            onClick={() => removeLine(row.lineId)}
                            disabled={saving || deleting}
                        />
                    )}
                    style={{ width: '6rem' }}
                />
            </AppDataTable>

            <div className="flex flex-wrap gap-2 mt-3">
                <Button
                    type="button"
                    className="app-action-compact"
                    icon="pi pi-save"
                    label={saving ? (currentStockInId ? 'Updating...' : 'Saving...') : currentStockInId ? 'Update' : 'Save'}
                    onClick={() => void saveStockIn()}
                    disabled={saving || deleting || !voucherDate || lines.length === 0}
                />
                {currentStockInId ? (
                    <Button
                        type="button"
                        className="p-button-danger p-button-text"
                        icon="pi pi-trash"
                        label={deleting ? 'Deleting...' : 'Delete'}
                        onClick={confirmDelete}
                        disabled={saving || deleting}
                    />
                ) : null}
                <Button
                    type="button"
                    className="p-button-text"
                    icon="pi pi-refresh"
                    label="Reset Draft"
                    onClick={resetDraft}
                    disabled={saving || deleting}
                />
            </div>
        </div>
    );
}
