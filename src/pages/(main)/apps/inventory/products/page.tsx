'use client';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { TabPanel, TabView } from 'primereact/tabview';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
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

interface ProductAttributeOption {
    productAttributeId: number;
    detail: string | null;
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
const LIMIT_OPTIONS = [100, 250, 500, 1000, 2000].map((value) => ({ label: String(value), value }));
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

type UnitDraft = {
    key: number;
    unitId: number | null;
    equalUnitId: number | null;
    quantity: number | null;
    effectiveDateText: string;
};

type SalesTaxDraft = {
    key: number;
    ledgerTaxId: number | null;
    ledgerTax2Id: number | null;
    ledgerTax3Id: number | null;
    mrp: number | null;
    margin: number | null;
    sellingRate: number | null;
    beforeVatRate: number | null;
    beforeVatRate2: number | null;
    effectiveDateText: string;
    isActiveFlag: boolean;
};

type ProductAttributeSelectionDraft = {
    productAttributeId: number;
    detail: string | null;
    orderNo: number | null;
};

type FormState = {
    name: string;
    code: string;
    productGroupId: number | null;
    productBrandId: number | null;
    productAttributeTypeId: number | null;
    hsnCodeId: number | null;
    openingQty: number | null;
    landingCost: number | null;
    remarks: string;
    isActiveFlag: boolean;
    showOnlyInTransportFlag: boolean;
    units: UnitDraft[];
    salesTaxes: SalesTaxDraft[];
};

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

const flagToBool = (value: number | null | undefined, defaultValue = false) => {
    if (value == null) return defaultValue;
    return Number(value || 0) === 1;
};
const boolToFlag = (value: boolean) => (value ? 1 : 0);

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

const isValidDateText = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const yyyymmdd = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        const date = new Date(`${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`);
        return !Number.isNaN(date.getTime());
    }
    const iso = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
    if (iso) {
        const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}`);
        return !Number.isNaN(date.getTime());
    }
    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slash) {
        const dd = slash[1].padStart(2, '0');
        const mm = slash[2].padStart(2, '0');
        const date = new Date(`${slash[3]}-${mm}-${dd}`);
        return !Number.isNaN(date.getTime());
    }
    return false;
};

export default function InventoryProductsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const unitKeyRef = useRef(1);
    const taxKeyRef = useRef(1);

    const [search, setSearch] = useState('');
    const [searchType, setSearchType] = useState<ProductSearchTypeFilter>(1);
    const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('active');
    const [productBrandFilterId, setProductBrandFilterId] = useState<number | null>(null);
    const [mrpFilter, setMrpFilter] = useState<number | null>(null);
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductRow | null>(null);
    const [detailsLoaded, setDetailsLoaded] = useState(true);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');
    const [productAttributeOptions, setProductAttributeOptions] = useState<ProductAttributeOption[]>([]);
    const [productAttributeSelections, setProductAttributeSelections] = useState<ProductAttributeSelectionDraft[]>([]);
    const [attributeToAdd, setAttributeToAdd] = useState<number | null>(null);

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

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
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
            const label = [hsn.name, hsn.code ? `(${hsn.code})` : null].filter(Boolean).join(' ');
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

        setForm({
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
        });
        setProductAttributeSelections(detailSelections);
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
        setForm((prev) => ({ ...prev, units: [...prev.units, createUnitDraft()] }));
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
        setForm((prev) => ({ ...prev, salesTaxes: [...prev.salesTaxes, createTaxDraft()] }));
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
            currentDigest: JSON.stringify(form),
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
            setDialogVisible(false);
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
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
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

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Products</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product masters with units, taxes, and attribute details.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Product" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
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
                        <InputNumber
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
                            label="Export"
                            icon="pi pi-download"
                            className="p-button-info"
                            onClick={() => dtRef.current?.exportCSV()}
                            disabled={rows.length === 0}
                        />
                        <Button
                            label="Print"
                            icon="pi pi-print"
                            className="p-button-text"
                            onClick={() => window.print()}
                        />
                        <Button
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => refetch()}
                        />
                        <span className="flex align-items-center gap-2">
                            <span className="text-600 text-sm">Limit</span>
                            <AppDropdown
                                value={limit}
                                options={LIMIT_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(e) => setLimit(e.value ?? 2000)}
                                style={{ width: '6rem' }}
                            />
                        </span>
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
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={dialogTitle}
                visible={dialogVisible}
                style={{ width: 'min(960px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={() => setDialogVisible(false)}
                            disabled={saving}
                        />
                        <Button
                            label={saving ? 'Saving...' : 'Save'}
                            icon="pi pi-check"
                            onClick={save}
                            disabled={saving || Boolean(editing && !detailsLoaded)}
                        />
                    </div>
                }
            >
                <div className="flex flex-column gap-3">
                    {productLoading && <div className="text-500">Loading product details...</div>}
                    {productError && <div className="text-red-500">Error: {productError.message}</div>}
                    <TabView>
                        <TabPanel header="Basic Details">
                            <div className="grid">
                                <div className="col-12 lg:col-7">
                                    <div className="grid">
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Product Group</label>
                                            <AppDropdown
                                                value={form.productGroupId}
                                                options={productGroups}
                                                optionLabel="name"
                                                optionValue="productGroupId"
                                                onChange={(e) => setForm((s) => ({ ...s, productGroupId: e.value ?? null }))}
                                                placeholder="Select product group"
                                                showClear
                                                filter
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Product Brand</label>
                                            <AppDropdown
                                                value={form.productBrandId}
                                                options={productBrands}
                                                optionLabel="name"
                                                optionValue="productBrandId"
                                                onChange={(e) => setForm((s) => ({ ...s, productBrandId: e.value ?? null }))}
                                                placeholder="Select product brand"
                                                showClear
                                                filter
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Code</label>
                                            <AppInput
                                                value={form.code}
                                                onChange={(e) => setForm((s) => ({ ...s, code: e.target.value }))}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Name</label>
                                            <AppInput
                                                value={form.name}
                                                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                                                style={{ width: '100%' }}
                                                className={formErrors.name ? 'p-invalid' : undefined}
                                            />
                                            {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                                        </div>
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">HSN Code</label>
                                            <AppDropdown
                                                value={form.hsnCodeId}
                                                options={hsnCodes}
                                                optionLabel="name"
                                                optionValue="hsnCodeId"
                                                itemTemplate={(option) => (
                                                    <span>
                                                        {option.name}
                                                        {option.code ? ` (${option.code})` : ''}
                                                    </span>
                                                )}
                                                onChange={(e) => setForm((s) => ({ ...s, hsnCodeId: e.value ?? null }))}
                                                placeholder="Select HSN code"
                                                showClear
                                                filter
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Remarks</label>
                                            <AppInput
                                                value={form.remarks}
                                                onChange={(e) => setForm((s) => ({ ...s, remarks: e.target.value }))}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <div className="flex flex-column gap-2">
                                                <span className="flex align-items-center gap-2">
                                                    <Checkbox
                                                        inputId="productTransportOnly"
                                                        checked={form.showOnlyInTransportFlag}
                                                        onChange={(e) =>
                                                            setForm((s) => ({ ...s, showOnlyInTransportFlag: !!e.checked }))
                                                        }
                                                    />
                                                    <label htmlFor="productTransportOnly" className="text-sm text-600">
                                                        Show Only In Transport
                                                    </label>
                                                </span>
                                                <span className="flex align-items-center gap-2">
                                                    <Checkbox
                                                        inputId="productActive"
                                                        checked={form.isActiveFlag}
                                                        onChange={(e) => setForm((s) => ({ ...s, isActiveFlag: !!e.checked }))}
                                                    />
                                                    <label htmlFor="productActive" className="text-sm text-600">
                                                        Active
                                                    </label>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 lg:col-5">
                                    <div className="grid">
                                        <div className="col-12">
                                            <label className="block text-600 mb-1">Product Attribute Type</label>
                                            <AppDropdown
                                                value={form.productAttributeTypeId}
                                                options={productAttributeTypes}
                                                optionLabel="name"
                                                optionValue="productAttributeTypeId"
                                                onChange={(e) => handleProductAttributeTypeChange(e.value ?? null)}
                                                placeholder="Select product attribute type"
                                                showClear
                                                filter
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <div className="flex align-items-center justify-content-between mb-2">
                                                <h4 className="m-0 text-600">Type Details</h4>
                                            </div>
                                            {!form.productAttributeTypeId ? (
                                                <small className="text-500">Select a product attribute type to manage attributes.</small>
                                            ) : attributeOptionsLoading ? (
                                                <small className="text-500">Loading type details...</small>
                                            ) : attributeOptionsError ? (
                                                <small className="text-red-500">Type details error: {attributeOptionsError.message}</small>
                                            ) : (
                                                <>
                                                    <div className="flex flex-column sm:flex-row align-items-stretch gap-2 mb-2">
                                                        <AppDropdown
                                                            value={attributeToAdd}
                                                            options={availableAttributeOptions}
                                                            optionLabel="detail"
                                                            optionValue="productAttributeId"
                                                            onChange={(e) => setAttributeToAdd(e.value ?? null)}
                                                            placeholder="Select detail"
                                                            showClear
                                                            filter
                                                            disabled={availableAttributeOptions.length === 0}
                                                            itemTemplate={(option) => (
                                                                <span>{option.detail ?? `Detail ${option.productAttributeId}`}</span>
                                                            )}
                                                            valueTemplate={(option) =>
                                                                option ? (
                                                                    <span>{option.detail ?? `Detail ${option.productAttributeId}`}</span>
                                                                ) : (
                                                                    <span className="text-500">Select detail</span>
                                                                )
                                                            }
                                                            style={{ width: '100%' }}
                                                        />
                                                        <Button
                                                            label="Add Detail"
                                                            icon="pi pi-plus"
                                                            className="p-button-sm"
                                                            onClick={addProductAttributeDetail}
                                                            disabled={!attributeToAdd}
                                                        />
                                                    </div>
                                                    <DataTable
                                                        value={productAttributeRows}
                                                        dataKey="productAttributeId"
                                                        scrollable
                                                        scrollHeight="460px"
                                                        size="small"
                                                        className="p-datatable-sm"
                                                        responsiveLayout="scroll"
                                                        emptyMessage="No details added."
                                                        reorderableRows
                                                        onRowReorder={handleAttributeReorder}
                                                    >
                                                        <Column rowReorder style={{ width: '3rem' }} />
                                                        <Column
                                                            header="Detail"
                                                            body={(row: ProductAttributeSelectionDraft) => (
                                                                <span className="text-600">
                                                                    {productAttributeOptionMap.get(row.productAttributeId) ??
                                                                        row.detail ??
                                                                        `Detail ${row.productAttributeId}`}
                                                                </span>
                                                            )}
                                                            style={{ minWidth: '12rem' }}
                                                        />
                                                        <Column
                                                            header="Remove"
                                                            body={(row: ProductAttributeSelectionDraft) => (
                                                                <Button
                                                                    icon="pi pi-times"
                                                                    className="p-button-text p-button-danger p-button-sm"
                                                                    onClick={() => removeProductAttributeDetail(row.productAttributeId)}
                                                                />
                                                            )}
                                                            bodyStyle={{ textAlign: 'center' }}
                                                            style={{ width: '6rem' }}
                                                        />
                                                    </DataTable>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabPanel>
                        <TabPanel header="Units & Taxes">
                            <div className="grid">
                                <div className="col-12">
                                    <div className="flex align-items-center justify-content-between mb-2">
                                        <h4 className="m-0 text-600">Units</h4>
                                        <Button
                                            label="Add Unit"
                                            icon="pi pi-plus"
                                            className="p-button-text p-button-sm"
                                            onClick={addUnit}
                                            disabled={saving}
                                        />
                                    </div>
                                    <DataTable
                                        value={form.units}
                                        dataKey="key"
                                        scrollable
                                        scrollHeight="240px"
                                        size="small"
                                        className="p-datatable-sm"
                                        responsiveLayout="scroll"
                                        emptyMessage="No unit rows added."
                                    >
                                        <Column
                                            header="#"
                                            body={(_row: UnitDraft, options) =>
                                                options.rowIndex != null ? options.rowIndex + 1 : 1
                                            }
                                            style={{ width: '3rem' }}
                                        />
                                        <Column
                                            header="Unit"
                                            body={(row: UnitDraft) => (
                                            <AppDropdown
                                                value={row.unitId}
                                                options={unitDropdownOptions}
                                                optionLabel="label"
                                                optionValue="value"
                                                appendTo={gridDropdownAppendTo}
                                                onChange={(e) => updateUnit(row.key, { unitId: e.value ?? null })}
                                                placeholder="Select unit"
                                                showClear
                                                filter
                                                filterBy="label"
                                                className="p-inputtext-sm"
                                                style={{ width: '100%' }}
                                            />
                                        )}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Equal Unit"
                                            body={(row: UnitDraft) => (
                                                <AppDropdown
                                                    value={row.equalUnitId}
                                                    options={unitDropdownOptions}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    appendTo={gridDropdownAppendTo}
                                                    onChange={(e) => updateUnit(row.key, { equalUnitId: e.value ?? null })}
                                                    placeholder="Select equal unit"
                                                    showClear
                                                    filter
                                                    filterBy="label"
                                                    className="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Qty"
                                            body={(row: UnitDraft) => (
                                                <InputNumber
                                                    value={row.quantity}
                                                    onValueChange={(e) =>
                                                        updateUnit(row.key, {
                                                            quantity: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '6rem' }}
                                        />
                                        <Column
                                            header="Effective Date"
                                            body={(row: UnitDraft) => {
                                                const errorKey = `units.${row.key}.effectiveDateText`;
                                                const error = formErrors[errorKey];
                                                return (
                                                    <div className="flex flex-column gap-1">
                                                        <AppInput
                                                            value={row.effectiveDateText}
                                                            onChange={(e) => {
                                                                updateUnit(row.key, { effectiveDateText: e.target.value });
                                                                clearFormError(errorKey);
                                                            }}
                                                            className={error ? 'p-inputtext-sm p-invalid' : 'p-inputtext-sm'}
                                                            style={{ width: '100%' }}
                                                        />
                                                        {error && <small className="text-red-500">{error}</small>}
                                                    </div>
                                                );
                                            }}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Delete"
                                            body={(row: UnitDraft) => (
                                                <Button
                                                    icon="pi pi-times"
                                                    className="p-button-text p-button-danger p-button-sm"
                                                    onClick={() => removeUnit(row.key)}
                                                />
                                            )}
                                            bodyStyle={{ textAlign: 'center' }}
                                            style={{ width: '5rem' }}
                                        />
                                    </DataTable>
                                </div>

                                <div className="col-12">
                                    <div className="flex align-items-center justify-content-between mb-2">
                                        <h4 className="m-0 text-600">Sales Taxes</h4>
                                        <Button
                                            label="Add Tax"
                                            icon="pi pi-plus"
                                            className="p-button-text p-button-sm"
                                            onClick={addTax}
                                            disabled={saving}
                                        />
                                    </div>
                                    {ledgerOptionsError && (
                                        <small className="text-red-500 block mb-2">
                                            Ledger options error: {ledgerOptionsError.message}
                                        </small>
                                    )}
                                    <DataTable
                                        value={form.salesTaxes}
                                        dataKey="key"
                                        scrollable
                                        scrollHeight="260px"
                                        size="small"
                                        className="p-datatable-sm"
                                        responsiveLayout="scroll"
                                        emptyMessage="No tax rows added."
                                    >
                                        <Column
                                            header="#"
                                            body={(_row: SalesTaxDraft, options) =>
                                                options.rowIndex != null ? options.rowIndex + 1 : 1
                                            }
                                            style={{ width: '3rem' }}
                                        />
                                        <Column
                                            header="Tax Ledger"
                                            body={(row: SalesTaxDraft) => (
                                                <AppDropdown
                                                    value={row.ledgerTaxId}
                                                    options={ledgerDropdownOptions}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    appendTo={gridDropdownAppendTo}
                                                    onChange={(e) => updateTax(row.key, { ledgerTaxId: e.value ?? null })}
                                                    placeholder="Select ledger"
                                                    showClear
                                                    filter
                                                    filterBy="label"
                                                    className="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Tax Ledger 2"
                                            body={(row: SalesTaxDraft) => (
                                                <AppDropdown
                                                    value={row.ledgerTax2Id}
                                                    options={ledgerDropdownOptions}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    appendTo={gridDropdownAppendTo}
                                                    onChange={(e) => updateTax(row.key, { ledgerTax2Id: e.value ?? null })}
                                                    placeholder="Select ledger"
                                                    showClear
                                                    filter
                                                    filterBy="label"
                                                    className="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Tax Ledger 3"
                                            body={(row: SalesTaxDraft) => (
                                                <AppDropdown
                                                    value={row.ledgerTax3Id}
                                                    options={ledgerDropdownOptions}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    appendTo={gridDropdownAppendTo}
                                                    onChange={(e) => updateTax(row.key, { ledgerTax3Id: e.value ?? null })}
                                                    placeholder="Select ledger"
                                                    showClear
                                                    filter
                                                    filterBy="label"
                                                    className="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="MRP"
                                            body={(row: SalesTaxDraft) => (
                                                <InputNumber
                                                    value={row.mrp}
                                                    onValueChange={(e) =>
                                                        updateTax(row.key, {
                                                            mrp: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '7rem' }}
                                        />
                                        <Column
                                            header="Margin"
                                            body={(row: SalesTaxDraft) => (
                                                <InputNumber
                                                    value={row.margin}
                                                    onValueChange={(e) =>
                                                        updateTax(row.key, {
                                                            margin: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '7rem' }}
                                        />
                                        <Column
                                            header="Selling Rate"
                                            body={(row: SalesTaxDraft) => (
                                                <InputNumber
                                                    value={row.sellingRate}
                                                    onValueChange={(e) =>
                                                        updateTax(row.key, {
                                                            sellingRate: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '8rem' }}
                                        />
                                        <Column
                                            header="Before VAT Rate"
                                            body={(row: SalesTaxDraft) => (
                                                <InputNumber
                                                    value={row.beforeVatRate}
                                                    onValueChange={(e) =>
                                                        updateTax(row.key, {
                                                            beforeVatRate: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '9rem' }}
                                        />
                                        <Column
                                            header="Before VAT Rate 2"
                                            body={(row: SalesTaxDraft) => (
                                                <InputNumber
                                                    value={row.beforeVatRate2}
                                                    onValueChange={(e) =>
                                                        updateTax(row.key, {
                                                            beforeVatRate2: typeof e.value === 'number' ? e.value : null
                                                        })
                                                    }
                                                    useGrouping={false}
                                                    inputClassName="p-inputtext-sm"
                                                    style={{ width: '100%' }}
                                                />
                                            )}
                                            style={{ width: '9rem' }}
                                        />
                                        <Column
                                            header="Effective Date"
                                            body={(row: SalesTaxDraft) => {
                                                const errorKey = `salesTaxes.${row.key}.effectiveDateText`;
                                                const error = formErrors[errorKey];
                                                return (
                                                    <div className="flex flex-column gap-1">
                                                        <AppInput
                                                            value={row.effectiveDateText}
                                                            onChange={(e) => {
                                                                updateTax(row.key, { effectiveDateText: e.target.value });
                                                                clearFormError(errorKey);
                                                            }}
                                                            className={error ? 'p-inputtext-sm p-invalid' : 'p-inputtext-sm'}
                                                            style={{ width: '100%' }}
                                                        />
                                                        {error && <small className="text-red-500">{error}</small>}
                                                    </div>
                                                );
                                            }}
                                            style={{ minWidth: '10rem' }}
                                        />
                                        <Column
                                            header="Active"
                                            body={(row: SalesTaxDraft) => (
                                                <div className="flex align-items-center gap-2">
                                                    <Checkbox
                                                        inputId={`taxActive-${row.key}`}
                                                        checked={row.isActiveFlag}
                                                        onChange={(e) => updateTax(row.key, { isActiveFlag: !!e.checked })}
                                                    />
                                                    <label htmlFor={`taxActive-${row.key}`} className="text-sm text-600">
                                                        Active
                                                    </label>
                                                </div>
                                            )}
                                            style={{ width: '9rem' }}
                                        />
                                        <Column
                                            header="Delete"
                                            body={(row: SalesTaxDraft) => (
                                                <Button
                                                    icon="pi pi-times"
                                                    className="p-button-text p-button-danger p-button-sm"
                                                    onClick={() => removeTax(row.key)}
                                                />
                                            )}
                                            bodyStyle={{ textAlign: 'center' }}
                                            style={{ width: '5rem' }}
                                        />
                                    </DataTable>
                                </div>
                            </div>
                        </TabPanel>
                    </TabView>
                </div>
            </Dialog>

            <Dialog
                header="Product Details"
                visible={detailVisible}
                style={{ width: 'min(760px, 96vw)' }}
                onHide={() => setDetailVisible(false)}
                footer={
                    <div className="flex justify-content-end w-full">
                        <Button label="Close" className="p-button-text" onClick={() => setDetailVisible(false)} />
                    </div>
                }
            >
                {detailRow && (
                    <div className="flex flex-column gap-2">
                        <div><strong>Name:</strong> {detailRow.name ?? '-'}</div>
                        <div><strong>Code:</strong> {detailRow.code ?? '-'}</div>
                        <div><strong>Group:</strong> {groupBody(detailRow)}</div>
                        <div><strong>Brand:</strong> {brandBody(detailRow)}</div>
                        <div><strong>Type:</strong> {typeBody(detailRow)}</div>
                        <div><strong>HSN:</strong> {hsnBody(detailRow)}</div>
                        <div><strong>Opening Qty:</strong> {detailRow.openingQty ?? '-'}</div>
                        <div><strong>Landing Cost:</strong> {detailRow.landingCost ?? '-'}</div>
                        <div><strong>Remarks:</strong> {detailRow.remarks || '-'}</div>
                        <div><strong>Show Only In Transport:</strong> {flagToBool(detailRow.showOnlyInTransportFlag, false) ? 'Yes' : 'No'}</div>
                        <div><strong>Status:</strong> {flagToBool(detailRow.isActiveFlag, true) ? 'Active' : 'Inactive'}</div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
