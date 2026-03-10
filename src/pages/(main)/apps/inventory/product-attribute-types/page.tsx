'use client';
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { DataTable, DataTableRowEditCompleteEvent } from 'primereact/datatable';
import AppInput from '@/components/AppInput';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
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
import { MASTER_DETAIL_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

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
export default function InventoryProductAttributeTypesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const detailKeyRef = useRef(1);
    const newDetailInputRef = useRef<HTMLInputElement>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductAttributeTypeRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductAttributeTypeRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

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
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);

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
        if (!editing || !productAttributeTypeData?.productAttributeTypeById) return;
        if (productAttributeTypeData.productAttributeTypeById.productAttributeTypeId !== editing.productAttributeTypeId) return;
        const details = (productAttributeTypeData.productAttributeTypeById.productAttributes ?? []) as ProductAttributeRow[];
        const nextForm: FormState = {
            name: editing.name ?? '',
            details: details.map((detail) => createDetail(detail.detail ?? '', detail.productAttributeId ?? null))
        };
        setForm((prev) => ({
            ...prev,
            details: nextForm.details
        }));
        setInitialForm(nextForm);
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
        <AppInput
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
            setInitialForm(form);
            if (!isBulkMode) {
                closeDialog();
            } else {
                setFormErrors({});
            }
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
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
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
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Type" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('productAttributeTypes')} buttonAriaLabel="Open Product Attribute Types help" />
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
                        <AppInput
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
                onShow={() => setInitialForm(form)}
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
                        saveDisabled={saving || !isFormDirty}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                    />
                }
            >
                <div className="grid">
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
                        <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mb-2">
                            <label className="block text-600">Type Details</label>
                            <div className="flex flex-column sm:flex-row align-items-stretch gap-2">
                                <AppInput
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
                        <MasterDetailGrid columns={1}>
                            <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        </MasterDetailGrid>
                        <MasterDetailSection
                            title="Type Details"
                            description={detailsLoading ? 'Loading type details...' : undefined}
                        >
                            {detailsLoading ? (
                                <MasterDetailGrid columns={1}>
                                    <MasterDetailCard label="Status" value="Loading..." />
                                </MasterDetailGrid>
                            ) : (
                                <div className="border-1 surface-border border-round overflow-hidden">
                                    <DataTable
                                        value={viewDetails}
                                        dataKey="productAttributeId"
                                        responsiveLayout="scroll"
                                        size="small"
                                        className="p-datatable-sm"
                                        emptyMessage="No details added."
                                        scrollable
                                        scrollHeight="16rem"
                                    >
                                        <Column
                                            header="#"
                                            body={(_row: ProductAttributeRow, options) => options.rowIndex + 1}
                                            style={{ width: '4rem' }}
                                        />
                                        <Column
                                            header="Detail"
                                            body={(row: ProductAttributeRow) => row.detail || '-'}
                                        />
                                    </DataTable>
                                </div>
                            )}
                        </MasterDetailSection>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
