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
import AppDropdown from '@/components/AppDropdown';
import { z } from 'zod';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { useGeoCityOptions } from '@/lib/accounts/cities';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchInventoryMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
    getMasterActionDeniedDetail,
    isMasterActionAllowed,
    type MasterAction,
    useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';

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
    query Transporters($search: String, $limit: Int) {
        transporters(search: $search, limit: $limit) {
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

const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({ label: String(value), value }));

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export default function InventoryTransportersPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<TransporterRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<TransporterRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(TRANSPORTERS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createTransporter] = useMutation(CREATE_TRANSPORTER, { client: inventoryApolloClient });
    const [updateTransporter] = useMutation(UPDATE_TRANSPORTER, { client: inventoryApolloClient });
    const [deleteTransporter] = useMutation(DELETE_TRANSPORTER, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);
    const { options: cityOptions, error: cityError, refetch: refetchCities } = useGeoCityOptions({ limit: 2000 });

    const rows: TransporterRow[] = useMemo(() => data?.transporters ?? [], [data]);

    const assertActionAllowed = (action: MasterAction) => {
        if (isMasterActionAllowed(masterPermissions, action)) return true;
        toastRef.current?.show({
            severity: 'warn',
            summary: 'Permission Denied',
            detail: getMasterActionDeniedDetail(action)
        });
        return false;
    };
    const cityMap = useMemo(() => {
        const map = new Map<number, string>();
        cityOptions.forEach((city) => {
            map.set(city.cityId, city.label);
        });
        return map;
    }, [cityOptions]);
    const cityDropdownOptions = useMemo(
        () => cityOptions.map((city) => ({ label: city.label, value: city.cityId })),
        [cityOptions]
    );

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: TransporterRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
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

    const openView = (row: TransporterRow) => {
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
                detail: getDeleteFailureMessage(e, 'transporter')
            });
        }
    };

    const confirmDelete = async () => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('TRANSPORTER', row.transporterId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('transporter', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('transporter')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.transporterId)
        });
    };

    const cityBody = (row: TransporterRow) => {
        if (!row.cityId) return <span className="text-500">-</span>;
        return cityMap.get(row.cityId) ?? row.cityId;
    };

    const actionsBody = (row: TransporterRow) => (
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
                        <h2 className="m-0">Transport</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain transporter records for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Transporter" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading transporters: {error.message}</p>}
                {cityError && <p className="text-red-500 m-0">Error loading cities: {cityError.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="transporterId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as TransporterRow) : openView(e.data as TransporterRow))}
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
                            onClick={() => {
                                refetch();
                                refetchCities();
                            }}
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
                            Showing {rows.length} transporter{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} transporter${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="alias" header="Alias" sortable />
                <Column header="City" body={cityBody} />
                <Column field="mobileNumber" header="Mobile" />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
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
                        <label className="block text-600 mb-1">City</label>
                        <AppDropdown
                            value={form.cityId}
                            options={cityDropdownOptions}
                            onChange={(e) => setForm((s) => ({ ...s, cityId: e.value ?? null }))}
                            placeholder="Select city"
                            filter
                            showClear
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

            <Dialog
                header="Transporter Details"
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
                        <div><strong>Alias:</strong> {detailRow.alias || '-'}</div>
                        <div><strong>Address:</strong> {[detailRow.addressLine1, detailRow.addressLine2, detailRow.addressLine3].filter(Boolean).join(', ') || '-'}</div>
                        <div><strong>City:</strong> {detailRow.cityId ? cityMap.get(detailRow.cityId) ?? detailRow.cityId : '-'}</div>
                        <div><strong>Postal Code:</strong> {detailRow.postalCode || '-'}</div>
                        <div><strong>Mobile:</strong> {detailRow.mobileNumber || '-'}</div>
                        <div><strong>Office Phone:</strong> {detailRow.officePhone || '-'}</div>
                        <div><strong>Residence Phone:</strong> {detailRow.residencePhone || '-'}</div>
                        <div><strong>Email:</strong> {detailRow.email || '-'}</div>
                        <div><strong>Website:</strong> {detailRow.website || '-'}</div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
