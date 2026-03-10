'use client';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Column } from 'primereact/column';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { Tag } from 'primereact/tag';
import { TabPanel, TabView } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchInventoryMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
    getMasterActionDeniedDetail,
    isMasterActionAllowed,
    type MasterAction,
    useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';
import {
    confirmMasterDialogClose,
    focusElementByIdNextFrame,
    getMasterSaveButtonLabel
} from '@/lib/masterFormDialog';
import { MASTER_DETAIL_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';
import { ProductBasicDetailsTab } from './components/ProductBasicDetailsTab';
import { ProductOfferBatchSmsDialog } from './components/ProductOfferBatchSmsDialog';
import { ProductOfferSmsDialog } from './components/ProductOfferSmsDialog';
import { ProductUnitsTaxesTab } from './components/ProductUnitsTaxesTab';
import { isValidDateText } from './productFormDate';
import { getProductTaxFieldId, getProductUnitFieldId } from './productFormNavigation';
import type {
    FormState,
    ProductAttributeOption,
    ProductAttributeSelectionDraft,
    SalesTaxDraft,
    UnitDraft
} from './productFormTypes';

interface ProductRow {
    productId: number;
    name: string | null;
    code: string | null;
    productGroupId: number | null;
    productBrandId: number | null;
    productAttributeTypeId: number | null;
    hsnCodeId: number | null;
    openingQty: number | null;
    landingCost: number | null;
    remarks: string | null;
    isActiveFlag: number | null;
    showOnlyInTransportFlag: number | null;
}

interface ProductUnitRow {
    productUnitId?: number;
    unitId: number | null;
    equalUnitId: number | null;
    quantity: number | null;
    effectiveDateText: string | null;
}

interface ProductSalesTaxRow {
    productSalesTaxId?: number;
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
    margin: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    beforeVatRate2: number | null;
    effectiveDateText: string | null;
    isActiveFlag: number | null;
}

interface ProductAttributeSelectionRow {
    productAttributeSelectionId?: number;
    productAttributeId: number;
    productAttributeTypeId: number | null;
    detail: string | null;
    isSelectedFlag: number | null;
    orderNo: number | null;
}

interface ProductOfferSmsResult {
    productId: number;
    productName: string | null;
    bindingKey: string;
    id: string;
    status: string;
    duplicate: boolean;
    providerMessageId: string | null;
    note: string | null;
    recipientPhone: string;
    recipientName: string | null;
    templateKey: string | null;
}

interface ProductOfferBatchSmsResult {
    productId: number;
    productName: string | null;
    bindingKey: string;
    maxRecipients: number;
    totalMappedLedgers: number;
    eligibleRecipients: number;
    sentCount: number;
    duplicateCount: number;
    skippedCount: number;
    failedCount: number;
    templateKey: string | null;
}

type ProductStatusFilter = 'all' | 'active' | 'inactive';
type ProductSearchTypeFilter = 0 | 1;

const STATUS_OPTIONS = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' }
] as { label: string; value: ProductStatusFilter }[];
const SEARCH_TYPE_OPTIONS = [
    { label: 'Name / Id', value: 0 },
    { label: 'Detailed', value: 1 }
] as { label: string; value: ProductSearchTypeFilter }[];
const MASTER_LOOKUP_LIMIT = 10000;

const PRODUCTS = gql`
    query Products(
        $search: String
        $limit: Int
        $productBrandId: Int
        $mrp: Float
        $searchType: Int
        $isActiveFlag: Int
    ) {
        products(
            search: $search
            limit: $limit
            productBrandId: $productBrandId
            mrp: $mrp
            searchType: $searchType
            isActiveFlag: $isActiveFlag
        ) {
            productId
            name
            code
            productGroupId
            productBrandId
            productAttributeTypeId
            hsnCodeId
            openingQty
            landingCost
            remarks
            isActiveFlag
            showOnlyInTransportFlag
        }
    }
`;

const PRODUCT_BY_ID = gql`
    query ProductById($productId: Int!) {
        productById(productId: $productId) {
            productId
            name
            code
            productGroupId
            productBrandId
            productAttributeTypeId
            hsnCodeId
            openingQty
            landingCost
            remarks
            isActiveFlag
            showOnlyInTransportFlag
            units {
                productUnitId
                unitId
                equalUnitId
                quantity
                effectiveDateText
            }
            salesTaxes {
                productSalesTaxId
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                mrp
                margin
                sellingRate
                beforeVatRate
                beforeVatRate2
                effectiveDateText
                isActiveFlag
            }
            productAttributes {
                productAttributeSelectionId
                productAttributeId
                productAttributeTypeId
                detail
                isSelectedFlag
                orderNo
            }
        }
    }
`;

const CREATE_PRODUCT = gql`
    mutation CreateProduct(
        $name: String!
        $code: String
        $productGroupId: Int
        $productBrandId: Int
        $productAttributeTypeId: Int
        $hsnCodeId: Int
        $openingQty: Float
        $landingCost: Float
        $remarks: String
        $isActiveFlag: Int
        $showOnlyInTransportFlag: Int
        $units: [ProductUnitInput!]
        $salesTaxes: [ProductSalesTaxInput!]
        $productAttributes: [ProductAttributeSelectionInput!]
    ) {
        createProduct(
            name: $name
            code: $code
            productGroupId: $productGroupId
            productBrandId: $productBrandId
            productAttributeTypeId: $productAttributeTypeId
            hsnCodeId: $hsnCodeId
            openingQty: $openingQty
            landingCost: $landingCost
            remarks: $remarks
            isActiveFlag: $isActiveFlag
            showOnlyInTransportFlag: $showOnlyInTransportFlag
            units: $units
            salesTaxes: $salesTaxes
            productAttributes: $productAttributes
        ) {
            productId
        }
    }
`;

const UPDATE_PRODUCT = gql`
    mutation UpdateProduct(
        $productId: Int!
        $name: String
        $code: String
        $productGroupId: Int
        $productBrandId: Int
        $productAttributeTypeId: Int
        $hsnCodeId: Int
        $openingQty: Float
        $landingCost: Float
        $remarks: String
        $isActiveFlag: Int
        $showOnlyInTransportFlag: Int
        $units: [ProductUnitInput!]
        $salesTaxes: [ProductSalesTaxInput!]
        $productAttributes: [ProductAttributeSelectionInput!]
    ) {
        updateProduct(
            productId: $productId
            name: $name
            code: $code
            productGroupId: $productGroupId
            productBrandId: $productBrandId
            productAttributeTypeId: $productAttributeTypeId
            hsnCodeId: $hsnCodeId
            openingQty: $openingQty
            landingCost: $landingCost
            remarks: $remarks
            isActiveFlag: $isActiveFlag
            showOnlyInTransportFlag: $showOnlyInTransportFlag
            units: $units
            salesTaxes: $salesTaxes
            productAttributes: $productAttributes
        ) {
            productId
        }
    }
`;

const DELETE_PRODUCT = gql`
    mutation DeleteProduct($productId: Int!) {
        deleteProduct(productId: $productId)
    }
`;

const SEND_PRODUCT_OFFER_SMS = gql`
    mutation SendProductOfferSms(
        $productId: Int!
        $recipientPhone: String!
        $recipientName: String
        $messageText: String
        $templateKey: String
    ) {
        sendProductOfferSms(
            productId: $productId
            recipientPhone: $recipientPhone
            recipientName: $recipientName
            messageText: $messageText
            templateKey: $templateKey
        ) {
            productId
            productName
            bindingKey
            id
            status
            duplicate
            providerMessageId
            note
            recipientPhone
            recipientName
            templateKey
        }
    }
`;

const SEND_PRODUCT_OFFER_BATCH_SMS = gql`
    mutation SendProductOfferBatchSms(
        $productId: Int!
        $messageText: String
        $templateKey: String
        $maxRecipients: Int
    ) {
        sendProductOfferBatchSms(
            productId: $productId
            messageText: $messageText
            templateKey: $templateKey
            maxRecipients: $maxRecipients
        ) {
            productId
            productName
            bindingKey
            maxRecipients
            totalMappedLedgers
            eligibleRecipients
            sentCount
            duplicateCount
            skippedCount
            failedCount
            templateKey
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

const PRODUCT_ATTRIBUTE_TYPES = gql`
    query ProductAttributeTypes {
        productAttributeTypes {
            productAttributeTypeId
            name
        }
    }
`;

const PRODUCT_ATTRIBUTE_TYPE_BY_ID = gql`
    query ProductAttributeTypeById($productAttributeTypeId: Int!) {
        productAttributeTypeById(productAttributeTypeId: $productAttributeTypeId) {
            productAttributeTypeId
            productAttributes {
                productAttributeId
                detail
            }
        }
    }
`;

const UNITS = gql`
    query Units {
        units {
            unitId
            name
        }
    }
`;

const HSN_CODES = gql`
    query HsnCodes {
        hsnCodes {
            hsnCodeId
            name
            code
        }
    }
`;

const LEDGER_OPTIONS = gql`
    query LedgerOptions($search: String, $limit: Int) {
        ledgerOptions(search: $search, limit: $limit) {
            ledgerId
            name
        }
    }
`;

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

const DEFAULT_FORM: FormState = {
    name: '',
    code: '',
    productGroupId: null,
    productBrandId: null,
    productAttributeTypeId: null,
    hsnCodeId: null,
    openingQty: null,
    landingCost: null,
    remarks: '',
    isActiveFlag: true,
    showOnlyInTransportFlag: false,
    units: [],
    salesTaxes: []
};

const DEFAULT_PRODUCT_OFFER_SMS_FORM = {
    recipientName: '',
    recipientPhone: '',
    messageText: ''
};

const DEFAULT_PRODUCT_OFFER_BATCH_SMS_FORM = {
    maxRecipients: 25,
    messageText: ''
};

const flagToBool = (value: number | null | undefined, defaultValue = false) => {
    if (value == null) return defaultValue;
    return Number(value || 0) === 1;
};
const boolToFlag = (value: boolean) => (value ? 1 : 0);

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export default function InventoryProductsPage() {
    const productGroupInputId = 'product-group-input';
    const productBrandInputId = 'product-brand-input';
    const productCodeInputId = 'product-code-input';
    const productNameInputId = 'product-name-input';
    const productHsnInputId = 'product-hsn-input';
    const productOpeningQtyInputId = 'product-opening-qty-input';
    const productLandingCostInputId = 'product-landing-cost-input';
    const productRemarksInputId = 'product-remarks-input';
    const productTransportOnlyInputId = 'product-transport-only-input';
    const productActiveInputId = 'product-active-input';
    const productAttributeTypeInputId = 'product-attribute-type-input';
    const productAttributeDetailInputId = 'product-attribute-detail-input';
    const productAttributeAddButtonId = 'product-attribute-add-button';
    const productSaveButtonId = 'product-save-button';
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const unitKeyRef = useRef(1);
    const taxKeyRef = useRef(1);

    const [search, setSearch] = useState('');
    const [searchType, setSearchType] = useState<ProductSearchTypeFilter>(1);
    const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('active');
    const [productBrandFilterId, setProductBrandFilterId] = useState<number | null>(null);
    const [mrpFilter, setMrpFilter] = useState<number | null>(null);
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductRow | null>(null);
    const [detailsLoaded, setDetailsLoaded] = useState(true);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [productOfferDialogVisible, setProductOfferDialogVisible] = useState(false);
    const [productOfferSending, setProductOfferSending] = useState(false);
    const [productOfferRow, setProductOfferRow] = useState<ProductRow | null>(null);
    const [productOfferForm, setProductOfferForm] = useState(DEFAULT_PRODUCT_OFFER_SMS_FORM);
    const [productOfferBatchDialogVisible, setProductOfferBatchDialogVisible] = useState(false);
    const [productOfferBatchSending, setProductOfferBatchSending] = useState(false);
    const [productOfferBatchRow, setProductOfferBatchRow] = useState<ProductRow | null>(null);
    const [productOfferBatchForm, setProductOfferBatchForm] = useState(DEFAULT_PRODUCT_OFFER_BATCH_SMS_FORM);

    const [dryEditDigest, setDryEditDigest] = useState('');
    const [productAttributeOptions, setProductAttributeOptions] = useState<ProductAttributeOption[]>([]);
    const [productAttributeSelections, setProductAttributeSelections] = useState<ProductAttributeSelectionDraft[]>([]);
    const [attributeToAdd, setAttributeToAdd] = useState<number | null>(null);
    const [initialFormSnapshot, setInitialFormSnapshot] = useState('');

    const clearFormError = (key: string) => {
        setFormErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const { data, loading, error, refetch } = useQuery(PRODUCTS, {
        client: inventoryApolloClient,
        variables: {
            search: search.trim() || null,
            limit,
            productBrandId: productBrandFilterId,
            mrp: mrpFilter,
            searchType,
            isActiveFlag: statusFilter === 'all' ? null : statusFilter === 'active' ? 1 : 0
        }
    });
    const [loadProduct, { data: productData, loading: productLoading, error: productError }] = useLazyQuery(
        PRODUCT_BY_ID,
        { client: inventoryApolloClient, fetchPolicy: 'network-only', notifyOnNetworkStatusChange: true }
    );
    const [
        loadProductAttributeOptions,
        { loading: attributeOptionsLoading, error: attributeOptionsError }
    ] = useLazyQuery(PRODUCT_ATTRIBUTE_TYPE_BY_ID, {
        client: inventoryApolloClient,
        fetchPolicy: 'network-only'
    });
    const [createProduct] = useMutation(CREATE_PRODUCT, { client: inventoryApolloClient });
    const [updateProduct] = useMutation(UPDATE_PRODUCT, { client: inventoryApolloClient });
    const [deleteProduct] = useMutation(DELETE_PRODUCT, { client: inventoryApolloClient });
    const [sendProductOfferSmsMutation] = useMutation<{ sendProductOfferSms: ProductOfferSmsResult }>(SEND_PRODUCT_OFFER_SMS, {
        client: inventoryApolloClient
    });
    const [sendProductOfferBatchSmsMutation] = useMutation<{ sendProductOfferBatchSms: ProductOfferBatchSmsResult }>(SEND_PRODUCT_OFFER_BATCH_SMS, {
        client: inventoryApolloClient
    });
    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const { data: productGroupsData } = useQuery(PRODUCT_GROUPS, { client: inventoryApolloClient });
    const { data: productBrandsData } = useQuery(PRODUCT_BRANDS, { client: inventoryApolloClient });
    const { data: productAttributeTypesData } = useQuery(PRODUCT_ATTRIBUTE_TYPES, { client: inventoryApolloClient });
    const { data: unitsData } = useQuery(UNITS, { client: inventoryApolloClient });
    const { data: hsnCodesData } = useQuery(HSN_CODES, { client: inventoryApolloClient });
    const { data: ledgerOptionsData, error: ledgerOptionsError } = useQuery(LEDGER_OPTIONS, {
        client: apolloClient,
        variables: { limit: MASTER_LOOKUP_LIMIT },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows: ProductRow[] = useMemo(() => data?.products ?? [], [data]);
    const formSnapshot = useMemo(
        () =>
            JSON.stringify({
                form,
                productAttributeSelections: productAttributeSelections.map((entry) => ({
                    productAttributeId: entry.productAttributeId,
                    orderNo: entry.orderNo ?? null
                }))
            }),
        [form, productAttributeSelections]
    );
    const isFormDirty = useMemo(() => formSnapshot !== initialFormSnapshot, [formSnapshot, initialFormSnapshot]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
    const isDryEditReady = useMemo(
        () => Boolean(editing && dryEditDigest && dryEditDigest === formSnapshot),
        [dryEditDigest, editing, formSnapshot]
    );
    const saveButtonLabel = useMemo(
        () => getMasterSaveButtonLabel(Boolean(editing), saving, isDryEditReady),
        [editing, isDryEditReady, saving]
    );

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };

    const closeDialog = () => {
        confirmMasterDialogClose({
            saving,
            isDirty: isFormDirty,
            onDiscard: () => {
                setDialogVisible(false);
                setFormErrors({});
            }
        });
    };

    const closeProductOfferDialog = () => {
        setProductOfferDialogVisible(false);
        setProductOfferRow(null);
        setProductOfferForm(DEFAULT_PRODUCT_OFFER_SMS_FORM);
    };

    const closeProductOfferBatchDialog = () => {
        setProductOfferBatchDialogVisible(false);
        setProductOfferBatchRow(null);
        setProductOfferBatchForm(DEFAULT_PRODUCT_OFFER_BATCH_SMS_FORM);
    };

    const openProductOfferDialog = (row: ProductRow) => {
        if (!assertActionAllowed('edit')) return;
        setProductOfferRow(row);
        setProductOfferForm(DEFAULT_PRODUCT_OFFER_SMS_FORM);
        setProductOfferDialogVisible(true);
    };

    const openProductOfferBatchDialog = (row: ProductRow) => {
        if (!assertActionAllowed('edit')) return;
        if (!row.productBrandId) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Brand Required',
                detail: 'Assign a product brand and brand ledgers before sending a batch product-offer SMS.'
            });
            return;
        }
        setProductOfferBatchRow(row);
        setProductOfferBatchForm(DEFAULT_PRODUCT_OFFER_BATCH_SMS_FORM);
        setProductOfferBatchDialogVisible(true);
    };

    const sendProductOfferSms = async () => {
        if (!productOfferRow) return;
        const recipientPhone = productOfferForm.recipientPhone.trim();
        if (!recipientPhone) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Recipient Required',
                detail: 'Enter a recipient phone number before sending the product offer SMS.'
            });
            return;
        }

        setProductOfferSending(true);
        try {
            const response = await sendProductOfferSmsMutation({
                variables: {
                    productId: productOfferRow.productId,
                    recipientPhone,
                    recipientName: toOptionalText(productOfferForm.recipientName),
                    messageText: toOptionalText(productOfferForm.messageText),
                    templateKey: null
                }
            });
            const result = response.data?.sendProductOfferSms;
            if (!result) throw new Error('Product offer SMS was not returned by the server.');
            closeProductOfferDialog();
            toastRef.current?.show({
                severity: result.duplicate ? 'warn' : 'success',
                summary: result.duplicate ? 'Duplicate Offer' : 'Offer Sent',
                detail:
                    result.note ??
                    (result.duplicate
                        ? `A recent product offer SMS already exists for ${result.recipientPhone}.`
                        : `Product offer SMS ${result.status} for ${result.recipientPhone}.`)
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Send Failed',
                detail: e?.message ?? 'Failed to send product offer SMS.'
            });
        } finally {
            setProductOfferSending(false);
        }
    };

    const sendProductOfferBatchSms = async () => {
        if (!productOfferBatchRow) return;

        setProductOfferBatchSending(true);
        try {
            const response = await sendProductOfferBatchSmsMutation({
                variables: {
                    productId: productOfferBatchRow.productId,
                    messageText: toOptionalText(productOfferBatchForm.messageText),
                    templateKey: null,
                    maxRecipients: productOfferBatchForm.maxRecipients
                }
            });
            const result = response.data?.sendProductOfferBatchSms;
            if (!result) throw new Error('Batch product offer SMS result was not returned by the server.');
            closeProductOfferBatchDialog();

            const detail = `${result.sentCount} sent, ${result.duplicateCount} duplicate, ${result.skippedCount} skipped, ${result.failedCount} failed across ${result.totalMappedLedgers} mapped ledgers. Eligible ${result.eligibleRecipients}, cap ${result.maxRecipients}.`;
            toastRef.current?.show({
                severity: result.sentCount > 0 ? 'success' : 'warn',
                summary: result.sentCount > 0 ? 'Batch Offer Sent' : 'No Eligible Recipients',
                detail
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Batch Send Failed',
                detail: e?.message ?? 'Failed to send batch product offer SMS.'
            });
        } finally {
            setProductOfferBatchSending(false);
        }
    };

    const productGroups = useMemo(() => productGroupsData?.productGroups ?? [], [productGroupsData]);
    const productBrands = useMemo(() => productBrandsData?.productBrands ?? [], [productBrandsData]);
    const productAttributeTypes = useMemo(() => productAttributeTypesData?.productAttributeTypes ?? [], [productAttributeTypesData]);
    const units = useMemo(() => unitsData?.units ?? [], [unitsData]);
    const hsnCodes = useMemo(() => hsnCodesData?.hsnCodes ?? [], [hsnCodesData]);
    const ledgerOptions = useMemo(() => ledgerOptionsData?.ledgerOptions ?? [], [ledgerOptionsData]);
    const unitDropdownOptions = useMemo(
        () =>
            units.map((unit: { unitId: number; name: string | null }) => ({
                label: unit.name?.trim() || `#${unit.unitId}`,
                value: unit.unitId
            })),
        [units]
    );
    const ledgerDropdownOptions = useMemo(
        () =>
            ledgerOptions.map((ledger: { ledgerId: number; name: string | null }) => ({
                label: ledger.name?.trim() || `Ledger #${ledger.ledgerId}`,
                value: ledger.ledgerId
            })),
        [ledgerOptions]
    );
    const gridDropdownAppendTo = useMemo<HTMLElement | 'self'>(
        () => (typeof document !== 'undefined' ? document.body : 'self'),
        []
    );

    const productGroupMap = useMemo(() => {
        const map = new Map<number, string>();
        productGroups.forEach((group: { productGroupId: number; name: string | null }) => {
            map.set(group.productGroupId, group.name ?? `#${group.productGroupId}`);
        });
        return map;
    }, [productGroups]);
    const productBrandMap = useMemo(() => {
        const map = new Map<number, string>();
        productBrands.forEach((brand: { productBrandId: number; name: string | null }) => {
            map.set(brand.productBrandId, brand.name ?? `#${brand.productBrandId}`);
        });
        return map;
    }, [productBrands]);
    const productBrandFilterOptions = useMemo(
        () =>
            productBrands.map((brand: { productBrandId: number; name: string | null }) => ({
                label: brand.name?.trim() || `#${brand.productBrandId}`,
                value: brand.productBrandId
            })),
        [productBrands]
    );
    const productAttributeTypeMap = useMemo(() => {
        const map = new Map<number, string>();
        productAttributeTypes.forEach((type: { productAttributeTypeId: number; name: string | null }) => {
            map.set(type.productAttributeTypeId, type.name ?? `#${type.productAttributeTypeId}`);
        });
        return map;
    }, [productAttributeTypes]);
    const hsnMap = useMemo(() => {
        const map = new Map<number, string>();
        hsnCodes.forEach((hsn: { hsnCodeId: number; name: string | null; code: string | null }) => {
            const label = hsn.code?.trim() || hsn.name?.trim() || '';
            map.set(hsn.hsnCodeId, label || `#${hsn.hsnCodeId}`);
        });
        return map;
    }, [hsnCodes]);
    const productAttributeOptionMap = useMemo(() => {
        const map = new Map<number, string | null>();
        productAttributeOptions.forEach((option) => {
            map.set(option.productAttributeId, option.detail ?? null);
        });
        return map;
    }, [productAttributeOptions]);
    const selectedAttributeIds = useMemo(() => {
        return new Set(
            productAttributeSelections.map((entry) => entry.productAttributeId)
        );
    }, [productAttributeSelections]);
    const availableAttributeOptions = useMemo(() => {
        return productAttributeOptions.filter((option) => !selectedAttributeIds.has(option.productAttributeId));
    }, [productAttributeOptions, selectedAttributeIds]);

    useEffect(() => {
        if (attributeToAdd == null) return;
        const stillAvailable = availableAttributeOptions.some((option) => option.productAttributeId === attributeToAdd);
        if (!stillAvailable) setAttributeToAdd(null);
    }, [attributeToAdd, availableAttributeOptions]);

    const productAttributeRows = useMemo<ProductAttributeSelectionDraft[]>(() => {
        return productAttributeSelections;
    }, [productAttributeSelections]);

    const createUnitDraft = (row?: ProductUnitRow): UnitDraft => {
        const key = unitKeyRef.current++;
        return {
            key,
            unitId: row?.unitId ?? null,
            equalUnitId: row?.equalUnitId ?? null,
            quantity: row?.quantity ?? null,
            effectiveDateText: row?.effectiveDateText ?? ''
        };
    };

    const createTaxDraft = (row?: ProductSalesTaxRow): SalesTaxDraft => {
        const key = taxKeyRef.current++;
        return {
            key,
            ledgerTaxId: row?.ledgerTaxId ?? null,
            ledgerTax2Id: row?.ledgerTax2Id ?? null,
            ledgerTax3Id: row?.ledgerTax3Id ?? null,
            mrp: row?.mrp ?? null,
            margin: row?.margin ?? null,
            sellingRate: row?.sellingRate ?? null,
            beforeVatRate: row?.beforeVatRate ?? null,
            beforeVatRate2: row?.beforeVatRate2 ?? null,
            effectiveDateText: row?.effectiveDateText ?? '',
            isActiveFlag: flagToBool(row?.isActiveFlag, true)
        };
    };

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setProductAttributeOptions([]);
        setProductAttributeSelections([]);
        setAttributeToAdd(null);
        setDetailsLoaded(true);
        setDialogVisible(true);
    };

    const openEdit = (row: ProductRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setDetailsLoaded(false);
        setForm({
            name: row.name ?? '',
            code: row.code ?? '',
            productGroupId: row.productGroupId ?? null,
            productBrandId: row.productBrandId ?? null,
            productAttributeTypeId: row.productAttributeTypeId ?? null,
            hsnCodeId: row.hsnCodeId ?? null,
            openingQty: row.openingQty ?? null,
            landingCost: row.landingCost ?? null,
            remarks: row.remarks ?? '',
            isActiveFlag: flagToBool(row.isActiveFlag, true),
            showOnlyInTransportFlag: flagToBool(row.showOnlyInTransportFlag, false),
            units: [],
            salesTaxes: []
        });
        setFormErrors({});
        setProductAttributeOptions([]);
        setProductAttributeSelections([]);
        setAttributeToAdd(null);
        setDialogVisible(true);
    };

    const openView = (row: ProductRow) => {
        if (!assertActionAllowed('view')) return;
        setDetailRow(row);
        setDetailVisible(true);
    };

    const navigateEditRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, editingIndex, direction);
        if (!nextRow) return;
        openEdit(nextRow);
    };

    const navigateDetailRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, detailIndex, direction);
        if (!nextRow) return;
        openView(nextRow);
    };

    useEffect(() => {
        if (!dialogVisible || !editing) return;
        loadProduct({ variables: { productId: editing.productId } });
    }, [dialogVisible, editing, loadProduct]);

    useEffect(() => {
        if (!productData?.productById || !editing) return;
        if (Number(editing.productId) !== Number(productData.productById.productId)) return;

        const detailRow = productData.productById;
        const productAttributeTypeId = detailRow.productAttributeTypeId ?? null;
        const unitsDrafts = (detailRow.units ?? []).map((unit: ProductUnitRow) => createUnitDraft(unit));
        const taxDrafts = (detailRow.salesTaxes ?? []).map((tax: ProductSalesTaxRow) => createTaxDraft(tax));
        const detailSelections = (detailRow.productAttributes ?? [])
            .filter((detail: ProductAttributeSelectionRow) => detail.isSelectedFlag == null || detail.isSelectedFlag === 1)
            .map((detail: ProductAttributeSelectionRow, index) => ({
                productAttributeId: detail.productAttributeId,
                detail: detail.detail ?? null,
                orderNo: detail.orderNo ?? index + 1
            }))
            .sort((a, b) => {
                const orderA = a.orderNo ?? Number.MAX_SAFE_INTEGER;
                const orderB = b.orderNo ?? Number.MAX_SAFE_INTEGER;
                if (orderA !== orderB) return orderA - orderB;
                return a.productAttributeId - b.productAttributeId;
            });

        const nextForm: FormState = {
            name: detailRow.name ?? '',
            code: detailRow.code ?? '',
            productGroupId: detailRow.productGroupId ?? null,
            productBrandId: detailRow.productBrandId ?? null,
            productAttributeTypeId,
            hsnCodeId: detailRow.hsnCodeId ?? null,
            openingQty: detailRow.openingQty ?? null,
            landingCost: detailRow.landingCost ?? null,
            remarks: detailRow.remarks ?? '',
            isActiveFlag: flagToBool(detailRow.isActiveFlag, true),
            showOnlyInTransportFlag: flagToBool(detailRow.showOnlyInTransportFlag, false),
            units: unitsDrafts,
            salesTaxes: taxDrafts
        };
        setForm(nextForm);
        setProductAttributeSelections(detailSelections);
        setInitialFormSnapshot(
            JSON.stringify({
                form: nextForm,
                productAttributeSelections: detailSelections.map((entry) => ({
                    productAttributeId: entry.productAttributeId,
                    orderNo: entry.orderNo ?? null
                }))
            })
        );
        setAttributeToAdd(null);
        setDetailsLoaded(true);

        if (productAttributeTypeId) {
            loadProductAttributeOptions({ variables: { productAttributeTypeId } }).then((response) => {
                const options = response.data?.productAttributeTypeById?.productAttributes ?? [];
                setProductAttributeOptions(options);
                const detailMap = new Map<number, string | null>();
                options.forEach((option: ProductAttributeOption) => {
                    detailMap.set(option.productAttributeId, option.detail ?? null);
                });
                setProductAttributeSelections((prev) =>
                    prev.map((entry) => ({
                        ...entry,
                        detail: detailMap.get(entry.productAttributeId) ?? entry.detail
                    }))
                );
            });
        } else {
            setProductAttributeOptions([]);
        }
    }, [productData, editing, loadProductAttributeOptions]);

    const handleProductAttributeTypeChange = async (value: number | null) => {
        setForm((prev) => ({ ...prev, productAttributeTypeId: value }));
        setProductAttributeSelections([]);
        setProductAttributeOptions([]);
        setAttributeToAdd(null);
        if (!value) {
            return;
        }
        const response = await loadProductAttributeOptions({ variables: { productAttributeTypeId: value } });
        const options = response.data?.productAttributeTypeById?.productAttributes ?? [];
        setProductAttributeOptions(options);
    };

    const addProductAttributeDetail = () => {
        if (!attributeToAdd) return;
        setProductAttributeSelections((prev) => {
            if (prev.some((entry) => entry.productAttributeId === attributeToAdd)) return prev;
            const detail = productAttributeOptionMap.get(attributeToAdd) ?? null;
            return [
                ...prev,
                {
                    productAttributeId: attributeToAdd,
                    detail,
                    orderNo: prev.length + 1
                }
            ];
        });
        setAttributeToAdd(null);
    };

    const removeProductAttributeDetail = (productAttributeId: number) => {
        setProductAttributeSelections((prev) =>
            prev
                .filter((entry) => entry.productAttributeId !== productAttributeId)
                .map((entry, index) => ({ ...entry, orderNo: index + 1 }))
        );
    };

    const handleAttributeReorder = (event: { value: ProductAttributeSelectionDraft[] }) => {
        const reordered = event.value.map((entry, index) => ({
            ...entry,
            orderNo: index + 1
        }));
        setProductAttributeSelections(reordered);
    };

    const addUnit = () => {
        const nextUnit = createUnitDraft();
        setForm((prev) => ({ ...prev, units: [...prev.units, nextUnit] }));
        focusElementByIdNextFrame(getProductUnitFieldId(nextUnit.key, 'unit'));
    };

    const updateUnit = (key: number, updates: Partial<UnitDraft>) => {
        setForm((prev) => ({
            ...prev,
            units: prev.units.map((unit) => (unit.key === key ? { ...unit, ...updates } : unit))
        }));
    };

    const removeUnit = (key: number) => {
        setForm((prev) => ({ ...prev, units: prev.units.filter((unit) => unit.key !== key) }));
    };

    const addTax = () => {
        const nextTax = createTaxDraft();
        setForm((prev) => ({ ...prev, salesTaxes: [...prev.salesTaxes, nextTax] }));
        focusElementByIdNextFrame(getProductTaxFieldId(nextTax.key, 'ledger-tax'));
    };

    const updateTax = (key: number, updates: Partial<SalesTaxDraft>) => {
        setForm((prev) => ({
            ...prev,
            salesTaxes: prev.salesTaxes.map((tax) => (tax.key === key ? { ...tax, ...updates } : tax))
        }));
    };

    const removeTax = (key: number) => {
        setForm((prev) => ({ ...prev, salesTaxes: prev.salesTaxes.filter((tax) => tax.key !== key) }));
    };

    const save = async () => {
        if (!assertActionAllowed(editing ? 'edit' : 'add')) return;
        if (editing && !detailsLoaded) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Please wait',
                detail: 'Product details are still loading.'
            });
            return;
        }
        const parsed = formSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                if (issue.path[0]) nextErrors[String(issue.path[0])] = issue.message;
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            focusElementByIdNextFrame(productNameInputId);
            return;
        }
        const nextErrors: Record<string, string> = {};
        form.units.forEach((unit) => {
            if (!unit.effectiveDateText || isValidDateText(unit.effectiveDateText)) return;
            nextErrors[`units.${unit.key}.effectiveDateText`] = 'Invalid date';
        });
        form.salesTaxes.forEach((tax) => {
            if (!tax.effectiveDateText || isValidDateText(tax.effectiveDateText)) return;
            nextErrors[`salesTaxes.${tax.key}.effectiveDateText`] = 'Invalid date';
        });
        if (Object.keys(nextErrors).length > 0) {
            setFormErrors((prev) => ({ ...prev, ...nextErrors }));
            toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            return;
        }

        if (!ensureDryEditCheck({
            isEditing: Boolean(editing),
            lastDigest: dryEditDigest,
            currentDigest: formSnapshot,
            setLastDigest: setDryEditDigest,
            toastRef,
            entityLabel: 'record'
        })) return;

        setSaving(true);
        try {
            const unitPayload = form.units
                .filter((unit) => typeof unit.unitId === 'number')
                .map((unit) => ({
                    unitId: unit.unitId as number,
                    equalUnitId: unit.equalUnitId,
                    quantity: unit.quantity,
                    effectiveDateText: toOptionalText(unit.effectiveDateText)
                }));

            const taxPayload = form.salesTaxes
                .filter((tax) => typeof tax.ledgerTaxId === 'number')
                .map((tax) => ({
                    ledgerTaxId: tax.ledgerTaxId as number,
                    ledgerTax2Id: tax.ledgerTax2Id,
                    ledgerTax3Id: tax.ledgerTax3Id,
                    mrp: tax.mrp,
                    margin: tax.margin,
                    sellingRate: tax.sellingRate,
                    beforeVatRate: tax.beforeVatRate,
                    beforeVatRate2: tax.beforeVatRate2,
                    effectiveDateText: toOptionalText(tax.effectiveDateText),
                    isActiveFlag: boolToFlag(tax.isActiveFlag)
                }));

            const productAttributePayload = productAttributeSelections.map((entry, index) => ({
                productAttributeId: entry.productAttributeId,
                productAttributeTypeId: form.productAttributeTypeId,
                isSelectedFlag: 1,
                orderNo: index + 1
            }));

            const variables = {
                name: form.name.trim(),
                code: toOptionalText(form.code),
                productGroupId: form.productGroupId,
                productBrandId: form.productBrandId,
                productAttributeTypeId: form.productAttributeTypeId,
                hsnCodeId: form.hsnCodeId,
                openingQty: form.openingQty,
                landingCost: form.landingCost,
                remarks: toOptionalText(form.remarks),
                isActiveFlag: boolToFlag(form.isActiveFlag),
                showOnlyInTransportFlag: boolToFlag(form.showOnlyInTransportFlag),
                units: unitPayload.length > 0 ? unitPayload : [],
                salesTaxes: taxPayload.length > 0 ? taxPayload : [],
                productAttributes: productAttributePayload as Array<{
                    productAttributeId: number;
                    productAttributeTypeId: number | null;
                    isSelectedFlag: number;
                    orderNo: number | null;
                }>
            };

            if (editing) {
                await updateProduct({
                    variables: {
                        productId: editing.productId,
                        ...variables
                    }
                });
            } else {
                await createProduct({ variables });
            }

            await refetch();
            setInitialFormSnapshot(formSnapshot);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Product saved.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Save failed.'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (productId: number) => {
        try {
            await deleteProduct({ variables: { productId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Product deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'product')
            });
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: ProductRow) => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('PRODUCT', row.productId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('product', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('product')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.productId)
        });
    };

    const statusBody = (row: ProductRow) => {
        const active = flagToBool(row.isActiveFlag, true);
        return <Tag value={active ? 'Active' : 'Inactive'} severity={active ? 'success' : 'danger'} />;
    };

    const groupBody = (row: ProductRow) => {
        if (!row.productGroupId) return <span className="text-500">-</span>;
        return productGroupMap.get(row.productGroupId) ?? row.productGroupId;
    };

    const brandBody = (row: ProductRow) => {
        if (!row.productBrandId) return <span className="text-500">-</span>;
        return productBrandMap.get(row.productBrandId) ?? row.productBrandId;
    };

    const typeBody = (row: ProductRow) => {
        if (!row.productAttributeTypeId) return <span className="text-500">-</span>;
        return productAttributeTypeMap.get(row.productAttributeTypeId) ?? row.productAttributeTypeId;
    };

    const hsnBody = (row: ProductRow) => {
        if (!row.hsnCodeId) return <span className="text-500">-</span>;
        return hsnMap.get(row.hsnCodeId) ?? row.hsnCodeId;
    };

    const actionsBody = (row: ProductRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-send" className="p-button-text" onClick={() => openProductOfferDialog(row)} aria-label="Send product offer SMS" disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-megaphone" className="p-button-text" onClick={() => openProductOfferBatchDialog(row)} aria-label="Send batch product offer SMS" disabled={!masterPermissions.canEdit || !row.productBrandId} />
            <Button icon="pi pi-barcode" className="p-button-text" onClick={() => navigate(`/apps/inventory/barcode?productId=${row.productId}`)} aria-label="Open barcode center" />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );

    const editingName = form.name.trim() || editing?.name?.trim() || '';
    const dialogTitle = editing
        ? editingName
            ? `Edit Product - ${editingName}`
            : 'Edit Product'
        : 'New Product';
    const productOfferLabel = productOfferRow
        ? `${productOfferRow.name?.trim() || `Product #${productOfferRow.productId}`}${productOfferRow.code?.trim() ? ` (${productOfferRow.code.trim()})` : ''}`
        : '';
    const productOfferBatchLabel = productOfferBatchRow
        ? `${productOfferBatchRow.name?.trim() || `Product #${productOfferBatchRow.productId}`}${productOfferBatchRow.code?.trim() ? ` (${productOfferBatchRow.code.trim()})` : ''}`
        : '';

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmDialog />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Products</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product masters with units, taxes, and attribute details.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Product" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('products')} buttonAriaLabel="Open Products help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading products: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="productId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as ProductRow) : openView(e.data as ProductRow))}
                headerLeft={
                    <div className="flex flex-wrap gap-2 align-items-center">
                        <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                            <i className="pi pi-search" />
                            <AppInput
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search product"
                                style={{ width: '100%' }}
                            />
                        </span>
                        <AppDropdown
                            value={statusFilter}
                            options={STATUS_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(e) => setStatusFilter(e.value)}
                            style={{ minWidth: '160px' }}
                        />
                        <AppDropdown
                            value={productBrandFilterId}
                            options={productBrandFilterOptions}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(e) => setProductBrandFilterId(e.value ?? null)}
                            placeholder="All brands"
                            showClear
                            filter
                            style={{ minWidth: '200px' }}
                        />
                        <AppInput inputType="number"
                            value={mrpFilter}
                            onValueChange={(e) =>
                                setMrpFilter(typeof e.value === 'number' ? e.value : null)
                            }
                            placeholder="MRP"
                            useGrouping={false}
                            maxFractionDigits={2}
                            style={{ width: '8rem' }}
                        />
                        <AppDropdown
                            value={searchType}
                            options={SEARCH_TYPE_OPTIONS}
                            optionLabel="label"
                            optionValue="value"
                            onChange={(e) => setSearchType((e.value ?? 1) as ProductSearchTypeFilter)}
                            style={{ minWidth: '120px' }}
                        />
                    </div>
                }
                headerRight={
                    <>
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => refetch()}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={() => window.print()}
                        />
                        <Button
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => dtRef.current?.exportCSV()}
                            disabled={rows.length === 0}
                        />
                        <span className="text-600 text-sm">
                            Showing {rows.length} product{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} product${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="productId" header="Id" sortable style={{ width: '6rem' }} />
                <Column field="name" header="Name" sortable />
                {searchType === 1 && <Column field="code" header="Code" sortable />}
                {searchType === 1 && <Column header="Group" body={groupBody} />}
                {searchType === 1 && <Column header="Brand" body={brandBody} />}
                {searchType === 1 && <Column header="Type" body={typeBody} />}
                {searchType === 1 && <Column header="HSN" body={hsnBody} />}
                <Column header="Status" body={statusBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '18rem' }} />
            </AppDataTable>

            <Dialog
                header={dialogTitle}
                visible={dialogVisible}
                style={{ width: 'min(960px, 96vw)' }}
                onShow={() => {
                    setInitialFormSnapshot(formSnapshot);
                    focusElementByIdNextFrame(productGroupInputId);
                }}
                onHide={closeDialog}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{
                            checked: isBulkMode,
                            onChange: setIsBulkMode,
                            onLabel: 'Bulk',
                            offLabel: 'Standard',
                            disabled: saving
                        }}
                        onCancel={closeDialog}
                        cancelDisabled={saving}
                        onSave={save}
                        saveDisabled={saving || Boolean(editing && !detailsLoaded) || !isFormDirty}
                        saveLabel={saveButtonLabel}
                        saveButtonId={productSaveButtonId}
                    />
                }
            >
                <div className="flex flex-column gap-3">
                    {editing && (
                        <div
                            className={`p-2 border-round text-sm ${
                                isDryEditReady ? 'surface-100 text-green-700' : 'surface-100 text-700'
                            }`}
                        >
                            {isDryEditReady
                                ? 'Dry check passed. Click Apply Changes to save.'
                                : 'Dry save flow: first click runs dry check, second click saves changes.'}
                        </div>
                    )}
                    {productLoading && <div className="text-500">Loading product details...</div>}
                    {productError && <div className="text-red-500">Error: {productError.message}</div>}
                    <TabView>
                        <TabPanel header="Basic Details">
                            <ProductBasicDetailsTab
                                form={form}
                                formErrors={formErrors}
                                productGroups={productGroups}
                                productBrands={productBrands}
                                hsnCodes={hsnCodes}
                                productAttributeTypes={productAttributeTypes}
                                productAttributeRows={productAttributeRows}
                                productAttributeOptionMap={productAttributeOptionMap}
                                availableAttributeOptions={availableAttributeOptions}
                                attributeToAdd={attributeToAdd}
                                attributeOptionsLoading={attributeOptionsLoading}
                                attributeOptionsErrorMessage={attributeOptionsError?.message ?? null}
                                fieldIds={{
                                    productGroup: productGroupInputId,
                                    productBrand: productBrandInputId,
                                    productCode: productCodeInputId,
                                    productName: productNameInputId,
                                    productHsn: productHsnInputId,
                                    productOpeningQty: productOpeningQtyInputId,
                                    productLandingCost: productLandingCostInputId,
                                    productRemarks: productRemarksInputId,
                                    productTransportOnly: productTransportOnlyInputId,
                                    productActive: productActiveInputId,
                                    productAttributeType: productAttributeTypeInputId,
                                    productAttributeDetail: productAttributeDetailInputId,
                                    productAttributeAdd: productAttributeAddButtonId,
                                    productSave: productSaveButtonId
                                }}
                                onProductGroupChange={(value) => setForm((s) => ({ ...s, productGroupId: value }))}
                                onProductBrandChange={(value) => setForm((s) => ({ ...s, productBrandId: value }))}
                                onCodeChange={(value) => setForm((s) => ({ ...s, code: value }))}
                                onNameChange={(value) => setForm((s) => ({ ...s, name: value }))}
                                onHsnCodeChange={(value) => setForm((s) => ({ ...s, hsnCodeId: value }))}
                                onOpeningQtyChange={(value) => setForm((s) => ({ ...s, openingQty: value }))}
                                onLandingCostChange={(value) => setForm((s) => ({ ...s, landingCost: value }))}
                                onRemarksChange={(value) => setForm((s) => ({ ...s, remarks: value }))}
                                onShowOnlyInTransportChange={(value) =>
                                    setForm((s) => ({ ...s, showOnlyInTransportFlag: value }))
                                }
                                onActiveChange={(value) => setForm((s) => ({ ...s, isActiveFlag: value }))}
                                onProductAttributeTypeChange={handleProductAttributeTypeChange}
                                onAttributeToAddChange={setAttributeToAdd}
                                onAddProductAttributeDetail={addProductAttributeDetail}
                                onRemoveProductAttributeDetail={removeProductAttributeDetail}
                                onAttributeReorder={handleAttributeReorder}
                            />
                        </TabPanel>
                        <TabPanel header="Units & Taxes">
                            <ProductUnitsTaxesTab
                                form={form}
                                formErrors={formErrors}
                                saving={saving}
                                unitDropdownOptions={unitDropdownOptions}
                                ledgerDropdownOptions={ledgerDropdownOptions}
                                gridDropdownAppendTo={gridDropdownAppendTo}
                                ledgerOptionsErrorMessage={ledgerOptionsError?.message ?? null}
                                fieldIds={{ save: productSaveButtonId }}
                                onClearFormError={clearFormError}
                                onAddUnit={addUnit}
                                onUpdateUnit={updateUnit}
                                onRemoveUnit={removeUnit}
                                onAddTax={addTax}
                                onUpdateTax={updateTax}
                                onRemoveTax={removeTax}
                            />
                        </TabPanel>
                    </TabView>
                </div>
            </Dialog>

            <ProductOfferSmsDialog
                visible={productOfferDialogVisible}
                productLabel={productOfferLabel}
                recipientName={productOfferForm.recipientName}
                recipientPhone={productOfferForm.recipientPhone}
                messageText={productOfferForm.messageText}
                sending={productOfferSending}
                onHide={closeProductOfferDialog}
                onRecipientNameChange={(value) => setProductOfferForm((current) => ({ ...current, recipientName: value }))}
                onRecipientPhoneChange={(value) => setProductOfferForm((current) => ({ ...current, recipientPhone: value }))}
                onMessageTextChange={(value) => setProductOfferForm((current) => ({ ...current, messageText: value }))}
                onSend={() => void sendProductOfferSms()}
            />

            <ProductOfferBatchSmsDialog
                visible={productOfferBatchDialogVisible}
                productLabel={productOfferBatchLabel}
                maxRecipients={productOfferBatchForm.maxRecipients}
                messageText={productOfferBatchForm.messageText}
                sending={productOfferBatchSending}
                onHide={closeProductOfferBatchDialog}
                onMaxRecipientsChange={(value) => setProductOfferBatchForm((current) => ({ ...current, maxRecipients: value }))}
                onMessageTextChange={(value) => setProductOfferBatchForm((current) => ({ ...current, messageText: value }))}
                onSend={() => void sendProductOfferBatchSms()}
            />

            <Dialog
                header="Product Details"
                visible={detailVisible}
                style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.standard }}
                onHide={() => setDetailVisible(false)}
                footer={
                    <MasterDetailDialogFooter
                        index={detailIndex}
                        total={rows.length}
                        onNavigate={navigateDetailRecord}
                        onClose={() => setDetailVisible(false)}
                    />
                }
            >
                {detailRow && (
                    <div className="flex flex-column gap-3">
                        <MasterDetailSection title="Basic Info">
                            <MasterDetailGrid columns={2}>
                                <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                                <MasterDetailCard label="Code" value={detailRow.code ?? '-'} />
                                <MasterDetailCard label="Group" value={groupBody(detailRow)} />
                                <MasterDetailCard label="Brand" value={brandBody(detailRow)} />
                                <MasterDetailCard label="Type" value={typeBody(detailRow)} />
                                <MasterDetailCard label="HSN" value={hsnBody(detailRow)} />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                        <MasterDetailSection title="Stock & Pricing">
                            <MasterDetailGrid columns={2}>
                                <MasterDetailCard label="Opening Qty" value={detailRow.openingQty ?? '-'} />
                                <MasterDetailCard label="Landing Cost" value={detailRow.landingCost ?? '-'} />
                                <MasterDetailCard label="Remarks" value={detailRow.remarks || '-'} />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                        <MasterDetailSection title="Flags">
                            <MasterDetailGrid columns={2}>
                                <MasterDetailCard
                                    label="Show Only In Transport"
                                    value={flagToBool(detailRow.showOnlyInTransportFlag, false) ? 'Yes' : 'No'}
                                />
                                <MasterDetailCard
                                    label="Status"
                                    value={flagToBool(detailRow.isActiveFlag, true) ? 'Active' : 'Inactive'}
                                />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                    </div>
                )}
            </Dialog>
        </div>
    );
}








