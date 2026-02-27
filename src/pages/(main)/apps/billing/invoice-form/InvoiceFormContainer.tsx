import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
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
    INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY,
    INVOICE_PRODUCTS_QUERY,
    INVOICE_UNITS_QUERY
} from './graphql';
import { computeInvoice, parseDateKey, pickLatestActiveTaxProfile, round2 } from './calculations';
import { validateInvoice } from './validation';
import { InvoiceFormView } from './InvoiceFormView';
import type {
    InvoiceAdditionalTaxationDraft,
    InvoiceFormRouteView,
    InvoiceHeaderDraft,
    InvoiceLineDraft,
    InvoicePreservedDetails,
    InvoiceProduct,
    InvoiceProductAttributeOption,
    InvoiceTypeDetailDraft,
    LineInventoryDraft,
    TaxProfile,
    TaxSummaryRow,
    WarehouseOption
} from './types';

type ProductUnitRow = { unitId: number | null };
type ProductSalesTaxRow = {
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
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
    productAttributeTypeId: number | null;
    units: ProductUnitRow[] | null;
    salesTaxes: ProductSalesTaxRow[] | null;
};

type ProductAttributeTypeRow = {
    productAttributeTypeId: number;
    productAttributes: InvoiceProductAttributeOption[] | null;
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

type InvoiceRegisterVoucherTypeMasterRow = {
    voucherTypeId: number;
    voucherTypeCode: number | null;
    voucherTypeName: string | null;
    displayName: string | null;
    defaultReportLookbackDays: number | null;
};

type ProductOption = {
    label: string;
    value: number;
    searchText?: string | null;
};

type MRPOption = {
    label: string;
    value: number;
};

type TaxLedgerOption = {
    label: string;
    value: number;
    address: string | null;
    ledgerGroupId: number | null;
    taxRate: number;
};

const toNumberOrNull = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
};

const fromDateText = (value: string | null | undefined): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d{8}$/.test(trimmed)) {
        const yyyy = Number(trimmed.slice(0, 4));
        const mm = Number(trimmed.slice(4, 6));
        const dd = Number(trimmed.slice(6, 8));
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [yyyy, mm, dd] = trimmed.split('-').map((part) => Number(part));
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        const [dd, mm, yyyy] = trimmed.split('/').map((part) => Number(part));
        const parsed = new Date(yyyy, mm - 1, dd);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
};

const toDateDayKey = (value: Date | null | undefined) => {
    if (!value) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
};

const parseVoucherSerial = (value: string | null | undefined) => {
    const text = (value ?? '').trim();
    if (!text) return null;
    if (/^\d+$/.test(text)) {
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : null;
    }
    const suffix = text.match(/(\d+)$/);
    if (!suffix) return null;
    const parsed = Number(suffix[1]);
    return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTaxRow = (row: ProductSalesTaxRow): TaxProfile => ({
    ledgerTaxId: toNumberOrNull(row.ledgerTaxId),
    ledgerTax2Id: toNumberOrNull(row.ledgerTax2Id),
    ledgerTax3Id: toNumberOrNull(row.ledgerTax3Id),
    mrp: toNumberOrNull(row.mrp),
    sellingRate: toNumberOrNull(row.sellingRate),
    beforeVatRate: toNumberOrNull(row.beforeVatRate),
    isActiveFlag: toNumberOrNull(row.isActiveFlag),
    effectiveDateText: row.effectiveDateText ?? null
});

const parseInventorySerialsText = (value: string | null | undefined) => {
    if (!value) return [];
    const seen = new Set<string>();
    return value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => {
            if (!entry || seen.has(entry)) return false;
            seen.add(entry);
            return true;
        });
};

const serializeLineInventory = (inventory: LineInventoryDraft) =>
    JSON.stringify({
        warehouseId: inventory.warehouseId ?? null,
        batchNo: inventory.batchNo.trim(),
        expiryDateText: inventory.expiryDate ? toDateText(inventory.expiryDate) : null,
        serials: inventory.serials.map((serial) => serial.trim()).filter(Boolean),
        requiresBatch: Boolean(inventory.requiresBatch),
        requiresExpiry: Boolean(inventory.requiresExpiry),
        requiresSerial: Boolean(inventory.requiresSerial)
    });

const createEmptyLine = (warehouseId: number | null, lineNumber = 1): InvoiceLineDraft => ({
    key: makeKey(),
    isNewLineEntry: true,
    lineNumber,
    itemId: null,
    itemName: '',
    itemCode: null,
    itemFreeId: null,
    itemFreeName: '',
    hsnCode: '',
    unitId: null,
    unitName: null,
    unitFreeId: null,
    unitFreeName: null,
    mrp: null,
    quantity: 1,
    freeQuantity: 0,
    sellingRate: null,
    rate: 0,
    displayAmount: 0,
    productDiscountMode: 'RATE',
    productDiscountRate: 0,
    productDiscountAmount: 0,
    cashDiscountMode: 'RATE',
    cashDiscountRate: 0,
    cashDiscountAmount: 0,
    qpsDiscountMode: 'RATE',
    qpsRate: 0,
    qpsAmount: 0,
    hasScheme: false,
    replacementAmount: 0,
    taxLedgerId: null,
    taxLedger2Id: null,
    taxLedger3Id: null,
    remarks: '',
    minQuantity: 0,
    minFreeQuantity: 0,
    tmpTypeId: null,
    estimateLineId: null,
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

const createEmptyTypeDetail = (): InvoiceTypeDetailDraft => ({
    key: makeKey(),
    itemId: null,
    typeDetailId: null,
    quantity: 0,
    tmpTypeId: null
});

const createDefaultHeader = (): InvoiceHeaderDraft => ({
    voucherDate: new Date(),
    voucherNumberPrefix: '',
    voucherNumber: '',
    documentType: 'invoice',
    billNumber: '',
    estimateId: null,
    partyLedgerId: null,
    ledgerGroupId: null,
    partyName: '',
    partyGstin: '',
    placeOfSupply: 'in_state',
    priceList: 'retail',
    warehouseId: null,
    isVatIncluded: false,
    hasScheme: false,
    isDisputed: false,
    isCancelled: false,
    remarks: '',
    bizomInvoiceNumber: ''
});

const EMPTY_PRESERVED_DETAILS: InvoicePreservedDetails = {
    taxLines: [],
    creditNotes: [],
    debitNotes: [],
    otherLedgerId: null,
    itemBrandId: null,
    isChecked: false,
    g1BillNumber: null,
    g1IsSchemeMatched: false,
    g1IsAmountMatched: false,
    g1Remark: null
};

const reindexLines = (lines: InvoiceLineDraft[]) => lines.map((line, index) => ({ ...line, lineNumber: index + 1 }));

const INVOICE_REGISTER_ROUTE = '/apps/billing/invoice-form';
const INVOICE_NEW_ROUTE = `${INVOICE_REGISTER_ROUTE}/new`;
const INVOICE_EDIT_ROUTE = `${INVOICE_REGISTER_ROUTE}/edit`;
const DUTIES_AND_TAXES_GROUP_TYPE_CODE = 12;
const INVOICE_REGISTER_LOOKBACK_VOUCHER_CODE_PRIORITY = [9, 5] as const;

const INVOICE_REGISTER_VOUCHER_TYPE_MASTERS_QUERY = gql`
    query InvoiceRegisterVoucherTypeMasters {
        voucherTypeMasters {
            voucherTypeId
            voucherTypeCode
            voucherTypeName
            displayName
            defaultReportLookbackDays
        }
    }
`;

const normalizeVoucherTypeName = (row: Pick<InvoiceRegisterVoucherTypeMasterRow, 'voucherTypeName' | 'displayName'>) =>
    `${row.displayName ?? ''} ${row.voucherTypeName ?? ''}`.toLowerCase();

const toPositiveIntegerOrNull = (value: number | null | undefined) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const integer = Math.trunc(value);
    return integer > 0 ? integer : null;
};

const resolveInvoiceRegisterDefaultLookbackDays = (rows: InvoiceRegisterVoucherTypeMasterRow[]) => {
    if (!rows.length) return null;
    const withDays = rows
        .map((row) => ({
            ...row,
            resolvedDays: toPositiveIntegerOrNull(row.defaultReportLookbackDays)
        }))
        .filter((row) => row.resolvedDays != null);
    if (!withDays.length) return null;

    for (const code of INVOICE_REGISTER_LOOKBACK_VOUCHER_CODE_PRIORITY) {
        const match = withDays.find((row) => Number(row.voucherTypeCode ?? 0) === code);
        if (match?.resolvedDays != null) return match.resolvedDays;
    }

    const invoiceNamed = withDays.find((row) => /\bsale(?:s)?\s+invoice\b/.test(normalizeVoucherTypeName(row)));
    if (invoiceNamed?.resolvedDays != null) return invoiceNamed.resolvedDays;

    const salesNamed = withDays.find((row) => /\bsale(?:s)?\b/.test(normalizeVoucherTypeName(row)));
    if (salesNamed?.resolvedDays != null) return salesNamed.resolvedDays;

    return withDays[0]?.resolvedDays ?? null;
};

type InvoiceLegacyAction = 'estimate' | 'creditNote' | 'debitNote';

const INVOICE_LEGACY_ACTION_FLAGS: Record<InvoiceLegacyAction, boolean> = {
    estimate: true,
    creditNote: true,
    debitNote: true
};

type CreditNoteDraftRow = {
    key: string;
    voucherId: number | null;
    saleReturnId: number | null;
};

type DebitNoteDraftRow = {
    key: string;
    voucherId: number | null;
};

type InvoiceFormContainerProps = {
    routeView: InvoiceFormRouteView;
    routeSaleInvoiceId: number | null;
};

export function InvoiceFormContainer({ routeView, routeSaleInvoiceId }: InvoiceFormContainerProps) {
    const navigate = useNavigate();
    const { companyContext } = useAuth();
    const { options: ledgerGroupOptions } = useLedgerGroupOptions();
    const ledgerLookup = useLedgerLookup();
    const { ledgerOptions, ledgerById, loading: ledgerLoading } = ledgerLookup;

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const { data: voucherTypeMasterData } = useQuery<{
        voucherTypeMasters: InvoiceRegisterVoucherTypeMasterRow[];
    }>(INVOICE_REGISTER_VOUCHER_TYPE_MASTERS_QUERY, {
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });
    const registerDefaultLookbackDays = useMemo(
        () => resolveInvoiceRegisterDefaultLookbackDays(voucherTypeMasterData?.voucherTypeMasters ?? []),
        [voucherTypeMasterData]
    );

    const [loading, setLoading] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [legacyActionNotice, setLegacyActionNotice] = useState<string | null>(null);
    const [saleInvoices, setSaleInvoices] = useState<invoicingApi.SaleInvoiceListItem[]>([]);
    const [estimateLookupDialogVisible, setEstimateLookupDialogVisible] = useState(false);
    const [estimateLookupLoading, setEstimateLookupLoading] = useState(false);
    const [estimateLookupError, setEstimateLookupError] = useState<string | null>(null);
    const [estimateLookups, setEstimateLookups] = useState<invoicingApi.EstimateLookupItem[]>([]);
    const [creditNoteDialogVisible, setCreditNoteDialogVisible] = useState(false);
    const [debitNoteDialogVisible, setDebitNoteDialogVisible] = useState(false);
    const [creditNoteDraftRows, setCreditNoteDraftRows] = useState<CreditNoteDraftRow[]>([]);
    const [debitNoteDraftRows, setDebitNoteDraftRows] = useState<DebitNoteDraftRow[]>([]);
    const [creditNoteLookupLoading, setCreditNoteLookupLoading] = useState(false);
    const [creditNoteLookupError, setCreditNoteLookupError] = useState<string | null>(null);
    const [creditNoteLookups, setCreditNoteLookups] = useState<invoicingApi.SalesReturnBookRow[]>([]);
    const [debitNoteLookupLoading, setDebitNoteLookupLoading] = useState(false);
    const [debitNoteLookupError, setDebitNoteLookupError] = useState<string | null>(null);
    const [debitNoteLookups, setDebitNoteLookups] = useState<invoicingApi.DebitNoteLookupItem[]>([]);

    const [editingSaleInvoiceId, setEditingSaleInvoiceId] = useState<number | null>(null);
    const [header, setHeader] = useState<InvoiceHeaderDraft>(createDefaultHeader);
    const [lines, setLines] = useState<InvoiceLineDraft[]>([createEmptyLine(null)]);
    const [typeDetails, setTypeDetails] = useState<InvoiceTypeDetailDraft[]>([]);
    const [additionalTaxations, setAdditionalTaxations] = useState<InvoiceAdditionalTaxationDraft[]>([]);
    const [typeDetailOptionsByType, setTypeDetailOptionsByType] = useState<Record<number, InvoiceProductAttributeOption[]>>(
        {}
    );
    const [preservedDetails, setPreservedDetails] = useState<InvoicePreservedDetails>(EMPTY_PRESERVED_DETAILS);
    const previousHeaderWarehouseIdRef = useRef<number | null>(null);
    const previousPriceListRef = useRef<InvoiceHeaderDraft['priceList']>('retail');
    const inventorySnapshotByLineKeyRef = useRef<Record<string, string>>({});
    const autoDefaultHeaderLedgerRef = useRef(false);
    const autoVoucherNumberRef = useRef<string | null>(null);
    const hydratedRouteInvoiceIdRef = useRef<number | null>(null);

    const [phaseOneWarningVisible, setPhaseOneWarningVisible] = useState(false);
    const [phaseOneWarningAcknowledged, setPhaseOneWarningAcknowledged] = useState(false);
    const pendingSaveModeRef = useRef<'default' | 'and_new'>('default');
    const [hasUnsavedEntryChanges, setHasUnsavedEntryChanges] = useState(false);

    const isEntryRoute = routeView === 'new' || routeView === 'edit';

    const markEntryDirty = useCallback(() => {
        if (!isEntryRoute) return;
        setHasUnsavedEntryChanges(true);
    }, [isEntryRoute]);

    const confirmDiscardUnsavedChanges = useCallback(
        (nextTargetLabel: string) => {
            if (!isEntryRoute || !hasUnsavedEntryChanges) return true;
            if (typeof window === 'undefined') return true;
            return window.confirm(
                `You have unsaved changes in this invoice. Discard them and continue to ${nextTargetLabel}?`
            );
        },
        [hasUnsavedEntryChanges, isEntryRoute]
    );

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
    const [loadProductAttributeTypeOptions, { loading: typeDetailOptionsLoading }] = useLazyQuery<{
        productAttributeTypeById: ProductAttributeTypeRow | null;
    }>(INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY, {
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
            const productAttributeTypeId =
                row.productAttributeTypeId != null ? Number(row.productAttributeTypeId) : null;

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
                productAttributeTypeId,
                unitId,
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

    const productOptions = useMemo<ProductOption[]>(
        () =>
            products.map((product) => ({
                label: `${product.name}${product.code ? ` • ${product.code}` : ''}`,
                value: product.productId,
                searchText: product.searchText
            })),
        [products]
    );

    const taxProfilesByProductId = useMemo(() => {
        const map = new Map<number, TaxProfile[]>();
        mergeProductRows.forEach((row) => {
            const productId = Number(row.productId);
            if (!Number.isFinite(productId)) return;
            const profiles = (row.salesTaxes ?? [])
                .map(normalizeTaxRow)
                .sort((a, b) => parseDateKey(b.effectiveDateText) - parseDateKey(a.effectiveDateText));
            map.set(productId, profiles);
        });
        return map;
    }, [mergeProductRows]);

    const mrpOptionsByProductId = useMemo<Record<number, MRPOption[]>>(() => {
        const optionsByProductId: Record<number, MRPOption[]> = {};
        taxProfilesByProductId.forEach((profiles, productId) => {
            const seen = new Set<string>();
            const mrpOptions = profiles
                .map((profile) => {
                    const mrp = Number(profile.mrp ?? NaN);
                    if (!Number.isFinite(mrp) || mrp <= 0) return null;
                    const normalized = round2(mrp);
                    const key = normalized.toFixed(2);
                    if (seen.has(key)) return null;
                    seen.add(key);
                    return {
                        label: normalized.toFixed(2),
                        value: normalized
                    };
                })
                .filter((option): option is MRPOption => option != null);

            if (mrpOptions.length > 0) {
                optionsByProductId[productId] = mrpOptions;
            }
        });
        return optionsByProductId;
    }, [taxProfilesByProductId]);

    const dutiesAndTaxesLedgerGroupIds = useMemo(() => {
        const ids = new Set<number>();
        ledgerGroupOptions.forEach((option) => {
            if (Number(option.groupTypeCode) !== DUTIES_AND_TAXES_GROUP_TYPE_CODE) return;
            const groupId = Number(option.value);
            if (!Number.isFinite(groupId) || groupId <= 0) return;
            ids.add(groupId);
        });
        return ids;
    }, [ledgerGroupOptions]);

    const unitOptions = useMemo(
        () =>
            (unitsData?.units ?? [])
                .map((row) => {
                    const value = Number(row.unitId);
                    if (!Number.isFinite(value)) return null;
                    return {
                        label: row.name?.trim() || `Unit ${value}`,
                        value
                    };
                })
                .filter((entry): entry is { label: string; value: number } => entry != null),
        [unitsData]
    );

    const taxLedgerOptions = useMemo<TaxLedgerOption[]>(() => {
        const taxLedgersByRate = ledgerOptions
            .map((option) => {
                const ledger = ledgerById.get(option.value) ?? null;
                const rate = Number(ledger?.taxRate ?? 0);
                if (!Number.isFinite(rate) || rate <= 0) return null;
                return {
                    label: option.label,
                    value: option.value,
                    address: ledger?.address?.trim() || null,
                    ledgerGroupId: ledger?.ledgerGroupId ?? null,
                    taxRate: rate
                };
            })
            .filter((entry): entry is TaxLedgerOption => entry != null);

        if (dutiesAndTaxesLedgerGroupIds.size === 0) return taxLedgersByRate;
        const dutiesAndTaxesOnly = taxLedgersByRate.filter((option) => {
            if (option.ledgerGroupId == null) return false;
            return dutiesAndTaxesLedgerGroupIds.has(option.ledgerGroupId);
        });
        return dutiesAndTaxesOnly.length > 0 ? dutiesAndTaxesOnly : taxLedgersByRate;
    }, [dutiesAndTaxesLedgerGroupIds, ledgerById, ledgerOptions]);

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

    const additionalTaxAmount = useMemo(
        () =>
            round2(
                additionalTaxations.reduce((sum, entry) => sum + round2(Number(entry.addAmount ?? 0)), 0)
            ),
        [additionalTaxations]
    );

    const rawComputation = useMemo(
        () =>
            computeInvoice({
                lines,
                placeOfSupply: header.placeOfSupply,
                isVatIncluded: header.isVatIncluded,
                additionalTaxAmount,
                getTaxRateByLedgerId
            }),
        [additionalTaxAmount, getTaxRateByLedgerId, header.isVatIncluded, header.placeOfSupply, lines]
    );

    const taxSummaryRows = useMemo<TaxSummaryRow[]>(() => {
        const byLedger = new Map<number, TaxSummaryRow>();

        rawComputation.taxSummary.forEach((summary) => {
            if (!summary.ledgerId || !Number.isFinite(summary.ledgerId)) return;
            byLedger.set(summary.ledgerId, {
                ledgerId: summary.ledgerId,
                taxableAmount: round2(Number(summary.taxableAmount ?? 0)),
                addAmount: round2(Number(summary.addAmount ?? 0)),
                lessAmount: round2(Number(summary.lessAmount ?? 0))
            });
        });

        (preservedDetails.taxLines ?? []).forEach((line) => {
            const ledgerId = Number(line.ledgerId);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0) return;
            const lessAmount = round2(Number(line.lessAmount ?? 0));
            const existing = byLedger.get(ledgerId);
            if (existing) {
                existing.lessAmount = lessAmount;
                byLedger.set(ledgerId, existing);
                return;
            }
            if (lessAmount <= 0) return;
            byLedger.set(ledgerId, {
                ledgerId,
                taxableAmount: 0,
                addAmount: 0,
                lessAmount
            });
        });

        return Array.from(byLedger.values()).sort((a, b) => a.ledgerId - b.ledgerId);
    }, [preservedDetails.taxLines, rawComputation.taxSummary]);

    const computation = useMemo(() => {
        const totalTaxAdd = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.addAmount ?? 0), 0));
        const totalTaxLess = round2(taxSummaryRows.reduce((sum, row) => sum + Number(row.lessAmount ?? 0), 0));
        const totalTaxAmount = round2(Math.max(0, totalTaxAdd - totalTaxLess));
        const totalNetBase = round2(rawComputation.totals.totalGrossAmount + totalTaxAmount + additionalTaxAmount);
        const roundOffAmount = round2(Math.round(totalNetBase) - totalNetBase);
        const totalNetAmount = round2(totalNetBase + roundOffAmount);

        return {
            ...rawComputation,
            totals: {
                ...rawComputation.totals,
                totalTaxAmount,
                totalReplacementAmount: 0,
                totalLessSpecialAmount: totalTaxLess,
                totalAdditionalTaxAmount: additionalTaxAmount,
                roundOffAmount,
                totalNetAmount
            }
        };
    }, [additionalTaxAmount, rawComputation, taxSummaryRows]);

    const validation = useMemo(() => validateInvoice({ header, lines: rawComputation.lines }), [header, rawComputation.lines]);

    const hasPreservedDetails = useMemo(() => {
        return Boolean(
            (preservedDetails.taxLines?.length ?? 0) > 0 ||
                (preservedDetails.creditNotes?.length ?? 0) > 0 ||
                (preservedDetails.debitNotes?.length ?? 0) > 0 ||
                preservedDetails.otherLedgerId != null ||
                preservedDetails.itemBrandId != null
        );
    }, [preservedDetails]);

    const lineErrorsByKey = useMemo(() => {
        const map: Record<string, string[]> = {};
        validation.lineErrors.forEach((lineError) => {
            map[lineError.lineKey] = lineError.messages;
        });
        return map;
    }, [validation.lineErrors]);

    const inventoryStatusByLineKey = useMemo(() => {
        const status: Record<string, 'saved' | 'pending'> = {};
        const snapshots = inventorySnapshotByLineKeyRef.current;

        rawComputation.lines.forEach((line) => {
            const snapshot = snapshots[line.key];
            if (!snapshot) {
                status[line.key] = 'pending';
                return;
            }
            status[line.key] = snapshot === serializeLineInventory(line.inventory) ? 'saved' : 'pending';
        });

        return status;
    }, [rawComputation.lines]);

    const pendingInventoryCount = useMemo(
        () => Object.values(inventoryStatusByLineKey).filter((status) => status === 'pending').length,
        [inventoryStatusByLineKey]
    );

    const canSave = Boolean(header.voucherDate) && rawComputation.lines.length > 0 && validation.isValid && !saving;

    const nextVoucherNumberSuggestion = useMemo(() => {
        const startKey = toDateDayKey(fiscalRange?.start ?? null);
        const endKey = toDateDayKey(fiscalRange?.end ?? null);
        let maxVoucherSerial = 0;

        saleInvoices.forEach((row) => {
            const serial = parseVoucherSerial(row.voucherNumber);
            if (serial == null) return;

            if (startKey != null || endKey != null) {
                const rowDate = fromDateText(row.voucherDateText);
                const rowDateKey = toDateDayKey(rowDate);
                if (rowDateKey == null) return;
                if (startKey != null && rowDateKey < startKey) return;
                if (endKey != null && rowDateKey > endKey) return;
            }

            if (serial > maxVoucherSerial) {
                maxVoucherSerial = serial;
            }
        });

        return String(maxVoucherSerial + 1);
    }, [fiscalRange?.end, fiscalRange?.start, saleInvoices]);

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

    const loadEstimateLookups = useCallback(async (search?: string) => {
        setEstimateLookupLoading(true);
        setEstimateLookupError(null);
        try {
            const result = await invoicingApi.listEstimateLookups({
                search: search?.trim() || null,
                limit: 250,
                includeCancelled: false
            });
            setEstimateLookups(result.items);
        } catch (nextError) {
            setEstimateLookups([]);
            setEstimateLookupError(nextError instanceof Error ? nextError.message : 'Failed to load estimates');
        } finally {
            setEstimateLookupLoading(false);
        }
    }, []);

    const openEstimateLookupDialog = useCallback(() => {
        if (saving || loadingInvoice) return;
        setLegacyActionNotice(null);
        setEstimateLookupDialogVisible(true);
        void loadEstimateLookups();
    }, [loadEstimateLookups, loadingInvoice, saving]);

    const closeEstimateLookupDialog = useCallback(() => {
        setEstimateLookupDialogVisible(false);
        setEstimateLookupError(null);
    }, []);

    const clearEstimateLink = useCallback(() => {
        markEntryDirty();
        setHeader((previous) => ({
            ...previous,
            estimateId: null
        }));
        setEstimateLookupDialogVisible(false);
        setLegacyActionNotice('Estimate linkage cleared for this invoice draft.');
    }, [markEntryDirty]);

    const loadCreditNoteLookups = useCallback(async () => {
        setCreditNoteLookupLoading(true);
        setCreditNoteLookupError(null);
        try {
            const response = await invoicingApi.fetchSalesReturnBook({
                ledgerId: header.partyLedgerId ?? null,
                cancelled: 0,
                limit: 200,
                offset: 0
            });
            setCreditNoteLookups(response.items ?? []);
        } catch (nextError) {
            setCreditNoteLookups([]);
            setCreditNoteLookupError(nextError instanceof Error ? nextError.message : 'Failed to load credit note lookups');
        } finally {
            setCreditNoteLookupLoading(false);
        }
    }, [header.partyLedgerId]);

    const loadDebitNoteLookups = useCallback(async (search?: string) => {
        setDebitNoteLookupLoading(true);
        setDebitNoteLookupError(null);
        try {
            const response = await invoicingApi.listDebitNoteLookups({
                search: search?.trim() || null,
                includeCancelled: false,
                limit: 200
            });
            setDebitNoteLookups(response.items);
        } catch (nextError) {
            setDebitNoteLookups([]);
            setDebitNoteLookupError(nextError instanceof Error ? nextError.message : 'Failed to load debit note lookups');
        } finally {
            setDebitNoteLookupLoading(false);
        }
    }, []);

    const openCreditNoteDialog = useCallback(() => {
        if (saving || loadingInvoice) return;
        setLegacyActionNotice(null);
        setCreditNoteDialogVisible(true);
        setCreditNoteDraftRows(
            preservedDetails.creditNotes.length > 0
                ? preservedDetails.creditNotes.map((note) => ({
                      key: makeKey(),
                      voucherId: note.voucherId ?? null,
                      saleReturnId: note.saleReturnId ?? null
                  }))
                : [{ key: makeKey(), voucherId: null, saleReturnId: null }]
        );
        void loadCreditNoteLookups();
    }, [loadCreditNoteLookups, loadingInvoice, preservedDetails.creditNotes, saving]);

    const closeCreditNoteDialog = useCallback(() => {
        setCreditNoteDialogVisible(false);
    }, []);

    const addCreditNoteDraftRow = useCallback(() => {
        setCreditNoteDraftRows((previous) => [...previous, { key: makeKey(), voucherId: null, saleReturnId: null }]);
    }, []);

    const updateCreditNoteDraftRow = useCallback(
        (rowKey: string, patch: { voucherId?: number | null; saleReturnId?: number | null }) => {
            setCreditNoteDraftRows((previous) =>
                previous.map((row) => (row.key === rowKey ? { ...row, ...patch } : row))
            );
        },
        []
    );

    const deleteCreditNoteDraftRow = useCallback((rowKey: string) => {
        setCreditNoteDraftRows((previous) => previous.filter((row) => row.key !== rowKey));
    }, []);

    const applyCreditNotes = useCallback(() => {
        const normalized = creditNoteDraftRows
            .map((row) => ({
                voucherId: row.voucherId != null && Number.isFinite(row.voucherId) ? Number(row.voucherId) : null,
                saleReturnId: row.saleReturnId != null && Number.isFinite(row.saleReturnId) ? Number(row.saleReturnId) : null
            }))
            .filter((row) => row.voucherId != null || row.saleReturnId != null);

        markEntryDirty();
        setPreservedDetails((previous) => ({
            ...previous,
            creditNotes: normalized
        }));
        setCreditNoteDialogVisible(false);
        setLegacyActionNotice(
            normalized.length > 0
                ? `${normalized.length} credit note link(s) set for save.`
                : 'Credit note links cleared.'
        );
    }, [creditNoteDraftRows, markEntryDirty]);

    const appendCreditNoteFromLookup = useCallback((saleReturnId: number) => {
        setCreditNoteDraftRows((previous) => [
            ...previous,
            {
                key: makeKey(),
                voucherId: null,
                saleReturnId: Number(saleReturnId)
            }
        ]);
    }, []);

    const openDebitNoteDialog = useCallback(() => {
        if (saving || loadingInvoice) return;
        setLegacyActionNotice(null);
        setDebitNoteDialogVisible(true);
        setDebitNoteDraftRows(
            preservedDetails.debitNotes.length > 0
                ? preservedDetails.debitNotes.map((note) => ({
                      key: makeKey(),
                      voucherId: note.voucherId ?? null
                  }))
                : [{ key: makeKey(), voucherId: null }]
        );
        void loadDebitNoteLookups();
    }, [loadDebitNoteLookups, loadingInvoice, preservedDetails.debitNotes, saving]);

    const closeDebitNoteDialog = useCallback(() => {
        setDebitNoteDialogVisible(false);
    }, []);

    const addDebitNoteDraftRow = useCallback(() => {
        setDebitNoteDraftRows((previous) => [...previous, { key: makeKey(), voucherId: null }]);
    }, []);

    const updateDebitNoteDraftRow = useCallback((rowKey: string, patch: { voucherId?: number | null }) => {
        setDebitNoteDraftRows((previous) =>
            previous.map((row) => (row.key === rowKey ? { ...row, ...patch } : row))
        );
    }, []);

    const deleteDebitNoteDraftRow = useCallback((rowKey: string) => {
        setDebitNoteDraftRows((previous) => previous.filter((row) => row.key !== rowKey));
    }, []);

    const applyDebitNotes = useCallback(() => {
        const normalized = debitNoteDraftRows
            .map((row) => ({
                voucherId: row.voucherId != null && Number.isFinite(row.voucherId) ? Number(row.voucherId) : null
            }))
            .filter((row) => row.voucherId != null);

        markEntryDirty();
        setPreservedDetails((previous) => ({
            ...previous,
            debitNotes: normalized
        }));
        setDebitNoteDialogVisible(false);
        setLegacyActionNotice(
            normalized.length > 0
                ? `${normalized.length} debit note link(s) set for save.`
                : 'Debit note links cleared.'
        );
    }, [debitNoteDraftRows, markEntryDirty]);

    const appendDebitNoteFromLookup = useCallback((voucherId: number) => {
        setDebitNoteDraftRows((previous) => [
            ...previous,
            {
                key: makeKey(),
                voucherId: Number(voucherId)
            }
        ]);
    }, []);

    const ensureProductDetail = useCallback(
        async (productId: number) => {
            if (productById.has(productId)) return;
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
        [fetchProductById, productById]
    );

    const applyEstimateLookup = useCallback(
        (estimate: invoicingApi.EstimateLookupItem) => {
            if (saving || loadingInvoice) return;
            const nextEstimateId = Number(estimate.estimateId);
            if (!Number.isFinite(nextEstimateId) || nextEstimateId <= 0) return;

            const importEstimate = async () => {
                setEstimateLookupLoading(true);
                setEstimateLookupError(null);
                try {
                    const estimateImport = await invoicingApi.getEstimateImport(nextEstimateId);
                    const importLines = estimateImport.lines ?? [];
                    const importTaxLines = estimateImport.taxLines ?? [];
                    const importAdditionalTaxations = estimateImport.additionalTaxations ?? [];
                    const importTypeDetails = estimateImport.typeDetails ?? [];

                    const mappedLines = importLines.map((line, index) => {
                        const product = line.itemId ? productById.get(line.itemId) ?? null : null;
                        const freeProduct = line.itemFreeId ? productById.get(line.itemFreeId) ?? null : null;
                        return {
                            key: makeKey(),
                            isNewLineEntry: false,
                            lineNumber: line.lineNumber ?? index + 1,
                            itemId: line.itemId,
                            itemName: product?.name ?? '',
                            itemCode: product?.code ?? null,
                            itemFreeId: line.itemFreeId,
                            itemFreeName: freeProduct?.name ?? '',
                            hsnCode: product?.hsnCode ?? '',
                            unitId: line.unitId,
                            unitName:
                                line.unitId != null
                                    ? unitNameById.get(line.unitId) ?? product?.unitName ?? null
                                    : product?.unitName ?? null,
                            unitFreeId: line.unitFreeId,
                            unitFreeName:
                                line.unitFreeId != null
                                    ? unitNameById.get(line.unitFreeId) ?? freeProduct?.unitName ?? null
                                    : freeProduct?.unitName ?? null,
                            mrp: line.mrp,
                            quantity: Number(line.quantity ?? 0),
                            freeQuantity: Number(line.freeQuantity ?? 0),
                            sellingRate: line.sellingRate,
                            rate: Number(line.unitPrice ?? line.sellingRate ?? 0),
                            displayAmount: Number(line.displayAmount ?? 0),
                            productDiscountMode: line.isManualProductDiscount ? 'AMOUNT' : 'RATE',
                            productDiscountRate: Number(line.productDiscountRate ?? 0),
                            productDiscountAmount: Number(line.productDiscountAmount ?? 0),
                            cashDiscountMode: line.isManualCashDiscount ? 'AMOUNT' : 'RATE',
                            cashDiscountRate: Number(line.cashDiscountRate ?? 0),
                            cashDiscountAmount: Number(line.cashDiscountAmount ?? 0),
                            qpsDiscountMode: line.isManualQpsDiscount ? 'AMOUNT' : 'RATE',
                            qpsRate: Number(line.qpsRate ?? 0),
                            qpsAmount: Number(line.qpsAmount ?? 0),
                            hasScheme: Boolean(
                                Number(line.qpsRate ?? 0) ||
                                    Number(line.qpsAmount ?? 0) ||
                                    Number(line.productDiscountRate ?? 0) ||
                                    Number(line.productDiscountAmount ?? 0)
                            ),
                            replacementAmount: Number(line.replacementAmount ?? 0),
                            taxLedgerId: line.taxLedgerId,
                            taxLedger2Id: line.taxLedger2Id,
                            taxLedger3Id: line.taxLedger3Id,
                            remarks: line.remarks ?? '',
                            minQuantity: Number(line.minQuantity ?? 0),
                            minFreeQuantity: Number(line.minFreeQuantity ?? 0),
                            tmpTypeId: line.tmpTypeId,
                            estimateLineId: line.estimateLineId,
                            inventory: {
                                warehouseId: header.warehouseId,
                                batchNo: '',
                                expiryDate: null,
                                serials: [],
                                requiresBatch: false,
                                requiresExpiry: false,
                                requiresSerial: false
                            }
                        } satisfies InvoiceLineDraft;
                    });

                    const nextLedgerId =
                        estimateImport.ledgerId != null ? Number(estimateImport.ledgerId) : estimate.ledgerId ?? null;
                    const nextLedger = nextLedgerId != null ? ledgerById.get(nextLedgerId) ?? null : null;
                    const nextHasScheme = importLines.some((line) => {
                        return Boolean(
                            Number(line.qpsRate ?? 0) ||
                                Number(line.qpsAmount ?? 0) ||
                                Number(line.productDiscountRate ?? 0) ||
                                Number(line.productDiscountAmount ?? 0)
                        );
                    });

                    setHeader((previous) => ({
                        ...previous,
                        estimateId: nextEstimateId,
                        partyLedgerId: nextLedgerId ?? previous.partyLedgerId,
                        ledgerGroupId:
                            nextLedgerId != null ? (nextLedger?.ledgerGroupId ?? previous.ledgerGroupId ?? null) : previous.ledgerGroupId,
                        partyName:
                            nextLedgerId != null
                                ? nextLedger?.name?.trim() || estimateImport.ledgerName?.trim() || previous.partyName
                                : previous.partyName,
                        partyGstin:
                            nextLedgerId != null ? (nextLedger?.gstNumber?.trim() ?? previous.partyGstin) : previous.partyGstin,
                        hasScheme: nextHasScheme
                    }));

                    setLines(
                        mappedLines.length > 0
                            ? reindexLines(mappedLines)
                            : [createEmptyLine(header.warehouseId)]
                    );
                    setAdditionalTaxations(
                        importAdditionalTaxations
                            .filter((line) => line.ledgerId != null || Number(line.addAmount ?? 0) !== 0)
                            .map((line) => ({
                                key: makeKey(),
                                ledgerId: line.ledgerId ?? null,
                                addAmount: round2(Number(line.addAmount ?? 0)),
                                taxableAmount: round2(Number(line.taxableAmount ?? 0))
                            }))
                    );
                    setTypeDetails(
                        importTypeDetails.map((line) => ({
                            key: makeKey(),
                            itemId: line.itemId ?? null,
                            typeDetailId: line.typeDetailId ?? null,
                            quantity: Number(line.quantity ?? 0),
                            tmpTypeId: line.tmpTypeId ?? null
                        }))
                    );
                    setPreservedDetails((previous) => ({
                        ...previous,
                        taxLines: importTaxLines
                            .filter(
                                (line) =>
                                    line.ledgerId != null ||
                                    Number(line.addAmount ?? 0) !== 0 ||
                                    Number(line.lessAmount ?? 0) !== 0
                            )
                            .map((line) => ({
                                ledgerId: line.ledgerId ?? null,
                                addAmount: line.addAmount ?? null,
                                lessAmount: line.lessAmount ?? null,
                                taxableAmount: line.taxableAmount ?? null
                            }))
                    }));
                    markEntryDirty();

                    const idsToEnsure = new Set<number>();
                    importLines.forEach((line) => {
                        if (line.itemId) idsToEnsure.add(line.itemId);
                        if (line.itemFreeId) idsToEnsure.add(line.itemFreeId);
                    });
                    importTypeDetails.forEach((line) => {
                        if (line.itemId) idsToEnsure.add(line.itemId);
                    });
                    idsToEnsure.forEach((id) => {
                        if (!productById.has(id)) {
                            void ensureProductDetail(id);
                        }
                    });

                    inventorySnapshotByLineKeyRef.current = {};
                    autoDefaultHeaderLedgerRef.current = true;
                    setEstimateLookupDialogVisible(false);
                    setLegacyActionNotice(
                        `Imported estimate #${nextEstimateId} with ${mappedLines.length} line(s).`
                    );
                } catch (nextError) {
                    setEstimateLookupError(
                        nextError instanceof Error ? nextError.message : 'Failed to import estimate details'
                    );
                } finally {
                    setEstimateLookupLoading(false);
                }
            };

            void importEstimate();
        },
        [ensureProductDetail, header.warehouseId, ledgerById, loadingInvoice, markEntryDirty, productById, saving, unitNameById]
    );

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
        const previousPriceList = previousPriceListRef.current;
        if (previousPriceList === header.priceList) return;

        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                if (!line.itemId) return line;
                const product = productById.get(line.itemId);
                if (!product) return line;

                const nextRate =
                    header.priceList === 'wholesale'
                        ? product.taxProfile?.beforeVatRate ?? product.taxProfile?.sellingRate ?? 0
                        : product.taxProfile?.sellingRate ?? product.taxProfile?.beforeVatRate ?? 0;
                const nextSellingRate = product.taxProfile?.sellingRate ?? null;
                const nextMrp = product.taxProfile?.mrp ?? null;
                const nextTaxLedgerId = header.placeOfSupply === 'other_state' ? null : product.taxProfile?.ledgerTaxId ?? null;
                const nextTaxLedger2Id = header.placeOfSupply === 'other_state' ? null : product.taxProfile?.ledgerTax2Id ?? null;
                const nextTaxLedger3Id = header.placeOfSupply === 'other_state' ? product.taxProfile?.ledgerTax3Id ?? null : null;

                if (
                    line.rate === nextRate &&
                    line.sellingRate === nextSellingRate &&
                    line.mrp === nextMrp &&
                    line.taxLedgerId === nextTaxLedgerId &&
                    line.taxLedger2Id === nextTaxLedger2Id &&
                    line.taxLedger3Id === nextTaxLedger3Id
                ) {
                    return line;
                }

                changed = true;
                return {
                    ...line,
                    rate: nextRate,
                    sellingRate: nextSellingRate,
                    mrp: nextMrp,
                    taxLedgerId: nextTaxLedgerId,
                    taxLedger2Id: nextTaxLedger2Id,
                    taxLedger3Id: nextTaxLedger3Id
                };
            });

            return changed ? nextLines : previous;
        });

        previousPriceListRef.current = header.priceList;
    }, [header.placeOfSupply, header.priceList, productById]);

    useEffect(() => {
        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                if (header.placeOfSupply === 'other_state') {
                    if (line.taxLedgerId == null && line.taxLedger2Id == null) return line;
                    changed = true;
                    return {
                        ...line,
                        taxLedgerId: null,
                        taxLedger2Id: null
                    };
                }

                if (line.taxLedger3Id == null) return line;
                changed = true;
                return {
                    ...line,
                    taxLedger3Id: null
                };
            });
            return changed ? reindexLines(nextLines) : previous;
        });
    }, [header.placeOfSupply]);

    useEffect(() => {
        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                if (!line.itemId) return line;
                const product = productById.get(line.itemId);
                if (!product) return line;

                const freeProduct = line.itemFreeId ? productById.get(line.itemFreeId) ?? null : null;
                const patch: Partial<InvoiceLineDraft> = {};

                if (!line.itemName.trim()) patch.itemName = product.name;
                if (!line.itemCode && product.code) patch.itemCode = product.code;
                if (!line.hsnCode && product.hsnCode) patch.hsnCode = product.hsnCode;
                if (line.unitId == null && product.unitId != null) patch.unitId = product.unitId;
                if (!line.unitName && product.unitName) patch.unitName = product.unitName;

                if (line.itemFreeId && freeProduct) {
                    if (!line.itemFreeName) patch.itemFreeName = freeProduct.name;
                    if (line.unitFreeId == null && freeProduct.unitId != null) patch.unitFreeId = freeProduct.unitId;
                    if (!line.unitFreeName && freeProduct.unitName) patch.unitFreeName = freeProduct.unitName;
                }

                if (Object.keys(patch).length === 0) return line;
                changed = true;
                return { ...line, ...patch };
            });
            return changed ? nextLines : previous;
        });
    }, [productById]);

    const ensureTypeDetailOptions = useCallback(
        async (productAttributeTypeId: number | null) => {
            if (!productAttributeTypeId) return;
            if (typeDetailOptionsByType[productAttributeTypeId]) return;
            try {
                const response = await loadProductAttributeTypeOptions({
                    variables: { productAttributeTypeId }
                });
                const options = response.data?.productAttributeTypeById?.productAttributes ?? [];
                setTypeDetailOptionsByType((previous) => {
                    if (previous[productAttributeTypeId]) return previous;
                    return {
                        ...previous,
                        [productAttributeTypeId]: options.map((option) => ({
                            productAttributeId: Number(option.productAttributeId),
                            detail: option.detail ?? null
                        }))
                    };
                });
            } catch {
                // keep form usable even if attribute option fetch fails
            }
        },
        [loadProductAttributeTypeOptions, typeDetailOptionsByType]
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
                    unitId: null,
                    unitName: null,
                    mrp: null,
                    taxLedgerId: null,
                    taxLedger2Id: null,
                    taxLedger3Id: null,
                    sellingRate: null,
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
                unitId: product.unitId,
                unitName: product.unitName,
                mrp: product.taxProfile?.mrp ?? null,
                sellingRate: product.taxProfile?.sellingRate ?? null,
                rate,
                hasScheme: line.hasScheme || header.hasScheme,
                taxLedgerId: header.placeOfSupply === 'other_state' ? null : product.taxProfile?.ledgerTaxId ?? null,
                taxLedger2Id: header.placeOfSupply === 'other_state' ? null : product.taxProfile?.ledgerTax2Id ?? null,
                taxLedger3Id: header.placeOfSupply === 'other_state' ? product.taxProfile?.ledgerTax3Id ?? null : null
            };
        },
        [ensureProductDetail, header.hasScheme, header.placeOfSupply, header.priceList, productById]
    );

    const hydrateInvoice = useCallback(
        async (saleInvoiceId: number) => {
            setLoadingInvoice(true);
            setError(null);
            setLegacyActionNotice(null);
            setHasUnsavedEntryChanges(false);
            try {
                const result = await invoicingApi.getSaleInvoice(saleInvoiceId);
                const invoice = result.invoice;
                const invoiceLines = invoice.lines ?? [];
                const documentType: InvoiceHeaderDraft['documentType'] =
                    (invoice.debitNotes?.length ?? 0) > 0
                        ? 'debit_note'
                        : (invoice.creditNotes?.length ?? 0) > 0
                          ? 'credit_note'
                          : 'invoice';

                setEditingSaleInvoiceId(invoice.saleInvoiceId);
                setHeader({
                    voucherDate: fromDateText(invoice.voucherDateText),
                    voucherNumberPrefix: invoice.voucherNumberPrefix ?? '',
                    voucherNumber: invoice.voucherNumber ?? '',
                    documentType,
                    billNumber: invoice.billNumber ?? '',
                    estimateId: invoice.estimateId,
                    partyLedgerId: invoice.ledgerId,
                    ledgerGroupId: invoice.ledgerGroupId,
                    partyName: invoice.ledgerName ?? '',
                    partyGstin: invoice.ledgerId ? ledgerById.get(invoice.ledgerId)?.gstNumber ?? '' : '',
                    placeOfSupply: invoice.isOtherState ? 'other_state' : 'in_state',
                    priceList: 'retail',
                    warehouseId: null,
                    isVatIncluded: Boolean(invoice.isVatIncluded),
                    hasScheme: Boolean(invoice.hasScheme),
                    isDisputed: Boolean(invoice.isDisputed),
                    isCancelled: Boolean(invoice.isCancelled),
                    remarks: invoice.remarks ?? '',
                    bizomInvoiceNumber: invoice.bizomInvoiceNumber ?? ''
                });

                setAdditionalTaxations(
                    (invoice.additionalTaxations ?? []).map((line) => ({
                        key: makeKey(),
                        ledgerId: line.ledgerId,
                        addAmount: round2(Number(line.addAmount ?? 0)),
                        taxableAmount: round2(Number(line.taxableAmount ?? 0))
                    }))
                );

                setTypeDetails(
                    (invoice.typeDetails ?? []).map((line) => ({
                        key: makeKey(),
                        itemId: line.itemId,
                        typeDetailId: line.typeDetailId,
                        quantity: Number(line.quantity ?? 0),
                        tmpTypeId: line.tmpTypeId
                    }))
                );

                setPreservedDetails({
                    taxLines: (invoice.taxLines ?? []).map((line) => ({
                        ledgerId: line.ledgerId,
                        addAmount: line.addAmount,
                        lessAmount: line.lessAmount,
                        taxableAmount: line.taxableAmount
                    })),
                    creditNotes: (invoice.creditNotes ?? []).map((line) => ({
                        voucherId: line.voucherId,
                        saleReturnId: line.saleReturnId
                    })),
                    debitNotes: (invoice.debitNotes ?? []).map((line) => ({
                        voucherId: line.voucherId
                    })),
                    otherLedgerId: invoice.otherLedgerId,
                    itemBrandId: invoice.itemBrandId,
                    isChecked: Boolean(invoice.isChecked),
                    g1BillNumber: invoice.g1BillNumber ?? null,
                    g1IsSchemeMatched: Boolean(invoice.g1IsSchemeMatched),
                    g1IsAmountMatched: Boolean(invoice.g1IsAmountMatched),
                    g1Remark: invoice.g1Remark ?? null
                });

                const mappedLines = invoiceLines.map((line, index) => {
                    const product = line.itemId ? productById.get(line.itemId) ?? null : null;
                    const freeProduct = line.itemFreeId ? productById.get(line.itemFreeId) ?? null : null;
                    const inventorySerials = parseInventorySerialsText(line.inventorySerialsText);
                    return {
                        key: makeKey(),
                        isNewLineEntry: false,
                        lineNumber: line.lineNumber ?? index + 1,
                        itemId: line.itemId,
                        itemName: product?.name ?? '',
                        itemCode: product?.code ?? null,
                        itemFreeId: line.itemFreeId,
                        itemFreeName: freeProduct?.name ?? '',
                        hsnCode: product?.hsnCode ?? '',
                        unitId: line.unitId,
                        unitName: line.unitId != null ? unitNameById.get(line.unitId) ?? product?.unitName ?? null : product?.unitName ?? null,
                        unitFreeId: line.unitFreeId,
                        unitFreeName:
                            line.unitFreeId != null
                                ? unitNameById.get(line.unitFreeId) ?? freeProduct?.unitName ?? null
                                : freeProduct?.unitName ?? null,
                        mrp: line.mrp,
                        quantity: Number(line.quantity ?? 0),
                        freeQuantity: Number(line.freeQuantity ?? 0),
                        sellingRate: line.sellingRate,
                        rate: Number(line.unitPrice ?? line.sellingRate ?? 0),
                        displayAmount: Number(line.displayAmount ?? 0),
                        productDiscountMode: line.isManualProductDiscount ? 'AMOUNT' : 'RATE',
                        productDiscountRate: Number(line.productDiscountRate ?? 0),
                        productDiscountAmount: Number(line.productDiscountAmount ?? 0),
                        cashDiscountMode: line.isManualCashDiscount ? 'AMOUNT' : 'RATE',
                        cashDiscountRate: Number(line.cashDiscountRate ?? 0),
                        cashDiscountAmount: Number(line.cashDiscountAmount ?? 0),
                        qpsDiscountMode: line.isManualQpsDiscount ? 'AMOUNT' : 'RATE',
                        qpsRate: Number(line.qpsRate ?? 0),
                        qpsAmount: Number(line.qpsAmount ?? 0),
                        hasScheme: Boolean(
                            Number(line.qpsRate ?? 0) ||
                                Number(line.qpsAmount ?? 0) ||
                                Number(line.productDiscountRate ?? 0) ||
                                Number(line.productDiscountAmount ?? 0)
                        ),
                        replacementAmount: 0,
                        taxLedgerId: line.taxLedgerId,
                        taxLedger2Id: line.taxLedger2Id,
                        taxLedger3Id: line.taxLedger3Id,
                        remarks: line.remarks ?? '',
                        minQuantity: Number(line.minQuantity ?? 0),
                        minFreeQuantity: Number(line.minFreeQuantity ?? 0),
                        tmpTypeId: line.tmpTypeId,
                        estimateLineId: line.estimateLineId,
                        inventory: {
                            warehouseId: line.inventoryWarehouseId ?? null,
                            batchNo: line.inventoryBatchNo ?? '',
                            expiryDate: fromDateText(line.inventoryExpiryDateText),
                            serials: inventorySerials,
                            requiresBatch: Boolean(line.inventoryRequiresBatch) || Boolean(line.inventoryBatchNo),
                            requiresExpiry: Boolean(line.inventoryRequiresExpiry) || Boolean(line.inventoryExpiryDateText),
                            requiresSerial: Boolean(line.inventoryRequiresSerial) || inventorySerials.length > 0
                        }
                    } satisfies InvoiceLineDraft;
                });

                if (mappedLines.length === 0) {
                    inventorySnapshotByLineKeyRef.current = {};
                    setLines([createEmptyLine(null)]);
                } else {
                    inventorySnapshotByLineKeyRef.current = mappedLines.reduce<Record<string, string>>((acc, line) => {
                        acc[line.key] = serializeLineInventory(line.inventory);
                        return acc;
                    }, {});
                    setLines(reindexLines(mappedLines));
                }

                const idsToEnsure = new Set<number>();
                invoiceLines.forEach((line) => {
                    if (line.itemId) idsToEnsure.add(line.itemId);
                    if (line.itemFreeId) idsToEnsure.add(line.itemFreeId);
                });
                (invoice.typeDetails ?? []).forEach((line) => {
                    if (line.itemId) idsToEnsure.add(line.itemId);
                });
                idsToEnsure.forEach((id) => {
                    if (!productById.has(id)) {
                        void ensureProductDetail(id);
                    }
                });
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to load invoice');
            } finally {
                setLoadingInvoice(false);
            }
        },
        [ensureProductDetail, ledgerById, productById, unitNameById]
    );

    const resetDraftState = useCallback(() => {
        setError(null);
        setLegacyActionNotice(null);
        setEstimateLookupDialogVisible(false);
        setEstimateLookupLoading(false);
        setEstimateLookupError(null);
        setEstimateLookups([]);
        setCreditNoteDialogVisible(false);
        setDebitNoteDialogVisible(false);
        setCreditNoteDraftRows([]);
        setDebitNoteDraftRows([]);
        setCreditNoteLookupLoading(false);
        setCreditNoteLookupError(null);
        setCreditNoteLookups([]);
        setDebitNoteLookupLoading(false);
        setDebitNoteLookupError(null);
        setDebitNoteLookups([]);
        setEditingSaleInvoiceId(null);
        setHeader(createDefaultHeader());
        setLines([createEmptyLine(null)]);
        setTypeDetails([]);
        setAdditionalTaxations([]);
        setTypeDetailOptionsByType({});
        setPreservedDetails(EMPTY_PRESERVED_DETAILS);
        inventorySnapshotByLineKeyRef.current = {};
        autoDefaultHeaderLedgerRef.current = false;
        autoVoucherNumberRef.current = null;
        previousHeaderWarehouseIdRef.current = null;
        previousPriceListRef.current = 'retail';
        setPhaseOneWarningVisible(false);
        setPhaseOneWarningAcknowledged(false);
        setHasUnsavedEntryChanges(false);
    }, []);

    useEffect(() => {
        const attributeTypeIds = new Set<number>();
        typeDetails.forEach((line) => {
            if (!line.itemId) return;
            const product = productById.get(line.itemId) ?? null;
            const attributeTypeId = product?.productAttributeTypeId ?? null;
            if (attributeTypeId) {
                attributeTypeIds.add(attributeTypeId);
            }
        });

        attributeTypeIds.forEach((attributeTypeId) => {
            void ensureTypeDetailOptions(attributeTypeId);
        });
    }, [ensureTypeDetailOptions, productById, typeDetails]);

    useEffect(() => {
        if (routeView === 'new') {
            hydratedRouteInvoiceIdRef.current = null;
            resetDraftState();
            return;
        }

        if (routeView === 'edit') {
            if (!routeSaleInvoiceId) {
                setError('Invalid invoice id in route');
                return;
            }
            setEstimateLookupDialogVisible(false);
            setEstimateLookupError(null);
            setCreditNoteDialogVisible(false);
            setDebitNoteDialogVisible(false);
            setCreditNoteLookupError(null);
            setDebitNoteLookupError(null);
            if (
                hydratedRouteInvoiceIdRef.current === routeSaleInvoiceId &&
                editingSaleInvoiceId === routeSaleInvoiceId
            ) {
                return;
            }
            hydratedRouteInvoiceIdRef.current = routeSaleInvoiceId;
            setPhaseOneWarningVisible(false);
            setPhaseOneWarningAcknowledged(false);
            void hydrateInvoice(routeSaleInvoiceId);
            return;
        }

        hydratedRouteInvoiceIdRef.current = null;
        setLoadingInvoice(false);
        setEditingSaleInvoiceId(null);
        setHasUnsavedEntryChanges(false);
        setLegacyActionNotice(null);
        setEstimateLookupDialogVisible(false);
        setEstimateLookupError(null);
        setCreditNoteDialogVisible(false);
        setDebitNoteDialogVisible(false);
        setCreditNoteLookupError(null);
        setDebitNoteLookupError(null);
        setPhaseOneWarningVisible(false);
        setPhaseOneWarningAcknowledged(false);
    }, [editingSaleInvoiceId, hydrateInvoice, resetDraftState, routeSaleInvoiceId, routeView]);

    useEffect(() => {
        if (routeView !== 'new') return;
        if (ledgerLoading) return;
        if (header.partyLedgerId != null) {
            autoDefaultHeaderLedgerRef.current = true;
            return;
        }
        if (autoDefaultHeaderLedgerRef.current) return;

        const defaultLedgerId =
            (header.ledgerGroupId != null
                ? ledgerOptions.find((option) => ledgerById.get(option.value)?.ledgerGroupId === header.ledgerGroupId)?.value
                : ledgerOptions[0]?.value) ?? null;
        if (!defaultLedgerId) return;

        const defaultLedger = ledgerById.get(defaultLedgerId) ?? null;
        if (!defaultLedger) return;

        autoDefaultHeaderLedgerRef.current = true;
        setHeader((previous) => {
            if (previous.partyLedgerId != null) return previous;
            return {
                ...previous,
                ledgerGroupId: previous.ledgerGroupId ?? defaultLedger.ledgerGroupId ?? null,
                partyLedgerId: defaultLedgerId,
                partyName: defaultLedger.name ?? previous.partyName,
                partyGstin: defaultLedger.gstNumber?.trim() ?? previous.partyGstin
            };
        });
    }, [header.ledgerGroupId, header.partyLedgerId, ledgerById, ledgerLoading, ledgerOptions, routeView]);

    useEffect(() => {
        if (routeView !== 'new') return;
        if (!nextVoucherNumberSuggestion) return;

        setHeader((previous) => {
            const currentVoucherNumber = previous.voucherNumber.trim();
            const canAutoFill =
                currentVoucherNumber.length === 0 ||
                (autoVoucherNumberRef.current != null && currentVoucherNumber === autoVoucherNumberRef.current);
            if (!canAutoFill) return previous;
            if (currentVoucherNumber === nextVoucherNumberSuggestion) return previous;

            autoVoucherNumberRef.current = nextVoucherNumberSuggestion;
            return {
                ...previous,
                voucherNumber: nextVoucherNumberSuggestion
            };
        });
    }, [nextVoucherNumberSuggestion, routeView]);

    const openNew = useCallback(() => {
        if (saving) return;
        if (routeView === 'new') return;
        if (!confirmDiscardUnsavedChanges('a new invoice')) return;
        setLegacyActionNotice(null);
        navigate(INVOICE_NEW_ROUTE);
    }, [confirmDiscardUnsavedChanges, navigate, routeView, saving]);

    const openEdit = useCallback(
        (saleInvoiceId: number) => {
            if (saving) return;
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;
            if (routeView === 'edit' && editingSaleInvoiceId === saleInvoiceId) return;
            if (!confirmDiscardUnsavedChanges(`invoice #${saleInvoiceId}`)) return;
            setLegacyActionNotice(null);
            navigate(`${INVOICE_EDIT_ROUTE}/${saleInvoiceId}`);
        },
        [confirmDiscardUnsavedChanges, editingSaleInvoiceId, navigate, routeView, saving]
    );

    const cancelEntry = useCallback(() => {
        if (saving) return;
        if (!confirmDiscardUnsavedChanges('the invoice register')) return;
        setLegacyActionNotice(null);
        setPhaseOneWarningVisible(false);
        navigate(INVOICE_REGISTER_ROUTE);
    }, [confirmDiscardUnsavedChanges, navigate, saving]);

    const deleteInvoice = useCallback(
        async (saleInvoiceId: number) => {
            if (saving) return;
            setSaving(true);
            setError(null);
            try {
                const cancelled = await invoicingApi.setSaleInvoiceCancelled({
                    saleInvoiceId,
                    cancelled: true
                });
                if (!cancelled) {
                    throw new Error('Invoice not found or already deleted');
                }

                if (editingSaleInvoiceId === saleInvoiceId) {
                    setHeader((previous) => ({ ...previous, isCancelled: true }));
                }

                if (routeView === 'edit' && editingSaleInvoiceId === saleInvoiceId) {
                    navigate(INVOICE_REGISTER_ROUTE, { replace: true });
                }

                await loadSaleInvoices();
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to delete invoice');
            } finally {
                setSaving(false);
            }
        },
        [editingSaleInvoiceId, loadSaleInvoices, navigate, routeView, saving]
    );

    const addLine = useCallback(() => {
        markEntryDirty();
        setLines((previous) => reindexLines([...previous, createEmptyLine(header.warehouseId, previous.length + 1)]));
    }, [header.warehouseId, markEntryDirty]);

    const selectProduct = useCallback(
        (lineKey: string, productId: number | null) => {
            markEntryDirty();
            setLines((previous) =>
                reindexLines(previous.map((line) => (line.key === lineKey ? applyProductToLine(line, productId) : line)))
            );
        },
        [applyProductToLine, markEntryDirty]
    );

    const changeHeader = useCallback(
        (patch: Partial<InvoiceHeaderDraft>) => {
            markEntryDirty();
            if (patch.voucherNumber !== undefined) {
                const nextVoucherNumber = String(patch.voucherNumber ?? '').trim();
                if (autoVoucherNumberRef.current != null && nextVoucherNumber !== autoVoucherNumberRef.current) {
                    autoVoucherNumberRef.current = null;
                }
            }
            setHeader((previous) => {
                const next = { ...previous, ...patch };
                if (patch.partyLedgerId !== undefined) {
                    const ledger = patch.partyLedgerId ? ledgerById.get(patch.partyLedgerId) ?? null : null;
                    next.partyName = ledger?.name ?? next.partyName;
                    next.partyGstin = ledger?.gstNumber?.trim() ?? next.partyGstin;
                    next.ledgerGroupId = ledger?.ledgerGroupId ?? next.ledgerGroupId;
                }
                return next;
            });
        },
        [ledgerById, markEntryDirty]
    );

    const changeLine = useCallback(
        (lineKey: string, patch: Partial<InvoiceLineDraft>) => {
            markEntryDirty();
            setLines((previous) =>
                reindexLines(
                    previous.map((line) => {
                        if (line.key !== lineKey) return line;
                        const next = { ...line, ...patch };

                        if (patch.itemFreeId !== undefined) {
                            const freeProduct = patch.itemFreeId ? productById.get(patch.itemFreeId) ?? null : null;
                            next.itemFreeName = freeProduct?.name ?? '';
                            next.unitFreeId = freeProduct?.unitId ?? null;
                            next.unitFreeName = freeProduct?.unitName ?? null;
                            if (patch.itemFreeId) {
                                void ensureProductDetail(patch.itemFreeId);
                            }
                        }

                        return next;
                    })
                )
            );
        },
        [ensureProductDetail, markEntryDirty, productById]
    );

    const changeInventory = useCallback((lineKey: string, patch: Partial<LineInventoryDraft>) => {
        markEntryDirty();
        setLines((previous) =>
            reindexLines(
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
            )
        );
    }, [markEntryDirty]);

    const deleteLine = useCallback(
        (lineKey: string) => {
            markEntryDirty();
            setLines((previous) => {
                if (previous.length <= 1) return previous;
                const next = previous.filter((line) => line.key !== lineKey);
                if (next.length === 0) return [createEmptyLine(header.warehouseId)];
                return reindexLines(next);
            });
        },
        [header.warehouseId, markEntryDirty]
    );

    const duplicateLine = useCallback((lineKey: string) => {
        markEntryDirty();
        setLines((previous) => {
            const sourceIndex = previous.findIndex((line) => line.key === lineKey);
            if (sourceIndex < 0) return previous;
            const sourceLine = previous[sourceIndex];
            const duplicated: InvoiceLineDraft = {
                ...sourceLine,
                key: makeKey(),
                isNewLineEntry: true,
                inventory: {
                    ...sourceLine.inventory,
                    serials: []
                }
            };
            const next = [...previous];
            next.splice(sourceIndex + 1, 0, duplicated);
            return reindexLines(next);
        });
    }, [markEntryDirty]);

    const selectLineMrp = useCallback(
        (lineKey: string, mrp: number | null) => {
            markEntryDirty();
            setLines((previous) =>
                reindexLines(
                    previous.map((line) => {
                        if (line.key !== lineKey) return line;
                        if (mrp == null || line.itemId == null) {
                            return {
                                ...line,
                                mrp
                            };
                        }

                        const profiles = taxProfilesByProductId.get(line.itemId) ?? [];
                        const normalizedMrp = round2(Number(mrp));
                        const matchedProfile =
                            profiles.find((profile) => {
                                const profileMrp = Number(profile.mrp ?? NaN);
                                if (!Number.isFinite(profileMrp)) return false;
                                return Math.abs(round2(profileMrp) - normalizedMrp) < 0.0001;
                            }) ?? null;

                        if (!matchedProfile) {
                            return {
                                ...line,
                                mrp: normalizedMrp
                            };
                        }

                        const nextRate =
                            header.priceList === 'wholesale'
                                ? matchedProfile.beforeVatRate ?? matchedProfile.sellingRate ?? line.rate
                                : matchedProfile.sellingRate ?? matchedProfile.beforeVatRate ?? line.rate;

                        return {
                            ...line,
                            mrp: normalizedMrp,
                            sellingRate: matchedProfile.sellingRate ?? null,
                            rate: nextRate,
                            taxLedgerId: header.placeOfSupply === 'other_state' ? null : matchedProfile.ledgerTaxId ?? null,
                            taxLedger2Id: header.placeOfSupply === 'other_state' ? null : matchedProfile.ledgerTax2Id ?? null,
                            taxLedger3Id: header.placeOfSupply === 'other_state' ? matchedProfile.ledgerTax3Id ?? null : null
                        };
                    })
                )
            );
        },
        [header.placeOfSupply, header.priceList, markEntryDirty, taxProfilesByProductId]
    );

    const addTypeDetail = useCallback(() => {
        markEntryDirty();
        setTypeDetails((previous) => [...previous, createEmptyTypeDetail()]);
    }, [markEntryDirty]);

    const changeTypeDetail = useCallback(
        (lineKey: string, patch: Partial<InvoiceTypeDetailDraft>) => {
            markEntryDirty();
            setTypeDetails((previous) =>
                previous.map((line) => {
                    if (line.key !== lineKey) return line;
                    const next: InvoiceTypeDetailDraft = { ...line, ...patch };

                    if (patch.itemId !== undefined) {
                        const nextItemId = patch.itemId ?? null;
                        next.itemId = nextItemId;
                        if (nextItemId !== line.itemId) {
                            next.typeDetailId = null;
                        }

                        if (nextItemId) {
                            if (!productById.has(nextItemId)) {
                                void ensureProductDetail(nextItemId);
                            }
                            const product = productById.get(nextItemId) ?? null;
                            const attributeTypeId = product?.productAttributeTypeId ?? null;
                            if (attributeTypeId) {
                                void ensureTypeDetailOptions(attributeTypeId);
                            }
                        }
                    }

                    if (patch.quantity !== undefined) {
                        next.quantity = Math.max(0, Number(patch.quantity ?? 0));
                    }
                    if (patch.typeDetailId !== undefined) {
                        next.typeDetailId = patch.typeDetailId ?? null;
                    }
                    if (patch.tmpTypeId !== undefined) {
                        next.tmpTypeId = patch.tmpTypeId ?? null;
                    }

                    return next;
                })
            );
        },
        [ensureProductDetail, ensureTypeDetailOptions, markEntryDirty, productById]
    );

    const deleteTypeDetail = useCallback((lineKey: string) => {
        markEntryDirty();
        setTypeDetails((previous) => previous.filter((line) => line.key !== lineKey));
    }, [markEntryDirty]);

    const addAdditionalTaxation = useCallback(() => {
        markEntryDirty();
        setAdditionalTaxations((previous) => [
            ...previous,
            {
                key: makeKey(),
                ledgerId: null,
                addAmount: 0,
                taxableAmount: 0
            }
        ]);
    }, [markEntryDirty]);

    const changeAdditionalTaxation = useCallback((lineKey: string, patch: Partial<InvoiceAdditionalTaxationDraft>) => {
        markEntryDirty();
        setAdditionalTaxations((previous) =>
            previous.map((line) => (line.key === lineKey ? { ...line, ...patch } : line))
        );
    }, [markEntryDirty]);

    const deleteAdditionalTaxation = useCallback((lineKey: string) => {
        markEntryDirty();
        setAdditionalTaxations((previous) => previous.filter((line) => line.key !== lineKey));
    }, [markEntryDirty]);

    const changeTaxLessAmount = useCallback(
        (args: { ledgerId: number; lessAmount: number; addAmount: number; taxableAmount: number }) => {
            markEntryDirty();
            setPreservedDetails((previous) => {
                const nextTaxLines = [...(previous.taxLines ?? [])];
                const existingIndex = nextTaxLines.findIndex((line) => Number(line.ledgerId) === args.ledgerId);
                const nextLess = round2(Math.max(0, Number(args.lessAmount ?? 0)));

                if (existingIndex >= 0) {
                    nextTaxLines[existingIndex] = {
                        ...nextTaxLines[existingIndex],
                        lessAmount: nextLess
                    };
                } else {
                    nextTaxLines.push({
                        ledgerId: args.ledgerId,
                        addAmount: round2(Number(args.addAmount ?? 0)),
                        taxableAmount: round2(Number(args.taxableAmount ?? 0)),
                        lessAmount: nextLess
                    });
                }

                return {
                    ...previous,
                    taxLines: nextTaxLines
                };
            });
        },
        [markEntryDirty]
    );

    const resetTaxLessAmounts = useCallback(() => {
        markEntryDirty();
        setPreservedDetails((previous) => ({
            ...previous,
            taxLines: (previous.taxLines ?? []).map((line) => ({
                ...line,
                lessAmount: 0
            }))
        }));
    }, [markEntryDirty]);

    const buildPayload = useCallback((): invoicingApi.CreateSaleInvoiceInput => {
        const inputLines: invoicingApi.SaleInvoiceLineInput[] = computation.lines.map((line, index) => ({
            lineNumber: line.lineNumber || index + 1,
            itemId: line.itemId,
            itemFreeId: line.itemFreeId,
            unitId: line.unitId,
            unitFreeId: line.unitFreeId,
            mrp: line.mrp,
            quantity: line.quantity,
            freeQuantity: line.freeQuantity,
            unitPrice: line.rate,
            sellingRate: line.sellingRate,
            quantityRateAmount: line.quantityRateAmount,
            displayAmount: line.displayAmount,
            productDiscountRate: line.productDiscountRate,
            productDiscountAmount: line.productDiscountAmountComputed,
            cashDiscountRate: line.cashDiscountRate,
            cashDiscountAmount: line.cashDiscountAmountComputed,
            qpsRate: line.qpsRate,
            qpsAmount: line.qpsAmountComputed,
            lineAmount: line.lineAmount,
            replacementAmount: 0,
            finalAmount: line.finalAmount,
            taxLedgerId: line.taxLedgerId,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            taxableAmount: line.taxableAmount,
            taxLedger2Id: line.taxLedger2Id,
            taxRate2: line.taxRate2,
            taxAmount2: line.taxAmount2,
            taxableAmount2: line.taxableAmount2,
            taxLedger3Id: line.taxLedger3Id,
            taxRate3: line.taxRate3,
            taxAmount3: line.taxAmount3,
            taxableAmount3: line.taxableAmount3,
            minQuantity: line.minQuantity,
            minFreeQuantity: line.minFreeQuantity,
            isManualProductDiscount: line.productDiscountMode === 'AMOUNT',
            isManualCashDiscount: line.cashDiscountMode === 'AMOUNT',
            isManualQpsDiscount: line.qpsDiscountMode === 'AMOUNT',
            tmpTypeId: line.tmpTypeId,
            estimateLineId: line.estimateLineId,
            remarks: line.remarks.trim() || null,
            inventoryWarehouseId: line.inventory.warehouseId,
            inventoryBatchNo: line.inventory.batchNo.trim() || null,
            inventoryExpiryDateText: line.inventory.expiryDate ? toDateText(line.inventory.expiryDate) : null,
            inventorySerialsText:
                line.inventory.serials
                    .map((serial) => serial.trim())
                    .filter(Boolean)
                    .join(',') || null,
            inventoryRequiresBatch: line.inventory.requiresBatch,
            inventoryRequiresExpiry: line.inventory.requiresExpiry,
            inventoryRequiresSerial: line.inventory.requiresSerial
        }));

        const computedTaxByLedger = new Map<number, invoicingApi.SaleInvoiceTaxLineInput>();
        computation.taxSummary.forEach((summary) => {
            if (!summary.ledgerId || !Number.isFinite(summary.ledgerId)) return;
            computedTaxByLedger.set(summary.ledgerId, {
                ledgerId: summary.ledgerId,
                addAmount: round2(summary.addAmount),
                lessAmount: round2(summary.lessAmount),
                taxableAmount: round2(summary.taxableAmount)
            });
        });

        const preservedTaxByLedger = new Map<number, invoicingApi.SaleInvoiceTaxLineInput>();
        (preservedDetails.taxLines ?? []).forEach((line) => {
            const ledgerId = Number(line.ledgerId);
            if (!Number.isFinite(ledgerId) || ledgerId <= 0) return;
            preservedTaxByLedger.set(ledgerId, {
                ledgerId,
                addAmount: round2(Number(line.addAmount ?? 0)),
                lessAmount: round2(Number(line.lessAmount ?? 0)),
                taxableAmount: round2(Number(line.taxableAmount ?? 0))
            });
        });

        const taxLedgerIds = new Set<number>();
        computedTaxByLedger.forEach((_line, ledgerId) => {
            taxLedgerIds.add(ledgerId);
        });
        preservedTaxByLedger.forEach((_line, ledgerId) => {
            taxLedgerIds.add(ledgerId);
        });

        const taxLines: invoicingApi.SaleInvoiceTaxLineInput[] = [];
        Array.from(taxLedgerIds)
            .sort((a, b) => a - b)
            .forEach((ledgerId) => {
                const computed = computedTaxByLedger.get(ledgerId);
                const preserved = preservedTaxByLedger.get(ledgerId);
                const lessAmount = round2(Number(preserved?.lessAmount ?? computed?.lessAmount ?? 0));

                if (!computed && lessAmount === 0) {
                    return;
                }

                taxLines.push({
                    ledgerId,
                    addAmount: round2(Number(computed?.addAmount ?? 0)),
                    lessAmount,
                    taxableAmount: round2(Number(computed?.taxableAmount ?? 0))
                });
            });

        const additionalTaxationsPayload: invoicingApi.SaleInvoiceAdditionalTaxationInput[] = additionalTaxations
            .filter((line) => line.ledgerId != null)
            .map((line) => ({
                ledgerId: line.ledgerId,
                addAmount: round2(Number(line.addAmount ?? 0)),
                taxableAmount: round2(Number(line.taxableAmount ?? 0))
            }));

        const typeDetailsPayload: invoicingApi.SaleInvoiceTypeDetailInput[] = typeDetails
            .filter((line) => line.itemId != null && line.typeDetailId != null)
            .map((line) => ({
                itemId: line.itemId,
                typeDetailId: line.typeDetailId,
                quantity: round2(Number(line.quantity ?? 0)),
                tmpTypeId: line.tmpTypeId ?? null
            }));

        return {
            voucherDateText: toDateText(header.voucherDate as Date),
            voucherNumberPrefix: header.voucherNumberPrefix.trim() || null,
            voucherNumber: header.voucherNumber.trim() || null,
            billNumber: header.billNumber.trim() || null,
            ledgerId: header.partyLedgerId,
            ledgerName: header.partyName.trim() || null,
            ledgerGroupId: header.ledgerGroupId,
            otherLedgerId: preservedDetails.otherLedgerId,
            itemBrandId: preservedDetails.itemBrandId,
            estimateId: header.estimateId,
            remarks: header.remarks.trim() || null,
            isVatIncluded: header.isVatIncluded,
            isOtherState: header.placeOfSupply === 'other_state',
            hasScheme: header.hasScheme,
            isChecked: preservedDetails.isChecked,
            isDisputed: header.isDisputed,
            totalProductDiscountAmount: round2(computation.totals.totalProductDiscountAmount),
            totalDisplayAmount: round2(computation.totals.totalDisplayAmount),
            totalCashDiscountAmount: round2(computation.totals.totalCashDiscountAmount),
            totalReplacementAmount: 0,
            totalGrossAmount: round2(computation.totals.totalGrossAmount),
            totalTaxAmount: round2(computation.totals.totalTaxAmount),
            totalNetAmount: round2(computation.totals.totalNetAmount),
            totalLessSpecialAmount: round2(computation.totals.totalLessSpecialAmount),
            totalQpsDiscountAmount: round2(computation.totals.totalQpsDiscountAmount),
            totalQuantity: round2(computation.totals.totalQuantity),
            totalFreeQuantity: round2(computation.totals.totalFreeQuantity),
            totalQuantityRateAmount: round2(computation.totals.totalQuantityRateAmount),
            totalAmount: round2(computation.totals.totalAmount),
            totalFinalAmount: round2(computation.totals.totalFinalAmount),
            roundOffAmount: round2(computation.totals.roundOffAmount),
            totalAdditionalTaxAmount: round2(computation.totals.totalAdditionalTaxAmount),
            bizomInvoiceNumber: header.bizomInvoiceNumber.trim() || null,
            g1BillNumber: preservedDetails.g1BillNumber,
            g1IsSchemeMatched: preservedDetails.g1IsSchemeMatched,
            g1IsAmountMatched: preservedDetails.g1IsAmountMatched,
            g1Remark: preservedDetails.g1Remark,
            lines: inputLines,
            taxLines,
            additionalTaxations: additionalTaxationsPayload,
            replacementLines: [],
            typeDetails: typeDetailsPayload,
            creditNotes: preservedDetails.creditNotes,
            debitNotes: preservedDetails.debitNotes
        };
    }, [additionalTaxations, computation, header, preservedDetails, typeDetails]);

    const createOrUpdateInvoice = useCallback(async (options?: { openNewAfterSave?: boolean }) => {
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
            const payload = buildPayload();
            const openNewAfterSave = options?.openNewAfterSave === true && routeView !== 'edit';

            if (routeView === 'edit' && editingSaleInvoiceId) {
                await invoicingApi.updateSaleInvoice({
                    saleInvoiceId: editingSaleInvoiceId,
                    ...payload,
                    isCancelled: header.isCancelled
                });
            } else {
                await invoicingApi.createSaleInvoice(payload);
            }

            setPhaseOneWarningVisible(false);
            setPhaseOneWarningAcknowledged(false);
            pendingSaveModeRef.current = 'default';
            setHasUnsavedEntryChanges(false);
            navigate(openNewAfterSave ? INVOICE_NEW_ROUTE : INVOICE_REGISTER_ROUTE, { replace: true });
            void loadSaleInvoices();
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to save invoice');
        } finally {
            setSaving(false);
        }
    }, [
        buildPayload,
        editingSaleInvoiceId,
        fiscalRange,
        header.isCancelled,
        header.voucherDate,
        loadSaleInvoices,
        navigate,
        routeView,
        validation.isValid
    ]);

    const requestSave = useCallback(() => {
        pendingSaveModeRef.current = 'default';
        void createOrUpdateInvoice();
    }, [createOrUpdateInvoice]);

    const requestSaveAndAddNew = useCallback(() => {
        if (routeView === 'edit') return;
        pendingSaveModeRef.current = 'and_new';
        void createOrUpdateInvoice({ openNewAfterSave: true });
    }, [createOrUpdateInvoice, routeView]);

    const requestLegacyAction = useCallback(
        (action: InvoiceLegacyAction) => {
            if (saving || loadingInvoice) return;

            const estimateId = header.estimateId;
            const creditNoteCount = preservedDetails.creditNotes.length;
            const debitNoteCount = preservedDetails.debitNotes.length;

            if (action === 'estimate') {
                if (!INVOICE_LEGACY_ACTION_FLAGS.estimate) {
                    setLegacyActionNotice(
                        estimateId
                            ? `Estimate #${estimateId} is linked. Estimate linkage editing is read-only in this form right now.`
                            : 'Estimate selection/creation action is not enabled yet in this form.'
                    );
                    return;
                }
                openEstimateLookupDialog();
                return;
            }

            if (action === 'creditNote') {
                if (!INVOICE_LEGACY_ACTION_FLAGS.creditNote) {
                    setLegacyActionNotice(
                        creditNoteCount > 0
                            ? `${creditNoteCount} linked credit note(s) are preserved on save. Editing linkage is read-only in this form.`
                            : 'Credit-note linkage action is not enabled yet in this form.'
                    );
                    return;
                }
                openCreditNoteDialog();
                return;
            }

            if (!INVOICE_LEGACY_ACTION_FLAGS.debitNote) {
                setLegacyActionNotice(
                    debitNoteCount > 0
                        ? `${debitNoteCount} linked debit note(s) are preserved on save. Editing linkage is read-only in this form.`
                        : 'Debit-note linkage action is not enabled yet in this form.'
                );
                return;
            }

            openDebitNoteDialog();
        },
        [
            header.estimateId,
            loadingInvoice,
            openCreditNoteDialog,
            openDebitNoteDialog,
            openEstimateLookupDialog,
            preservedDetails.creditNotes.length,
            preservedDetails.debitNotes.length,
            saving
        ]
    );

    return (
        <InvoiceFormView
            routeView={routeView}
            editingSaleInvoiceId={editingSaleInvoiceId}
            hasUnsavedEntryChanges={hasUnsavedEntryChanges}
            loading={loading}
            loadingInvoice={loadingInvoice}
            saving={saving}
            error={error}
            productsLoading={productsLoading}
            saleInvoices={saleInvoices}
            header={header}
            fiscalYearStart={fiscalRange?.start ?? null}
            fiscalYearEnd={fiscalRange?.end ?? null}
            registerDefaultLookbackDays={registerDefaultLookbackDays}
            ledgerOptions={ledgerOptions}
            ledgerById={ledgerById}
            ledgerLoading={ledgerLoading}
            products={products}
            productOptions={productOptions}
            mrpOptionsByProductId={mrpOptionsByProductId}
            unitOptions={unitOptions}
            taxLedgerOptions={taxLedgerOptions}
            warehouseOptions={warehouseOptions}
            computation={computation}
            taxSummaryRows={taxSummaryRows}
            additionalTaxations={additionalTaxations}
            totalAdditionalTaxAmount={additionalTaxAmount}
            typeDetails={typeDetails}
            typeDetailOptionsByType={typeDetailOptionsByType}
            typeDetailOptionsLoading={typeDetailOptionsLoading}
            headerErrors={validation.headerErrors}
            lineErrorsByKey={lineErrorsByKey}
            inventoryStatusByLineKey={inventoryStatusByLineKey}
            pendingInventoryCount={pendingInventoryCount}
            canSave={canSave}
            hasPreservedDetails={hasPreservedDetails}
            phaseOneWarningVisible={phaseOneWarningVisible}
            legacyActionNotice={legacyActionNotice}
            legacyActionFlags={INVOICE_LEGACY_ACTION_FLAGS}
            linkedEstimateId={header.estimateId}
            linkedCreditNoteCount={preservedDetails.creditNotes.length}
            linkedDebitNoteCount={preservedDetails.debitNotes.length}
            estimateLookupDialogVisible={estimateLookupDialogVisible}
            estimateLookupLoading={estimateLookupLoading}
            estimateLookupError={estimateLookupError}
            estimateLookups={estimateLookups}
            creditNoteDialogVisible={creditNoteDialogVisible}
            debitNoteDialogVisible={debitNoteDialogVisible}
            creditNoteDraftRows={creditNoteDraftRows}
            debitNoteDraftRows={debitNoteDraftRows}
            creditNoteLookupLoading={creditNoteLookupLoading}
            creditNoteLookupError={creditNoteLookupError}
            creditNoteLookups={creditNoteLookups}
            debitNoteLookupLoading={debitNoteLookupLoading}
            debitNoteLookupError={debitNoteLookupError}
            debitNoteLookups={debitNoteLookups}
            onRefresh={loadSaleInvoices}
            onOpenNew={openNew}
            onOpenEdit={openEdit}
            onDeleteInvoice={deleteInvoice}
            onCancelEntry={cancelEntry}
            onHeaderChange={changeHeader}
            onSelectProduct={selectProduct}
            onSelectMrp={selectLineMrp}
            onLineChange={changeLine}
            onInventoryChange={changeInventory}
            onDeleteLine={deleteLine}
            onDuplicateLine={duplicateLine}
            onAddLine={addLine}
            onAddTypeDetail={addTypeDetail}
            onChangeTypeDetail={changeTypeDetail}
            onDeleteTypeDetail={deleteTypeDetail}
            onAddAdditionalTaxation={addAdditionalTaxation}
            onChangeAdditionalTaxation={changeAdditionalTaxation}
            onDeleteAdditionalTaxation={deleteAdditionalTaxation}
            onTaxLessChange={changeTaxLessAmount}
            onResetTaxLess={resetTaxLessAmounts}
            onRequestSave={requestSave}
            onRequestSaveAndAddNew={requestSaveAndAddNew}
            onRequestLegacyAction={requestLegacyAction}
            onSearchEstimateLookups={loadEstimateLookups}
            onApplyEstimateLookup={applyEstimateLookup}
            onClearEstimateLink={clearEstimateLink}
            onCloseEstimateLookupDialog={closeEstimateLookupDialog}
            onAddCreditNoteDraftRow={addCreditNoteDraftRow}
            onUpdateCreditNoteDraftRow={updateCreditNoteDraftRow}
            onDeleteCreditNoteDraftRow={deleteCreditNoteDraftRow}
            onApplyCreditNotes={applyCreditNotes}
            onCloseCreditNoteDialog={closeCreditNoteDialog}
            onAddDebitNoteDraftRow={addDebitNoteDraftRow}
            onUpdateDebitNoteDraftRow={updateDebitNoteDraftRow}
            onDeleteDebitNoteDraftRow={deleteDebitNoteDraftRow}
            onApplyDebitNotes={applyDebitNotes}
            onCloseDebitNoteDialog={closeDebitNoteDialog}
            onRefreshCreditNoteLookups={loadCreditNoteLookups}
            onRefreshDebitNoteLookups={loadDebitNoteLookups}
            onAppendCreditNoteFromLookup={appendCreditNoteFromLookup}
            onAppendDebitNoteFromLookup={appendDebitNoteFromLookup}
            onCancelPhaseOneWarning={() => setPhaseOneWarningVisible(false)}
            onConfirmPhaseOneWarning={() => {
                setPhaseOneWarningAcknowledged(true);
                setPhaseOneWarningVisible(false);
                void createOrUpdateInvoice({
                    openNewAfterSave: pendingSaveModeRef.current === 'and_new'
                });
            }}
        />
    );
}
