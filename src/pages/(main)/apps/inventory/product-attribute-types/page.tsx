'use client';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { DataTable, DataTableRowEditCompleteEvent } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { z } from 'zod';
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

interface ProductAttributeTypeRow {
    productAttributeTypeId: number;
    name: string | null;
}

interface ProductAttributeRow {
    productAttributeId: number;
    detail: string | null;
}

type DetailDraft = {
    key: number;
    productAttributeId: number | null;
    detail: string;
};

const PRODUCT_ATTRIBUTE_TYPES = gql`
    query ProductAttributeTypes($search: String, $limit: Int) {
        productAttributeTypes(search: $search, limit: $limit) {
            productAttributeTypeId
            name
        }
    }
`;

const PRODUCT_ATTRIBUTE_TYPE_BY_ID = gql`
    query ProductAttributeTypeById($productAttributeTypeId: Int!) {
        productAttributeTypeById(productAttributeTypeId: $productAttributeTypeId) {
            productAttributeTypeId
            name
            productAttributes {
                productAttributeId
                detail
            }
        }
    }
`;

const CREATE_PRODUCT_ATTRIBUTE_TYPE = gql`
    mutation CreateProductAttributeType($name: String!, $productAttributes: [ProductAttributeInput!]) {
        createProductAttributeType(name: $name, productAttributes: $productAttributes) {
            productAttributeTypeId
        }
    }
`;

const UPDATE_PRODUCT_ATTRIBUTE_TYPE = gql`
    mutation UpdateProductAttributeType($productAttributeTypeId: Int!, $name: String, $productAttributes: [ProductAttributeInput!]) {
        updateProductAttributeType(productAttributeTypeId: $productAttributeTypeId, name: $name, productAttributes: $productAttributes) {
            productAttributeTypeId
        }
    }
`;

const DELETE_PRODUCT_ATTRIBUTE_TYPE = gql`
    mutation DeleteProductAttributeType($productAttributeTypeId: Int!) {
        deleteProductAttributeType(productAttributeTypeId: $productAttributeTypeId)
    }
`;

type FormState = {
    name: string;
    details: DetailDraft[];
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

const DEFAULT_FORM: FormState = {
    name: '',
    details: []
};
const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function InventoryProductAttributeTypesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const detailKeyRef = useRef(1);
    const newDetailInputRef = useRef<HTMLInputElement>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductAttributeTypeRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductAttributeTypeRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');
    const [newDetail, setNewDetail] = useState('');

    const { data, loading, error, refetch } = useQuery(PRODUCT_ATTRIBUTE_TYPES, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [loadProductAttributeType, { data: productAttributeTypeData, loading: detailsLoading, error: detailsError }] =
        useLazyQuery(PRODUCT_ATTRIBUTE_TYPE_BY_ID, { client: inventoryApolloClient, fetchPolicy: 'network-only' });
    const [createProductAttributeType] = useMutation(CREATE_PRODUCT_ATTRIBUTE_TYPE, { client: inventoryApolloClient });
    const [updateProductAttributeType] = useMutation(UPDATE_PRODUCT_ATTRIBUTE_TYPE, { client: inventoryApolloClient });
    const [deleteProductAttributeType] = useMutation(DELETE_PRODUCT_ATTRIBUTE_TYPE, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: ProductAttributeTypeRow[] = useMemo(() => data?.productAttributeTypes ?? [], [data]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };

    const createDetail = useCallback((detail = '', productAttributeId: number | null = null): DetailDraft => {
        const key = detailKeyRef.current;
        detailKeyRef.current += 1;
        return { key, productAttributeId, detail };
    }, []);

    const closeDialog = useCallback(() => {
        setDialogVisible(false);
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setNewDetail('');
        detailKeyRef.current = 1;
    }, []);

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setNewDetail('');
        setDialogVisible(true);
    };

    const openEdit = (row: ProductAttributeTypeRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            details: []
        });
        setFormErrors({});
        setNewDetail('');
        setDialogVisible(true);
        loadProductAttributeType({ variables: { productAttributeTypeId: row.productAttributeTypeId } });
    };

    const openView = (row: ProductAttributeTypeRow) => {
        if (!assertActionAllowed('view')) return;
        setDetailRow(row);
        setDetailVisible(true);
        loadProductAttributeType({ variables: { productAttributeTypeId: row.productAttributeTypeId } });
    };

    useEffect(() => {
        if (!editing || !productAttributeTypeData?.productAttributeTypeById) return;
        if (productAttributeTypeData.productAttributeTypeById.productAttributeTypeId !== editing.productAttributeTypeId) return;
        const details = (productAttributeTypeData.productAttributeTypeById.productAttributes ?? []) as ProductAttributeRow[];
        setForm((prev) => ({
            ...prev,
            details: details.map((detail) => createDetail(detail.detail ?? '', detail.productAttributeId ?? null))
        }));
    }, [productAttributeTypeData, editing, createDetail]);

    useEffect(() => {
        if (!detailsError) return;
        toastRef.current?.show({
            severity: 'error',
            summary: 'Error',
            detail: detailsError.message ?? 'Failed to load type details.'
        });
    }, [detailsError]);

    const addDetail = () => {
        const trimmed = newDetail.trim();
        if (!trimmed) return;
        setForm((prev) => ({ ...prev, details: [createDetail(trimmed), ...prev.details] }));
        setNewDetail('');
        setTimeout(() => newDetailInputRef.current?.focus(), 0);
    };

    const removeDetail = (key: number) => {
        setForm((prev) => ({
            ...prev,
            details: prev.details.filter((detail) => detail.key !== key)
        }));
    };

    const onDetailRowEditComplete = (event: DataTableRowEditCompleteEvent) => {
        const { newData, index } = event;
        if (index == null) return;
        setForm((prev) => {
            const nextDetails = [...prev.details];
            const existing = nextDetails[index];
            if (!existing) return prev;
            nextDetails[index] = { ...existing, detail: newData.detail ?? '' };
            return { ...prev, details: nextDetails };
        });
    };

    const detailEditor = (options: { value?: string; editorCallback?: (value: string) => void }) => (
        <InputText
            value={options.value ?? ''}
            onChange={(e) => options.editorCallback?.(e.target.value)}
            className="p-inputtext-sm"
        />
    );

    const viewDetails = useMemo(() => {
        if (!detailRow) return [];
        const detailType = productAttributeTypeData?.productAttributeTypeById;
        if (!detailType || detailType.productAttributeTypeId !== detailRow.productAttributeTypeId) return [];
        return (detailType.productAttributes ?? []) as ProductAttributeRow[];
    }, [detailRow, productAttributeTypeData]);

    const save = async () => {
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
            const productAttributes = form.details
                .map((detail) => ({
                    productAttributeId: detail.productAttributeId ?? undefined,
                    detail: detail.detail.trim()
                }))
                .filter((detail) => detail.detail.length > 0);
            const variables = {
                name: form.name.trim(),
                productAttributes
            };

            if (editing) {
                await updateProductAttributeType({
                    variables: {
                        productAttributeTypeId: editing.productAttributeTypeId,
                        ...variables
                    }
                });
            } else {
                await createProductAttributeType({ variables });
            }

            await refetch();
            closeDialog();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Product attribute type saved.'
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

    const handleDelete = async (productAttributeTypeId: number) => {
        try {
            await deleteProductAttributeType({ variables: { productAttributeTypeId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Product attribute type deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'product attribute type')
            });
        }
    };

    const confirmDelete = async () => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('PRODUCT_ATTRIBUTE_TYPE', row.productAttributeTypeId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('product attribute type', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('product attribute type')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.productAttributeTypeId)
        });
    };

    const actionsBody = (row: ProductAttributeTypeRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Product Attribute Types</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product attribute types and attribute lists for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Type" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading product attribute types: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="productAttributeTypeId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as ProductAttributeTypeRow) : openView(e.data as ProductAttributeTypeRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search product attribute type"
                            style={{ width: '100%' }}
                        />
                    </span>
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
                                options={limitOptions}
                                onChange={(e) => setLimit(e.value ?? 2000)}
                                className="w-6rem"
                            />
                        </span>
                        <span className="text-600 text-sm">
                            Showing {rows.length} type{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} type${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Product Attribute Type' : 'New Product Attribute Type'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={closeDialog}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={closeDialog}
                            disabled={saving}
                        />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-2">
                            <label className="block text-600">Type Details</label>
                            <div className="flex flex-column sm:flex-row align-items-stretch gap-2">
                                <InputText
                                    ref={newDetailInputRef}
                                    value={newDetail}
                                    onChange={(e) => setNewDetail(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        addDetail();
                                    }}
                                    placeholder="Add detail and press Enter"
                                    className="p-inputtext-sm"
                                    style={{ minWidth: '220px' }}
                                />
                                <Button
                                    label="Add"
                                    icon="pi pi-plus"
                                    className="p-button-sm"
                                    onClick={addDetail}
                                    disabled={saving || newDetail.trim().length === 0}
                                />
                            </div>
                        </div>
                        {detailsLoading && editing && (
                            <small className="text-500 block mb-2">Loading type details...</small>
                        )}
                        <DataTable
                            value={form.details}
                            dataKey="key"
                            editMode="row"
                            onRowEditComplete={onDetailRowEditComplete}
                            scrollable
                            scrollHeight="260px"
                            size="small"
                            className="p-datatable-sm"
                            emptyMessage="No details added."
                            responsiveLayout="scroll"
                        >
                            <Column
                                header="#"
                                body={(_, options) => (options.rowIndex != null ? options.rowIndex + 1 : 1)}
                                style={{ width: '3rem' }}
                            />
                            <Column field="detail" header="Detail" editor={detailEditor} />
                            <Column
                                rowEditor
                                headerStyle={{ width: '6rem' }}
                                bodyStyle={{ textAlign: 'center' }}
                            />
                            <Column
                                header="Delete"
                                body={(row: DetailDraft) => (
                                    <Button
                                        icon="pi pi-times"
                                        className="p-button-text p-button-danger p-button-sm"
                                        onClick={() => removeDetail(row.key)}
                                        disabled={saving}
                                    />
                                )}
                                bodyStyle={{ textAlign: 'center' }}
                                style={{ width: '5rem' }}
                            />
                        </DataTable>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Product Attribute Type Details"
                visible={detailVisible}
                style={{ width: 'min(680px, 96vw)' }}
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
                        {detailsLoading ? (
                            <small className="text-500">Loading type details...</small>
                        ) : (
                            <div>
                                <strong>Type Details:</strong>{' '}
                                {viewDetails.length
                                    ? viewDetails.map((item) => item.detail || '-').join(', ')
                                    : '-'}
                            </div>
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
}
