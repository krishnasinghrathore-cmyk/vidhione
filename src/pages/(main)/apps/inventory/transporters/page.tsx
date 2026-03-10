'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import AppInput from '@/components/AppInput';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
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
import {
    confirmMasterDialogClose,
    focusElementById,
    focusElementByIdNextFrame,
    getMasterSaveButtonLabel
} from '@/lib/masterFormDialog';
import { MASTER_DETAIL_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

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

const toOptionalText = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
};

export default function InventoryTransportersPage() {
    const nameInputId = 'transporter-name-input';
    const aliasInputId = 'transporter-alias-input';
    const address1InputId = 'transporter-address1-input';
    const address2InputId = 'transporter-address2-input';
    const address3InputId = 'transporter-address3-input';
    const cityInputId = 'transporter-city-input';
    const postalInputId = 'transporter-postal-input';
    const mobileInputId = 'transporter-mobile-input';
    const emailInputId = 'transporter-email-input';
    const websiteInputId = 'transporter-website-input';
    const officePhoneInputId = 'transporter-office-phone-input';
    const residencePhoneInputId = 'transporter-residence-phone-input';
    const saveButtonId = 'transporter-save-button';

    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<TransporterRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<TransporterRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

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
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
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

    const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: TransporterRow) => {
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
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
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
            <ConfirmDialog />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Transporters</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain transporter records for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Transporter" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('transporters')} buttonAriaLabel="Open Transporters help" />
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
                        <AppInput
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
                            label="Refresh"
                            icon="pi pi-refresh"
                            className="p-button-text"
                            onClick={() => {
                                refetch();
                                refetchCities();
                            }}
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
                        saveLabel={saveButtonLabel}
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
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            id={nameInputId}
                            autoFocus
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            onEnterNext={() => focusElementById(aliasInputId)}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Alias</label>
                        <AppInput
                            id={aliasInputId}
                            value={form.alias}
                            onChange={(e) => setForm((s) => ({ ...s, alias: e.target.value }))}
                            onEnterNext={() => focusElementById(address1InputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 1</label>
                        <AppInput
                            id={address1InputId}
                            value={form.addressLine1}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine1: e.target.value }))}
                            onEnterNext={() => focusElementById(address2InputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 2</label>
                        <AppInput
                            id={address2InputId}
                            value={form.addressLine2}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine2: e.target.value }))}
                            onEnterNext={() => focusElementById(address3InputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12">
                        <label className="block text-600 mb-1">Address Line 3</label>
                        <AppInput
                            id={address3InputId}
                            value={form.addressLine3}
                            onChange={(e) => setForm((s) => ({ ...s, addressLine3: e.target.value }))}
                            onEnterNext={() => focusElementById(cityInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">City</label>
                        <AppDropdown
                            inputId={cityInputId}
                            value={form.cityId}
                            options={cityDropdownOptions}
                            onChange={(e) => setForm((s) => ({ ...s, cityId: e.value ?? null }))}
                            onEnterNext={() => focusElementById(postalInputId)}
                            placeholder="Select city"
                            filter
                            showClear
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Postal Code</label>
                        <AppInput
                            id={postalInputId}
                            value={form.postalCode}
                            onChange={(e) => setForm((s) => ({ ...s, postalCode: e.target.value }))}
                            onEnterNext={() => focusElementById(mobileInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Mobile</label>
                        <AppInput
                            id={mobileInputId}
                            value={form.mobileNumber}
                            onChange={(e) => setForm((s) => ({ ...s, mobileNumber: e.target.value }))}
                            onEnterNext={() => focusElementById(emailInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Email</label>
                        <AppInput
                            id={emailInputId}
                            value={form.email}
                            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                            onEnterNext={() => focusElementById(websiteInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Website</label>
                        <AppInput
                            id={websiteInputId}
                            value={form.website}
                            onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))}
                            onEnterNext={() => focusElementById(officePhoneInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Office Phone</label>
                        <AppInput
                            id={officePhoneInputId}
                            value={form.officePhone}
                            onChange={(e) => setForm((s) => ({ ...s, officePhone: e.target.value }))}
                            onEnterNext={() => focusElementById(residencePhoneInputId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="col-12 md:col-6">
                        <label className="block text-600 mb-1">Residence Phone</label>
                        <AppInput
                            id={residencePhoneInputId}
                            value={form.residencePhone}
                            onChange={(e) => setForm((s) => ({ ...s, residencePhone: e.target.value }))}
                            onEnterNext={() => focusElementById(saveButtonId)}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Transporter Details"
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
                        <MasterDetailSection title="Basic Info">
                            <MasterDetailGrid columns={2}>
                                <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                                <MasterDetailCard label="Alias" value={detailRow.alias || '-'} />
                                <MasterDetailCard
                                    label="City"
                                    value={detailRow.cityId ? cityMap.get(detailRow.cityId) ?? detailRow.cityId : '-'}
                                />
                                <MasterDetailCard label="Postal Code" value={detailRow.postalCode || '-'} />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                        <MasterDetailSection title="Address">
                            <MasterDetailGrid columns={1}>
                                <MasterDetailCard
                                    label="Address"
                                    value={[detailRow.addressLine1, detailRow.addressLine2, detailRow.addressLine3].filter(Boolean).join(', ') || '-'}
                                />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                        <MasterDetailSection title="Contact">
                            <MasterDetailGrid columns={2}>
                                <MasterDetailCard label="Mobile" value={detailRow.mobileNumber || '-'} />
                                <MasterDetailCard label="Office Phone" value={detailRow.officePhone || '-'} />
                                <MasterDetailCard label="Residence Phone" value={detailRow.residencePhone || '-'} />
                                <MasterDetailCard label="Email" value={detailRow.email || '-'} />
                                <MasterDetailCard label="Website" value={detailRow.website || '-'} />
                            </MasterDetailGrid>
                        </MasterDetailSection>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
