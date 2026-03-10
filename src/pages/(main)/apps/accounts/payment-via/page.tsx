'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import AppInput from '@/components/AppInput';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { apolloClient } from '@/lib/apolloClient';
import { MASTER_DETAIL_DIALOG_WIDTHS, MASTER_EDIT_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

interface PaymentViaRow {
    paymentViaId: number;
    code: string | null;
    name: string | null;
    orderNo: number | null;
    isActive: boolean | null;
}

const PAYMENT_VIA_MASTERS = gql`
    query PaymentViaMasters($search: String, $limit: Int, $includeInactive: Boolean) {
        paymentViaMasters(search: $search, limit: $limit, includeInactive: $includeInactive) {
            paymentViaId
            code
            name
            orderNo
            isActive
        }
    }
`;

const CREATE_PAYMENT_VIA = gql`
    mutation CreatePaymentViaMaster($code: String!, $name: String!, $orderNo: Int, $isActive: Boolean) {
        createPaymentViaMaster(code: $code, name: $name, orderNo: $orderNo, isActive: $isActive) {
            paymentViaId
        }
    }
`;

const UPDATE_PAYMENT_VIA = gql`
    mutation UpdatePaymentViaMaster($paymentViaId: Int!, $code: String, $name: String, $orderNo: Int, $isActive: Boolean) {
        updatePaymentViaMaster(paymentViaId: $paymentViaId, code: $code, name: $name, orderNo: $orderNo, isActive: $isActive) {
            paymentViaId
        }
    }
`;

const DELETE_PAYMENT_VIA = gql`
    mutation DeletePaymentViaMaster($paymentViaId: Int!) {
        deletePaymentViaMaster(paymentViaId: $paymentViaId)
    }
`;

type FormState = {
    code: string;
    name: string;
    isActive: boolean;
};

const formSchema = z.object({
    code: z.string().trim().min(1, 'Code is required'),
    name: z.string().trim().min(1, 'Name is required'),
    isActive: z.boolean()
});

const DEFAULT_FORM: FormState = {
    code: '',
    name: '',
    isActive: true
};

export default function AccountsPaymentViaPage() {
    const toastRef = useRef<Toast>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [includeInactive, setIncludeInactive] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<PaymentViaRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<PaymentViaRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [orderedRows, setOrderedRows] = useState<PaymentViaRow[]>([]);
    const [reordering, setReordering] = useState(false);

    const { data, loading, error, refetch } = useQuery(PAYMENT_VIA_MASTERS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit, includeInactive }
    });
    const [createPaymentVia] = useMutation(CREATE_PAYMENT_VIA, { client: apolloClient });
    const [updatePaymentVia] = useMutation(UPDATE_PAYMENT_VIA, { client: apolloClient });
    const [deletePaymentVia] = useMutation(DELETE_PAYMENT_VIA, { client: apolloClient });

    const rows: PaymentViaRow[] = useMemo(() => data?.paymentViaMasters ?? [], [data]);
    useEffect(() => {
        setOrderedRows(rows);
    }, [rows]);
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(orderedRows, editing), [orderedRows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(orderedRows, detailRow), [orderedRows, detailRow]);
    const canReorderRows = useMemo(() => !search.trim() && includeInactive, [includeInactive, search]);
    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return orderedRows;
        return orderedRows.filter((row) =>
            [row.paymentViaId, row.code, row.name, row.orderNo]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [orderedRows, search]);

    const openNew = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: PaymentViaRow) => {
        setEditing(row);
        setForm({
            code: row.code ?? '',
            name: row.name ?? '',
            isActive: row.isActive !== false
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: PaymentViaRow) => {
        setDetailRow(row);
        setDetailVisible(true);
    };

    const navigateEditRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(orderedRows, editingIndex, direction);
        if (!nextRow) return;
        openEdit(nextRow);
    };

    const navigateDetailRecord = (direction: MasterDialogDirection) => {
        const nextRow = getMasterRowByDirection(orderedRows, detailIndex, direction);
        if (!nextRow) return;
        openView(nextRow);
    };

    const resolveNextOrderNo = async () => {
        const { data: freshData } = await apolloClient.query({
            query: PAYMENT_VIA_MASTERS,
            variables: { search: null, limit, includeInactive: true },
            fetchPolicy: 'network-only'
        });
        const freshRows = (freshData?.paymentViaMasters ?? []) as PaymentViaRow[];
        return (
            freshRows.reduce((maxOrder, row) => {
                const currentOrder = Number(row.orderNo ?? 0);
                return Number.isFinite(currentOrder) ? Math.max(maxOrder, currentOrder) : maxOrder;
            }, 0) + 1
        );
    };

    const handleRowReorder = async (nextRows: PaymentViaRow[]) => {
        if (!canReorderRows || reordering) return;

        const changedRows = nextRows
            .map((row, index) => ({ row, nextOrderNo: index + 1 }))
            .filter(({ row, nextOrderNo }) => Number(row.orderNo ?? 0) !== nextOrderNo);
        const normalizedRows = nextRows.map((row, index) => ({ ...row, orderNo: index + 1 }));

        setOrderedRows(normalizedRows);
        if (!changedRows.length) return;

        setReordering(true);
        try {
            await Promise.all(
                changedRows.map(({ row, nextOrderNo: updatedOrderNo }) =>
                    updatePaymentVia({
                        variables: {
                            paymentViaId: row.paymentViaId,
                            orderNo: updatedOrderNo
                        }
                    })
                )
            );
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Order Updated',
                detail: 'Payment via display order updated.'
            });
        } catch (e: any) {
            setOrderedRows(rows);
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Reorder failed.'
            });
        } finally {
            setReordering(false);
        }
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
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                isActive: Boolean(form.isActive)
            };

            if (editing) {
                await updatePaymentVia({
                    variables: {
                        paymentViaId: editing.paymentViaId,
                        ...variables
                    }
                });
            } else {
                const nextOrderNo = await resolveNextOrderNo();
                await createPaymentVia({
                    variables: {
                        ...variables,
                        orderNo: nextOrderNo
                    }
                });
            }

            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Payment via saved.'
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

    const handleDelete = async (paymentViaId: number) => {
        try {
            await deletePaymentVia({ variables: { paymentViaId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Payment via deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: PaymentViaRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this payment via?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.paymentViaId)
        });
    };

    const actionsBody = (row: PaymentViaRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => confirmDelete(e, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <Dialog
                header={editing ? 'Edit Payment Via' : 'New Payment Via'}
                visible={dialogVisible}
                style={{ width: MASTER_EDIT_DIALOG_WIDTHS.medium }}
                onShow={() => setInitialForm(form)}
                onHide={() => setDialogVisible(false)}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={() => setDialogVisible(false)}
                        cancelDisabled={saving}
                        onSave={save}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                        saveDisabled={saving || !isFormDirty}
                    />
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Code</label>
                        <AppInput value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} style={{ width: '100%' }} />
                        {formErrors.code && <small className="text-red-500">{formErrors.code}</small>}
                    </div>
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={{ width: '100%' }} />
                        {formErrors.name && <small className="text-red-500">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <div className="flex align-items-center gap-2 mt-2">
                            <Checkbox
                                inputId="payment-via-active"
                                checked={form.isActive}
                                onChange={(e) => setForm((prev) => ({ ...prev, isActive: Boolean(e.checked) }))}
                            />
                            <label htmlFor="payment-via-active">Active</label>
                        </div>
                    </div>
                    <div className="col-12">
                        <small className="text-600">Display order is managed from the list by dragging rows.</small>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Payment Via Details"
                visible={detailVisible}
                style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.medium }}
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
                    <MasterDetailGrid columns={2}>
                        <MasterDetailCard label="Code" value={detailRow.code ?? '-'} />
                        <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        <MasterDetailCard label="Display Order" value={detailRow.orderNo ?? '-'} />
                        <MasterDetailCard label="Active" value={detailRow.isActive === false ? 'No' : 'Yes'} />
                    </MasterDetailGrid>
                )}
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Payment Via</h2>
                        <p className="mt-2 mb-0 text-600">Maintain bank payment modes for vouchers.</p>
                        <p className="mt-2 mb-0 text-500 text-sm">
                            {canReorderRows
                                ? 'Drag rows from the handle to set display order.'
                                : 'Clear search and enable Show inactive to reorder display order.'}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button label="New Payment Via" icon="pi pi-plus" className="app-action-compact" onClick={openNew} />
                        <AppHelpDialogButton {...getMasterPageHelp('paymentVia')} buttonAriaLabel="Open Payment Via help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading payment via: {error.message}</p>}
            </div>

            <AppDataTable
                value={filteredRows}
                paginator
                rows={15}
                rowsPerPageOptions={[15, 30, 50, 100]}
                dataKey="paymentViaId"
                stripedRows
                size="small"
                loading={loading || reordering}
                reorderableRows={canReorderRows}
                onRowReorder={(event) => {
                    void handleRowReorder(event.value as PaymentViaRow[]);
                }}
                headerLeft={
                    <div className="flex flex-column md:flex-row gap-2" style={{ minWidth: '320px' }}>
                        <span className="p-input-icon-left" style={{ minWidth: '220px' }}>
                            <i className="pi pi-search" />
                            <AppInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment via" style={{ width: '100%' }} />
                        </span>
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="payment-via-include-inactive"
                                checked={includeInactive}
                                onChange={(e) => setIncludeInactive(Boolean(e.checked))}
                            />
                            <label htmlFor="payment-via-include-inactive">Show inactive</label>
                        </div>
                    </div>
                }
                headerRight={<Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />}
                recordSummary={`${filteredRows.length} payment via${filteredRows.length === 1 ? '' : 's'}`}
            >
                {canReorderRows ? <Column rowReorder style={{ width: '3rem' }} /> : null}
                <Column field="paymentViaId" header="ID" style={{ width: '6rem' }} />
                <Column field="code" header="Code" style={{ width: '8rem' }} />
                <Column field="name" header="Name" />
                <Column field="orderNo" header="Order" style={{ width: '7rem', textAlign: 'right' }} />
                <Column
                    field="isActive"
                    header="Active"
                    body={(row: PaymentViaRow) => (row.isActive === false ? 'No' : 'Yes')}
                    style={{ width: '6rem', textAlign: 'center' }}
                />
                <Column header="Actions" body={actionsBody} style={{ width: '6rem' }} />
            </AppDataTable>
        </div>
    );
}
