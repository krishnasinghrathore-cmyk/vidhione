import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gql, useLazyQuery, useQuery } from '@apollo/client';
import { confirmDialog } from 'primereact/confirmdialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { useLedgerGroupOptions } from '@/lib/accounts/ledgerGroups';
import { useAuth } from '@/lib/auth/context';
import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';
import { getTextileDocument, saveTextileDocument, toTextileDocumentInput } from '@/lib/textile/api';
import { parseTextileInvoiceSourceRouteState, type TextileInvoiceSourceRouteState } from '@/lib/textile/navigation';
import { resolveFiscalRange } from '@/lib/fiscalRange';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import * as invoicingApi from '@/lib/invoicing/api';
import * as crmApi from '@/lib/crm/api';
import { validateSingleDate } from '@/lib/reportDateValidation';
import { getSalesInvoiceProfilePolicy } from '../salesProfile';
import { makeKey, toDateText } from '../helpers';
import { useLedgerLookup, type LedgerSummary } from '../useLedgerLookup';
import {
    INVOICE_HSN_CODE_BY_ID_QUERY,
    INVOICE_HSN_CODES_QUERY,
    INVOICE_PRODUCT_BRANDS_QUERY,
    INVOICE_PRODUCT_BY_ID_QUERY,
    INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY,
    INVOICE_PRODUCT_GROUPS_QUERY,
    INVOICE_PRODUCTS_QUERY,
    INVOICE_TRANSPORTERS_QUERY,
    INVOICE_UNITS_QUERY
} from './graphql';
import { computeInvoice, parseDateKey, pickLatestActiveTaxProfile, round2 } from './calculations';
import { resolveInvoiceRoutePaths } from './routes';
import { validateInvoice } from './validation';
import { InvoiceFormView } from './InvoiceFormView';
import type {
    InvoiceAdditionalTaxationDraft,
    InvoiceFormRouteView,
    InvoiceGiftCertificateApplicationDraft,
    InvoiceHeaderDraft,
    InvoiceLoyaltyApplicationDraft,
    InvoiceLineDraft,
    InvoicePreservedDetails,
    InvoiceProduct,
    InvoiceProductAttributeSelection,
    InvoiceProductAttributeOption,
    RegisterInvoiceLineSummary,
    InvoiceTypeDetailDraft,
    LineInventoryDraft,
    TaxProfile,
    TaxSummaryRow
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

type ProductAttributeSelectionRow = {
    productAttributeId: number | null;
    productAttributeTypeId: number | null;
    detail: string | null;
    isSelectedFlag: number | null;
    orderNo: number | null;
};

type ProductRow = {
    productId: number;
    name: string | null;
    code: string | null;
    productGroupId: number | null;
    productBrandId: number | null;
    hsnCodeId: number | null;
    productAttributeTypeId: number | null;
    productAttributes: ProductAttributeSelectionRow[] | null;
    units: ProductUnitRow[] | null;
    salesTaxes: ProductSalesTaxRow[] | null;
};

type ProductGroupMasterRow = {
    productGroupId: number;
    name: string | null;
};

type ProductBrandMasterRow = {
    productBrandId: number;
    name: string | null;
};

type ProductAttributeTypeRow = {
    productAttributeTypeId: number;
    name: string | null;
    productAttributes: InvoiceProductAttributeOption[] | null;
};

type HsnCodeRow = {
    hsnCodeId: number;
    code: string | null;
    name: string | null;
};

type UnitRow = {
    unitId: number;
    name: string | null;
};

type TransporterRow = {
    transporterId: number;
    name: string | null;
    alias?: string | null;
};

type GiftCertificateOption = {
    label: string;
    value: string;
    certificateCode: string;
    balanceAmount: number;
    status: string;
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
type TaxLedgerRole = 'sgst' | 'cgst' | 'igst' | 'unknown';
type InvoiceTaxRateHintSourceLine = {
    taxLedgerId?: number | null;
    taxRate?: number | null;
    taxLedger2Id?: number | null;
    taxRate2?: number | null;
    taxLedger3Id?: number | null;
    taxRate3?: number | null;
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

const toPositiveLedgerId = (value: number | null | undefined) => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized <= 0) return null;
    return normalized;
};

const toPositiveId = (value: unknown): number | null => {
    if (value == null) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.trunc(parsed);
};

const normalizeLedgerMatchKey = (value: string | null | undefined) =>
    (value ?? '')
        .toLowerCase()
        .replace(/\s*•\s*gstin.*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();

const formatLedgerAddress = (ledger: LedgerSummary | null | undefined) =>
    [ledger?.address, ledger?.cityName, ledger?.stateName]
        .map((value) => (value ?? '').trim())
        .filter(Boolean)
        .join(', ');

const resolveTaxLedgerRole = (label: string | null | undefined): TaxLedgerRole => {
    const compact = (label ?? '')
        .toLowerCase()
        .replace(/[^a-z]/g, '');
    if (compact.includes('sgst')) return 'sgst';
    if (compact.includes('cgst')) return 'cgst';
    if (compact.includes('igst')) return 'igst';
    return 'unknown';
};

const serializeLineInventory = (_inventory: LineInventoryDraft) =>
    JSON.stringify({
        // Phase-1: warehouse/batch/serial controls are intentionally disabled in UI.
        // Persist neutral inventory payload so save/update behavior matches current legacy form.
        warehouseId: null,
        batchNo: '',
        expiryDateText: null,
        serials: [],
        requiresBatch: false,
        requiresExpiry: false,
        requiresSerial: false
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
    textileJobberLedgerId: null,
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

const toCrmAmountNumber = (value: string | number | null | undefined) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? round2(parsed) : 0;
};

const buildGiftCertificateOptionLabel = (
    certificateCode: string,
    balanceAmount: number,
    status: string,
    issuedToName?: string | null
) => {
    const pieces = [certificateCode.trim() || 'Certificate', 'Bal ' + balanceAmount.toFixed(2), status.trim() || 'active'];
    const issuedTo = (issuedToName ?? '').trim();
    if (issuedTo) pieces.push(issuedTo);
    return pieces.join(' - ');
};

const createEmptyGiftCertificateApplication = (): InvoiceGiftCertificateApplicationDraft => ({
    key: makeKey(),
    giftCertificateId: '',
    certificateCode: '',
    redeemedAmount: 0,
    balanceAmount: null,
    status: null,
    notes: ''
});

const createEmptyLoyaltyApplication = (): InvoiceLoyaltyApplicationDraft => ({
    pointsRedeemed: 0,
    amountApplied: 0,
    notes: ''
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
    salesmanId: null,
    salesman2Id: null,
    textileJobberLedgerId: null,
    textileJobberChallanNo: '',
    textileJobberChallanDate: null,
    textileRemarkForStatement: '',
    partyName: '',
    partyGstin: '',
    partyAddress: '',
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
    loyaltyApplication: null,
    giftCertificateApplications: [],
    otherLedgerId: null,
    itemBrandId: null,
    isChecked: false,
    g1BillNumber: null,
    g1IsSchemeMatched: false,
    g1IsAmountMatched: false,
    g1Remark: null
};

const reindexLines = (lines: InvoiceLineDraft[]) => lines.map((line, index) => ({ ...line, lineNumber: index + 1 }));

const DUTIES_AND_TAXES_GROUP_TYPE_CODE = 12;
const INVOICE_REGISTER_LOOKBACK_VOUCHER_CODE_PRIORITY = [9, 5] as const;
const TYPE_DETAIL_QTY_EPSILON = 0.0001;

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

const INVOICE_LEDGER_PAGE_QUERY = gql`
    query InvoiceLedgerPage($limit: Int!, $offset: Int!) {
        ledgerSummaries(search: null, limit: $limit, offset: $offset, sortField: "name", sortOrder: 1) {
            total
            items {
                ledgerId
                name
                ledgerGroupId
                gstNumber
                taxRate
                taxTypeCode
                address
                cityName
                stateName
            }
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

type CreditNoteDraftRow = {
    key: string;
    voucherId: number | null;
    saleReturnId: number | null;
};

type DebitNoteDraftRow = {
    key: string;
    voucherId: number | null;
};

type InvoiceTransportDraft = {
    isApplied: boolean;
    transporterId: number | null;
    freightLedgerId: number | null;
    freightAmount: number;
    freightTaxLedgerId: number | null;
};

type InvoiceFormContainerProps = {
    routeView: InvoiceFormRouteView;
    routeSaleInvoiceId: number | null;
};

const createDefaultTransportDraft = (isAppliedDefault: boolean): InvoiceTransportDraft => ({
    isApplied: isAppliedDefault,
    transporterId: null,
    freightLedgerId: null,
    freightAmount: 0,
    freightTaxLedgerId: null
});

const inferTransportDraftFromAdditionalTaxations = (
    rows: InvoiceAdditionalTaxationDraft[],
    transportFeatureDefaultOn: boolean
): {
    draft: InvoiceTransportDraft;
    managedKeys: { freightKey: string | null; freightTaxKey: string | null };
} => {
    const normalizedRows = rows.filter(
        (row) => Number.isFinite(Number(row.addAmount ?? 0)) && Number(row.addAmount ?? 0) > 0
    );
    const taxRow = normalizedRows.find((row) => Number(row.taxableAmount ?? 0) > 0) ?? null;
    const freightRow =
        normalizedRows.find((row) => row.key !== taxRow?.key) ??
        (taxRow != null && Number(taxRow.taxableAmount ?? 0) > 0 ? null : taxRow);
    const hasDetectedFreight = freightRow != null || taxRow != null;

    return {
        draft: {
            isApplied: hasDetectedFreight || transportFeatureDefaultOn,
            transporterId: null,
            freightLedgerId: freightRow?.ledgerId ?? null,
            freightAmount:
                freightRow != null
                    ? round2(Number(freightRow.addAmount ?? 0))
                    : taxRow != null
                      ? round2(Number(taxRow.taxableAmount ?? 0))
                      : 0,
            freightTaxLedgerId: taxRow?.ledgerId ?? null
        },
        managedKeys: {
            freightKey: freightRow?.key ?? null,
            freightTaxKey: taxRow?.key ?? null
        }
    };
};

export function InvoiceFormContainer({ routeView, routeSaleInvoiceId }: InvoiceFormContainerProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { companyContext, tenantIndustryKey, tenantSettings } = useAuth();
    const { options: ledgerGroupOptions } = useLedgerGroupOptions();
    const ledgerLookup = useLedgerLookup();
    const { ledgerOptions, ledgerById, loading: ledgerLoading } = ledgerLookup;
    const salesProfileKey = tenantSettings?.salesInvoiceProfileKey ?? null;
    const salesProfilePolicy = useMemo(
        () => getSalesInvoiceProfilePolicy(salesProfileKey, tenantSettings?.salesInvoiceProfileOptions ?? null),
        [salesProfileKey, tenantSettings?.salesInvoiceProfileOptions]
    );
    const textileIndustryActive = isTextileIndustry(tenantIndustryKey);
    const textilePresetKey = tenantSettings?.textilePresetKey ?? defaultTextilePresetKey(tenantIndustryKey);
    const textileCapabilities = useMemo(
        () => resolveTextileCapabilities(textilePresetKey, tenantSettings?.textileCapabilities ?? null),
        [tenantSettings?.textileCapabilities, textilePresetKey]
    );
    const showTextileJobworkFields =
        salesProfilePolicy.profile.isTextileProfile
        && (textileIndustryActive || textilePresetKey != null)
        && textileCapabilities.jobwork;
    const transportFeatureAvailable = salesProfilePolicy.transport.enabled;
    const transportFeatureDefaultOn = salesProfilePolicy.transport.defaultApplied;
    const showTransporterField = salesProfilePolicy.transport.showTransporterField;
    const requireTransporterWhenApplied = salesProfilePolicy.transport.requireTransporterWhenApplied;
    const dryCheckRequired = salesProfilePolicy.validation.dryCheckRequired;
    const strictPostingParity = salesProfilePolicy.validation.strictPostingParity;
    const showTaxColumns = salesProfilePolicy.pricing.showTaxColumns;
    const showTypeDetailsFeature = salesProfilePolicy.lineEntry.showTypeDetails;
    const showAdditionalTaxationFeature = salesProfilePolicy.lineEntry.showAdditionalTaxation;
    const showHeaderSchemeToggle = salesProfilePolicy.header.showSchemeToggle;
    const showHeaderBizomField = salesProfilePolicy.header.showBizomInvoiceField;
    const showHeaderInterStateToggle = salesProfilePolicy.header.showInterStateToggle;
    const legacyActionFlags = salesProfilePolicy.linkedActions;
    const salesmanFeatureAvailable = salesProfilePolicy.header.salesmanMode !== 'none';
    const secondarySalesmanFeatureAvailable = salesProfilePolicy.header.salesmanMode === 'dual';

    const fiscalRange = useMemo(
        () => resolveFiscalRange(companyContext?.fiscalYearStart ?? null, companyContext?.fiscalYearEnd ?? null),
        [companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]
    );
    const invoiceRoutes = useMemo(() => resolveInvoiceRoutePaths(location.pathname), [location.pathname]);
    const textileInvoiceSource = useMemo(() => parseTextileInvoiceSourceRouteState(location.state), [location.state]);
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
    const [registerActionNotice, setRegisterActionNotice] = useState<string | null>(null);
    const [sendingDueSmsInvoiceId, setSendingDueSmsInvoiceId] = useState<number | null>(null);
    const [sendingWhatsAppInvoiceId, setSendingWhatsAppInvoiceId] = useState<number | null>(null);
    const [registerDateFilterApplied, setRegisterDateFilterApplied] = useState(false);
    const [registerIncludesProductNames, setRegisterIncludesProductNames] = useState(false);
    const [saleInvoices, setSaleInvoices] = useState<invoicingApi.SaleInvoiceListItem[]>([]);
    const [registerItemSummaryByInvoiceId, setRegisterItemSummaryByInvoiceId] = useState<Record<number, RegisterInvoiceLineSummary[]>>({});
    const [registerItemSummaryLoadingByInvoiceId, setRegisterItemSummaryLoadingByInvoiceId] = useState<Record<number, boolean>>({});
    const [registerItemSummaryErrorByInvoiceId, setRegisterItemSummaryErrorByInvoiceId] = useState<Record<number, string | null>>({});
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
    const [lineTaxRateHintsByLedgerId, setLineTaxRateHintsByLedgerId] = useState<Record<number, number>>({});
    const [taxLedgerOverridesById, setTaxLedgerOverridesById] = useState<Record<number, LedgerSummary>>({});

    const [editingSaleInvoiceId, setEditingSaleInvoiceId] = useState<number | null>(null);
    const [header, setHeader] = useState<InvoiceHeaderDraft>(createDefaultHeader);
    const [lines, setLines] = useState<InvoiceLineDraft[]>([createEmptyLine(null)]);
    const [typeDetails, setTypeDetails] = useState<InvoiceTypeDetailDraft[]>([]);
    const [additionalTaxations, setAdditionalTaxations] = useState<InvoiceAdditionalTaxationDraft[]>([]);
    const [transportDraft, setTransportDraft] = useState<InvoiceTransportDraft>(() =>
        createDefaultTransportDraft(transportFeatureDefaultOn)
    );
    const [typeDetailOptionsByType, setTypeDetailOptionsByType] = useState<Record<number, InvoiceProductAttributeOption[]>>(
        {}
    );
    const [typeDetailTypeNameById, setTypeDetailTypeNameById] = useState<Record<number, string>>({});
    const [preservedDetails, setPreservedDetails] = useState<InvoicePreservedDetails>(EMPTY_PRESERVED_DETAILS);
    const [availableGiftCertificates, setAvailableGiftCertificates] = useState<crmApi.GiftCertificate[]>([]);
    const [giftCertificatesLoading, setGiftCertificatesLoading] = useState(false);
    const [giftCertificatesError, setGiftCertificatesError] = useState<string | null>(null);
    const [loyaltySummary, setLoyaltySummary] = useState<crmApi.CrmLoyaltySummary | null>(null);
    const [loyaltySummaryLoading, setLoyaltySummaryLoading] = useState(false);
    const [loyaltySummaryError, setLoyaltySummaryError] = useState<string | null>(null);
    const previousHeaderWarehouseIdRef = useRef<number | null>(null);
    const previousPriceListRef = useRef<InvoiceHeaderDraft['priceList']>('retail');
    const inventorySnapshotByLineKeyRef = useRef<Record<string, string>>({});
    const autoDefaultHeaderLedgerRef = useRef(false);
    const autoVoucherNumberRef = useRef<string | null>(null);
    const hydratedRouteInvoiceIdRef = useRef<number | null>(null);
    const hydratedTextileSourceDocumentIdRef = useRef<string | null>(null);
    const lastRouteViewRef = useRef<InvoiceFormRouteView | null>(null);
    const saleInvoiceListInputRef = useRef<invoicingApi.ListSaleInvoicesInput | undefined>(undefined);
    const saleInvoiceLoadSequenceRef = useRef(0);
    const giftCertificateLoadSequenceRef = useRef(0);
    const loyaltyLoadSequenceRef = useRef(0);
    const loyaltyApplicationBaselineRef = useRef<InvoiceLoyaltyApplicationDraft | null>(null);
    const lastRegisterLoadKeyRef = useRef<string | null>(null);
    const hsnCodeFetchInFlightRef = useRef<Set<number>>(new Set());
    const taxLedgerLookupSweepInFlightRef = useRef(false);
    const taxLedgerLookupUnavailableIdsRef = useRef<Set<number>>(new Set());
    const transportManagedAdditionalTaxKeysRef = useRef<{ freightKey: string | null; freightTaxKey: string | null }>({
        freightKey: null,
        freightTaxKey: null
    });

    const pendingSaveModeRef = useRef<'default' | 'and_new'>('default');
    const [hasUnsavedEntryChanges, setHasUnsavedEntryChanges] = useState(false);

    const isEntryRoute = routeView === 'new' || routeView === 'edit';

    const markEntryDirty = useCallback(() => {
        if (!isEntryRoute) return;
        setHasUnsavedEntryChanges(true);
    }, [isEntryRoute]);

    const confirmDiscardUnsavedChanges = useCallback(
        (nextTargetLabel: string, onAccept: () => void) => {
            if (!isEntryRoute || !hasUnsavedEntryChanges || typeof window === 'undefined') {
                onAccept();
                return;
            }
            confirmDialog({
                header: 'Discard Changes?',
                message: `You have unsaved changes in this invoice. Discard them and continue to ${nextTargetLabel}?`,
                icon: 'pi pi-exclamation-triangle',
                rejectLabel: 'Keep Editing',
                acceptLabel: 'Discard',
                acceptClassName: 'p-button-danger',
                accept: onAccept,
                reject: () => undefined
            });
        },
        [hasUnsavedEntryChanges, isEntryRoute]
    );

    const [productOverrides, setProductOverrides] = useState<Record<number, ProductRow>>({});
    const [hsnCodeOverrides, setHsnCodeOverrides] = useState<Record<number, string>>({});

    const { data: productsData, loading: productsLoading } = useQuery<{ products: ProductRow[] }>(INVOICE_PRODUCTS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 1000 }
    });
    const { data: productGroupsData } = useQuery<{ productGroups: ProductGroupMasterRow[] }>(INVOICE_PRODUCT_GROUPS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 1000 }
    });
    const { data: productBrandsData } = useQuery<{ productBrands: ProductBrandMasterRow[] }>(INVOICE_PRODUCT_BRANDS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 1000 }
    });
    const { data: hsnData } = useQuery<{ hsnCodes: HsnCodeRow[] }>(INVOICE_HSN_CODES_QUERY, {
        client: inventoryApolloClient,
        variables: { limit: 2000 }
    });
    const { data: unitsData } = useQuery<{ units: UnitRow[] }>(INVOICE_UNITS_QUERY, {
        client: inventoryApolloClient,
        variables: { limit: 1000 }
    });
    const { data: transportersData } = useQuery<{ transporters: TransporterRow[] }>(INVOICE_TRANSPORTERS_QUERY, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 1000 }
    });

    const [fetchProductById] = useLazyQuery<{ productById: ProductRow | null }>(INVOICE_PRODUCT_BY_ID_QUERY, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });
    const [fetchHsnCodeById] = useLazyQuery<{ hsnCodeById: HsnCodeRow | null }>(INVOICE_HSN_CODE_BY_ID_QUERY, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });
    const [loadProductAttributeTypeOptions, { loading: typeDetailOptionsLoading }] = useLazyQuery<{
        productAttributeTypeById: ProductAttributeTypeRow | null;
    }>(INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });
    const [fetchLedgerPage] = useLazyQuery<{ ledgerSummaries: { total: number; items: LedgerSummary[] } }>(
        INVOICE_LEDGER_PAGE_QUERY,
        {
            fetchPolicy: 'network-only'
        }
    );

    const hsnCodeById = useMemo(() => {
        const map = new Map<number, string>();
        (hsnData?.hsnCodes ?? []).forEach((row) => {
            const key = Number(row.hsnCodeId);
            const code = row.code?.trim() || row.name?.trim() || '';
            if (Number.isFinite(key) && code) {
                map.set(key, code);
            }
        });
        Object.entries(hsnCodeOverrides).forEach(([rawKey, rawCode]) => {
            const key = Number(rawKey);
            const code = rawCode?.trim() || '';
            if (!Number.isFinite(key) || !code) return;
            map.set(key, code);
        });
        return map;
    }, [hsnCodeOverrides, hsnData]);

    const hydrateMissingHsnCodesInBackground = useCallback(
        (hsnCodeIds: number[]) => {
            const pendingIds = Array.from(
                new Set(
                    hsnCodeIds.filter((value) => {
                        if (!Number.isFinite(value) || value <= 0) return false;
                        if (hsnCodeById.has(value)) return false;
                        if (hsnCodeFetchInFlightRef.current.has(value)) return false;
                        return true;
                    })
                )
            );
            if (pendingIds.length === 0) return;
            pendingIds.forEach((hsnCodeId) => {
                hsnCodeFetchInFlightRef.current.add(hsnCodeId);
                void fetchHsnCodeById({ variables: { hsnCodeId } })
                    .then((result) => {
                        const row = result.data?.hsnCodeById;
                        const code = row?.code?.trim() || row?.name?.trim() || '';
                        if (!code) return;
                        setHsnCodeOverrides((previous) => {
                            if (previous[hsnCodeId] === code) return previous;
                            return {
                                ...previous,
                                [hsnCodeId]: code
                            };
                        });
                    })
                    .catch(() => {
                        // keep view usable even if one HSN lookup fails
                    })
                    .finally(() => {
                        hsnCodeFetchInFlightRef.current.delete(hsnCodeId);
                    });
            });
        },
        [fetchHsnCodeById, hsnCodeById]
    );

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
    const productGroupNameById = useMemo(() => {
        const map = new Map<number, string>();
        (productGroupsData?.productGroups ?? []).forEach((row) => {
            const key = Number(row.productGroupId);
            const name = row.name?.trim() || '';
            if (!Number.isFinite(key) || !name) return;
            map.set(key, name);
        });
        return map;
    }, [productGroupsData]);
    const productBrandNameById = useMemo(() => {
        const map = new Map<number, string>();
        (productBrandsData?.productBrands ?? []).forEach((row) => {
            const key = Number(row.productBrandId);
            const name = row.name?.trim() || '';
            if (!Number.isFinite(key) || !name) return;
            map.set(key, name);
        });
        return map;
    }, [productBrandsData]);

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
            const productGroupId = row.productGroupId != null ? Number(row.productGroupId) : null;
            const productBrandId = row.productBrandId != null ? Number(row.productBrandId) : null;
            const hsnCodeId = row.hsnCodeId != null ? Number(row.hsnCodeId) : null;
            const hsnCode = hsnCodeId ? hsnCodeById.get(hsnCodeId) ?? '' : '';
            const productAttributeTypeId =
                row.productAttributeTypeId != null ? Number(row.productAttributeTypeId) : null;
            const productAttributes = (row.productAttributes ?? [])
                .map((option) => {
                    const productAttributeId = Number(option.productAttributeId);
                    if (!Number.isFinite(productAttributeId) || productAttributeId <= 0) return null;
                    const optionProductAttributeTypeId =
                        option.productAttributeTypeId != null ? Number(option.productAttributeTypeId) : null;
                    const isSelectedFlag = option.isSelectedFlag != null ? Number(option.isSelectedFlag) : null;
                    const orderNo = option.orderNo != null ? Number(option.orderNo) : null;
                    const detail = option.detail?.trim() || null;
                    return {
                        productAttributeId,
                        productAttributeTypeId: optionProductAttributeTypeId,
                        detail,
                        isSelectedFlag,
                        orderNo
                    } satisfies InvoiceProductAttributeSelection;
                })
                .filter((option): option is InvoiceProductAttributeSelection => option != null)
                .filter((option) => option.isSelectedFlag == null || option.isSelectedFlag !== 0)
                .sort((left, right) => {
                    const leftOrder = left.orderNo ?? Number.MAX_SAFE_INTEGER;
                    const rightOrder = right.orderNo ?? Number.MAX_SAFE_INTEGER;
                    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                    const leftLabel = left.detail?.toLowerCase() ?? '';
                    const rightLabel = right.detail?.toLowerCase() ?? '';
                    if (leftLabel !== rightLabel) return leftLabel.localeCompare(rightLabel);
                    return left.productAttributeId - right.productAttributeId;
                });

            const unitId = row.units?.find((unit) => Number.isFinite(Number(unit.unitId)))?.unitId ?? null;
            const unitName = unitId != null ? unitNameById.get(Number(unitId)) ?? null : null;

            const taxRows = (row.salesTaxes ?? []).map(normalizeTaxRow);
            const taxProfile = pickLatestActiveTaxProfile(taxRows);
            const searchText = `${name} ${code ?? ''} ${hsnCode}`.toLowerCase();

            return {
                productId,
                name,
                code,
                productGroupId,
                productGroupName: productGroupId != null ? productGroupNameById.get(productGroupId) ?? null : null,
                productBrandId,
                productBrandName: productBrandId != null ? productBrandNameById.get(productBrandId) ?? null : null,
                hsnCodeId,
                hsnCode,
                productAttributeTypeId,
                productAttributes,
                unitId,
                unitName,
                searchText,
                taxProfile
            };
        });
    }, [hsnCodeById, mergeProductRows, productBrandNameById, productGroupNameById, unitNameById]);

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

    const transporterOptions = useMemo(
        () =>
            (transportersData?.transporters ?? [])
                .map((row) => {
                    const value = Number(row.transporterId);
                    if (!Number.isFinite(value) || value <= 0) return null;
                    const name = row.name?.trim() || '';
                    const alias = row.alias?.trim() || '';
                    return {
                        label: name && alias ? `${name} • ${alias}` : name || alias || `Transporter ${value}`,
                        value
                    };
                })
                .filter((entry): entry is { label: string; value: number } => entry != null),
        [transportersData]
    );

    const mergeLineTaxRateHints = useCallback((sourceLines: InvoiceTaxRateHintSourceLine[]) => {
        if (!Array.isArray(sourceLines) || sourceLines.length === 0) return;
        setLineTaxRateHintsByLedgerId((previous) => {
            const next = { ...previous };
            let changed = false;
            const assignRateHint = (ledgerIdRaw: number | null | undefined, rateRaw: number | null | undefined) => {
                const ledgerId = toPositiveLedgerId(ledgerIdRaw ?? null);
                const taxRate = Number(rateRaw ?? 0);
                if (ledgerId == null) return;
                if (!Number.isFinite(taxRate) || taxRate <= 0) return;
                const existingRate = Number(next[ledgerId] ?? 0);
                if (Math.abs(existingRate - taxRate) <= 0.0001) return;
                next[ledgerId] = taxRate;
                changed = true;
            };
            sourceLines.forEach((line) => {
                assignRateHint(line.taxLedgerId, line.taxRate);
                assignRateHint(line.taxLedger2Id, line.taxRate2);
                assignRateHint(line.taxLedger3Id, line.taxRate3);
            });
            return changed ? next : previous;
        });
    }, []);

    const hintedTaxLedgerIds = useMemo(() => {
        return Object.keys(lineTaxRateHintsByLedgerId)
            .map((rawValue) => toPositiveLedgerId(Number(rawValue)))
            .filter((value): value is number => value != null);
    }, [lineTaxRateHintsByLedgerId]);

    useEffect(() => {
        if (hintedTaxLedgerIds.length === 0) return;
        const missingIds = hintedTaxLedgerIds.filter((ledgerId) => {
            if (ledgerById.has(ledgerId)) return false;
            if (taxLedgerOverridesById[ledgerId]) return false;
            if (taxLedgerLookupUnavailableIdsRef.current.has(ledgerId)) return false;
            return true;
        });
        if (missingIds.length === 0) return;
        if (taxLedgerLookupSweepInFlightRef.current) return;
        taxLedgerLookupSweepInFlightRef.current = true;

        const missingSet = new Set(missingIds);
        const pageSize = 2000;

        const hydrateMissingTaxLedgers = async () => {
            let offset = 0;
            const resolvedById: Record<number, LedgerSummary> = {};
            try {
                while (missingSet.size > 0) {
                    const result = await fetchLedgerPage({
                        variables: {
                            limit: pageSize,
                            offset
                        }
                    });
                    const page = result.data?.ledgerSummaries;
                    const rows = page?.items ?? [];
                    const total = Number(page?.total ?? 0);

                    rows.forEach((row) => {
                        const ledgerId = toPositiveLedgerId(row.ledgerId);
                        if (ledgerId == null || !missingSet.has(ledgerId)) return;
                        missingSet.delete(ledgerId);
                        resolvedById[ledgerId] = row;
                    });

                    if (rows.length < pageSize) break;
                    offset += pageSize;
                    if (total > 0 && offset >= total) break;
                }

                const resolvedEntries = Object.entries(resolvedById);
                if (resolvedEntries.length > 0) {
                    setTaxLedgerOverridesById((previous) => {
                        const next = { ...previous };
                        resolvedEntries.forEach(([ledgerIdText, ledger]) => {
                            next[Number(ledgerIdText)] = ledger;
                        });
                        return next;
                    });
                }
                missingSet.forEach((ledgerId) => {
                    taxLedgerLookupUnavailableIdsRef.current.add(ledgerId);
                });
            } catch {
                // Avoid repeated failing scans for the same unresolved ledger ids.
                missingSet.forEach((ledgerId) => {
                    taxLedgerLookupUnavailableIdsRef.current.add(ledgerId);
                });
            } finally {
                taxLedgerLookupSweepInFlightRef.current = false;
            }
        };

        void hydrateMissingTaxLedgers();
    }, [fetchLedgerPage, hintedTaxLedgerIds, ledgerById, taxLedgerOverridesById]);

    const resolveLedgerSummaryById = useCallback(
        (ledgerId: number | null | undefined) => {
            const normalizedLedgerId = toPositiveLedgerId(ledgerId ?? null);
            if (normalizedLedgerId == null) return null;
            return ledgerById.get(normalizedLedgerId) ?? taxLedgerOverridesById[normalizedLedgerId] ?? null;
        },
        [ledgerById, taxLedgerOverridesById]
    );

    const taxLedgerOptions = useMemo<TaxLedgerOption[]>(() => {
        const taxLedgersByRate = ledgerOptions
            .map((option) => {
                const ledger = resolveLedgerSummaryById(option.value);
                const rate = Number(ledger?.taxRate ?? 0);
                if (!Number.isFinite(rate) || rate <= 0) return null;
                const resolvedName = ledger?.name?.trim() || '';
                const resolvedLabel = resolvedName
                    ? `${resolvedName}${ledger?.gstNumber ? ` • GSTIN ${ledger.gstNumber}` : ''}`
                    : option.label;
                return {
                    label: resolvedLabel,
                    value: option.value,
                    address: ledger?.address?.trim() || null,
                    ledgerGroupId: ledger?.ledgerGroupId ?? null,
                    taxRate: rate
                };
            })
            .filter((entry): entry is TaxLedgerOption => entry != null);

        const baseById = new Map<number, TaxLedgerOption>();
        taxLedgersByRate.forEach((option) => {
            baseById.set(option.value, option);
        });

        const filteredBase =
            dutiesAndTaxesLedgerGroupIds.size === 0
                ? taxLedgersByRate
                : (() => {
                      const dutiesAndTaxesOnly = taxLedgersByRate.filter((option) => {
                          if (option.ledgerGroupId == null) return false;
                          return dutiesAndTaxesLedgerGroupIds.has(option.ledgerGroupId);
                      });
                      return dutiesAndTaxesOnly.length > 0 ? dutiesAndTaxesOnly : taxLedgersByRate;
                  })();

        const finalOptions = [...filteredBase];
        const finalIds = new Set(finalOptions.map((option) => option.value));

        Object.entries(lineTaxRateHintsByLedgerId).forEach(([ledgerIdText, rateRaw]) => {
            const ledgerId = toPositiveLedgerId(Number(ledgerIdText));
            const taxRate = Number(rateRaw ?? 0);
            if (ledgerId == null) return;
            if (!Number.isFinite(taxRate) || taxRate <= 0) return;
            if (finalIds.has(ledgerId)) return;

            const existingBase = baseById.get(ledgerId);
            if (existingBase) {
                finalOptions.push(existingBase);
                finalIds.add(ledgerId);
                return;
            }

            const ledger = resolveLedgerSummaryById(ledgerId);
            const name = ledger?.name?.trim() || '';
            finalOptions.push({
                label: name || `Tax Ledger ${ledgerId} (${taxRate.toFixed(2)}%)`,
                value: ledgerId,
                address: ledger?.address?.trim() || null,
                ledgerGroupId: ledger?.ledgerGroupId ?? null,
                taxRate
            });
            finalIds.add(ledgerId);
        });

        return finalOptions.sort((left, right) => left.label.localeCompare(right.label, undefined, { sensitivity: 'base' }));
    }, [dutiesAndTaxesLedgerGroupIds, ledgerOptions, lineTaxRateHintsByLedgerId, resolveLedgerSummaryById]);

    const normalizedTaxLedgerOptions = useMemo(() => {
        return taxLedgerOptions
            .map((option) => {
                const ledgerId = toPositiveLedgerId(option.value);
                if (ledgerId == null) return null;
                return {
                    ledgerId,
                    rate: Number(option.taxRate ?? 0),
                    role: resolveTaxLedgerRole(option.label)
                };
            })
            .filter(
                (
                    option
                ): option is {
                    ledgerId: number;
                    rate: number;
                    role: TaxLedgerRole;
                } => option != null
            );
    }, [taxLedgerOptions]);

    const taxLedgerOptionById = useMemo(() => {
        const byId = new Map<number, { ledgerId: number; rate: number; role: TaxLedgerRole }>();
        normalizedTaxLedgerOptions.forEach((option) => {
            byId.set(option.ledgerId, option);
        });
        return byId;
    }, [normalizedTaxLedgerOptions]);

    const resolveTaxLedgerRoleById = useCallback(
        (ledgerId: number | null | undefined): TaxLedgerRole => {
            const normalizedLedgerId = toPositiveLedgerId(ledgerId ?? null);
            if (normalizedLedgerId == null) return 'unknown';
            const option = taxLedgerOptionById.get(normalizedLedgerId);
            if (option) return option.role;
            return resolveTaxLedgerRole(resolveLedgerSummaryById(normalizedLedgerId)?.name ?? null);
        },
        [resolveLedgerSummaryById, taxLedgerOptionById]
    );

    const resolveTaxLedgerRateById = useCallback(
        (ledgerId: number | null | undefined) => {
            const normalizedLedgerId = toPositiveLedgerId(ledgerId ?? null);
            if (normalizedLedgerId == null) return 0;
            const option = taxLedgerOptionById.get(normalizedLedgerId);
            if (option) return Number(option.rate ?? 0);
            const fallbackRate = Number(resolveLedgerSummaryById(normalizedLedgerId)?.taxRate ?? 0);
            return Number.isFinite(fallbackRate) ? fallbackRate : 0;
        },
        [resolveLedgerSummaryById, taxLedgerOptionById]
    );

    const findPairedTaxLedgerId = useCallback(
        (sourceLedgerId: number, targetRole: 'sgst' | 'cgst') => {
            const sourceId = toPositiveLedgerId(sourceLedgerId);
            if (sourceId == null) return null;

            const source = taxLedgerOptionById.get(sourceId) ?? null;
            if (!source) {
                const roleOnlyMatch = normalizedTaxLedgerOptions.find(
                    (option) => option.ledgerId !== sourceId && option.role === targetRole
                );
                return roleOnlyMatch?.ledgerId ?? null;
            }

            const candidates = normalizedTaxLedgerOptions.filter((option) => {
                if (option.ledgerId === sourceId) return false;
                if (Number.isFinite(source.rate) && source.rate > 0 && Number.isFinite(option.rate)) {
                    if (Math.abs(option.rate - source.rate) > 0.0001) return false;
                }
                return true;
            });

            const roleMatch = candidates.find((option) => option.role === targetRole);
            if (roleMatch) return roleMatch.ledgerId;

            const sameStateFallback = candidates.find(
                (option) => option.role !== 'igst' && option.role !== source.role
            );
            if (sameStateFallback) return sameStateFallback.ledgerId;

            return candidates[0]?.ledgerId ?? null;
        },
        [normalizedTaxLedgerOptions, taxLedgerOptionById]
    );

    const normalizeInStateTaxLedgerPair = useCallback(
        (input: { taxLedgerId: number | null; taxLedger2Id: number | null }) => {
            const taxLedgerId = toPositiveLedgerId(input.taxLedgerId);
            const taxLedger2Id = toPositiveLedgerId(input.taxLedger2Id);
            if (taxLedgerId != null && taxLedger2Id != null) {
                return {
                    taxLedgerId,
                    taxLedger2Id
                };
            }
            if (taxLedgerId != null && taxLedger2Id == null) {
                return {
                    taxLedgerId,
                    taxLedger2Id: findPairedTaxLedgerId(taxLedgerId, 'cgst')
                };
            }
            if (taxLedgerId == null && taxLedger2Id != null) {
                return {
                    taxLedgerId: findPairedTaxLedgerId(taxLedger2Id, 'sgst'),
                    taxLedger2Id
                };
            }
            return {
                taxLedgerId: null,
                taxLedger2Id: null
            };
        },
        [findPairedTaxLedgerId]
    );

    const resolveInStateTaxLedgerPair = useCallback(
        (input: {
            taxLedgerId: number | null;
            taxLedger2Id: number | null;
            taxRateHint?: number | null;
            taxRate2Hint?: number | null;
            fallbackLedgerIds?: number[];
        }) => {
            const normalizedPair = normalizeInStateTaxLedgerPair({
                taxLedgerId: input.taxLedgerId,
                taxLedger2Id: input.taxLedger2Id
            });

            let taxLedgerId = normalizedPair.taxLedgerId;
            let taxLedger2Id = normalizedPair.taxLedger2Id;

            const fallbackPool = Array.from(
                new Set(
                    (input.fallbackLedgerIds ?? [])
                        .map((ledgerId) => toPositiveLedgerId(ledgerId))
                        .filter((ledgerId): ledgerId is number => ledgerId != null)
                        .filter((ledgerId) => resolveTaxLedgerRoleById(ledgerId) !== 'igst')
                )
            );
            if (fallbackPool.length === 0) {
                return { taxLedgerId, taxLedger2Id };
            }

            const pickFallbackLedger = (excludedIds: number[], preferredRate: number) => {
                const excluded = new Set(excludedIds);
                if (Number.isFinite(preferredRate) && preferredRate > 0) {
                    const byRate = fallbackPool.find((ledgerId) => {
                        if (excluded.has(ledgerId)) return false;
                        return Math.abs(resolveTaxLedgerRateById(ledgerId) - preferredRate) <= 0.0001;
                    });
                    if (byRate != null) return byRate;
                }
                return fallbackPool.find((ledgerId) => !excluded.has(ledgerId)) ?? null;
            };

            if (taxLedgerId == null && taxLedger2Id != null) {
                const preferredRate = Number(input.taxRateHint ?? resolveTaxLedgerRateById(taxLedger2Id) ?? 0);
                const fallbackLedgerId = pickFallbackLedger([taxLedger2Id], preferredRate);
                if (fallbackLedgerId != null) taxLedgerId = fallbackLedgerId;
            } else if (taxLedger2Id == null && taxLedgerId != null) {
                const preferredRate = Number(input.taxRate2Hint ?? resolveTaxLedgerRateById(taxLedgerId) ?? 0);
                const fallbackLedgerId = pickFallbackLedger([taxLedgerId], preferredRate);
                if (fallbackLedgerId != null) taxLedger2Id = fallbackLedgerId;
            } else if (taxLedgerId == null && taxLedger2Id == null && fallbackPool.length > 1) {
                const firstFallback = pickFallbackLedger([], Number(input.taxRateHint ?? 0));
                const secondFallback = pickFallbackLedger(
                    firstFallback != null ? [firstFallback] : [],
                    Number(input.taxRate2Hint ?? 0)
                );
                if (firstFallback != null) taxLedgerId = firstFallback;
                if (secondFallback != null) taxLedger2Id = secondFallback;
            }

            return { taxLedgerId, taxLedger2Id };
        },
        [normalizeInStateTaxLedgerPair, resolveTaxLedgerRateById, resolveTaxLedgerRoleById]
    );

    const getTaxRateByLedgerId = useCallback(
        (ledgerId: number | null) => resolveTaxLedgerRateById(ledgerId),
        [resolveTaxLedgerRateById]
    );
    const transportFreightTaxRate = useMemo(
        () => round2(getTaxRateByLedgerId(transportDraft.freightTaxLedgerId)),
        [getTaxRateByLedgerId, transportDraft.freightTaxLedgerId]
    );
    const transportFreightTaxAmount = useMemo(
        () => round2((Math.max(0, Number(transportDraft.freightAmount ?? 0)) * transportFreightTaxRate) / 100),
        [transportDraft.freightAmount, transportFreightTaxRate]
    );
    const transportFreightTotalAmount = useMemo(
        () => round2(Math.max(0, Number(transportDraft.freightAmount ?? 0)) + transportFreightTaxAmount),
        [transportDraft.freightAmount, transportFreightTaxAmount]
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

    const loyaltyAppliedAmount = useMemo(() => {
        if (!preservedDetails.loyaltyApplication) return 0;
        return round2(Math.max(0, Number(preservedDetails.loyaltyApplication.amountApplied ?? 0)));
    }, [preservedDetails.loyaltyApplication]);

    const giftCertificateAppliedAmount = useMemo(
        () =>
            round2(
                preservedDetails.giftCertificateApplications.reduce((sum, line) => {
                    const giftCertificateId = (line.giftCertificateId ?? '').trim();
                    if (!giftCertificateId) return sum;

                    const redeemedAmount = Number(line.redeemedAmount ?? 0);
                    if (!Number.isFinite(redeemedAmount) || redeemedAmount <= 0) return sum;
                    return sum + redeemedAmount;
                }, 0)
            ),
        [preservedDetails.giftCertificateApplications]
    );

    const settlementAppliedAmount = useMemo(
        () => round2(loyaltyAppliedAmount + giftCertificateAppliedAmount),
        [giftCertificateAppliedAmount, loyaltyAppliedAmount]
    );

    const settlementBalanceAmount = useMemo(
        () => round2(Math.max(0, computation.totals.totalNetAmount - settlementAppliedAmount)),
        [computation.totals.totalNetAmount, settlementAppliedAmount]
    );

    const settlementExceedsInvoice = useMemo(
        () => settlementAppliedAmount > round2(computation.totals.totalNetAmount) + 0.0001,
        [computation.totals.totalNetAmount, settlementAppliedAmount]
    );

    const validation = useMemo(
        () =>
            validateInvoice({
                header,
                lines: rawComputation.lines,
                totals: computation.totals,
                taxSummaryRows,
                additionalTaxations,
                typeDetails,
                transport: {
                    isApplied: transportDraft.isApplied,
                    transporterId: transportDraft.transporterId
                },
                policy: {
                    strictPostingParity,
                    requireTransporterWhenApplied: showTransporterField && requireTransporterWhenApplied
                }
            }),
        [
            additionalTaxations,
            computation.totals,
            header,
            rawComputation.lines,
            requireTransporterWhenApplied,
            showTransporterField,
            strictPostingParity,
            taxSummaryRows,
            transportDraft.isApplied,
            transportDraft.transporterId,
            typeDetails
        ]
    );

    const hasPreservedDetails = useMemo(() => {
        return Boolean(
            (preservedDetails.creditNotes?.length ?? 0) > 0 ||
                (preservedDetails.debitNotes?.length ?? 0) > 0 ||
                preservedDetails.loyaltyApplication != null ||
                (preservedDetails.giftCertificateApplications?.length ?? 0) > 0 ||
                preservedDetails.otherLedgerId != null ||
                preservedDetails.itemBrandId != null ||
                preservedDetails.isChecked ||
                (preservedDetails.g1BillNumber?.trim() ?? '').length > 0 ||
                preservedDetails.g1IsSchemeMatched ||
                preservedDetails.g1IsAmountMatched ||
                (preservedDetails.g1Remark?.trim() ?? '').length > 0
        );
    }, [preservedDetails]);

    const giftCertificateOptions = useMemo(() => {
        const optionById = new Map<string, GiftCertificateOption>();

        availableGiftCertificates.forEach((certificate) => {
            const certificateId = certificate.id.trim();
            if (!certificateId) return;
            const certificateCode = certificate.certificateCode.trim();
            const balanceAmount = toCrmAmountNumber(certificate.balanceAmount);
            const status = certificate.status.trim() || 'active';
            optionById.set(certificateId, {
                label: buildGiftCertificateOptionLabel(certificateCode, balanceAmount, status, certificate.issuedToName),
                value: certificateId,
                certificateCode,
                balanceAmount,
                status
            });
        });

        preservedDetails.giftCertificateApplications.forEach((line) => {
            const certificateId = line.giftCertificateId.trim();
            if (!certificateId || optionById.has(certificateId)) return;
            const certificateCode = line.certificateCode.trim() || certificateId;
            const balanceAmount = line.balanceAmount != null ? round2(Math.max(0, Number(line.balanceAmount))) : 0;
            const status = (line.status ?? '').trim() || 'applied';
            optionById.set(certificateId, {
                label: buildGiftCertificateOptionLabel(certificateCode, balanceAmount, status),
                value: certificateId,
                certificateCode,
                balanceAmount,
                status
            });
        });

        return Array.from(optionById.values()).sort((left, right) =>
            left.label.localeCompare(right.label, undefined, { sensitivity: 'base' })
        );
    }, [availableGiftCertificates, preservedDetails.giftCertificateApplications]);

    const giftCertificateOptionById = useMemo(
        () => new Map(giftCertificateOptions.map((option) => [option.value, option])),
        [giftCertificateOptions]
    );

    useEffect(() => {
        const partyLedgerId = toPositiveId(header.partyLedgerId);
        const requestSequence = ++giftCertificateLoadSequenceRef.current;

        if (partyLedgerId == null) {
            setAvailableGiftCertificates([]);
            setGiftCertificatesLoading(false);
            setGiftCertificatesError(null);
            return;
        }

        setGiftCertificatesLoading(true);
        setGiftCertificatesError(null);

        void (async () => {
            try {
                const certificates = await crmApi.listGiftCertificates(null, {
                    recipientLedgerId: String(partyLedgerId),
                    statuses: ['active', 'partial']
                });
                if (requestSequence !== giftCertificateLoadSequenceRef.current) return;
                setAvailableGiftCertificates(certificates);
            } catch (nextError) {
                if (requestSequence !== giftCertificateLoadSequenceRef.current) return;
                setAvailableGiftCertificates([]);
                setGiftCertificatesError(nextError instanceof Error ? nextError.message : 'Failed to load gift certificates');
            } finally {
                if (requestSequence !== giftCertificateLoadSequenceRef.current) return;
                setGiftCertificatesLoading(false);
            }
        })();
    }, [header.partyLedgerId]);

    useEffect(() => {
        const partyLedgerId = toPositiveId(header.partyLedgerId);
        const requestSequence = ++loyaltyLoadSequenceRef.current;

        if (partyLedgerId == null) {
            setLoyaltySummary(null);
            setLoyaltySummaryLoading(false);
            setLoyaltySummaryError(null);
            return;
        }

        setLoyaltySummaryLoading(true);
        setLoyaltySummaryError(null);

        void (async () => {
            try {
                const summary = await crmApi.getCrmLoyaltySummary(String(partyLedgerId));
                if (requestSequence !== loyaltyLoadSequenceRef.current) return;
                setLoyaltySummary(summary);
            } catch (nextError) {
                if (requestSequence !== loyaltyLoadSequenceRef.current) return;
                setLoyaltySummary(null);
                setLoyaltySummaryError(nextError instanceof Error ? nextError.message : 'Failed to load loyalty summary');
            } finally {
                if (requestSequence !== loyaltyLoadSequenceRef.current) return;
                setLoyaltySummaryLoading(false);
            }
        })();
    }, [header.partyLedgerId]);

    useEffect(() => {
        if (preservedDetails.giftCertificateApplications.length === 0) return;

        setPreservedDetails((previous) => {
            let changed = false;
            const giftCertificateApplications = previous.giftCertificateApplications.map((line) => {
                const certificateId = line.giftCertificateId.trim();
                if (!certificateId) {
                    if (!line.certificateCode && line.balanceAmount == null && line.status == null) return line;
                    changed = true;
                    return {
                        ...line,
                        certificateCode: '',
                        balanceAmount: null,
                        status: null
                    };
                }

                const option = giftCertificateOptionById.get(certificateId);
                if (!option) return line;

                const nextCertificateCode = option.certificateCode.trim();
                const nextBalanceAmount = round2(Math.max(0, Number(option.balanceAmount ?? 0)));
                const nextStatus = option.status.trim() || null;

                if (
                    line.certificateCode === nextCertificateCode &&
                    line.balanceAmount === nextBalanceAmount &&
                    line.status === nextStatus
                ) {
                    return line;
                }

                changed = true;
                return {
                    ...line,
                    certificateCode: nextCertificateCode,
                    balanceAmount: nextBalanceAmount,
                    status: nextStatus
                };
            });

            if (!changed) return previous;

            return {
                ...previous,
                giftCertificateApplications
            };
        });
    }, [giftCertificateOptionById, preservedDetails.giftCertificateApplications]);

    const lineErrorsByKey = useMemo(() => {
        const map: Record<string, string[]> = {};
        validation.lineErrors.forEach((lineError) => {
            map[lineError.lineKey] = lineError.messages;
        });
        return map;
    }, [validation.lineErrors]);

    const canSave =
        Boolean(header.voucherDate) &&
        rawComputation.lines.length > 0 &&
        validation.isValid &&
        !settlementExceedsInvoice &&
        !saving;

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

    const loadSaleInvoices = useCallback(async (input?: invoicingApi.ListSaleInvoicesInput) => {
        const requestSequence = ++saleInvoiceLoadSequenceRef.current;
        const effectiveInput = input !== undefined ? input : saleInvoiceListInputRef.current;
        if (input !== undefined) {
            saleInvoiceListInputRef.current = input;
        }
        setLoading(true);
        setError(null);
        setRegisterItemSummaryByInvoiceId({});
        setRegisterItemSummaryLoadingByInvoiceId({});
        setRegisterItemSummaryErrorByInvoiceId({});
        try {
            const hasExplicitDateRange = Boolean(effectiveInput?.fromDate?.trim() || effectiveInput?.toDate?.trim());
            const requestedOffset = Math.max(Math.trunc(Number(effectiveInput?.offset ?? 0)), 0);
            const pageLimit = Math.min(Math.max(Math.trunc(Number(effectiveInput?.limit ?? 300)), 1), 2000);
            const shouldLoadAllPages = hasExplicitDateRange && requestedOffset === 0;

            let items: invoicingApi.SaleInvoiceListItem[] = [];
            if (shouldLoadAllPages) {
                let nextOffset = 0;
                while (true) {
                    const result = await invoicingApi.listSaleInvoices({
                        ...effectiveInput,
                        limit: pageLimit,
                        offset: nextOffset
                    });
                    if (requestSequence !== saleInvoiceLoadSequenceRef.current) return;
                    items = [...items, ...result.items];
                    if (result.items.length < pageLimit) break;
                    nextOffset += pageLimit;
                }
            } else {
                const result = await invoicingApi.listSaleInvoices(effectiveInput);
                if (requestSequence !== saleInvoiceLoadSequenceRef.current) return;
                items = result.items;
            }
            if (requestSequence !== saleInvoiceLoadSequenceRef.current) return;
            setRegisterDateFilterApplied(hasExplicitDateRange);
            setRegisterIncludesProductNames(effectiveInput?.includeProductNames !== false);
            setSaleInvoices(items);
        } catch (nextError) {
            if (requestSequence !== saleInvoiceLoadSequenceRef.current) return;
            setError(nextError instanceof Error ? nextError.message : 'Failed to load invoices');
        } finally {
            if (requestSequence !== saleInvoiceLoadSequenceRef.current) return;
            setLoading(false);
        }
    }, []);
    const refreshSaleInvoices = useCallback(
        (input?: {
            fromDate: Date | null;
            toDate: Date | null;
            includeCancelled: boolean;
            includeProductNames?: boolean;
        }) => {
            const fromDateText = input?.fromDate ? toDateText(input.fromDate) : null;
            const toDateTextValue = input?.toDate ? toDateText(input.toDate) : null;
            const hasExplicitDateRange = Boolean(fromDateText || toDateTextValue);
            const query: invoicingApi.ListSaleInvoicesInput = {
                fromDate: fromDateText,
                toDate: toDateTextValue,
                includeCancelled: input?.includeCancelled ?? false,
                includeProductNames: input?.includeProductNames ?? false,
                limit: hasExplicitDateRange ? 2000 : 300,
                offset: 0
            };
            void loadSaleInvoices(query);
        },
        [loadSaleInvoices]
    );

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

    useEffect(() => {
        if (hsnCodeById.size === 0) return;
        setRegisterItemSummaryByInvoiceId((previous) => {
            let hasChanges = false;
            const nextByInvoiceId: Record<number, RegisterInvoiceLineSummary[]> = {};

            Object.entries(previous).forEach(([rawInvoiceId, linesForInvoice]) => {
                const invoiceId = Number(rawInvoiceId);
                if (!Array.isArray(linesForInvoice)) return;
                let invoiceChanged = false;
                const nextLines = linesForInvoice.map((line) => {
                    if (line.hsnCode || line.hsnCodeId == null || line.hsnCodeId <= 0) return line;
                    const resolvedHsn = hsnCodeById.get(line.hsnCodeId)?.trim() || '';
                    if (!resolvedHsn) return line;
                    invoiceChanged = true;
                    return {
                        ...line,
                        hsnCode: resolvedHsn
                    };
                });
                if (invoiceChanged) {
                    hasChanges = true;
                    nextByInvoiceId[invoiceId] = nextLines;
                } else {
                    nextByInvoiceId[invoiceId] = linesForInvoice;
                }
            });

            return hasChanges ? nextByInvoiceId : previous;
        });
    }, [hsnCodeById]);

    const loadRegisterItemSummary = useCallback(
        async (saleInvoiceId: number, force = false) => {
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;
            if (!force && Object.prototype.hasOwnProperty.call(registerItemSummaryByInvoiceId, saleInvoiceId)) return;
            if (registerItemSummaryLoadingByInvoiceId[saleInvoiceId]) return;

            setRegisterItemSummaryErrorByInvoiceId((previous) => ({
                ...previous,
                [saleInvoiceId]: null
            }));
            setRegisterItemSummaryLoadingByInvoiceId((previous) => ({
                ...previous,
                [saleInvoiceId]: true
            }));
            try {
                const result = await invoicingApi.getSaleInvoice(saleInvoiceId);
                const invoice = result.invoice;
                const invoiceLines = invoice.lines ?? [];
                const missingProductIds = new Set<number>();
                const resolvedProductMetaById = new Map<
                    number,
                    {
                        name: string;
                        code: string | null;
                        hsnCodeId: number | null;
                        hsnCode: string | null;
                        unitName: string | null;
                        productAttributeTypeId: number | null;
                    }
                >();
                productById.forEach((product, productId) => {
                    resolvedProductMetaById.set(productId, {
                        name: product.name,
                        code: product.code ?? null,
                        hsnCodeId: product.hsnCodeId ?? null,
                        hsnCode: product.hsnCode?.trim() || null,
                        unitName: product.unitName?.trim() || null,
                        productAttributeTypeId: product.productAttributeTypeId ?? null
                    });
                });

                invoiceLines.forEach((line) => {
                    const itemId = toPositiveId(line.itemId);
                    const itemFreeId = toPositiveId(line.itemFreeId);
                    if (itemId != null && !resolvedProductMetaById.has(itemId)) missingProductIds.add(itemId);
                    if (itemFreeId != null && !resolvedProductMetaById.has(itemFreeId)) missingProductIds.add(itemFreeId);
                });

                const hydrateMissingProductsInBackground = () => {
                    if (missingProductIds.size === 0) return;
                    const pendingProductIds = Array.from(missingProductIds);
                    void Promise.allSettled(
                        pendingProductIds.map(async (productId) => {
                            try {
                                const detailResult = await fetchProductById({ variables: { productId } });
                                const detail = detailResult.data?.productById;
                                if (!detail) return null;
                                return { productId, detail };
                            } catch {
                                return null;
                            }
                        })
                    ).then((results) => {
                        const fetchedProductOverrides: Record<number, ProductRow> = {};
                        results.forEach((result) => {
                            if (result.status !== 'fulfilled' || !result.value) return;
                            fetchedProductOverrides[result.value.productId] = result.value.detail;
                        });
                        if (Object.keys(fetchedProductOverrides).length === 0) return;
                        setProductOverrides((previous) => ({
                            ...previous,
                            ...fetchedProductOverrides
                        }));
                    });
                };

                const invoiceTypeDetails = invoice.typeDetails ?? [];
                const resolveTypeDetailsText = (itemId: number | null, tmpTypeId: number | null) => {
                    if (itemId == null) return null;
                    const itemMeta = resolvedProductMetaById.get(itemId) ?? null;
                    const attributeTypeId = itemMeta?.productAttributeTypeId ?? null;
                    const attributeOptions = attributeTypeId != null ? typeDetailOptionsByType[attributeTypeId] ?? [] : [];
                    const matchingRows = invoiceTypeDetails.filter((typeDetail) => {
                        const typeItemId = toPositiveId(typeDetail.itemId);
                        if (typeItemId == null || typeItemId !== itemId) return false;
                        if (tmpTypeId == null) return true;
                        const typeTmpTypeId = toPositiveId(typeDetail.tmpTypeId);
                        return typeTmpTypeId == null || typeTmpTypeId === tmpTypeId;
                    });
                    if (matchingRows.length === 0) return null;
                    const formatTypeQty = (value: number) => {
                        if (Math.abs(value % 1) < 0.000001) return String(Math.trunc(value));
                        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                    };
                    const quantityByLabel = new Map<string, number>();
                    matchingRows.forEach((typeDetail) => {
                        const typeDetailId = toPositiveId(typeDetail.typeDetailId);
                        const quantity = round2(Number(typeDetail.quantity ?? 0));
                        if (quantity <= 0) return;
                        const option = typeDetailId == null ? null : attributeOptions.find((entry) => Number(entry.productAttributeId) === typeDetailId);
                        const label = option?.detail?.trim()
                            || typeDetail.typeDetailName?.trim()
                            || (typeDetailId != null ? `Detail ${typeDetailId}` : 'Detail');
                        if (!label) return;
                        quantityByLabel.set(label, round2((quantityByLabel.get(label) ?? 0) + quantity));
                    });
                    if (quantityByLabel.size === 0) return null;
                    return Array.from(quantityByLabel.entries())
                        .map(([label, quantity]) => `${label}-${formatTypeQty(quantity)}`)
                        .join(', ');
                };

                const missingHsnCodeIds = new Set<number>();
                const lineSummaries: RegisterInvoiceLineSummary[] = invoiceLines.map((line, index) => {
                    const itemId = toPositiveId(line.itemId);
                    const itemFreeId = toPositiveId(line.itemFreeId);
                    const productMeta = itemId != null ? resolvedProductMetaById.get(itemId) ?? null : null;
                    const freeProductMeta = itemFreeId != null ? resolvedProductMetaById.get(itemFreeId) ?? null : null;
                    const tmpTypeId = toPositiveId(line.tmpTypeId);
                    const taxAmount1 = round2(Number(line.taxAmount ?? 0));
                    const taxAmount2 = round2(Number(line.taxAmount2 ?? 0));
                    const taxAmount3 = round2(Number(line.taxAmount3 ?? 0));
                    const taxTotalAmount = round2(taxAmount1 + taxAmount2 + taxAmount3);
                    const taxableAmount1 = round2(Number(line.taxableAmount ?? 0));
                    const taxableAmount2 = round2(Number(line.taxableAmount2 ?? 0));
                    const taxableAmount3 = round2(Number(line.taxableAmount3 ?? 0));
                    const taxableTotalAmount = round2(taxableAmount1 + taxableAmount2 + taxableAmount3);
                    const lineNumber = Number.isFinite(Number(line.lineNumber))
                        ? Math.max(1, Math.trunc(Number(line.lineNumber)))
                        : index + 1;
                    const hsnCodeId = productMeta?.hsnCodeId ?? null;
                    const resolvedHsnCode =
                        productMeta?.hsnCode?.trim()
                        || (hsnCodeId != null ? hsnCodeById.get(hsnCodeId)?.trim() || '' : '');
                    if (!resolvedHsnCode && hsnCodeId != null) {
                        missingHsnCodeIds.add(hsnCodeId);
                    }

                    return {
                        saleInvoiceLineId: Number(line.saleInvoiceLineId),
                        lineNumber,
                        itemId,
                        itemName: productMeta?.name ?? (itemId != null ? `Item #${itemId}` : '-'),
                        itemCode: productMeta?.code ?? null,
                        itemFreeName: freeProductMeta?.name ?? (itemFreeId != null ? `Item #${itemFreeId}` : null),
                        hsnCodeId,
                        hsnCode: resolvedHsnCode || null,
                        unitName: line.unitId != null ? unitNameById.get(Number(line.unitId)) ?? null : null,
                        unitFreeName: line.unitFreeId != null ? unitNameById.get(Number(line.unitFreeId)) ?? null : null,
                        tmpTypeId,
                        typeDetailsText: resolveTypeDetailsText(itemId, tmpTypeId),
                        quantity: round2(Number(line.quantity ?? 0)),
                        freeQuantity: round2(Number(line.freeQuantity ?? 0)),
                        mrp: line.mrp != null ? round2(Number(line.mrp)) : null,
                        sellingRate: line.sellingRate != null ? round2(Number(line.sellingRate)) : null,
                        rate: round2(Number(line.unitPrice ?? line.sellingRate ?? 0)),
                        displayAmount: round2(Number(line.displayAmount ?? 0)),
                        qpsRate: round2(Number(line.qpsRate ?? 0)),
                        qpsAmount: round2(Number(line.qpsAmount ?? 0)),
                        productDiscountRate: round2(Number(line.productDiscountRate ?? 0)),
                        productDiscountAmount: round2(Number(line.productDiscountAmount ?? 0)),
                        cashDiscountRate: round2(Number(line.cashDiscountRate ?? 0)),
                        cashDiscountAmount: round2(Number(line.cashDiscountAmount ?? 0)),
                        grossAmount: round2(Number(line.lineAmount ?? 0)),
                        taxableAmount: taxableAmount1,
                        taxableAmount2,
                        taxableAmount3,
                        taxableTotalAmount,
                        taxLedgerId: line.taxLedgerId != null && Number(line.taxLedgerId) > 0 ? Number(line.taxLedgerId) : null,
                        taxRate: round2(Number(line.taxRate ?? 0)),
                        taxAmount: taxAmount1,
                        taxLedger2Id: line.taxLedger2Id != null && Number(line.taxLedger2Id) > 0 ? Number(line.taxLedger2Id) : null,
                        taxRate2: round2(Number(line.taxRate2 ?? 0)),
                        taxAmount2,
                        taxLedger3Id: line.taxLedger3Id != null && Number(line.taxLedger3Id) > 0 ? Number(line.taxLedger3Id) : null,
                        taxRate3: round2(Number(line.taxRate3 ?? 0)),
                        taxAmount3,
                        taxTotalAmount,
                        finalAmount: round2(Number(line.finalAmount ?? 0)),
                        remarks: line.remarks?.trim() || null
                    };
                });

                setRegisterItemSummaryByInvoiceId((previous) => ({
                    ...previous,
                    [saleInvoiceId]: lineSummaries
                }));
                hydrateMissingProductsInBackground();
                hydrateMissingHsnCodesInBackground(Array.from(missingHsnCodeIds));
                setRegisterItemSummaryErrorByInvoiceId((previous) => ({
                    ...previous,
                    [saleInvoiceId]: null
                }));

            } catch (error) {
                const errorMessage = error instanceof Error && error.message.trim()
                    ? error.message.trim()
                    : 'Unable to load item details.';
                setRegisterItemSummaryByInvoiceId((previous) => ({
                    ...previous,
                    [saleInvoiceId]: []
                }));
                setRegisterItemSummaryErrorByInvoiceId((previous) => ({
                    ...previous,
                    [saleInvoiceId]: errorMessage
                }));
            } finally {
                setRegisterItemSummaryLoadingByInvoiceId((previous) => ({
                    ...previous,
                    [saleInvoiceId]: false
                }));
            }
        },
        [
            fetchProductById,
            hydrateMissingHsnCodesInBackground,
            hsnCodeById,
            productById,
            registerItemSummaryByInvoiceId,
            registerItemSummaryLoadingByInvoiceId,
            typeDetailOptionsByType,
            unitNameById
        ]
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
                    mergeLineTaxRateHints(importLines);
                    const importTaxLines = estimateImport.taxLines ?? [];
                    const importAdditionalTaxations = estimateImport.additionalTaxations ?? [];
                    const importTypeDetails = estimateImport.typeDetails ?? [];
                    const importInStateTaxLedgerIds =
                        header.placeOfSupply === 'other_state'
                            ? []
                            : Array.from(
                                  new Set(
                                      importTaxLines
                                          .map((taxLine) => toPositiveLedgerId(taxLine.ledgerId ?? null))
                                          .filter((ledgerId): ledgerId is number => ledgerId != null)
                                  )
                              );

                    const mappedLines = importLines.map((line, index) => {
                        const product = line.itemId ? productById.get(line.itemId) ?? null : null;
                        const freeProduct = line.itemFreeId ? productById.get(line.itemFreeId) ?? null : null;
                        const lineFallbackLedgerIds = [
                            ...importInStateTaxLedgerIds,
                            toPositiveLedgerId(product?.taxProfile?.ledgerTaxId ?? null),
                            toPositiveLedgerId(product?.taxProfile?.ledgerTax2Id ?? null)
                        ].filter((ledgerId): ledgerId is number => ledgerId != null);
                        const normalizedTaxLedgers =
                            header.placeOfSupply === 'other_state'
                                ? { taxLedgerId: null, taxLedger2Id: null }
                                : resolveInStateTaxLedgerPair({
                                      taxLedgerId: line.taxLedgerId ?? null,
                                      taxLedger2Id: line.taxLedger2Id ?? null,
                                      taxRateHint: line.taxRate ?? null,
                                      taxRate2Hint: line.taxRate2 ?? null,
                                      fallbackLedgerIds: lineFallbackLedgerIds
                                  });
                        const normalizedUnitFreeId = toPositiveId(line.unitFreeId);
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
                            unitFreeId: normalizedUnitFreeId,
                            unitFreeName:
                                normalizedUnitFreeId != null
                                    ? unitNameById.get(normalizedUnitFreeId) ?? freeProduct?.unitName ?? null
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
                            taxLedgerId: normalizedTaxLedgers.taxLedgerId,
                            taxLedger2Id: normalizedTaxLedgers.taxLedger2Id,
                            taxLedger3Id: header.placeOfSupply === 'other_state' ? toPositiveLedgerId(line.taxLedger3Id ?? null) : null,
                            remarks: line.remarks ?? '',
                            minQuantity: Number(line.minQuantity ?? 0),
                            minFreeQuantity: Number(line.minFreeQuantity ?? 0),
                            tmpTypeId: line.tmpTypeId,
                            estimateLineId: line.estimateLineId,
                            textileJobberLedgerId: null,
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
                        partyAddress:
                            nextLedgerId != null
                                ? formatLedgerAddress(nextLedger) || previous.partyAddress
                                : previous.partyAddress,
                        hasScheme: nextHasScheme
                    }));

                    setLines(
                        mappedLines.length > 0
                            ? reindexLines(mappedLines)
                            : [createEmptyLine(header.warehouseId)]
                    );
                    const mappedAdditionalTaxations = importAdditionalTaxations
                        .filter((line) => line.ledgerId != null || Number(line.addAmount ?? 0) !== 0)
                        .map((line) => ({
                            key: makeKey(),
                            ledgerId: line.ledgerId ?? null,
                            addAmount: round2(Number(line.addAmount ?? 0)),
                            taxableAmount: round2(Number(line.taxableAmount ?? 0))
                        }));
                    setAdditionalTaxations(mappedAdditionalTaxations);
                    const inferredTransportDraft = inferTransportDraftFromAdditionalTaxations(
                        mappedAdditionalTaxations,
                        transportFeatureDefaultOn
                    );
                    setTransportDraft(inferredTransportDraft.draft);
                    transportManagedAdditionalTaxKeysRef.current = inferredTransportDraft.managedKeys;
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
        [
            ensureProductDetail,
            header.placeOfSupply,
            header.warehouseId,
            ledgerById,
            loadingInvoice,
            mergeLineTaxRateHints,
            markEntryDirty,
            productById,
            resolveInStateTaxLedgerPair,
            saving,
            transportFeatureDefaultOn,
            unitNameById
        ]
    );

    useEffect(() => {
        if (header.placeOfSupply === 'other_state') return;
        if (normalizedTaxLedgerOptions.length === 0) return;
        const fallbackLedgerIds = Array.from(
            new Set(
                (preservedDetails.taxLines ?? [])
                    .map((taxLine) => toPositiveLedgerId(taxLine.ledgerId))
                    .filter((ledgerId): ledgerId is number => ledgerId != null)
            )
        );

        const hasMissingTaxPair = lines.some((line) => {
            const taxLedgerId = toPositiveLedgerId(line.taxLedgerId);
            const taxLedger2Id = toPositiveLedgerId(line.taxLedger2Id);
            return (taxLedgerId == null) !== (taxLedger2Id == null);
        });
        if (!hasMissingTaxPair) return;

        setLines((previous) => {
            let changed = false;
            const nextLines = previous.map((line) => {
                const product = line.itemId ? productById.get(line.itemId) ?? null : null;
                const lineFallbackLedgerIds = [
                    ...fallbackLedgerIds,
                    toPositiveLedgerId(product?.taxProfile?.ledgerTaxId ?? null),
                    toPositiveLedgerId(product?.taxProfile?.ledgerTax2Id ?? null)
                ].filter((ledgerId): ledgerId is number => ledgerId != null);
                const normalizedPair = resolveInStateTaxLedgerPair({
                    taxLedgerId: line.taxLedgerId,
                    taxLedger2Id: line.taxLedger2Id,
                    fallbackLedgerIds: lineFallbackLedgerIds
                });
                if (line.taxLedgerId === normalizedPair.taxLedgerId && line.taxLedger2Id === normalizedPair.taxLedger2Id) {
                    return line;
                }
                changed = true;
                return {
                    ...line,
                    taxLedgerId: normalizedPair.taxLedgerId,
                    taxLedger2Id: normalizedPair.taxLedger2Id
                };
            });
            return changed ? nextLines : previous;
        });
    }, [
        header.placeOfSupply,
        lines,
        normalizedTaxLedgerOptions.length,
        preservedDetails.taxLines,
        productById,
        resolveInStateTaxLedgerPair
    ]);

    useEffect(() => {
        if (routeView === 'register') {
            const registerInput: invoicingApi.ListSaleInvoicesInput = {
                fromDate: null,
                toDate: null,
                includeCancelled: false,
                includeProductNames: false,
                limit: 300,
                offset: 0
            };
            const registerLoadKey = JSON.stringify(registerInput);
            if (lastRegisterLoadKeyRef.current === registerLoadKey) return;
            lastRegisterLoadKeyRef.current = registerLoadKey;
            saleInvoiceListInputRef.current = registerInput;
            void loadSaleInvoices(registerInput);
            return;
        }
        lastRegisterLoadKeyRef.current = null;
        saleInvoiceListInputRef.current = undefined;
        void loadSaleInvoices();
    }, [loadSaleInvoices, routeView]);

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
            const hasOptions = Boolean(typeDetailOptionsByType[productAttributeTypeId]);
            const hasTypeName = Boolean(typeDetailTypeNameById[productAttributeTypeId]?.trim());
            if (hasOptions && hasTypeName) return;
            try {
                const response = await loadProductAttributeTypeOptions({
                    variables: { productAttributeTypeId }
                });
                const attributeType = response.data?.productAttributeTypeById ?? null;
                const options = attributeType?.productAttributes ?? [];
                const typeName = attributeType?.name?.trim() ?? '';
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
                if (typeName) {
                    setTypeDetailTypeNameById((previous) => {
                        if (previous[productAttributeTypeId] === typeName) return previous;
                        return {
                            ...previous,
                            [productAttributeTypeId]: typeName
                        };
                    });
                }
            } catch {
                // keep form usable even if attribute option fetch fails
            }
        },
        [loadProductAttributeTypeOptions, typeDetailOptionsByType, typeDetailTypeNameById]
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

    const hydrateTextileSourceDocument = useCallback(
        async (source: TextileInvoiceSourceRouteState) => {
            setLoadingInvoice(true);
            setError(null);
            setLegacyActionNotice(null);
            setHasUnsavedEntryChanges(false);
            try {
                const sourceDocument = await getTextileDocument(source.textileSourceDocumentId);
                if (!sourceDocument) {
                    setError('Selected textile source document was not found.');
                    return;
                }

                const sourcePartyLedgerId = toPositiveId(sourceDocument.partyLedgerId);
                const sourcePartyLedger =
                    sourcePartyLedgerId != null ? ledgerById.get(sourcePartyLedgerId) ?? null : null;
                const sourceLedgerGroupId = toPositiveId(sourcePartyLedger?.ledgerGroupId);
                const sourceTransporterId = toPositiveId(sourceDocument.transporterId);
                const sourceProductIds = Array.from(
                    new Set(
                        (sourceDocument.lines ?? [])
                            .map((line) => toPositiveId(line.productId))
                            .filter((value): value is number => value != null)
                    )
                );
                const missingProductIds = sourceProductIds.filter((productId) => !productById.has(productId));

                if (missingProductIds.length > 0) {
                    const fetchedProductOverrides: Record<number, ProductRow> = {};
                    const results = await Promise.allSettled(
                        missingProductIds.map(async (productId) => {
                            const detailResult = await fetchProductById({ variables: { productId } });
                            return { productId, detail: detailResult.data?.productById ?? null };
                        })
                    );
                    results.forEach((result) => {
                        if (result.status !== 'fulfilled') return;
                        const detail = result.value.detail;
                        if (!detail) return;
                        fetchedProductOverrides[result.value.productId] = detail;
                    });
                    if (Object.keys(fetchedProductOverrides).length > 0) {
                        setProductOverrides((previous) => ({
                            ...previous,
                            ...fetchedProductOverrides
                        }));
                    }
                }

                const mappedLines = (sourceDocument.lines ?? []).map((sourceLine, index) => {
                    const productId = toPositiveId(sourceLine.productId);
                    const unitId = toPositiveId(sourceLine.unitId);
                    const product = productId != null ? productById.get(productId) ?? null : null;
                    const baseLine =
                        productId != null && product != null
                            ? applyProductToLine(createEmptyLine(null, sourceLine.lineNumber ?? index + 1), productId)
                            : createEmptyLine(null, sourceLine.lineNumber ?? index + 1);
                    const lineRate = round2(Number(sourceLine.rate ?? sourceLine.fabricRate ?? 0));
                    const lineQuantity = round2(Number(sourceLine.quantity ?? 0));
                    const itemName = product?.name ?? baseLine.itemName ?? '';

                    return {
                        ...baseLine,
                        isNewLineEntry: false,
                        lineNumber: sourceLine.lineNumber ?? index + 1,
                        itemId: productId ?? baseLine.itemId,
                        itemName: itemName || (productId != null ? 'Item ' + productId : ''),
                        itemCode: product?.code ?? baseLine.itemCode,
                        hsnCode: product?.hsnCode ?? baseLine.hsnCode,
                        unitId: unitId ?? baseLine.unitId,
                        unitName: unitId != null ? unitNameById.get(unitId) ?? baseLine.unitName : baseLine.unitName,
                        quantity: lineQuantity,
                        rate: lineRate,
                        sellingRate: lineRate > 0 ? lineRate : baseLine.sellingRate,
                        displayAmount: round2(Number(sourceLine.amount ?? lineQuantity * lineRate)),
                        remarks: sourceLine.remarks ?? '',
                        textileJobberLedgerId: toPositiveId(sourceLine.lineJobberLedgerId),
                        inventory: {
                            ...baseLine.inventory,
                            warehouseId: null
                        }
                    } satisfies InvoiceLineDraft;
                });
                const nextLines = mappedLines.length > 0 ? reindexLines(mappedLines) : [createEmptyLine(null)];
                const nextTransportDraft = createDefaultTransportDraft(
                    sourceTransporterId != null ? true : transportFeatureDefaultOn
                );
                nextTransportDraft.transporterId = showTransporterField ? sourceTransporterId : null;

                setEditingSaleInvoiceId(null);
                setHeader({
                    ...createDefaultHeader(),
                    voucherDate: fromDateText(sourceDocument.documentDate) ?? new Date(),
                    partyLedgerId: sourcePartyLedgerId,
                    ledgerGroupId: sourceLedgerGroupId,
                    textileJobberLedgerId: toPositiveId(sourceDocument.jobberLedgerId),
                    textileJobberChallanNo: sourceDocument.jobberChallanNo ?? '',
                    textileJobberChallanDate: fromDateText(sourceDocument.jobberChallanDate),
                    textileRemarkForStatement: sourceDocument.remarkForStatement ?? '',
                    partyName: sourcePartyLedger?.name ?? '',
                    partyGstin: sourcePartyLedger?.gstNumber?.trim() ?? '',
                    partyAddress: formatLedgerAddress(sourcePartyLedger),
                    remarks: sourceDocument.remarks ?? ''
                });
                setTypeDetails([]);
                setAdditionalTaxations([]);
                setTransportDraft(nextTransportDraft);
                loyaltyApplicationBaselineRef.current = null;
                setPreservedDetails(EMPTY_PRESERVED_DETAILS);
                transportManagedAdditionalTaxKeysRef.current = { freightKey: null, freightTaxKey: null };
                inventorySnapshotByLineKeyRef.current = nextLines.reduce<Record<string, string>>((acc, line) => {
                    acc[line.key] = serializeLineInventory(line.inventory);
                    return acc;
                }, {});
                setLines(nextLines);

                const sourceLabel =
                    source.textileSourceDocumentType === 'packing_slip' ? 'packing slip' : 'delivery challan';
                const sourceLabelWithNumber = source.textileSourceDocumentNumber
                    ? sourceLabel + ' ' + source.textileSourceDocumentNumber
                    : sourceLabel;
                setLegacyActionNotice(
                    'Source ' + sourceLabelWithNumber + ' selected. Saving this invoice will link it back to the textile document.'
                );
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to load textile source document');
            } finally {
                setLoadingInvoice(false);
            }
        },
        [
            applyProductToLine,
            fetchProductById,
            ledgerById,
            productById,
            showTransporterField,
            transportFeatureDefaultOn,
            unitNameById
        ]
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
                mergeLineTaxRateHints(invoiceLines);
                const documentType: InvoiceHeaderDraft['documentType'] =
                    (invoice.debitNotes?.length ?? 0) > 0
                        ? 'debit_note'
                        : (invoice.creditNotes?.length ?? 0) > 0
                          ? 'credit_note'
                          : 'invoice';
                let fallbackRegisterRow =
                    saleInvoices.find((row) => Number(row.saleInvoiceId) === Number(invoice.saleInvoiceId)) ?? null;
                const rawInvoiceLedgerId = toPositiveId(invoice.ledgerId);
                const rawInvoiceLedgerName = (invoice.ledgerName ?? '').trim();
                if (fallbackRegisterRow == null && rawInvoiceLedgerId == null && !rawInvoiceLedgerName && invoice.voucherDateText) {
                    try {
                        const fallbackLookup = await invoicingApi.listSaleInvoices({
                            fromDate: invoice.voucherDateText,
                            toDate: invoice.voucherDateText,
                            includeCancelled: true,
                            includeProductNames: false,
                            limit: 2000,
                            offset: 0
                        });
                        fallbackRegisterRow =
                            fallbackLookup.items.find((row) => Number(row.saleInvoiceId) === Number(invoice.saleInvoiceId)) ?? null;
                    } catch {
                        // Keep hydration resilient; fallback row lookup is best-effort only.
                    }
                }
                const fallbackLedgerId = toPositiveId(fallbackRegisterRow?.ledgerId);
                const fallbackLedgerGroupId = toPositiveId(fallbackRegisterRow?.ledgerGroupId);
                const fallbackLedgerName = (fallbackRegisterRow?.ledgerName ?? '').trim();
                const fallbackLedgerGstin = (fallbackRegisterRow?.ledgerGstin ?? '').trim();
                const invoiceLedgerId = rawInvoiceLedgerId ?? fallbackLedgerId;
                const invoiceLedgerGroupId = toPositiveId(invoice.ledgerGroupId) ?? fallbackLedgerGroupId;
                const invoiceLedgerName = rawInvoiceLedgerName || fallbackLedgerName;
                const invoiceLedgerNameKey = normalizeLedgerMatchKey(invoiceLedgerName);
                const matchedLedgerByName =
                    invoiceLedgerNameKey.length > 0
                        ? (() => {
                              const exactMatches = ledgerOptions.filter((option) => {
                                  const optionLedger = ledgerById.get(option.value) ?? null;
                                  const optionNameKey = normalizeLedgerMatchKey(optionLedger?.name ?? option.label);
                                  return optionNameKey === invoiceLedgerNameKey;
                              });
                              if (exactMatches.length === 0) return null;
                              const byGroup =
                                  invoiceLedgerGroupId != null
                                      ? exactMatches.find((option) => {
                                            const optionGroupId = toPositiveId(ledgerById.get(option.value)?.ledgerGroupId);
                                            return optionGroupId === invoiceLedgerGroupId;
                                        })
                                      : null;
                              return byGroup ?? exactMatches[0];
                          })()
                        : null;
                const resolvedPartyLedgerId = invoiceLedgerId ?? matchedLedgerByName?.value ?? null;
                const resolvedPartyLedger =
                    (resolvedPartyLedgerId != null ? ledgerById.get(resolvedPartyLedgerId) ?? null : null)
                    ?? (matchedLedgerByName != null ? ledgerById.get(matchedLedgerByName.value) ?? null : null);
                const resolvedLedgerGroupId = toPositiveId(resolvedPartyLedger?.ledgerGroupId) ?? invoiceLedgerGroupId;
                const fallbackLedgerAddress = (fallbackRegisterRow?.ledgerAddress ?? '').trim();
                const resolvedPartyAddress = formatLedgerAddress(resolvedPartyLedger) || fallbackLedgerAddress;

                setEditingSaleInvoiceId(invoice.saleInvoiceId);
                setHeader({
                    voucherDate: fromDateText(invoice.voucherDateText),
                    voucherNumberPrefix: invoice.voucherNumberPrefix ?? '',
                    voucherNumber: invoice.voucherNumber ?? '',
                    documentType,
                    billNumber: invoice.billNumber ?? '',
                    estimateId: invoice.estimateId,
                    partyLedgerId: resolvedPartyLedgerId,
                    ledgerGroupId: resolvedLedgerGroupId,
                    salesmanId: invoice.salesmanId ?? null,
                    salesman2Id: invoice.salesman2Id ?? null,
                    textileJobberLedgerId: invoice.textileJobberLedgerId ?? null,
                    textileJobberChallanNo: invoice.textileJobberChallanNo ?? '',
                    textileJobberChallanDate: fromDateText(invoice.textileJobberChallanDateText),
                    textileRemarkForStatement: invoice.textileRemarkForStatement ?? '',
                    partyName: resolvedPartyLedger?.name ?? invoiceLedgerName,
                    partyGstin: resolvedPartyLedger?.gstNumber?.trim() ?? fallbackLedgerGstin,
                    partyAddress: resolvedPartyAddress,
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

                const mappedAdditionalTaxations = (invoice.additionalTaxations ?? []).map((line) => ({
                    key: makeKey(),
                    ledgerId: line.ledgerId,
                    addAmount: round2(Number(line.addAmount ?? 0)),
                    taxableAmount: round2(Number(line.taxableAmount ?? 0))
                }));
                setAdditionalTaxations(mappedAdditionalTaxations);
                const inferredTransportDraft = inferTransportDraftFromAdditionalTaxations(
                    mappedAdditionalTaxations,
                    transportFeatureDefaultOn
                );
                const mergedTransportDraft: InvoiceTransportDraft = {
                    isApplied:
                        typeof invoice.transportIsApplied === 'boolean'
                            ? invoice.transportIsApplied
                            : inferredTransportDraft.draft.isApplied,
                    transporterId: invoice.transporterId ?? null,
                    freightLedgerId: invoice.transportFreightLedgerId ?? inferredTransportDraft.draft.freightLedgerId,
                    freightAmount:
                        invoice.transportFreightAmount != null
                            ? round2(Math.max(0, Number(invoice.transportFreightAmount ?? 0)))
                            : inferredTransportDraft.draft.freightAmount,
                    freightTaxLedgerId: invoice.transportFreightTaxLedgerId ?? inferredTransportDraft.draft.freightTaxLedgerId
                };
                if (!mergedTransportDraft.isApplied) {
                    mergedTransportDraft.transporterId = null;
                    mergedTransportDraft.freightLedgerId = null;
                    mergedTransportDraft.freightAmount = 0;
                    mergedTransportDraft.freightTaxLedgerId = null;
                }
                setTransportDraft(mergedTransportDraft);
                transportManagedAdditionalTaxKeysRef.current = inferredTransportDraft.managedKeys;

                setTypeDetails(
                    (invoice.typeDetails ?? []).map((line) => ({
                        key: makeKey(),
                        itemId: line.itemId,
                        typeDetailId: line.typeDetailId,
                        quantity: Number(line.quantity ?? 0),
                        tmpTypeId: line.tmpTypeId
                    }))
                );

                const hydratedLoyaltyApplication = invoice.loyaltyApplication
                    ? {
                          pointsRedeemed: round2(Math.max(0, Number(invoice.loyaltyApplication.pointsRedeemed ?? 0))),
                          amountApplied: round2(Math.max(0, Number(invoice.loyaltyApplication.amountApplied ?? 0))),
                          notes: invoice.loyaltyApplication.referenceNote ?? ''
                      }
                    : null;
                loyaltyApplicationBaselineRef.current = hydratedLoyaltyApplication
                    ? { ...hydratedLoyaltyApplication }
                    : null;

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
                    loyaltyApplication: hydratedLoyaltyApplication,
                    giftCertificateApplications: (invoice.giftCertificateApplications ?? []).map((line) => ({
                        key: makeKey(),
                        giftCertificateId: line.giftCertificateId,
                        certificateCode: line.certificateCode,
                        redeemedAmount: round2(Math.max(0, Number(line.redeemedAmount ?? 0))),
                        balanceAmount: line.balanceAmount != null ? round2(Math.max(0, Number(line.balanceAmount ?? 0))) : null,
                        status: line.status ?? null,
                        notes: line.notes ?? ''
                    })),
                    otherLedgerId: invoice.otherLedgerId,
                    itemBrandId: invoice.itemBrandId,
                    isChecked: Boolean(invoice.isChecked),
                    g1BillNumber: invoice.g1BillNumber ?? null,
                    g1IsSchemeMatched: Boolean(invoice.g1IsSchemeMatched),
                    g1IsAmountMatched: Boolean(invoice.g1IsAmountMatched),
                    g1Remark: invoice.g1Remark ?? null
                });
                const invoiceInStateTaxLedgerIds = invoice.isOtherState
                    ? []
                    : Array.from(
                          new Set(
                              (invoice.taxLines ?? [])
                                  .map((taxLine) => toPositiveLedgerId(taxLine.ledgerId ?? null))
                                  .filter((ledgerId): ledgerId is number => ledgerId != null)
                          )
                      );

                const mappedLines = invoiceLines.map((line, index) => {
                    const product = line.itemId ? productById.get(line.itemId) ?? null : null;
                    const freeProduct = line.itemFreeId ? productById.get(line.itemFreeId) ?? null : null;
                    const inventorySerials = parseInventorySerialsText(line.inventorySerialsText);
                    const lineFallbackLedgerIds = [
                        ...invoiceInStateTaxLedgerIds,
                        toPositiveLedgerId(product?.taxProfile?.ledgerTaxId ?? null),
                        toPositiveLedgerId(product?.taxProfile?.ledgerTax2Id ?? null)
                    ].filter((ledgerId): ledgerId is number => ledgerId != null);
                    const normalizedTaxLedgers = invoice.isOtherState
                        ? { taxLedgerId: null, taxLedger2Id: null }
                        : resolveInStateTaxLedgerPair({
                              taxLedgerId: line.taxLedgerId ?? null,
                              taxLedger2Id: line.taxLedger2Id ?? null,
                              taxRateHint: line.taxRate ?? null,
                              taxRate2Hint: line.taxRate2 ?? null,
                              fallbackLedgerIds: lineFallbackLedgerIds
                          });
                    const normalizedUnitFreeId = toPositiveId(line.unitFreeId);
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
                        unitFreeId: normalizedUnitFreeId,
                        unitFreeName:
                            normalizedUnitFreeId != null
                                ? unitNameById.get(normalizedUnitFreeId) ?? freeProduct?.unitName ?? null
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
                        taxLedgerId: normalizedTaxLedgers.taxLedgerId,
                        taxLedger2Id: normalizedTaxLedgers.taxLedger2Id,
                        taxLedger3Id: invoice.isOtherState ? toPositiveLedgerId(line.taxLedger3Id ?? null) : null,
                        remarks: line.remarks ?? '',
                        minQuantity: Number(line.minQuantity ?? 0),
                        minFreeQuantity: Number(line.minFreeQuantity ?? 0),
                        tmpTypeId: line.tmpTypeId,
                        estimateLineId: line.estimateLineId,
                        textileJobberLedgerId: line.textileJobberLedgerId ?? null,
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
        [
            ensureProductDetail,
            ledgerById,
            ledgerOptions,
            mergeLineTaxRateHints,
            productById,
            resolveInStateTaxLedgerPair,
            saleInvoices,
            transportFeatureDefaultOn,
            unitNameById
        ]
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
        setTransportDraft(createDefaultTransportDraft(transportFeatureDefaultOn));
        setTypeDetailOptionsByType({});
        loyaltyApplicationBaselineRef.current = null;
        setPreservedDetails(EMPTY_PRESERVED_DETAILS);
        setLineTaxRateHintsByLedgerId({});
        setTaxLedgerOverridesById({});
        transportManagedAdditionalTaxKeysRef.current = { freightKey: null, freightTaxKey: null };
        inventorySnapshotByLineKeyRef.current = {};
        autoDefaultHeaderLedgerRef.current = false;
        autoVoucherNumberRef.current = null;
        previousHeaderWarehouseIdRef.current = null;
        previousPriceListRef.current = 'retail';
        taxLedgerLookupSweepInFlightRef.current = false;
        taxLedgerLookupUnavailableIdsRef.current.clear();
        setHasUnsavedEntryChanges(false);
    }, [transportFeatureDefaultOn]);

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
            const routeChanged = lastRouteViewRef.current !== 'new';
            lastRouteViewRef.current = 'new';

            if (textileInvoiceSource) {
                const sourceChanged =
                    hydratedTextileSourceDocumentIdRef.current !== textileInvoiceSource.textileSourceDocumentId;
                if (!routeChanged && !sourceChanged) {
                    return;
                }
                hydratedTextileSourceDocumentIdRef.current = textileInvoiceSource.textileSourceDocumentId;
                resetDraftState();
                void hydrateTextileSourceDocument(textileInvoiceSource);
                return;
            }

            const hadTextileSource = hydratedTextileSourceDocumentIdRef.current != null;
            hydratedTextileSourceDocumentIdRef.current = null;
            if (!routeChanged && !hadTextileSource) {
                return;
            }
            resetDraftState();
            return;
        }

        hydratedTextileSourceDocumentIdRef.current = null;
        lastRouteViewRef.current = routeView;

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
    }, [
        editingSaleInvoiceId,
        hydrateInvoice,
        hydrateTextileSourceDocument,
        resetDraftState,
        routeSaleInvoiceId,
        routeView,
        textileInvoiceSource
    ]);

    useEffect(() => {
        if (routeView !== 'edit') return;
        if (ledgerLoading) return;
        if (header.partyLedgerId != null) return;
        const partyNameKey = normalizeLedgerMatchKey(header.partyName);
        if (!partyNameKey) return;

        const currentLedgerGroupId = toPositiveId(header.ledgerGroupId);
        const exactMatches = ledgerOptions.filter((option) => {
            const optionLedger = ledgerById.get(option.value) ?? null;
            const optionNameKey = normalizeLedgerMatchKey(optionLedger?.name ?? option.label);
            return optionNameKey === partyNameKey;
        });
        if (exactMatches.length === 0) return;

        const matchedOption =
            (currentLedgerGroupId != null
                ? exactMatches.find((option) => {
                      const optionGroupId = toPositiveId(ledgerById.get(option.value)?.ledgerGroupId);
                      return optionGroupId === currentLedgerGroupId;
                  })
                : null) ?? exactMatches[0];
        if (!matchedOption) return;

        const matchedLedger = ledgerById.get(matchedOption.value) ?? null;
        setHeader((previous) => {
            if (previous.partyLedgerId != null) return previous;
            if (normalizeLedgerMatchKey(previous.partyName) !== partyNameKey) return previous;
            return {
                ...previous,
                partyLedgerId: matchedOption.value,
                ledgerGroupId: toPositiveId(matchedLedger?.ledgerGroupId) ?? previous.ledgerGroupId,
                partyGstin: matchedLedger?.gstNumber?.trim() ?? previous.partyGstin,
                partyAddress: formatLedgerAddress(matchedLedger) || previous.partyAddress
            };
        });
    }, [header.ledgerGroupId, header.partyLedgerId, header.partyName, ledgerById, ledgerLoading, ledgerOptions, routeView]);

    useEffect(() => {
        if (routeView !== 'edit') return;
        if (header.partyLedgerId != null) return;
        const targetInvoiceId = toPositiveId(editingSaleInvoiceId);
        if (targetInvoiceId == null) return;

        const fallbackRow = saleInvoices.find((row) => Number(row.saleInvoiceId) === targetInvoiceId) ?? null;
        if (!fallbackRow) return;
        const fallbackLedgerId = toPositiveId(fallbackRow.ledgerId);
        if (fallbackLedgerId == null) return;
        const fallbackLedger = ledgerById.get(fallbackLedgerId) ?? null;

        setHeader((previous) => {
            if (previous.partyLedgerId != null) return previous;
            if (toPositiveId(editingSaleInvoiceId) !== targetInvoiceId) return previous;
            return {
                ...previous,
                partyLedgerId: fallbackLedgerId,
                ledgerGroupId:
                    toPositiveId(fallbackLedger?.ledgerGroupId ?? fallbackRow.ledgerGroupId) ?? previous.ledgerGroupId,
                partyName: previous.partyName.trim() || fallbackLedger?.name?.trim() || fallbackRow.ledgerName?.trim() || '',
                partyGstin:
                    previous.partyGstin.trim()
                    || fallbackLedger?.gstNumber?.trim()
                    || fallbackRow.ledgerGstin?.trim()
                    || '',
                partyAddress:
                    previous.partyAddress.trim()
                    || formatLedgerAddress(fallbackLedger)
                    || fallbackRow.ledgerAddress?.trim()
                    || ''
            };
        });
    }, [editingSaleInvoiceId, header.partyLedgerId, ledgerById, routeView, saleInvoices]);

    useEffect(() => {
        if (routeView !== 'edit') return;
        const partyLedgerId = toPositiveId(header.partyLedgerId);
        if (partyLedgerId == null) return;
        const partyLedger = ledgerById.get(partyLedgerId) ?? null;
        if (!partyLedger) return;

        const nextLedgerGroupId = toPositiveId(partyLedger.ledgerGroupId);
        const nextPartyName = partyLedger.name?.trim() ?? '';
        const nextPartyGstin = partyLedger.gstNumber?.trim() ?? '';
        const nextPartyAddress = formatLedgerAddress(partyLedger);
        if (
            (header.ledgerGroupId != null || nextLedgerGroupId == null)
            && (header.partyName.trim() || !nextPartyName)
            && (header.partyGstin.trim() || !nextPartyGstin)
            && (header.partyAddress.trim() || !nextPartyAddress)
        ) {
            return;
        }

        setHeader((previous) => {
            if (toPositiveId(previous.partyLedgerId) !== partyLedgerId) return previous;
            const next: InvoiceHeaderDraft = { ...previous };
            if (next.ledgerGroupId == null && nextLedgerGroupId != null) next.ledgerGroupId = nextLedgerGroupId;
            if (!next.partyName.trim() && nextPartyName) next.partyName = nextPartyName;
            if (!next.partyGstin.trim() && nextPartyGstin) next.partyGstin = nextPartyGstin;
            if (!next.partyAddress.trim() && nextPartyAddress) next.partyAddress = nextPartyAddress;
            return next;
        });
    }, [header.ledgerGroupId, header.partyAddress, header.partyGstin, header.partyLedgerId, header.partyName, ledgerById, routeView]);

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
                partyGstin: defaultLedger.gstNumber?.trim() ?? previous.partyGstin,
                partyAddress: formatLedgerAddress(defaultLedger) || previous.partyAddress
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
        confirmDiscardUnsavedChanges('a new invoice', () => {
            setLegacyActionNotice(null);
            navigate(invoiceRoutes.newRoute);
        });
    }, [confirmDiscardUnsavedChanges, invoiceRoutes, navigate, routeView, saving]);

    const openEdit = useCallback(
        (saleInvoiceId: number) => {
            if (saving) return;
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;
            if (routeView === 'edit' && editingSaleInvoiceId === saleInvoiceId) return;
            confirmDiscardUnsavedChanges(`invoice #${saleInvoiceId}`, () => {
                setLegacyActionNotice(null);
                navigate(`${invoiceRoutes.editRoutePrefix}/${saleInvoiceId}`);
            });
        },
        [confirmDiscardUnsavedChanges, editingSaleInvoiceId, invoiceRoutes, navigate, routeView, saving]
    );

    const cancelEntry = useCallback(() => {
        if (saving) return;
        confirmDiscardUnsavedChanges('the invoice register', () => {
            setLegacyActionNotice(null);
            navigate(invoiceRoutes.registerRoute);
        });
    }, [confirmDiscardUnsavedChanges, invoiceRoutes, navigate, saving]);

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
                    navigate(invoiceRoutes.registerRoute, { replace: true });
                }

                await loadSaleInvoices();
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to delete invoice');
            } finally {
                setSaving(false);
            }
        },
        [editingSaleInvoiceId, invoiceRoutes, loadSaleInvoices, navigate, routeView, saving]
    );

    const sendDueSms = useCallback(
        async (saleInvoiceId: number) => {
            if (saving) return;
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;

            setSendingDueSmsInvoiceId(saleInvoiceId);
            setError(null);
            setRegisterActionNotice(null);

            try {
                const result = await invoicingApi.sendSaleInvoiceDueSms({ saleInvoiceId });
                if (result.status === 'failed') {
                    throw new Error(result.note?.trim() || 'Failed to send due reminder SMS');
                }

                const invoiceLabel =
                    saleInvoices.find((item) => Number(item.saleInvoiceId) === saleInvoiceId)?.voucherNumber?.trim()
                    || `#${saleInvoiceId}`;
                const baseNotice = result.duplicate
                    ? `Existing due reminder SMS returned for invoice ${invoiceLabel}`
                    : `Due reminder SMS ${result.status === 'sandbox' ? 'prepared' : 'processed'} for invoice ${invoiceLabel}`;
                const detailNotice = `to ${result.recipientPhone} for Rs ${result.dueAmount.toFixed(2)}.`;
                const note = result.note?.trim();
                setRegisterActionNotice(note ? `${baseNotice} ${detailNotice} ${note}` : `${baseNotice} ${detailNotice}`);
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to send due reminder SMS');
            } finally {
                setSendingDueSmsInvoiceId((current) => (current === saleInvoiceId ? null : current));
            }
        },
        [saleInvoices, saving]
    );

    const sendInvoiceWhatsApp = useCallback(
        async (saleInvoiceId: number) => {
            if (saving) return;
            if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;

            setSendingWhatsAppInvoiceId(saleInvoiceId);
            setError(null);
            setRegisterActionNotice(null);

            try {
                const result = await invoicingApi.sendSaleInvoiceWhatsApp({ saleInvoiceId });
                if (result.status === 'failed') {
                    throw new Error('Failed to send invoice WhatsApp message');
                }

                const invoiceLabel =
                    saleInvoices.find((item) => Number(item.saleInvoiceId) === saleInvoiceId)?.voucherNumber?.trim()
                    || `#${saleInvoiceId}`;
                const templateLabel = result.templateName?.trim() || result.templateKey?.trim() || result.bindingKey;
                const statusLabel = result.status === 'sandbox'
                    ? 'prepared'
                    : result.status === 'queued'
                        ? 'queued'
                        : 'processed';
                setRegisterActionNotice(
                    `WhatsApp message ${statusLabel} for invoice ${invoiceLabel} to ${result.recipientPhone} using ${templateLabel}.`
                );
            } catch (nextError) {
                setError(nextError instanceof Error ? nextError.message : 'Failed to send invoice WhatsApp message');
            } finally {
                setSendingWhatsAppInvoiceId((current) => (current === saleInvoiceId ? null : current));
            }
        },
        [saleInvoices, saving]
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
            const partyLedgerChanged = patch.partyLedgerId !== undefined && patch.partyLedgerId !== header.partyLedgerId;
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
                    next.partyAddress = formatLedgerAddress(ledger) || next.partyAddress;
                    next.ledgerGroupId = ledger?.ledgerGroupId ?? next.ledgerGroupId;
                }
                return next;
            });
            if (partyLedgerChanged) {
                loyaltyApplicationBaselineRef.current = null;
                setPreservedDetails((previous) => {
                    if (previous.giftCertificateApplications.length === 0 && previous.loyaltyApplication == null) return previous;
                    return {
                        ...previous,
                        loyaltyApplication: null,
                        giftCertificateApplications: []
                    };
                });
            }
        },
        [header.partyLedgerId, ledgerById, markEntryDirty]
    );

    const applyLoyaltyApplication = useCallback(() => {
        if (toPositiveId(header.partyLedgerId) == null) return;
        const defaultPoints = round2(Math.max(0, Number(loyaltySummary?.minimumRedeemPoints ?? 0)));
        const valuePerPoint = Number(loyaltySummary?.redemptionValuePerPoint ?? 0);
        const defaultAmount = defaultPoints > 0 && Number.isFinite(valuePerPoint)
            ? round2(defaultPoints * Math.max(0, valuePerPoint))
            : 0;

        markEntryDirty();
        setPreservedDetails((previous) => ({
            ...previous,
            loyaltyApplication: previous.loyaltyApplication ?? {
                ...createEmptyLoyaltyApplication(),
                pointsRedeemed: defaultPoints,
                amountApplied: defaultAmount
            }
        }));
    }, [header.partyLedgerId, loyaltySummary, markEntryDirty]);

    const changeLoyaltyApplication = useCallback((patch: Partial<InvoiceLoyaltyApplicationDraft>) => {
        markEntryDirty();
        setPreservedDetails((previous) => {
            if (previous.loyaltyApplication == null) return previous;

            const nextPointsRaw = patch.pointsRedeemed === undefined ? previous.loyaltyApplication.pointsRedeemed : patch.pointsRedeemed;
            const nextAmountRaw = patch.amountApplied === undefined ? previous.loyaltyApplication.amountApplied : patch.amountApplied;

            return {
                ...previous,
                loyaltyApplication: {
                    ...previous.loyaltyApplication,
                    pointsRedeemed: round2(Math.max(0, Number(nextPointsRaw ?? 0))),
                    amountApplied: round2(Math.max(0, Number(nextAmountRaw ?? 0))),
                    notes: patch.notes === undefined ? previous.loyaltyApplication.notes : String(patch.notes ?? '')
                }
            };
        });
    }, [markEntryDirty]);

    const clearLoyaltyApplication = useCallback(() => {
        markEntryDirty();
        setPreservedDetails((previous) => {
            if (previous.loyaltyApplication == null) return previous;
            return {
                ...previous,
                loyaltyApplication: null
            };
        });
    }, [markEntryDirty]);

    const addGiftCertificateApplication = useCallback(() => {
        markEntryDirty();
        setPreservedDetails((previous) => ({
            ...previous,
            giftCertificateApplications: [...previous.giftCertificateApplications, createEmptyGiftCertificateApplication()]
        }));
    }, [markEntryDirty]);

    const selectGiftCertificateApplication = useCallback(
        (lineKey: string, giftCertificateId: string | null) => {
            markEntryDirty();
            setPreservedDetails((previous) => ({
                ...previous,
                giftCertificateApplications: previous.giftCertificateApplications.map((line) => {
                    if (line.key !== lineKey) return line;

                    const normalizedId = (giftCertificateId ?? '').trim();
                    if (!normalizedId) {
                        return {
                            ...line,
                            giftCertificateId: '',
                            certificateCode: '',
                            redeemedAmount: 0,
                            balanceAmount: null,
                            status: null,
                            notes: ''
                        };
                    }

                    const option = giftCertificateOptionById.get(normalizedId);
                    const nextCertificateCode = option?.certificateCode ?? line.certificateCode;
                    const nextBalanceAmount = option?.balanceAmount ?? line.balanceAmount;
                    const nextStatus = option?.status ?? line.status;
                    const isChangedCertificate = line.giftCertificateId !== normalizedId;

                    return {
                        ...line,
                        giftCertificateId: normalizedId,
                        certificateCode: nextCertificateCode,
                        redeemedAmount: isChangedCertificate ? 0 : round2(Math.max(0, Number(line.redeemedAmount ?? 0))),
                        balanceAmount: nextBalanceAmount,
                        status: nextStatus,
                        notes: isChangedCertificate ? '' : line.notes
                    };
                })
            }));
        },
        [giftCertificateOptionById, markEntryDirty]
    );

    const changeGiftCertificateApplication = useCallback(
        (lineKey: string, patch: Partial<InvoiceGiftCertificateApplicationDraft>) => {
            markEntryDirty();
            setPreservedDetails((previous) => {
                const otherGiftAppliedAmount = round2(
                    previous.giftCertificateApplications.reduce((sum, line) => {
                        if (line.key === lineKey) return sum;
                        if (!(line.giftCertificateId ?? '').trim()) return sum;

                        const redeemedAmount = Number(line.redeemedAmount ?? 0);
                        if (!Number.isFinite(redeemedAmount) || redeemedAmount <= 0) return sum;
                        return sum + redeemedAmount;
                    }, 0)
                );
                const maxInvoiceAmountForLine = round2(
                    Math.max(0, computation.totals.totalNetAmount - loyaltyAppliedAmount - otherGiftAppliedAmount)
                );

                return {
                    ...previous,
                    giftCertificateApplications: previous.giftCertificateApplications.map((line) => {
                        if (line.key !== lineKey) return line;

                        const nextBalanceAmount =
                            patch.balanceAmount === undefined || patch.balanceAmount === null
                                ? patch.balanceAmount === undefined
                                    ? line.balanceAmount
                                    : null
                                : round2(Math.max(0, Number(patch.balanceAmount)));
                        const nextRedeemedAmountRaw =
                            patch.redeemedAmount === undefined ? line.redeemedAmount : patch.redeemedAmount;
                        let nextRedeemedAmount = round2(Math.max(0, Number(nextRedeemedAmountRaw ?? 0)));
                        const currentRedeemedAmount = round2(Math.max(0, Number(line.redeemedAmount ?? 0)));
                        if (nextBalanceAmount != null) {
                            const maxCertificateAmountForLine = round2(
                                Math.max(0, nextBalanceAmount + currentRedeemedAmount)
                            );
                            nextRedeemedAmount = round2(Math.min(nextRedeemedAmount, maxCertificateAmountForLine));
                        }
                        nextRedeemedAmount = round2(Math.min(nextRedeemedAmount, maxInvoiceAmountForLine));

                        return {
                            ...line,
                            certificateCode:
                                patch.certificateCode === undefined
                                    ? line.certificateCode
                                    : String(patch.certificateCode ?? '').trim(),
                            redeemedAmount: nextRedeemedAmount,
                            balanceAmount: nextBalanceAmount,
                            status: patch.status === undefined ? line.status : String(patch.status ?? '').trim() || null,
                            notes: patch.notes === undefined ? line.notes : String(patch.notes ?? '')
                        };
                    })
                };
            });
        },
        [computation.totals.totalNetAmount, loyaltyAppliedAmount, markEntryDirty]
    );

    const deleteGiftCertificateApplication = useCallback(
        (lineKey: string) => {
            markEntryDirty();
            setPreservedDetails((previous) => ({
                ...previous,
                giftCertificateApplications: previous.giftCertificateApplications.filter((line) => line.key !== lineKey)
            }));
        },
        [markEntryDirty]
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

    const addTypeDetail = useCallback((defaults?: { itemId?: number | null; tmpTypeId?: number | null }) => {
        const normalizedItemId = toPositiveId(defaults?.itemId ?? null);
        const normalizedTmpTypeId = toPositiveId(defaults?.tmpTypeId ?? null);
        markEntryDirty();
        setTypeDetails((previous) => [
            ...previous,
            {
                ...createEmptyTypeDetail(),
                itemId: normalizedItemId,
                tmpTypeId: normalizedTmpTypeId
            }
        ]);
        if (normalizedItemId != null && !productById.has(normalizedItemId)) {
            void ensureProductDetail(normalizedItemId);
        }
        const product = normalizedItemId != null ? productById.get(normalizedItemId) ?? null : null;
        const attributeTypeId = product?.productAttributeTypeId ?? null;
        if (attributeTypeId) {
            void ensureTypeDetailOptions(attributeTypeId);
        }
    }, [ensureProductDetail, ensureTypeDetailOptions, markEntryDirty, productById]);

    const openTypeDetailsForItem = useCallback(
        (itemId: number | null, tmpTypeId: number | null) => {
            const normalizedItemId = toPositiveId(itemId);
            const normalizedTmpTypeId = toPositiveId(tmpTypeId);
            if (normalizedItemId == null) {
                return;
            }

            if (!productById.has(normalizedItemId)) {
                void ensureProductDetail(normalizedItemId);
            }
            const product = productById.get(normalizedItemId) ?? null;
            const attributeTypeId = product?.productAttributeTypeId ?? null;
            const typeDetailIdsFromProduct = (product?.productAttributes ?? [])
                .map((option) => toPositiveId(option.productAttributeId))
                .filter((value): value is number => value != null);
            const defaultTypeDetailIds = Array.from(
                new Set(typeDetailIdsFromProduct)
            );

            if (defaultTypeDetailIds.length > 0) {
                setTypeDetails((previous) => {
                    const isScopeLine = (line: InvoiceTypeDetailDraft) => {
                        if (toPositiveId(line.itemId) !== normalizedItemId) return false;
                        if (normalizedTmpTypeId == null) return true;
                        const lineTmpTypeId = toPositiveId(line.tmpTypeId);
                        return lineTmpTypeId == null || lineTmpTypeId === normalizedTmpTypeId;
                    };

                    const existingTypeDetailIds = new Set<number>();
                    previous.forEach((line) => {
                        if (!isScopeLine(line)) return;
                        const typeDetailId = toPositiveId(line.typeDetailId);
                        if (typeDetailId == null) return;
                        existingTypeDetailIds.add(typeDetailId);
                    });

                    let changed = false;
                    const next = previous.filter((line) => {
                        if (!isScopeLine(line)) return true;
                        const typeDetailId = toPositiveId(line.typeDetailId);
                        if (typeDetailId != null) {
                            if (defaultTypeDetailIds.length === 0 || defaultTypeDetailIds.includes(typeDetailId)) {
                                return true;
                            }
                            const quantity = Number(line.quantity ?? 0);
                            const hasQty = Number.isFinite(quantity) && Math.abs(quantity) > TYPE_DETAIL_QTY_EPSILON;
                            if (!hasQty) changed = true;
                            return hasQty;
                        }
                        const quantity = Number(line.quantity ?? 0);
                        const shouldKeep = Number.isFinite(quantity) && Math.abs(quantity) > TYPE_DETAIL_QTY_EPSILON;
                        if (!shouldKeep) changed = true;
                        return shouldKeep;
                    });

                    defaultTypeDetailIds.forEach((typeDetailId) => {
                        if (existingTypeDetailIds.has(typeDetailId)) return;
                        changed = true;
                        next.push({
                            ...createEmptyTypeDetail(),
                            itemId: normalizedItemId,
                            tmpTypeId: normalizedTmpTypeId,
                            typeDetailId,
                            quantity: 0
                        });
                    });

                    return changed ? next : previous;
                });
            }

            if (attributeTypeId) {
                void ensureTypeDetailOptions(attributeTypeId);
            }
        },
        [ensureProductDetail, ensureTypeDetailOptions, productById]
    );

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

    const changeTransportDraft = useCallback((patch: Partial<InvoiceTransportDraft>) => {
        markEntryDirty();
        setTransportDraft((previous) => {
            const next = { ...previous, ...patch };
            if (!next.isApplied) {
                next.transporterId = null;
                next.freightLedgerId = null;
                next.freightAmount = 0;
                next.freightTaxLedgerId = null;
            }
            return next;
        });
    }, [markEntryDirty]);

    const applyTransportCharges = useCallback(() => {
        const freightAmount = round2(Math.max(0, Number(transportDraft.freightAmount ?? 0)));
        const transporterMissing =
            showTransporterField && requireTransporterWhenApplied && transportDraft.transporterId == null;
        if (!transportDraft.isApplied || freightAmount <= 0 || transportDraft.freightLedgerId == null) return;
        if (transporterMissing) return;
        markEntryDirty();
        setAdditionalTaxations((previous) => {
            const rows = [...previous];
            const freightKey = transportManagedAdditionalTaxKeysRef.current.freightKey;
            const freightTaxKey = transportManagedAdditionalTaxKeysRef.current.freightTaxKey;

            const upsertRow = (key: string | null, nextRow: InvoiceAdditionalTaxationDraft): string => {
                if (key != null) {
                    const index = rows.findIndex((row) => row.key === key);
                    if (index >= 0) {
                        rows[index] = { ...rows[index], ...nextRow };
                        return key;
                    }
                }
                rows.push(nextRow);
                return nextRow.key;
            };

            const nextFreightKey = upsertRow(freightKey, {
                key: freightKey ?? makeKey(),
                ledgerId: transportDraft.freightLedgerId,
                addAmount: freightAmount,
                taxableAmount: 0
            });
            transportManagedAdditionalTaxKeysRef.current.freightKey = nextFreightKey;

            if (transportDraft.freightTaxLedgerId != null && transportFreightTaxAmount > 0) {
                const nextTaxKey = upsertRow(freightTaxKey, {
                    key: freightTaxKey ?? makeKey(),
                    ledgerId: transportDraft.freightTaxLedgerId,
                    addAmount: transportFreightTaxAmount,
                    taxableAmount: freightAmount
                });
                transportManagedAdditionalTaxKeysRef.current.freightTaxKey = nextTaxKey;
            } else if (freightTaxKey != null) {
                transportManagedAdditionalTaxKeysRef.current.freightTaxKey = null;
                return rows.filter((row) => row.key !== freightTaxKey);
            }

            return rows;
        });
    }, [
        markEntryDirty,
        transportDraft.freightAmount,
        transportDraft.freightLedgerId,
        transportDraft.freightTaxLedgerId,
        transportDraft.isApplied,
        transportDraft.transporterId,
        requireTransporterWhenApplied,
        showTransporterField,
        transportFreightTaxAmount
    ]);

    const clearTransportCharges = useCallback(() => {
        markEntryDirty();
        const managedKeys = transportManagedAdditionalTaxKeysRef.current;
        setAdditionalTaxations((previous) =>
            previous.filter((line) => line.key !== managedKeys.freightKey && line.key !== managedKeys.freightTaxKey)
        );
        transportManagedAdditionalTaxKeysRef.current = { freightKey: null, freightTaxKey: null };
        setTransportDraft(createDefaultTransportDraft(false));
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
            textileJobberLedgerId: line.textileJobberLedgerId,
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
            .filter(
                (line) =>
                    line.itemId != null
                    && line.typeDetailId != null
                    && Number(line.quantity ?? 0) > TYPE_DETAIL_QTY_EPSILON
            )
            .map((line) => ({
                itemId: line.itemId,
                typeDetailId: line.typeDetailId,
                quantity: round2(Number(line.quantity ?? 0)),
                tmpTypeId: line.tmpTypeId ?? null
            }));
        const loyaltyApplicationPayload: invoicingApi.SaleInvoiceLoyaltyApplicationInput | null =
            preservedDetails.loyaltyApplication &&
            Number(preservedDetails.loyaltyApplication.pointsRedeemed ?? 0) > 0 &&
            Number(preservedDetails.loyaltyApplication.amountApplied ?? 0) > 0
                ? {
                      pointsRedeemed: round2(Number(preservedDetails.loyaltyApplication.pointsRedeemed ?? 0)),
                      amountApplied: round2(Number(preservedDetails.loyaltyApplication.amountApplied ?? 0)),
                      notes: preservedDetails.loyaltyApplication.notes.trim() || null
                  }
                : null;
        const giftCertificateApplicationsPayload: invoicingApi.SaleInvoiceGiftCertificateApplicationInput[] =
            preservedDetails.giftCertificateApplications
                .filter((line) => (line.giftCertificateId ?? '').trim().length > 0 && Number(line.redeemedAmount ?? 0) > 0)
                .map((line) => ({
                    giftCertificateId: line.giftCertificateId.trim(),
                    redeemedAmount: round2(Number(line.redeemedAmount ?? 0)),
                    notes: line.notes.trim() || null
                }));
        const transportIsAppliedPayload = Boolean(transportDraft.isApplied);
        const transportFreightAmountPayload = round2(Math.max(0, Number(transportDraft.freightAmount ?? 0)));
        const transportFreightTaxAmountPayload = round2(Math.max(0, Number(transportFreightTaxAmount ?? 0)));
        const transportTransporterIdPayload =
            transportIsAppliedPayload && showTransporterField ? transportDraft.transporterId : null;

        return {
            voucherDateText: toDateText(header.voucherDate as Date),
            voucherNumberPrefix: header.voucherNumberPrefix.trim() || null,
            voucherNumber: header.voucherNumber.trim() || null,
            billNumber: header.billNumber.trim() || null,
            ledgerId: header.partyLedgerId,
            ledgerName: header.partyName.trim() || null,
            ledgerGroupId: header.ledgerGroupId,
            salesmanId: header.salesmanId,
            salesman2Id: header.salesman2Id,
            transportIsApplied: transportIsAppliedPayload,
            transporterId: transportTransporterIdPayload,
            transportFreightLedgerId: transportIsAppliedPayload ? transportDraft.freightLedgerId : null,
            transportFreightAmount: transportIsAppliedPayload ? transportFreightAmountPayload : 0,
            transportFreightTaxLedgerId: transportIsAppliedPayload ? transportDraft.freightTaxLedgerId : null,
            transportFreightTaxAmount: transportIsAppliedPayload ? transportFreightTaxAmountPayload : 0,
            textileJobberLedgerId: header.textileJobberLedgerId,
            textileJobberChallanNo: header.textileJobberChallanNo.trim() || null,
            textileJobberChallanDateText: header.textileJobberChallanDate ? toDateText(header.textileJobberChallanDate) : null,
            textileRemarkForStatement: header.textileRemarkForStatement.trim() || null,
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
            debitNotes: preservedDetails.debitNotes,
            loyaltyApplication: loyaltyApplicationPayload,
            giftCertificateApplications: giftCertificateApplicationsPayload
        };
    }, [
        additionalTaxations,
        computation,
        header,
        preservedDetails,
        showTransporterField,
        transportDraft,
        transportFreightTaxAmount,
        typeDetails
    ]);

    const linkTextileSourceDocumentToInvoice = useCallback(async (textileDocumentId: string, saleInvoiceId: number) => {
        if (!textileDocumentId.trim()) return;
        if (!Number.isFinite(saleInvoiceId) || saleInvoiceId <= 0) return;

        const sourceDocument = await getTextileDocument(textileDocumentId);
        if (!sourceDocument) return;
        if (Number(sourceDocument.linkedSaleInvoiceId ?? NaN) === saleInvoiceId) return;

        await saveTextileDocument(
            toTextileDocumentInput(sourceDocument, {
                linkedSaleInvoiceId: String(saleInvoiceId)
            })
        );
    }, []);

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

        const activeLoyaltyApplication = preservedDetails.loyaltyApplication;
        if (activeLoyaltyApplication) {
            if (toPositiveId(header.partyLedgerId) == null) {
                setError('Select a party ledger before applying loyalty.');
                return;
            }
            if (loyaltySummaryLoading) {
                setError('Wait for loyalty balance to finish loading before saving.');
                return;
            }
            if (loyaltySummaryError) {
                setError(loyaltySummaryError);
                return;
            }
            if (!loyaltySummary) {
                setError('No active loyalty program found for the selected party.');
                return;
            }

            const pointsRedeemed = round2(Math.max(0, Number(activeLoyaltyApplication.pointsRedeemed ?? 0)));
            const amountApplied = round2(Math.max(0, Number(activeLoyaltyApplication.amountApplied ?? 0)));
            if (pointsRedeemed <= 0) {
                setError('Enter redeemed loyalty points greater than zero.');
                return;
            }
            if (amountApplied <= 0) {
                setError('Enter applied loyalty amount greater than zero.');
                return;
            }
            if (!loyaltySummary.canRedeem) {
                setError('The selected party is not eligible for loyalty redemption right now.');
                return;
            }

            const minimumRedeemPoints = round2(Math.max(0, Number(loyaltySummary.minimumRedeemPoints ?? 0)));
            if (minimumRedeemPoints > 0 && pointsRedeemed < minimumRedeemPoints) {
                setError('Redeem at least ' + minimumRedeemPoints + ' loyalty points.');
                return;
            }

            const baselinePoints = round2(Math.max(0, Number(loyaltyApplicationBaselineRef.current?.pointsRedeemed ?? 0)));
            const baselineAmount = round2(Math.max(0, Number(loyaltyApplicationBaselineRef.current?.amountApplied ?? 0)));
            const effectiveAvailablePoints = round2(Math.max(0, Number(loyaltySummary.availablePoints ?? 0)) + baselinePoints);
            if (pointsRedeemed > effectiveAvailablePoints + 0.0001) {
                setError('Only ' + effectiveAvailablePoints + ' loyalty points are available for this invoice.');
                return;
            }

            const summaryAvailableAmount = loyaltySummary.availableAmount != null ? Number(loyaltySummary.availableAmount) : null;
            const effectiveAvailableAmount =
                summaryAvailableAmount != null && Number.isFinite(summaryAvailableAmount)
                    ? round2(Math.max(0, summaryAvailableAmount) + baselineAmount)
                    : null;
            if (effectiveAvailableAmount != null && amountApplied > effectiveAvailableAmount + 0.0001) {
                setError('Only ' + effectiveAvailableAmount.toFixed(2) + ' loyalty amount is available for this invoice.');
                return;
            }
        }

        if (settlementExceedsInvoice) {
            const overAppliedAmount = round2(Math.max(0, settlementAppliedAmount - computation.totals.totalNetAmount));
            setError('Applied loyalty and gift certificates exceed invoice amount by ' + overAppliedAmount.toFixed(2) + '.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = buildPayload();
            const openNewAfterSave = options?.openNewAfterSave === true && routeView !== 'edit';
            let persistedSaleInvoiceId: number | null = null;

            if (routeView === 'edit' && editingSaleInvoiceId) {
                const result = await invoicingApi.updateSaleInvoice({
                    saleInvoiceId: editingSaleInvoiceId,
                    ...payload,
                    isCancelled: header.isCancelled
                });
                persistedSaleInvoiceId = result.saleInvoiceId;
            } else {
                const result = await invoicingApi.createSaleInvoice(payload);
                persistedSaleInvoiceId = result.saleInvoiceId;
            }

            if (persistedSaleInvoiceId != null && textileInvoiceSource) {
                try {
                    await linkTextileSourceDocumentToInvoice(
                        textileInvoiceSource.textileSourceDocumentId,
                        persistedSaleInvoiceId
                    );
                } catch {
                    // Keep invoice save successful even if textile backlink persistence fails.
                }
            }

            pendingSaveModeRef.current = 'default';
            setHasUnsavedEntryChanges(false);
            navigate(openNewAfterSave ? invoiceRoutes.newRoute : invoiceRoutes.registerRoute, { replace: true });
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
        header.partyLedgerId,
        header.voucherDate,
        invoiceRoutes,
        linkTextileSourceDocumentToInvoice,
        navigate,
        routeView,
        settlementAppliedAmount,
        settlementExceedsInvoice,
        textileInvoiceSource,
        loyaltySummary,
        loyaltySummaryError,
        loyaltySummaryLoading,
        preservedDetails.loyaltyApplication,
        validation.isValid,
        computation.totals.totalNetAmount
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
                if (!legacyActionFlags.estimate) {
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
                if (!legacyActionFlags.creditNote) {
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

            if (!legacyActionFlags.debitNote) {
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
            saving,
            legacyActionFlags.creditNote,
            legacyActionFlags.debitNote,
            legacyActionFlags.estimate
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
            registerDateFilterApplied={registerDateFilterApplied}
            ledgerOptions={ledgerOptions}
            ledgerById={ledgerById}
            ledgerLoading={ledgerLoading}
            products={products}
            productOptions={productOptions}
            mrpOptionsByProductId={mrpOptionsByProductId}
            unitOptions={unitOptions}
            transporterOptions={transporterOptions}
            taxLedgerOptions={taxLedgerOptions}
            computation={computation}
            taxSummaryRows={taxSummaryRows}
            additionalTaxations={additionalTaxations}
            totalAdditionalTaxAmount={additionalTaxAmount}
            showTaxColumns={showTaxColumns}
            showTypeDetailsFeature={showTypeDetailsFeature}
            showAdditionalTaxationFeature={showAdditionalTaxationFeature}
            showHeaderSchemeToggle={showHeaderSchemeToggle}
            showHeaderBizomField={showHeaderBizomField}
            showHeaderInterStateToggle={showHeaderInterStateToggle}
            showTextileJobworkFields={showTextileJobworkFields}
            transportFeatureAvailable={transportFeatureAvailable}
            showTransporterField={showTransporterField}
            requireTransporterWhenApplied={requireTransporterWhenApplied}
            dryCheckRequired={dryCheckRequired}
            salesmanFeatureAvailable={salesmanFeatureAvailable}
            secondarySalesmanFeatureAvailable={secondarySalesmanFeatureAvailable}
            transportDraft={transportDraft}
            transportFreightTaxRate={transportFreightTaxRate}
            transportFreightTaxAmount={transportFreightTaxAmount}
            transportFreightTotalAmount={transportFreightTotalAmount}
            typeDetails={typeDetails}
            typeDetailOptionsByType={typeDetailOptionsByType}
            typeDetailTypeNameById={typeDetailTypeNameById}
            typeDetailOptionsLoading={typeDetailOptionsLoading}
            headerErrors={validation.headerErrors}
            lineErrorsByKey={lineErrorsByKey}
            canSave={canSave}
            hasPreservedDetails={hasPreservedDetails}
            preservedDetails={preservedDetails}
            loyaltySummary={loyaltySummary}
            loyaltySummaryLoading={loyaltySummaryLoading}
            loyaltySummaryError={loyaltySummaryError}
            giftCertificateOptions={giftCertificateOptions}
            giftCertificatesLoading={giftCertificatesLoading}
            giftCertificatesError={giftCertificatesError}
            loyaltyAppliedAmount={loyaltyAppliedAmount}
            giftCertificateAppliedAmount={giftCertificateAppliedAmount}
            settlementAppliedAmount={settlementAppliedAmount}
            settlementBalanceAmount={settlementBalanceAmount}
            settlementExceedsInvoice={settlementExceedsInvoice}
            registerIncludesProductNames={registerIncludesProductNames}
            registerItemSummaryByInvoiceId={registerItemSummaryByInvoiceId}
            registerItemSummaryLoadingByInvoiceId={registerItemSummaryLoadingByInvoiceId}
            registerItemSummaryErrorByInvoiceId={registerItemSummaryErrorByInvoiceId}
            registerActionNotice={registerActionNotice}
            sendingDueSmsInvoiceId={sendingDueSmsInvoiceId}
            sendingWhatsAppInvoiceId={sendingWhatsAppInvoiceId}
            legacyActionNotice={legacyActionNotice}
            legacyActionFlags={legacyActionFlags}
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
            onRefresh={refreshSaleInvoices}
            onOpenNew={openNew}
            onOpenEdit={openEdit}
            onDeleteInvoice={deleteInvoice}
            onSendDueSms={sendDueSms}
            onSendInvoiceWhatsApp={sendInvoiceWhatsApp}
            onLoadRegisterItemSummary={loadRegisterItemSummary}
            onCancelEntry={cancelEntry}
            onHeaderChange={changeHeader}
            onSelectProduct={selectProduct}
            onSelectMrp={selectLineMrp}
            onLineChange={changeLine}
            onDeleteLine={deleteLine}
            onDuplicateLine={duplicateLine}
            onAddLine={addLine}
            onOpenTypeDetailsForItem={openTypeDetailsForItem}
            onAddTypeDetail={addTypeDetail}
            onChangeTypeDetail={changeTypeDetail}
            onDeleteTypeDetail={deleteTypeDetail}
            onAddAdditionalTaxation={addAdditionalTaxation}
            onChangeAdditionalTaxation={changeAdditionalTaxation}
            onDeleteAdditionalTaxation={deleteAdditionalTaxation}
            onTransportDraftChange={changeTransportDraft}
            onApplyTransportCharges={applyTransportCharges}
            onClearTransportCharges={clearTransportCharges}
            onApplyLoyaltyApplication={applyLoyaltyApplication}
            onChangeLoyaltyApplication={changeLoyaltyApplication}
            onClearLoyaltyApplication={clearLoyaltyApplication}
            onAddGiftCertificateApplication={addGiftCertificateApplication}
            onSelectGiftCertificate={selectGiftCertificateApplication}
            onChangeGiftCertificateApplication={changeGiftCertificateApplication}
            onDeleteGiftCertificateApplication={deleteGiftCertificateApplication}
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
        />
    );
}






















