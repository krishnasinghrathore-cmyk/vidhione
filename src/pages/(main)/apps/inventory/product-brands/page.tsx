'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppMultiSelect from '@/components/AppMultiSelect';
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

interface ProductBrandRow {
    productBrandId: number;
    name: string | null;
    ledgerIds?: number[] | null;
}

const PRODUCT_BRANDS = gql`
    query ProductBrands($search: String, $limit: Int) {
        productBrands(search: $search, limit: $limit) {
            productBrandId
            name
            ledgerIds
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

const LEDGER_OPTIONS = gql`
    query LedgerOptions($search: String, $limit: Int) {
        ledgerOptions(search: $search, limit: $limit) {
            ledgerId
            name
        }
    }
`;

type FormState = {
    name: string;
    ledgerIds: number[];
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

const DEFAULT_FORM: FormState = {
    name: '',
    ledgerIds: []
};
const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({ label: String(value), value }));

export default function InventoryProductBrandsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductBrandRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductBrandRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(PRODUCT_BRANDS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const { data: ledgerOptionsData } = useQuery(LEDGER_OPTIONS, {
        client: inventoryApolloClient,
        variables: { search: null, limit: 2000 }
    });
    const [createProductBrand] = useMutation(CREATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [updateProductBrand] = useMutation(UPDATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [deleteProductBrand] = useMutation(DELETE_PRODUCT_BRAND, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: ProductBrandRow[] = useMemo(() => data?.productBrands ?? [], [data]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };
    const ledgerOptions = useMemo(
        () =>
            (ledgerOptionsData?.ledgerOptions ?? []).map((ledger: { ledgerId: number; name: string | null }) => ({
                label: ledger.name ?? `Ledger ${ledger.ledgerId}`,
                value: Number(ledger.ledgerId)
            })),
        [ledgerOptionsData]
    );
    const ledgerLabelById = useMemo(() => {
        const map = new Map<number, string>();
        ledgerOptions.forEach((option) => map.set(Number(option.value), option.label));
        return map;
    }, [ledgerOptions]);

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: ProductBrandRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            ledgerIds: (row.ledgerIds ?? []).map(Number).filter((value) => Number.isFinite(value))
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: ProductBrandRow) => {
        if (!assertActionAllowed('view')) return;
        setDetailRow(row);
        setDetailVisible(true);
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
            const variables = {
                name: form.name.trim(),
                ledgerIds: form.ledgerIds
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
            setDialogVisible(false);
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

    const confirmDelete = async () => {
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
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.productBrandId)
        });
    };

    const actionsBody = (row: ProductBrandRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} disabled={!masterPermissions.canView} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} disabled={!masterPermissions.canEdit} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => { void confirmDelete(e, row); }} disabled={!masterPermissions.canDelete} />
        </div>
    );

    const ledgerSummaryBody = (row: ProductBrandRow) => {
        const ids = (row.ledgerIds ?? []).map(Number).filter((value) => Number.isFinite(value));
        if (!ids.length) return <span className="text-500">-</span>;
        const labels = ids.map((id) => ledgerLabelById.get(id) ?? `Ledger ${id}`);
        return <span>{labels.join(', ')}</span>;
    };

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Product Brands</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product branding for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Brand" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading product brands: {error.message}</p>}
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
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as ProductBrandRow) : openView(e.data as ProductBrandRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
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
                            Showing {rows.length} brand{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} brand${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Ledger Mapping" body={ledgerSummaryBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Product Brand' : 'New Product Brand'}
                visible={dialogVisible}
                style={{ width: 'min(620px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button
                            label="Cancel"
                            className="p-button-text"
                            onClick={() => setDialogVisible(false)}
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
                        <label className="block text-600 mb-1">Mapped Ledgers</label>
                        <AppMultiSelect
                            value={form.ledgerIds}
                            options={ledgerOptions}
                            onChange={(e) =>
                                setForm((s) => ({
                                    ...s,
                                    ledgerIds: Array.isArray(e.value)
                                        ? e.value.map((value) => Number(value)).filter((value) => Number.isFinite(value))
                                        : []
                                }))
                            }
                            optionLabel="label"
                            optionValue="value"
                            filter
                            showClear
                            maxSelectedLabels={3}
                            placeholder="Select ledgers"
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Product Brand Details"
                visible={detailVisible}
                style={{ width: 'min(620px, 96vw)' }}
                onHide={() => setDetailVisible(false)}
            >
                {detailRow && (
                    <div className="flex flex-column gap-2 text-600">
                        <div>
                            <strong>Name:</strong> {detailRow.name ?? '-'}
                        </div>
                        <div>
                            <strong>Mapped Ledgers:</strong>{' '}
                            {(detailRow.ledgerIds ?? []).length
                                ? (detailRow.ledgerIds ?? [])
                                      .map(Number)
                                      .filter((value) => Number.isFinite(value))
                                      .map((id) => ledgerLabelById.get(id) ?? `Ledger ${id}`)
                                      .join(', ')
                                : '-'}
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
