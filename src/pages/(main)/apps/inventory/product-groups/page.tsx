'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
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

interface ProductGroupRow {
    productGroupId: number;
    name: string | null;
    isShowInPurchaseFlag: number | null;
    isShowInSaleFlag: number | null;
    highlightInReceiptFlag: number | null;
}

const PRODUCT_GROUPS = gql`
    query ProductGroups($search: String, $limit: Int) {
        productGroups(search: $search, limit: $limit) {
            productGroupId
            name
            isShowInPurchaseFlag
            isShowInSaleFlag
            highlightInReceiptFlag
        }
    }
`;

const CREATE_PRODUCT_GROUP = gql`
    mutation CreateProductGroup(
        $name: String!
        $isShowInPurchaseFlag: Int
        $isShowInSaleFlag: Int
        $highlightInReceiptFlag: Int
    ) {
        createProductGroup(
            name: $name
            isShowInPurchaseFlag: $isShowInPurchaseFlag
            isShowInSaleFlag: $isShowInSaleFlag
            highlightInReceiptFlag: $highlightInReceiptFlag
        ) {
            productGroupId
        }
    }
`;

const UPDATE_PRODUCT_GROUP = gql`
    mutation UpdateProductGroup(
        $productGroupId: Int!
        $name: String
        $isShowInPurchaseFlag: Int
        $isShowInSaleFlag: Int
        $highlightInReceiptFlag: Int
    ) {
        updateProductGroup(
            productGroupId: $productGroupId
            name: $name
            isShowInPurchaseFlag: $isShowInPurchaseFlag
            isShowInSaleFlag: $isShowInSaleFlag
            highlightInReceiptFlag: $highlightInReceiptFlag
        ) {
            productGroupId
        }
    }
`;

const DELETE_PRODUCT_GROUP = gql`
    mutation DeleteProductGroup($productGroupId: Int!) {
        deleteProductGroup(productGroupId: $productGroupId)
    }
`;

type FormState = {
    name: string;
    isShowInPurchaseFlag: boolean;
    isShowInSaleFlag: boolean;
    highlightInReceiptFlag: boolean;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    isShowInPurchaseFlag: z.boolean(),
    isShowInSaleFlag: z.boolean(),
    highlightInReceiptFlag: z.boolean()
});

const DEFAULT_FORM: FormState = {
    name: '',
    isShowInPurchaseFlag: false,
    isShowInSaleFlag: false,
    highlightInReceiptFlag: false
};
const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

const flagToBool = (value: number | null | undefined) => Number(value || 0) === 1;
const boolToFlag = (value: boolean) => (value ? 1 : 0);

export default function InventoryProductGroupsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ProductGroupRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ProductGroupRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(PRODUCT_GROUPS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createProductGroup] = useMutation(CREATE_PRODUCT_GROUP, { client: inventoryApolloClient });
    const [updateProductGroup] = useMutation(UPDATE_PRODUCT_GROUP, { client: inventoryApolloClient });
    const [deleteProductGroup] = useMutation(DELETE_PRODUCT_GROUP, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: ProductGroupRow[] = useMemo(() => data?.productGroups ?? [], [data]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: ProductGroupRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            isShowInPurchaseFlag: flagToBool(row.isShowInPurchaseFlag),
            isShowInSaleFlag: flagToBool(row.isShowInSaleFlag),
            highlightInReceiptFlag: flagToBool(row.highlightInReceiptFlag)
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: ProductGroupRow) => {
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
            setTimeout(() => nameInputRef.current?.focus(), 0);
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
                isShowInPurchaseFlag: boolToFlag(form.isShowInPurchaseFlag),
                isShowInSaleFlag: boolToFlag(form.isShowInSaleFlag),
                highlightInReceiptFlag: boolToFlag(form.highlightInReceiptFlag)
            };

            if (editing) {
                await updateProductGroup({
                    variables: {
                        productGroupId: editing.productGroupId,
                        ...variables
                    }
                });
            } else {
                await createProductGroup({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Product group saved.'
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

    const handleDelete = async (productGroupId: number) => {
        try {
            await deleteProductGroup({ variables: { productGroupId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Product group deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'product group')
            });
        }
    };

    const confirmDelete = async () => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('PRODUCT_GROUP', row.productGroupId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('product group', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('product group')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.productGroupId)
        });
    };

    const flagsBody = (row: ProductGroupRow) => {
        const flags: React.ReactNode[] = [];
        if (flagToBool(row.isShowInPurchaseFlag)) {
            flags.push(<Tag key="purchase" value="Purchase" severity="info" />);
        }
        if (flagToBool(row.isShowInSaleFlag)) {
            flags.push(<Tag key="sale" value="Sale" severity="success" />);
        }
        if (flagToBool(row.highlightInReceiptFlag)) {
            flags.push(<Tag key="receipt" value="Receipt" severity="warning" />);
        }
        if (flags.length === 0) return <Tag value="-" severity="secondary" />;
        return <div className="flex gap-1 flex-wrap">{flags}</div>;
    };

    const actionsBody = (row: ProductGroupRow) => (
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
                        <h2 className="m-0">Product Groups</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain product grouping for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Group" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading product groups: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="productGroupId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as ProductGroupRow) : openView(e.data as ProductGroupRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search product group"
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
                            Showing {rows.length} group{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} group${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Flags" body={flagsBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Product Group' : 'New Product Group'}
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
                            ref={nameInputRef}
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <div className="flex flex-wrap gap-4">
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="igPurchase"
                                    checked={form.isShowInPurchaseFlag}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, isShowInPurchaseFlag: !!e.checked }))
                                    }
                                />
                                <label htmlFor="igPurchase" className="text-sm text-600">
                                    Show in Purchase
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="igSale"
                                    checked={form.isShowInSaleFlag}
                                    onChange={(e) => setForm((s) => ({ ...s, isShowInSaleFlag: !!e.checked }))}
                                />
                                <label htmlFor="igSale" className="text-sm text-600">
                                    Show in Sale
                                </label>
                            </span>
                            <span className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="igReceipt"
                                    checked={form.highlightInReceiptFlag}
                                    onChange={(e) =>
                                        setForm((s) => ({ ...s, highlightInReceiptFlag: !!e.checked }))
                                    }
                                />
                                <label htmlFor="igReceipt" className="text-sm text-600">
                                    Highlight in Receipt
                                </label>
                            </span>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Product Group Details"
                visible={detailVisible}
                style={{ width: 'min(620px, 96vw)' }}
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
                        <div><strong>Show in Purchase:</strong> {flagToBool(detailRow.isShowInPurchaseFlag) ? 'Yes' : 'No'}</div>
                        <div><strong>Show in Sale:</strong> {flagToBool(detailRow.isShowInSaleFlag) ? 'Yes' : 'No'}</div>
                        <div><strong>Highlight in Receipt:</strong> {flagToBool(detailRow.highlightInReceiptFlag) ? 'Yes' : 'No'}</div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
