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
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';

interface ProductBrandRow {
    productBrandId: number;
    name: string | null;
}

const PRODUCT_BRANDS = gql`
    query ProductBrands {
        productBrands {
            productBrandId
            name
        }
    }
`;

const CREATE_PRODUCT_BRAND = gql`
    mutation CreateProductBrand($name: String!) {
        createProductBrand(name: $name) {
            productBrandId
        }
    }
`;

const UPDATE_PRODUCT_BRAND = gql`
    mutation UpdateProductBrand($productBrandId: Int!, $name: String) {
        updateProductBrand(productBrandId: $productBrandId, name: $name) {
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
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

const DEFAULT_FORM: FormState = {
    name: ''
};

export default function InventoryProductBrandsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductBrandRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(PRODUCT_BRANDS, { client: inventoryApolloClient });
    const [createProductBrand] = useMutation(CREATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [updateProductBrand] = useMutation(UPDATE_PRODUCT_BRAND, { client: inventoryApolloClient });
    const [deleteProductBrand] = useMutation(DELETE_PRODUCT_BRAND, { client: inventoryApolloClient });

    const rows: ProductBrandRow[] = useMemo(() => data?.productBrands ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.productBrandId, row.name]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const openNew = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: ProductBrandRow) => {
        setEditing(row);
        setForm({ name: row.name ?? '' });
        setFormErrors({});
        setDialogVisible(true);
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

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim()
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
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: ProductBrandRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this product brand?',
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
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => confirmDelete(e, row)} />
        </div>
    );

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
                        <Button label="New Brand" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading product brands: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="productBrandId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as ProductBrandRow)}
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
                            disabled={filteredRows.length === 0}
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
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} brand{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} brand${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
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
                </div>
            </Dialog>
        </div>
    );
}
