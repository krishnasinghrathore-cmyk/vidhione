'use client';
import React, { useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { apolloClient } from '@/lib/apolloClient';

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
    orderNo: number | null;
    isActive: boolean;
};

const formSchema = z.object({
    code: z.string().trim().min(1, 'Code is required'),
    name: z.string().trim().min(1, 'Name is required'),
    orderNo: z.number().int().nonnegative().optional().nullable(),
    isActive: z.boolean()
});

const DEFAULT_FORM: FormState = {
    code: '',
    name: '',
    orderNo: null,
    isActive: true
};

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function AccountsPaymentViaPage() {
    const toastRef = useRef<Toast>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [includeInactive, setIncludeInactive] = useState(true);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<PaymentViaRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(PAYMENT_VIA_MASTERS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit, includeInactive }
    });
    const [createPaymentVia] = useMutation(CREATE_PAYMENT_VIA, { client: apolloClient });
    const [updatePaymentVia] = useMutation(UPDATE_PAYMENT_VIA, { client: apolloClient });
    const [deletePaymentVia] = useMutation(DELETE_PAYMENT_VIA, { client: apolloClient });

    const rows: PaymentViaRow[] = useMemo(() => data?.paymentViaMasters ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.paymentViaId, row.code, row.name, row.orderNo]
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

    const openEdit = (row: PaymentViaRow) => {
        setEditing(row);
        setForm({
            code: row.code ?? '',
            name: row.name ?? '',
            orderNo: row.orderNo ?? null,
            isActive: row.isActive !== false
        });
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
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                orderNo: form.orderNo != null ? Number(form.orderNo) : null,
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
                await createPaymentVia({ variables });
            }

            await refetch();
            setDialogVisible(false);
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
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.paymentViaId)
        });
    };

    const actionsBody = (row: PaymentViaRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(e) => confirmDelete(e, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <Dialog
                header={editing ? `Edit Payment Via #${editing.paymentViaId}` : 'New Payment Via'}
                visible={dialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={() => setDialogVisible(false)}
                footer={
                    <div className="flex justify-content-end gap-2 w-full">
                        <Button label="Cancel" className="p-button-text" onClick={() => setDialogVisible(false)} disabled={saving} />
                        <Button label={saving ? 'Saving...' : 'Save'} icon="pi pi-check" onClick={save} disabled={saving} />
                    </div>
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Code</label>
                        <InputText value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} />
                        {formErrors.code && <small className="text-red-500">{formErrors.code}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={{ width: '100%' }} />
                        {formErrors.name && <small className="text-red-500">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-2">
                        <label className="block text-600 mb-1">Order</label>
                        <InputNumber value={form.orderNo} onValueChange={(e) => setForm((prev) => ({ ...prev, orderNo: e.value as number | null }))} min={0} />
                    </div>
                    <div className="col-12 md:col-4">
                        <div className="flex align-items-center gap-2 mt-2">
                            <Checkbox
                                inputId="payment-via-active"
                                checked={form.isActive}
                                onChange={(e) => setForm((prev) => ({ ...prev, isActive: Boolean(e.checked) }))}
                            />
                            <label htmlFor="payment-via-active">Active</label>
                        </div>
                    </div>
                </div>
            </Dialog>

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Payment Via</h2>
                        <p className="mt-2 mb-0 text-600">Maintain bank payment modes for vouchers.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Payment Via" icon="pi pi-plus" onClick={openNew} />
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
                loading={loading}
                headerLeft={
                    <div className="flex flex-column md:flex-row gap-2" style={{ minWidth: '320px' }}>
                        <span className="p-input-icon-left" style={{ minWidth: '220px' }}>
                            <i className="pi pi-search" />
                            <InputText value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment via" style={{ width: '100%' }} />
                        </span>
                        <AppDropdown
                            value={limit}
                            options={limitOptions}
                            onChange={(e) => setLimit(e.value)}
                            placeholder="Limit"
                            style={{ width: '110px' }}
                        />
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
                <Column field="paymentViaId" header="ID" sortable style={{ width: '6rem' }} />
                <Column field="code" header="Code" sortable style={{ width: '8rem' }} />
                <Column field="name" header="Name" sortable />
                <Column field="orderNo" header="Order" sortable style={{ width: '7rem', textAlign: 'right' }} />
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
