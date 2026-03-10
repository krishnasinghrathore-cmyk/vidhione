'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { DataTable } from 'primereact/datatable';
import { Dialog } from 'primereact/dialog';
import { Checkbox } from 'primereact/checkbox';
import AppDropdown from '@/components/AppDropdown';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import AppInput from '@/components/AppInput';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { useLedgerOptionsByPurpose } from '@/lib/accounts/ledgerOptions';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
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

interface ProductBrandRow {
    productBrandId: number;
    name: string | null;
    ledgerIds?: number[] | null;
}

type FallbackLedgerOptionRow = {
    ledgerId: number;
    name: string | null;
    address: string | null;
    groupName?: string | null;
};

type ProductBrandCompanyDraftRow = {
    rowId: string;
    ledgerId: number | null;
    markedForDelete: boolean;
};

const PRODUCT_BRANDS = gql`
    query ProductBrands($search: String, $limit: Int) {
        productBrands(search: $search, limit: $limit) {
            productBrandId
            name
            ledgerIds
        }
    }
`;

const PRODUCT_BRAND_BY_ID = gql`
    query ProductBrandById($productBrandId: Int!) {
        productBrandById(productBrandId: $productBrandId) {
            productBrandId
            name
            ledgerIds
        }
    }
`;

const LEDGER_OPTIONS_FALLBACK = gql`
    query LedgerOptionsFallback($limit: Int) {
        ledgerOptions(limit: $limit) {
            ledgerId
            name
            address
            groupName
        }
    }
`;

const CREATE_PRODUCT_BRAND = gql`
    mutation CreateProductBrand($name: String!, $ledgerIds: [Int!]) {
        createProductBrand(name: $name, ledgerIds: $ledgerIds) {
            productBrandId
        }
    }
`;

const UPDATE_PRODUCT_BRAND = gql`
    mutation UpdateProductBrand($productBrandId: Int!, $name: String, $ledgerIds: [Int!]) {
        updateProductBrand(productBrandId: $productBrandId, name: $name, ledgerIds: $ledgerIds) {
            productBrandId
        }
    }
`;

const DELETE_PRODUCT_BRAND = gql`
    mutation DeleteProductBrand($productBrandId: Int!) {
        deleteProductBrand(productBrandId: $productBrandId)
    }
`;

type FormState = {
    name: string;
    companyRows: ProductBrandCompanyDraftRow[];
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

let nextProductBrandCompanyRowId = 1;
const createProductBrandCompanyDraftRow = (ledgerId: number | null = null): ProductBrandCompanyDraftRow => ({
    rowId: `product-brand-company-row-${nextProductBrandCompanyRowId++}`,
    ledgerId,
    markedForDelete: false
});

const mapLedgerIdsToCompanyRows = (ledgerIds?: number[] | null): ProductBrandCompanyDraftRow[] => {
    const normalized = (ledgerIds ?? []).map(Number).filter((value) => Number.isFinite(value));
    if (!normalized.length) return [createProductBrandCompanyDraftRow(null)];
    return normalized.map((ledgerId) => createProductBrandCompanyDraftRow(ledgerId));
};

const deriveActiveCompanyLedgerIds = (companyRows: ProductBrandCompanyDraftRow[]) => {
    const seen = new Set<number>();
    const values: number[] = [];
    companyRows.forEach((row) => {
        if (row.markedForDelete) return;
        if (!Number.isFinite(row.ledgerId)) return;
        const ledgerId = Number(row.ledgerId);
        if (seen.has(ledgerId)) return;
        seen.add(ledgerId);
        values.push(ledgerId);
    });
    return values;
};

const createDefaultForm = (): FormState => ({
    name: '',
    companyRows: [createProductBrandCompanyDraftRow(null)]
});
export default function InventoryProductBrandsPage() {
    const nameInputId = 'product-brand-name-input';
    const saveButtonId = 'product-brand-save-button';
    const itemCompanyAppendTarget = typeof document !== 'undefined' ? document.body : 'self';

    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductBrandRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductBrandRow | null>(null);
    const [form, setForm] = useState<FormState>(() => createDefaultForm());
    const [initialForm, setInitialForm] = useState<FormState>(() => createDefaultForm());
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(PRODUCT_BRANDS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createProductBrand] = useMutation(CREATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [updateProductBrand] = useMutation(UPDATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [deleteProductBrand] = useMutation(DELETE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const {
        options: itemCompanyOptions,
        loading: itemCompanyOptionsLoading,
        error: itemCompanyOptionsError
    } = useLedgerOptionsByPurpose({
        purpose: 'PURCHASE',
        limit: 2000,
        includeNone: false
    });
    const { data: fallbackLedgerOptionsData } = useQuery<{ ledgerOptions: FallbackLedgerOptionRow[] }>(
        LEDGER_OPTIONS_FALLBACK,
        {
            client: apolloClient,
            variables: { limit: 10000 }
        }
    );

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: ProductBrandRow[] = useMemo(() => data?.productBrands ?? [], [data]);
    const currentFormDigest = useMemo(() => JSON.stringify(form), [form]);
    const isFormDirty = useMemo(() => currentFormDigest !== JSON.stringify(initialForm), [currentFormDigest, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
    const isDryEditReady = useMemo(
        () => Boolean(editing && dryEditDigest && dryEditDigest === currentFormDigest),
        [currentFormDigest, dryEditDigest, editing]
    );
    const saveButtonLabel = useMemo(
        () => getMasterSaveButtonLabel(Boolean(editing), saving, isDryEditReady),
        [editing, isDryEditReady, saving]
    );
    const knownCompanyLedgerIds = useMemo(
        () =>
            Array.from(
                new Set(
                    [
                        ...rows.flatMap((row) => row.ledgerIds ?? []),
                        ...form.companyRows.map((row) => row.ledgerId),
                        ...(detailRow?.ledgerIds ?? [])
                    ]
                        .map(Number)
                        .filter((value) => Number.isFinite(value) && value > 0)
                )
            ),
        [detailRow, form.companyRows, rows]
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
    const loadProductBrandById = async (productBrandId: number) => {
        try {
            const result = await inventoryApolloClient.query<{ productBrandById: ProductBrandRow | null }>({
                query: PRODUCT_BRAND_BY_ID,
                variables: { productBrandId },
                fetchPolicy: 'network-only'
            });
            return result.data?.productBrandById ?? null;
        } catch (error: any) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Lookup Warning',
                detail: error?.message ?? 'Could not load the latest company list for this product brand.'
            });
            return null;
        }
    };

    const fallbackLedgerOptionById = useMemo(() => {
        const map = new Map<number, { value: number; label: string; address: string | null; groupName?: string | null }>();
        (fallbackLedgerOptionsData?.ledgerOptions ?? []).forEach((row) => {
            const ledgerId = Number(row.ledgerId);
            if (!Number.isFinite(ledgerId)) return;
            map.set(ledgerId, {
                value: ledgerId,
                label: row.name?.trim() || `Ledger ${ledgerId}`,
                address: row.address ?? null,
                groupName: row.groupName ?? null
            });
        });
        return map;
    }, [fallbackLedgerOptionsData]);
    const itemCompanyDropdownOptions = useMemo(() => {
        const options = [...itemCompanyOptions];
        const knownValues = new Set(options.map((option) => Number(option.value)));
        knownCompanyLedgerIds.forEach((ledgerId) => {
            if (knownValues.has(ledgerId)) return;
            const fallback = fallbackLedgerOptionById.get(ledgerId);
            if (!fallback) return;
            options.push(fallback);
            knownValues.add(ledgerId);
        });
        return options;
    }, [fallbackLedgerOptionById, itemCompanyOptions, knownCompanyLedgerIds]);
    const ledgerLabelById = useMemo(() => {
        const map = new Map<number, string>();
        itemCompanyDropdownOptions.forEach((option) => map.set(Number(option.value), option.label));
        return map;
    }, [itemCompanyDropdownOptions]);
    const detailCompanyRows = useMemo(
        () =>
            (detailRow?.ledgerIds ?? [])
                .map(Number)
                .filter((value) => Number.isFinite(value))
                .map((ledgerId) => ({
                    ledgerId,
                    name: ledgerLabelById.get(ledgerId) ?? `Product Company ${ledgerId}`
                })),
        [detailRow, ledgerLabelById]
    );

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(createDefaultForm());
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = async (row: ProductBrandRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        const sourceRow = (await loadProductBrandById(row.productBrandId)) ?? row;
        setEditing(sourceRow);
        setForm({
            name: sourceRow.name ?? '',
            companyRows: mapLedgerIdsToCompanyRows(sourceRow.ledgerIds)
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = async (row: ProductBrandRow) => {
        if (!assertActionAllowed('view')) return;
        const sourceRow = (await loadProductBrandById(row.productBrandId)) ?? row;
        setDetailRow(sourceRow);
        setDetailVisible(true);
    };

    const navigateEditRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, editingIndex, direction);
        if (!nextRow) return;
        void openEdit(nextRow);
    };

    const navigateDetailRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(rows, detailIndex, direction);
        if (!nextRow) return;
        void openView(nextRow);
    };

    const save = async () => {
        const parsed = formSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                if (issue.path[0]) nextErrors[String(issue.path[0])] = issue.message;
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({ severity: 'warn', summary: 'Please fix validation errors' });
            focusElementByIdNextFrame(nameInputId);
            return;
        }

        const activeLedgerIds = deriveActiveCompanyLedgerIds(form.companyRows);
        const duplicateCount =
            form.companyRows.filter((row) => !row.markedForDelete && Number.isFinite(row.ledgerId)).length -
            activeLedgerIds.length;
        if (duplicateCount > 0) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Duplicate Product Company',
                detail: 'Company List contains duplicate product companies. Keep each company only once.'
            });
            return;
        }

        if (!ensureDryEditCheck({
            isEditing: Boolean(editing),
            lastDigest: dryEditDigest,
            currentDigest: currentFormDigest,
            setLastDigest: setDryEditDigest,
            toastRef,
            entityLabel: 'record'
        })) return;

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                ledgerIds: activeLedgerIds
            };

            if (editing) {
                await updateProductBrand({
                    variables: {
                        productBrandId: editing.productBrandId,
                        ...variables
                    }
                });
            } else {
                await createProductBrand({ variables });
            }

            await refetch();
            const normalizedSavedForm: FormState = {
                name: variables.name,
                companyRows: mapLedgerIdsToCompanyRows(activeLedgerIds)
            };
            setForm(normalizedSavedForm);
            setInitialForm(normalizedSavedForm);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Product brand saved.'
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

    const handleDelete = async (productBrandId: number) => {
        try {
            await deleteProductBrand({ variables: { productBrandId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Product brand deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'product brand')
            });
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: ProductBrandRow) => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('PRODUCT_BRAND', row.productBrandId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('product brand', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('product brand')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.productBrandId)
        });
    };

    const actionsBody = (row: ProductBrandRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => { void openView(row); }} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => { void openEdit(row); }} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );

    const itemCompanySummaryBody = (row: ProductBrandRow) => {
        const ids = (row.ledgerIds ?? []).map(Number).filter((value) => Number.isFinite(value));
        if (!ids.length) return <span className="text-500">-</span>;
        const labels = ids.map((id) => ledgerLabelById.get(id) ?? `Product Company ${id}`);
        const fullText = labels.join(', ');
        if (labels.length <= 2) {
            return <span title={fullText}>{fullText}</span>;
        }

        const summaryText = `${labels.slice(0, 2).join(', ')} +${labels.length - 2} more`;
        return (
            <span title={fullText}>
                {summaryText}
            </span>
        );
    };

    const addCompanyRow = () => {
        setForm((current) => ({
            ...current,
            companyRows: [...current.companyRows, createProductBrandCompanyDraftRow(null)]
        }));
    };

    const updateCompanyRow = (rowId: string, ledgerId: number | null) => {
        setForm((current) => ({
            ...current,
            companyRows: current.companyRows.map((row) =>
                row.rowId === rowId
                    ? {
                          ...row,
                          ledgerId,
                          markedForDelete: ledgerId == null ? false : row.markedForDelete
                      }
                    : row
            )
        }));
    };

    const toggleDeleteCompanyRow = (rowId: string, markedForDelete: boolean) => {
        setForm((current) => ({
            ...current,
            companyRows: current.companyRows.map((row) =>
                row.rowId === rowId ? { ...row, markedForDelete } : row
            )
        }));
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmDialog />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Product Brands</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product brands and the product-company purchase ledgers mapped under each brand.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Brand" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('productBrands')} buttonAriaLabel="Open Product Brands help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading product brands: {error.message}</p>}
                {itemCompanyOptionsError && (
                    <p className="text-orange-600 m-0">Product company options could not be loaded from Accounts lookups.</p>
                )}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="productBrandId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => {
                    if (masterPermissions.canEdit) {
                        void openEdit(e.data as ProductBrandRow);
                        return;
                    }
                    void openView(e.data as ProductBrandRow);
                }}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search product brand"
                            style={{ width: '100%' }}
                        />
                    </span>
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
                            Showing {rows.length} brand{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} brand${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Product Companies" body={itemCompanySummaryBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Product Brand' : 'New Product Brand'}
                visible={dialogVisible}
                style={{ width: 'min(760px, 96vw)' }}
                onShow={() => {
                    setInitialForm(form);
                    focusElementByIdNextFrame(nameInputId);
                }}
                onHide={closeDialog}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={closeDialog}
                        cancelDisabled={saving}
                        onSave={save}
                        saveLabel={saveButtonLabel}
                        saveDisabled={saving || !isFormDirty}
                        saveButtonId={saveButtonId}
                    />
                }
            >
                {editing && (
                    <div
                        className={`mb-3 p-2 border-round text-sm ${
                            isDryEditReady ? 'surface-100 text-green-700' : 'surface-100 text-700'
                        }`}
                    >
                        {isDryEditReady
                            ? 'Dry check passed. Click Apply Changes to save.'
                            : 'Dry save flow: first click runs dry check, second click saves changes.'}
                    </div>
                )}
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            id={nameInputId}
                            autoFocus
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <div className="border-1 surface-border border-round overflow-hidden">
                            <div className="surface-50 border-bottom-1 surface-border px-3 py-2 flex align-items-center justify-content-between gap-3">
                                <div className="flex flex-column gap-1">
                                    <span className="text-700 font-medium">Company List</span>
                                    <small className="text-600">Row list for product-company mapping.</small>
                                </div>
                                <Button
                                    type="button"
                                    label="Add Company"
                                    icon="pi pi-plus"
                                    className="app-action-compact"
                                    onClick={addCompanyRow}
                                    disabled={saving}
                                />
                            </div>
                            <DataTable
                                value={form.companyRows}
                                dataKey="rowId"
                                responsiveLayout="scroll"
                                size="small"
                                className="p-datatable-sm"
                                emptyMessage="No product companies added."
                                rowClassName={(row: ProductBrandCompanyDraftRow) =>
                                    row.markedForDelete ? 'surface-100 opacity-70' : undefined
                                }
                            >
                                <Column
                                    header="SN"
                                    body={(_row: ProductBrandCompanyDraftRow, options) => options.rowIndex + 1}
                                    style={{ width: '4rem' }}
                                />
                                <Column
                                    header="Product Company"
                                    body={(row: ProductBrandCompanyDraftRow) => (
                                        <AppDropdown
                                            value={row.ledgerId}
                                            options={itemCompanyDropdownOptions}
                                            optionLabel="label"
                                            optionValue="value"
                                            appendTo={itemCompanyAppendTarget}
                                            panelStyle={{ minWidth: '24rem', width: 'min(28rem, calc(100vw - 2rem))' }}
                                            onChange={(event) =>
                                                updateCompanyRow(
                                                    row.rowId,
                                                    event.value == null ? null : Number(event.value)
                                                )
                                            }
                                            disabled={row.markedForDelete || saving}
                                            loading={itemCompanyOptionsLoading}
                                            filter
                                            showClear
                                            placeholder="Select product company"
                                            style={{ width: '100%' }}
                                        />
                                    )}
                                />
                                <Column
                                    header="Delete"
                                    body={(row: ProductBrandCompanyDraftRow) => (
                                        <div className="flex justify-content-center">
                                            <Checkbox
                                                checked={row.markedForDelete}
                                                disabled={saving}
                                                onChange={(event) =>
                                                    toggleDeleteCompanyRow(row.rowId, Boolean(event.checked))
                                                }
                                            />
                                        </div>
                                    )}
                                    style={{ width: '6rem' }}
                                    bodyStyle={{ textAlign: 'center' }}
                                />
                            </DataTable>
                            <div className="border-top-1 surface-border px-3 py-2 text-600 text-sm">
                                Rows checked in Delete will be removed on save.
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Product Brand Details"
                visible={detailVisible}
                style={{ width: 'min(620px, 96vw)' }}
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
                            <MasterDetailGrid columns={1}>
                                <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                        <MasterDetailSection title="Company List">
                            <div className="border-1 surface-border border-round overflow-hidden">
                                <DataTable
                                    value={detailCompanyRows}
                                    dataKey="ledgerId"
                                    responsiveLayout="scroll"
                                    size="small"
                                    className="p-datatable-sm"
                                    emptyMessage="No product companies added."
                                    scrollable
                                    scrollHeight="12rem"
                                >
                                    <Column
                                        header="#"
                                        body={(_row: { ledgerId: number; name: string }, options) => options.rowIndex + 1}
                                        style={{ width: '4rem' }}
                                    />
                                    <Column
                                        header="Product Company"
                                        body={(row: { ledgerId: number; name: string }) => row.name}
                                    />
                                </DataTable>
                            </div>
                        </MasterDetailSection>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
