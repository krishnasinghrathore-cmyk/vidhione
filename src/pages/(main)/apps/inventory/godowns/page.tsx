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
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchInventoryMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
import {
    getMasterActionDeniedDetail,
    isMasterActionAllowed,
    type MasterAction,
    useMasterActionPermissions
} from '@/lib/masterActionPermissions';
import { ensureDryEditCheck } from '@/lib/masterDryRun';

interface GodownRow {
    godownId: number;
    name: string | null;
}

const GODOWNS = gql`
    query Godowns($search: String, $limit: Int) {
        godowns(search: $search, limit: $limit) {
            godownId
            name
        }
    }
`;

const CREATE_GODOWN = gql`
    mutation CreateGodown($name: String!) {
        createGodown(name: $name) {
            godownId
        }
    }
`;

const UPDATE_GODOWN = gql`
    mutation UpdateGodown($godownId: Int!, $name: String) {
        updateGodown(godownId: $godownId, name: $name) {
            godownId
        }
    }
`;

const DELETE_GODOWN = gql`
    mutation DeleteGodown($godownId: Int!) {
        deleteGodown(godownId: $godownId)
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
const limitOptions = [100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function InventoryGodownsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<GodownRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<GodownRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(GODOWNS, {
        client: inventoryApolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [createGodown] = useMutation(CREATE_GODOWN, { client: inventoryApolloClient });
    const [updateGodown] = useMutation(UPDATE_GODOWN, { client: inventoryApolloClient });
    const [deleteGodown] = useMutation(DELETE_GODOWN, { client: inventoryApolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(inventoryApolloClient);

    const rows: GodownRow[] = useMemo(() => data?.godowns ?? [], [data]);

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

    const openEdit = (row: GodownRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setForm({ name: row.name ?? '' });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: GodownRow) => {
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
                name: form.name.trim()
            };

            if (editing) {
                await updateGodown({
                    variables: {
                        godownId: editing.godownId,
                        ...variables
                    }
                });
            } else {
                await createGodown({ variables });
            }

            await refetch();
            setDialogVisible(false);
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Godown saved.'
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

    const handleDelete = async (godownId: number) => {
        try {
            await deleteGodown({ variables: { godownId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Godown deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'godown')
            });
        }
    };

    const confirmDelete = async () => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchInventoryMasterDeleteImpact('GODOWN', row.godownId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('godown', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('godown')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.godownId)
        });
    };

    const actionsBody = (row: GodownRow) => (
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
                        <h2 className="m-0">Godowns</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain godown locations for the agency inventory masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="New Godown" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading godowns: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="godownId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as GodownRow) : openView(e.data as GodownRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search godown"
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
                            Showing {rows.length} godown{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} godown${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Godown' : 'New Godown'}
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

            <Dialog
                header="Godown Details"
                visible={detailVisible}
                style={{ width: 'min(520px, 96vw)' }}
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
                    </div>
                )}
            </Dialog>
        </div>
    );
}
