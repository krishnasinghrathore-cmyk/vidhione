'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';

interface TransporterRow {
    transporterId: number;
    name: string | null;
    alias: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressLine3: string | null;
    cityId: number | null;
    postalCode: string | null;
    email: string | null;
    website: string | null;
    officePhone: string | null;
    residencePhone: string | null;
    mobileNumber: string | null;
}

const TRANSPORTERS = gql`
    query Transporters {
        transporters {
            transporterId
            name
            alias
            addressLine1
            addressLine2
            addressLine3
            cityId
            postalCode
            email
            website
            officePhone
            residencePhone
            mobileNumber
        }
    }
`;

const CREATE_TRANSPORTER = gql`
    mutation CreateTransporter(
        $name: String!
        $alias: String
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
    ) {
        createTransporter(
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
        ) {
            transporterId
        }
    }
`;

const UPDATE_TRANSPORTER = gql`
    mutation UpdateTransporter(
        $transporterId: Int!
        $name: String
        $alias: String
        $addressLine1: String
        $addressLine2: String
        $addressLine3: String
        $cityId: Int
        $postalCode: String
        $email: String
        $website: String
        $officePhone: String
        $residencePhone: String
        $mobileNumber: String
    ) {
        updateTransporter(
            transporterId: $transporterId
            name: $name
            alias: $alias
            addressLine1: $addressLine1
            addressLine2: $addressLine2
            addressLine3: $addressLine3
            cityId: $cityId
            postalCode: $postalCode
            email: $email
            website: $website
            officePhone: $officePhone
            residencePhone: $residencePhone
            mobileNumber: $mobileNumber
        ) {
            transporterId
        }
    }
`;

const DELETE_TRANSPORTER = gql`
    mutation DeleteTransporter($transporterId: Int!) {
        deleteTransporter(transporterId: $transporterId)
    }
`;

type FormState = {
    name: string;
    alias: string;
    addressLine1: string;
    addressLine2: string;
    addressLine3: string;
    cityId: number | null;
    postalCode: string;
    email: string;
    website: string;
    officePhone: string;
    residencePhone: string;
    mobileNumber: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    alias: z.string(),
    addressLine1: z.string(),
    addressLine2: z.string(),
    addressLine3: z.string(),
    cityId: z.number().int().nonnegative().nullable(),
    postalCode: z.string(),
    email: z.string(),
    website: z.string(),
    officePhone: z.string(),
    residencePhone: z.string(),
    mobileNumber: z.string()
});

const DEFAULT_FORM: FormState = {
    name: '',
    alias: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    cityId: null,
    postalCode: '',
    email: '',
    website: '',
    officePhone: '',
    residencePhone: '',
    mobileNumber: ''
};

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export default function InventoryTransportersPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<TransporterRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const { data, loading, error, refetch } = useQuery(TRANSPORTERS, { client: inventoryApolloClient });
    const [createTransporter] = useMutation(CREATE_TRANSPORTER, { client: inventoryApolloClient });
    const [updateTransporter] = useMutation(UPDATE_TRANSPORTER, { client: inventoryApolloClient });
    const [deleteTransporter] = useMutation(DELETE_TRANSPORTER, { client: inventoryApolloClient });

    const rows: TransporterRow[] = useMemo(() => data?.transporters ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [
                row.transporterId,
                row.name,
                row.alias,
                row.addressLine1,
                row.addressLine2,
                row.addressLine3,
                row.cityId,
                row.postalCode,
                row.email,
                row.website,
                row.officePhone,
                row.residencePhone,
                row.mobileNumber
            ]
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

    const openEdit = (row: TransporterRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            alias: row.alias ?? '',
            addressLine1: row.addressLine1 ?? '',
            addressLine2: row.addressLine2 ?? '',
            addressLine3: row.addressLine3 ?? '',
            cityId: row.cityId ?? null,
            postalCode: row.postalCode ?? '',
            email: row.email ?? '',
            website: row.website ?? '',
            officePhone: row.officePhone ?? '',
            residencePhone: row.residencePhone ?? '',
            mobileNumber: row.mobileNumber ?? ''
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
                name: form.name.trim(),
                alias: toOptionalText(form.alias),
                addressLine1: toOptionalText(form.addressLine1),
                addressLine2: toOptionalText(form.addressLine2),
                addressLine3: toOptionalText(form.addressLine3),
                cityId: form.cityId,
                postalCode: toOptionalText(form.postalCode),
                email: toOptionalText(form.email),
                website: toOptionalText(form.website),
                officePhone: toOptionalText(form.officePhone),
                residencePhone: toOptionalText(form.residencePhone),
                mobileNumber: toOptionalText(form.mobileNumber)
            };

            if (editing) {
                await updateTransporter({
                    variables: {
                        transporterId: editing.transporterId,
                        ...variables
                    }
                });
            } else {
                await createTransporter({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Transporter saved.'
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

    const handleDelete = async (transporterId: number) => {
        try {
            await deleteTransporter({ variables: { transporterId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Transporter deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: TransporterRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this transporter?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.transporterId)
        });
    };

    const actionsBody = (row: TransporterRow) => (
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
                        <h2 className="m-0">Transport</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain transporter records for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Transporter" icon="pi pi-plus" onClick={openNew} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading transporters: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="transporterId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as TransporterRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search transporters"
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
                            Showing {filteredRows.length} transporter{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} transporter${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="alias" header="Alias" sortable />
                <Column field="cityId" header="City ID" sortable />
                <Column field="mobileNumber" header="Mobile" />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Transporter' : 'New Transporter'}
                visible={dialogVisible}
                style={{ width: 'min(820px, 96vw)' }}
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
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <InputText
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Alias</label>
                        <InputText
                            value={form.alias}
                            onChange={(e) => setForm((s) => ({ ...s, alias: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 1</label>
                        <InputText
                            value={form.addressLine1}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 2</label>
                        <InputText
                            value={form.addressLine2}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 3</label>
                        <InputText
                            value={form.addressLine3}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine3: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">City ID</label>
                        <InputNumber
                            value={form.cityId}
                            onValueChange={(e) =>
                                setForm((s) => ({
                                    ...s,
                                    cityId: typeof e.value === 'number' ? e.value : null
                                }))
                            }
                            useGrouping={false}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Postal Code</label>
                        <InputText
                            value={form.postalCode}
                            onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Mobile</label>
                        <InputText
                            value={form.mobileNumber}
                            onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Email</label>
                        <InputText
                            value={form.email}
                            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Website</label>
                        <InputText
                            value={form.website}
                            onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Office Phone</label>
                        <InputText
                            value={form.officePhone}
                            onChange={(e) => setForm((s) => ({ ...s, officePhone: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Residence Phone</label>
                        <InputText
                            value={form.residencePhone}
                            onChange={(e) => setForm((s) => ({ ...s, residencePhone: e.target.value }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
