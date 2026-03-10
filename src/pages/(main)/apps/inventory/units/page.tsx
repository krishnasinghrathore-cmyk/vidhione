'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import AppInput from '@/components/AppInput';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid } from '@/components/MasterDetailLayout';
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

interface UnitRow {
    unitId: number;
    name: string | null;
    einvoiceUnitName: string | null;
    einvoiceUnitAlias: string | null;
}

const UNITS = gql`
    query Units($search: String, $limit: Int) {
        units(search: $search, limit: $limit) {
            unitId
            name
            einvoiceUnitName
            einvoiceUnitAlias
        }
    }
`;

const CREATE_UNIT = gql`
    mutation CreateUnit($name: String!, $einvoiceUnitName: String, $einvoiceUnitAlias: String) {
        createUnit(name: $name, einvoiceUnitName: $einvoiceUnitName, einvoiceUnitAlias: $einvoiceUnitAlias) {
            unitId
        }
    }
`;

const UPDATE_UNIT = gql`
    mutation UpdateUnit($unitId: Int!, $name: String, $einvoiceUnitName: String, $einvoiceUnitAlias: String) {
        updateUnit(
            unitId: $unitId
            name: $name
            einvoiceUnitName: $einvoiceUnitName
            einvoiceUnitAlias: $einvoiceUnitAlias
        ) {
            unitId
        }
    }
`;

const DELETE_UNIT = gql`
    mutation DeleteUnit($unitId: Int!) {
        deleteUnit(unitId: $unitId)
    }
`;

type FormState = {
    name: string;
    einvoiceUnitName: string;
    einvoiceUnitAlias: string;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    einvoiceUnitName: z.string(),
    einvoiceUnitAlias: z.string()
});

const DEFAULT_FORM: FormState = {
    name: '',
    einvoiceUnitName: '',
    einvoiceUnitAlias: ''
};

export default function InventoryUnitsPage() {
    const nameInputId = 'unit-name-input';
    const einvoiceNameInputId = 'unit-einvoice-name-input';
    const einvoiceAliasInputId = 'unit-einvoice-alias-input';
    const saveButtonId = 'unit-save-button';

    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<UnitRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<UnitRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(UNITS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first',
        notifyOnNetworkStatusChange: true
    });
    const [createUnit] = useMutation(CREATE_UNIT, { client: inventoryApolloClient });
    const [updateUnit] = useMutation(UPDATE_UNIT, { client: inventoryApolloClient });
    const [deleteUnit] = useMutation(DELETE_UNIT, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: UnitRow[] = useMemo(() => data?.units ?? [], [data]);
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);

    const focusElementById = (id: string) => {
        if (typeof document === 'undefined') return false;
        const element = document.getElementById(id);
        if (!element) return false;
        element.focus();
        return true;
    };

    const focusNameInput = () => {
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                focusElementById(nameInputId);
            });
        });
    };

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

    const openEdit = (row: UnitRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({
            name: row.name ?? '',
            einvoiceUnitName: row.einvoiceUnitName ?? '',
            einvoiceUnitAlias: row.einvoiceUnitAlias ?? ''
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: UnitRow) => {
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
                einvoiceUnitName: form.einvoiceUnitName.trim() || null,
                einvoiceUnitAlias: form.einvoiceUnitAlias.trim() || null
            };

            if (editing) {
                await updateUnit({
                    variables: {
                        unitId: editing.unitId,
                        ...variables
                    }
                });
            } else {
                await createUnit({ variables });
            }

            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Unit saved.'
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

    const handleDelete = async (unitId: number) => {
        try {
            await deleteUnit({ variables: { unitId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Unit deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'unit')
            });
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLElement>, row: UnitRow) => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('UNIT', row.unitId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('unit', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('unit')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.unitId)
        });
    };

    const actionsBody = (row: UnitRow) => (
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
                        <h2 className="m-0">Units</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain unit definitions for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button label="New Unit" icon="pi pi-plus" className="app-action-compact" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('units')} buttonAriaLabel="Open Units help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading units: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="unitId"
                stripedRows
                size="small"
                loading={loading}
                emptyMessage={search.trim() ? 'No units match your search.' : 'No units found.'}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as UnitRow) : openView(e.data as UnitRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search unit"
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
                            Showing {rows.length} unit{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} unit${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="einvoiceUnitName" header="eInvoice Unit Name" sortable />
                <Column field="einvoiceUnitAlias" header="eInvoice Unit Alias" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Unit' : 'New Unit'}
                visible={dialogVisible}
                style={{ width: 'min(680px, 96vw)' }}
                onShow={() => {
                    setInitialForm(form);
                    focusNameInput();
                }}
                onHide={() => setDialogVisible(false)}
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
                        onCancel={() => setDialogVisible(false)}
                        cancelDisabled={saving}
                        onSave={save}
                        saveDisabled={saving || !isFormDirty}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                        saveButtonId={saveButtonId}
                    />
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            id={nameInputId}
                            autoFocus
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            onEnterNext={() => focusElementById(einvoiceNameInputId)}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">eInvoice Unit Name</label>
                        <AppInput
                            id={einvoiceNameInputId}
                            value={form.einvoiceUnitName}
                            onChange={(e) => setForm((s) => ({ ...s, einvoiceUnitName: e.target.value }))}
                            onEnterNext={() => focusElementById(einvoiceAliasInputId)}
                            style={{ width: '100%' }}
                            placeholder="Optional"
                        />
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">eInvoice Unit Alias</label>
                        <AppInput
                            id={einvoiceAliasInputId}
                            value={form.einvoiceUnitAlias}
                            onChange={(e) => setForm((s) => ({ ...s, einvoiceUnitAlias: e.target.value }))}
                            onEnterNext={() => focusElementById(saveButtonId)}
                            style={{ width: '100%' }}
                            placeholder="Optional"
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Unit Details"
                visible={detailVisible}
                style={{ width: MASTER_DETAIL_DIALOG_WIDTHS.standard }}
                contentClassName="pt-2 pb-2"
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
                    <MasterDetailGrid columns={3}>
                        <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        <MasterDetailCard label="eInvoice Unit Name" value={detailRow.einvoiceUnitName ?? '-'} />
                        <MasterDetailCard label="eInvoice Unit Alias" value={detailRow.einvoiceUnitAlias ?? '-'} />
                    </MasterDetailGrid>
                )}
            </Dialog>
        </div>
    );
}
