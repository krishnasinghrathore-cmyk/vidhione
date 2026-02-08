import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client';
import { useAuth } from '@/lib/auth/context';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import * as invoicingApi from '@/lib/invoicing/api';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { makeKey, toDateText } from '../helpers';
import { useLedgerLookup } from '../useLedgerLookup';
import {
    INVOICE_GODOWNS_QUERY,
    INVOICE_HSN_CODES_QUERY,
    INVOICE_PRODUCT_BY_ID_QUERY,
    INVOICE_PRODUCTS_QUERY,
    INVOICE_UNITS_QUERY
} from './graphql';
import { computeInvoice, pickLatestActiveTaxProfile, round2 } from './calculations';
import { validateInvoice } from './validation';
import { InvoiceFormView } from './InvoiceFormView';
import type {
    InvoiceHeaderDraft,
    InvoiceLineDraft,
    InvoiceMode,
    InvoiceProduct,
    LineInventoryDraft,
    PriceListType,
    TaxProfile,
    WarehouseOption
} from './types';

type ProductUnitRow = { unitId: number | null };
type ProductSalesTaxRow = {
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    isActiveFlag: number | null;
    effectiveDateText: string | null;
};

type ProductRow = {
    productId: number;
    name: string | null;
    code: string | null;
    hsnCodeId: number | null;
    units: ProductUnitRow[] | null;
    salesTaxes: ProductSalesTaxRow[] | null;
};

type HsnCodeRow = {
    hsnCodeId: number;
    code: string | null;
    name: string | null;
};

type GodownRow = {
    godownId: number;
    name: string | null;
};

type UnitRow = {
    unitId: number;
    name: string | null;
};

const toNumberOrNull = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
};

const toStringOrEmpty = (value: unknown) => {
    if (typeof value !== 'string') return '';
    return value;
};

const normalizeTaxRow = (row: ProductSalesTaxRow): TaxProfile => ({
    ledgerTaxId: toNumberOrNull(row.ledgerTaxId),
    ledgerTax2Id: toNumberOrNull(row.ledgerTax2Id),
    ledgerTax3Id: toNumberOrNull(row.ledgerTax3Id),
    sellingRate: toNumberOrNull(row.sellingRate),
    beforeVatRate: toNumberOrNull(row.beforeVatRate),
    isActiveFlag: toNumberOrNull(row.isActiveFlag),
    effectiveDateText: row.effectiveDateText ?? null
});

const createEmptyLine = (warehouseId: number | null): InvoiceLineDraft => ({
    key: makeKey(),
    itemId: null,
    itemName: '',
    itemCode: null,
    hsnCode: '',
    unitName: null,
    quantity: 1,
    rate: 0,
    discountMode: 'PERCENT',
    discountValue: 0,
    taxLedgerId: null,
    taxLedger2Id: null,
    taxLedger3Id: null,
    inventory: {
        warehouseId,
        batchNo: '',
        expiryDate: null,
        serials: [],
        requiresBatch: false,
        requiresExpiry: false,
        requiresSerial: false
    }
});

const createDefaultHeader = (): InvoiceHeaderDraft => ({
    voucherDate: new Date(),
    voucherNumber: '',
    partyLedgerId: null,
    partyName: '',
    partyGstin: '',
    invoiceMode: 'B2C',
    placeOfSupply: 'in_state',
    priceList: 'retail',
    warehouseId: null,
    remarks: ''
});

const isBlankLine = (line: InvoiceLineDraft) => {
    return !line.itemId && !line.itemName.trim() && !line.hsnCode.trim() && line.quantity === 1 && line.rate === 0;
};

export function InvoiceFormContainer() {
    const { companyContext } = useAuth();
    const ledgerLookup = useLedgerLookup();
    const { ledgerOptions, ledgerById, loading: ledgerLoading } = ledgerLookup;

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saleInvoices, setSaleInvoices] = useState<invoicingApi.SaleInvoiceListItem[]>([]);

    const [createOpen, setCreateOpen] = useState(false);
    const [header, setHeader] = useState<InvoiceHeaderDraft>(createDefaultHeader);
    const [lines, setLines] = useState<InvoiceLineDraft[]>([createEmptyLine(null)]);
    const previousHeaderWarehouseIdRef = useRef<number | null>(null);

    const [phaseOneWarningVisible, setPhaseOneWarningVisible] = useState(false);
    const [phaseOneWarningAcknowledged, setPhaseOneWarningAcknowledged] = useState(false);

    const [productOverrides, setProductOverrides] = useState<Record<number, ProductRow>>({});

    const { data: productsData, loading: productsLoading } = useQuery<{ products: ProductRow[] }>(INVOICE_PRODUCTS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 1000 }
    });
    const { data: hsnData } = useQuery<{ hsnCodes: HsnCodeRow[] }>(INVOICE_HSN_CODES_QUERY, {
        client: inventoryApolloClient,
        variables: { limit: 2000 }
    });
    const { data: godownsData } = useQuery<{ godowns: GodownRow[] }>(INVOICE_GODOWNS_QUERY, {
        client: inventoryApolloClient,
        variables: { limit: 500 }
    });
    const { data: unitsData } = useQuery<{ units: UnitRow[] }>(INVOICE_UNITS_QUERY, {
        client: inventoryApolloClient,
        variables: { limit: 1000 }
    });

    const [fetchProductById] = useLazyQuery<{ productById: ProductRow | null }>(INVOICE_PRODUCT_BY_ID_QUERY, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });

    const hsnCodeById = useMemo(() => {
        const map = new Map<number, string>();
        (hsnData?.hsnCodes ?? []).forEach((row) => {
            const key = Number(row.hsnCodeId);
            const code = row.code?.trim() || row.name?.trim() || '';
            if (Number.isFinite(key) && code) {
                map.set(key, code);
            }
        });
        return map;
    }, [hsnData]);

    const unitNameById = useMemo(() => {
        const map = new Map<number, string>();
        (unitsData?.units ?? []).forEach((row) => {
            const key = Number(row.unitId);
            const name = row.name?.trim() || '';
            if (Number.isFinite(key) && name) {
                map.set(key, name);
            }
        });
        return map;
    }, [unitsData]);

    const mergeProductRows = useMemo(() => {
        const rows = [...(productsData?.products ?? [])];
        Object.values(productOverrides).forEach((override) => {
            const existingIndex = rows.findIndex((row) => Number(row.productId) === Number(override.productId));
            if (existingIndex >= 0) {
                rows[existingIndex] = override;
                return;
            }
            rows.push(override);
        });
        return rows;
    }, [productOverrides, productsData]);

    const products = useMemo<InvoiceProduct[]>(() => {
        return mergeProductRows.map((row) => {
            const productId = Number(row.productId);
            const name = row.name?.trim() || `Item ${productId}`;
            const code = row.code?.trim() || null;
            const hsnCodeId = row.hsnCodeId != null ? Number(row.hsnCodeId) : null;
            const hsnCode = hsnCodeId ? hsnCodeById.get(hsnCodeId) ?? '' : '';

            const unitId = row.units?.find((unit) => Number.isFinite(Number(unit.unitId)))?.unitId ?? null;
            const unitName = unitId != null ? unitNameById.get(Number(unitId)) ?? null : null;

            const taxRows = (row.salesTaxes ?? []).map(normalizeTaxRow);
            const taxProfile = pickLatestActiveTaxProfile(taxRows);
            const searchText = `${name} ${code ?? ''} ${hsnCode}`.toLowerCase();

            return {
                productId,
                name,
                code,
                hsnCodeId,
                hsnCode,
                unitName,
                searchText,
                taxProfile
            };
        });
    }, [hsnCodeById, mergeProductRows, unitNameById]);

    const productById = useMemo(() => {
        const map = new Map<number, InvoiceProduct>();
        products.forEach((product) => {
            map.set(product.productId, product);
        });
        return map;
    }, [products]);

    const productOptions = useMemo(
        () =>
            products.map((product) => ({
                label: `${product.name}${product.code ? ` • ${product.code}` : ''}`,
                value: product.productId
            })),
        [products]
    );

    const warehouseOptions = useMemo<WarehouseOption[]>(
        () =>
            (godownsData?.godowns ?? []).map((row) => ({
                label: row.name?.trim() || `Warehouse ${row.godownId}`,
                value: Number(row.godownId)
            })),
        [godownsData]
    );

    const getTaxRateByLedgerId = useCallback(
        (ledgerId: number | null) => {
            if (!ledgerId) return 0;
            const ledger = ledgerById.get(ledgerId);
            const rate = ledger?.taxRate ? Number(ledger.taxRate) : 0;
            return Number.isFinite(rate) ? rate : 0;
        },
        [ledgerById]
    );

    const computation = useMemo(
        () =>
            computeInvoice({
                lines,
                placeOfSupply: header.placeOfSupply,
                getTaxRateByLedgerId
            }),
        [getTaxRateByLedgerId, header.placeOfSupply, lines]
    );

    const validation = useMemo(() => validateInvoice({ header, lines: computation.lines }), [computation.lines, header]);

    const lineErrorsByKey = useMemo(() => {
        const map: Record<string, string[]> = {};
        validation.lineErrors.forEach((lineError) => {
            map[lineError.lineKey] = lineError.messages;
        });
        return map;
    }, [validation.lineErrors]);

    const canSave = Boolean(header.voucherDate) && computation.lines.length > 0 && validation.isValid && !saving;

    const loadSaleInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoicingApi.listSaleInvoices();
            setSaleInvoices(result.items);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSaleInvoices();
    }, [loadSaleInvoices]);

    useEffect(() => {
        const previousWarehouseId = previousHeaderWarehouseIdRef.current;
        const nextWarehouseId = header.warehouseId;
        if (previousWarehouseId === nextWarehouseId) return;

        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                const lineWarehouseId = line.inventory.warehouseId;
                const isInheritedWarehouse = lineWarehouseId === null || lineWarehouseId === previousWarehouseId;
                if (!isInheritedWarehouse || lineWarehouseId === nextWarehouseId) {
                    return line;
                }
                changed = true;
                return {
                    ...line,
                    inventory: {
                        ...line.inventory,
                        warehouseId: nextWarehouseId,
                        // Clear draft inventory picks when warehouse changes.
                        batchNo: '',
                        expiryDate: null,
                        serials: []
                    }
                };
            });
            return changed ? nextLines : previous;
        });

        previousHeaderWarehouseIdRef.current = nextWarehouseId;
    }, [header.warehouseId]);

    useEffect(() => {
        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                if (!line.itemId) return line;
                const product = productById.get(line.itemId);
                if (!product) return line;
                const nextRate =
                    header.priceList === 'wholesale'
                        ? product.taxProfile?.beforeVatRate ?? product.taxProfile?.sellingRate ?? line.rate
                        : product.taxProfile?.sellingRate ?? product.taxProfile?.beforeVatRate ?? line.rate;
                if (nextRate === line.rate) return line;
                changed = true;
                return { ...line, rate: nextRate };
            });
            return changed ? nextLines : previous;
        });
    }, [header.priceList, productById]);

    const ensureProductDetail = useCallback(
        async (productId: number) => {
            if (productOverrides[productId]) return;
            try {
                const result = await fetchProductById({ variables: { productId } });
                const detail = result.data?.productById;
                if (!detail) return;
                setProductOverrides((previous) => ({
                    ...previous,
                    [productId]: detail
                }));
            } catch {
                // keep form usable even if detail fetch fails
            }
        },
        [fetchProductById, productOverrides]
    );

    const applyProductToLine = useCallback(
        (line: InvoiceLineDraft, productId: number | null): InvoiceLineDraft => {
            if (!productId) {
                return {
                    ...line,
                    itemId: null,
                    itemName: '',
                    itemCode: null,
                    hsnCode: '',
                    unitName: null,
                    taxLedgerId: null,
                    taxLedger2Id: null,
                    taxLedger3Id: null,
                    rate: 0
                };
            }

            const product = productById.get(productId);
            if (!product) return line;

            void ensureProductDetail(productId);

            const rate =
                header.priceList === 'wholesale'
                    ? product.taxProfile?.beforeVatRate ?? product.taxProfile?.sellingRate ?? 0
                    : product.taxProfile?.sellingRate ?? product.taxProfile?.beforeVatRate ?? 0;

            return {
                ...line,
                itemId: product.productId,
                itemName: product.name,
                itemCode: product.code,
                hsnCode: product.hsnCode,
                unitName: product.unitName,
                rate,
                taxLedgerId: product.taxProfile?.ledgerTaxId ?? null,
                taxLedger2Id: product.taxProfile?.ledgerTax2Id ?? null,
                taxLedger3Id: product.taxProfile?.ledgerTax3Id ?? null
            };
        },
        [ensureProductDetail, header.priceList, productById]
    );

    const openCreate = () => {
        setError(null);
        setHeader(createDefaultHeader());
        setLines([createEmptyLine(null)]);
        setCreateOpen(true);
    };

    const closeCreate = () => {
        if (saving) return;
        setCreateOpen(false);
        setPhaseOneWarningVisible(false);
    };

    const addLine = useCallback(() => {
        setLines((previous) => [...previous, createEmptyLine(header.warehouseId)]);
    }, [header.warehouseId]);

    const addItem = useCallback(
        (productId: number) => {
            const product = productById.get(productId);
            if (!product) return;

            setLines((previous) => {
                const existingIndex = previous.findIndex(
                    (line) => line.itemId === productId && !line.inventory.requiresSerial
                );

                if (existingIndex >= 0) {
                    return previous.map((line, index) =>
                        index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line
                    );
                }

                const nextLine = applyProductToLine(createEmptyLine(header.warehouseId), productId);
                if (previous.length === 1 && isBlankLine(previous[0])) {
                    return [nextLine];
                }
                return [...previous, nextLine];
            });
        },
        [applyProductToLine, header.warehouseId, productById]
    );

    const selectProduct = useCallback(
        (lineKey: string, productId: number | null) => {
            setLines((previous) => previous.map((line) => (line.key === lineKey ? applyProductToLine(line, productId) : line)));
        },
        [applyProductToLine]
    );

    const changeHeader = useCallback(
        (patch: Partial<InvoiceHeaderDraft>) => {
            setHeader((previous) => {
                const next = { ...previous, ...patch };
                if (patch.partyLedgerId !== undefined && patch.partyLedgerId !== null) {
                    const ledger = ledgerById.get(patch.partyLedgerId);
                    const gstin = ledger?.gstNumber?.trim() ?? next.partyGstin;
                    next.partyGstin = gstin;
                    next.invoiceMode = gstin ? 'B2B' : next.invoiceMode;
                }
                if (patch.invoiceMode && patch.invoiceMode === 'B2B' && !next.partyGstin.trim()) {
                    next.invoiceMode = 'B2B' as InvoiceMode;
                }
                return next;
            });
        },
        [ledgerById]
    );

    const changeLine = useCallback((lineKey: string, patch: Partial<InvoiceLineDraft>) => {
        setLines((previous) => previous.map((line) => (line.key === lineKey ? { ...line, ...patch } : line)));
    }, []);

    const changeInventory = useCallback((lineKey: string, patch: Partial<LineInventoryDraft>) => {
        setLines((previous) =>
            previous.map((line) =>
                line.key === lineKey
                    ? {
                          ...line,
                          inventory: {
                              ...line.inventory,
                              ...patch
                          }
                      }
                    : line
            )
        );
    }, []);

    const deleteLine = useCallback(
        (lineKey: string) => {
            setLines((previous) => {
                if (previous.length <= 1) return previous;
                const next = previous.filter((line) => line.key !== lineKey);
                return next.length > 0 ? next : [createEmptyLine(header.warehouseId)];
            });
        },
        [header.warehouseId]
    );

    const duplicateLine = useCallback((lineKey: string) => {
        setLines((previous) => {
            const sourceIndex = previous.findIndex((line) => line.key === lineKey);
            if (sourceIndex < 0) return previous;
            const sourceLine = previous[sourceIndex];
            const duplicated: InvoiceLineDraft = {
                ...sourceLine,
                key: makeKey(),
                inventory: {
                    ...sourceLine.inventory,
                    serials: []
                }
            };
            const next = [...previous];
            next.splice(sourceIndex + 1, 0, duplicated);
            return next;
        });
    }, []);

    const createInvoice = useCallback(async () => {
        if (!header.voucherDate) return;

        const dateValidation = validateSingleDate({ date: header.voucherDate }, fiscalRange);
        if (!dateValidation.ok) {
            const message = dateValidation.errors.date ?? 'Voucher date is required';
            setError(message);
            return;
        }

        if (!validation.isValid) {
            setError('Please fix all validation errors before saving.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const inputLines = computation.lines.map((line, index) => {
                const isAmountDiscount = line.discountMode === 'AMOUNT';
                return {
                    lineNumber: index + 1,
                    itemId: line.itemId,
                    quantity: line.quantity,
                    unitPrice: line.rate,
                    lineAmount: line.lineAmount,
                    finalAmount: line.lineAmount,
                    productDiscountRate: isAmountDiscount ? 0 : line.discountValue,
                    productDiscountAmount: isAmountDiscount ? line.discountValue : line.discountAmount,
                    isManualProductDiscount: isAmountDiscount,
                    taxLedgerId: line.taxLedgerId,
                    taxRate: line.taxRate,
                    taxAmount: line.taxAmount,
                    taxableAmount: line.lineAmount,
                    taxLedger2Id: line.taxLedger2Id,
                    taxRate2: line.taxRate2,
                    taxAmount2: line.taxAmount2,
                    taxableAmount2: line.lineAmount,
                    taxLedger3Id: line.taxLedger3Id,
                    taxRate3: line.taxRate3,
                    taxAmount3: line.taxAmount3,
                    taxableAmount3: line.lineAmount,
                    remarks: line.itemName || null
                } satisfies invoicingApi.SaleInvoiceLineInput;
            });

            const taxLines = computation.taxSummary.map((summary) => ({
                ledgerId: summary.ledgerId,
                addAmount: round2(summary.taxAmount),
                lessAmount: 0,
                taxableAmount: round2(summary.taxableAmount)
            })) satisfies invoicingApi.SaleInvoiceTaxLineInput[];

            const payload: invoicingApi.CreateSaleInvoiceInput = {
                voucherDateText: toDateText(header.voucherDate),
                voucherNumber: header.voucherNumber.trim() || null,
                ledgerId: header.partyLedgerId,
                ledgerName: header.partyName.trim() || null,
                ledgerGroupId: header.partyLedgerId ? ledgerById.get(header.partyLedgerId)?.ledgerGroupId ?? null : null,
                remarks: header.remarks.trim() || null,
                isOtherState: header.placeOfSupply === 'other_state',
                totalProductDiscountAmount: round2(computation.totals.totalDiscount),
                totalGrossAmount: round2(computation.totals.totalTaxable),
                totalTaxAmount: round2(computation.totals.totalTax),
                totalNetAmount: round2(computation.totals.totalNetAmount),
                totalQuantity: round2(computation.totals.totalQuantity),
                totalQuantityRateAmount: round2(computation.totals.totalBeforeDiscount),
                totalAmount: round2(computation.totals.totalTaxable),
                totalFinalAmount: round2(computation.totals.totalTaxable),
                roundOffAmount: 0,
                lines: inputLines,
                taxLines
            };

            await invoicingApi.createSaleInvoice(payload);
            setCreateOpen(false);
            await loadSaleInvoices();
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to create invoice');
        } finally {
            setSaving(false);
        }
    }, [computation, fiscalRange, header, ledgerById, loadSaleInvoices, validation.isValid]);

    const requestSave = useCallback(() => {
        if (!phaseOneWarningAcknowledged) {
            setPhaseOneWarningVisible(true);
            return;
        }
        void createInvoice();
    }, [createInvoice, phaseOneWarningAcknowledged]);

    return (
        <InvoiceFormView
            loading={loading}
            saving={saving}
            error={error}
            productsLoading={productsLoading}
            saleInvoices={saleInvoices}
            createOpen={createOpen}
            header={header}
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            ledgerOptions={ledgerOptions}
            ledgerById={ledgerById}
            ledgerLoading={ledgerLoading}
            products={products}
            productOptions={productOptions}
            warehouseOptions={warehouseOptions}
            computation={computation}
            headerErrors={validation.headerErrors}
            lineErrorsByKey={lineErrorsByKey}
            canSave={canSave}
            phaseOneWarningVisible={phaseOneWarningVisible}
            onRefresh={loadSaleInvoices}
            onOpenCreate={openCreate}
            onCloseCreate={closeCreate}
            onHeaderChange={changeHeader}
            onAddItem={addItem}
            onSelectProduct={selectProduct}
            onLineChange={changeLine}
            onInventoryChange={changeInventory}
            onDeleteLine={deleteLine}
            onDuplicateLine={duplicateLine}
            onAddLine={addLine}
            onRequestSave={requestSave}
            onCancelPhaseOneWarning={() => setPhaseOneWarningVisible(false)}
            onConfirmPhaseOneWarning={() => {
                setPhaseOneWarningAcknowledged(true);
                setPhaseOneWarningVisible(false);
                void createInvoice();
            }}
        />
    );
}
