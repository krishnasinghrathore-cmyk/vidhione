'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { Checkbox } from 'primereact/checkbox';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { DataTable } from 'primereact/datatable';
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
import { MasterDetailGrid, MasterDetailSection } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { MASTER_DETAIL_DIALOG_WIDTHS, MASTER_EDIT_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';
import { getDeleteConfirmMessage, getDeleteFailureMessage } from '@/lib/deleteGuardrails';
import { fetchAccountsMasterDeleteImpact, getDeleteBlockedMessage } from '@/lib/masterDeleteImpact';
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

interface ManagerRow {
    managerId: number;
    name: string | null;
    salesmanIds?: number[] | null;
}

interface SalesmanOptionRow {
    salesmanId: number;
    name: string | null;
}

const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
            salesmanIds
        }
    }
`;

const SALESMEN = gql`
    query Salesmen($search: String, $limit: Int) {
        salesmen(search: $search, limit: $limit) {
            salesmanId
            name
        }
    }
`;

const CREATE_MANAGER = gql`
    mutation CreateManager($name: String!, $salesmanIds: [Int!]) {
        createManager(name: $name, salesmanIds: $salesmanIds) {
            managerId
        }
    }
`;

const UPDATE_MANAGER = gql`
    mutation UpdateManager($managerId: Int!, $name: String, $salesmanIds: [Int!]) {
        updateManager(managerId: $managerId, name: $name, salesmanIds: $salesmanIds) {
            managerId
        }
    }
`;

const DELETE_MANAGER = gql`
    mutation DeleteManager($managerId: Int!) {
        deleteManager(managerId: $managerId)
    }
`;

type FormState = {
    name: string;
    salesmanIds: number[];
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    salesmanIds: z.array(z.number().int().positive()).default([])
});

const DEFAULT_FORM: FormState = {
    name: '',
    salesmanIds: []
};

const normalizeIdList = (values?: Array<number | null | undefined> | null) =>
    Array.from(
        new Set(
            (values ?? [])
                .map((value) => Number(value))
                .filter((value) => Number.isFinite(value) && value > 0)
        )
    ).sort((a, b) => a - b);

const getSalesmanCheckboxId = (salesmanId: number) => `manager-salesman-checkbox-${salesmanId}`;

export default function AccountsManagersPage() {
    const nameInputId = 'manager-name-input';
    const salesmanSearchInputId = 'manager-salesman-search-input';
    const saveButtonId = 'manager-save-button';

    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [salesmanSearch, setSalesmanSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<ManagerRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<ManagerRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [dryEditDigest, setDryEditDigest] = useState('');

    const { data, loading, error, refetch } = useQuery(MANAGERS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const { data: salesmenData, loading: salesmenLoading } = useQuery(SALESMEN, {
        client: apolloClient,
        variables: { search: null, limit: 2000 }
    });
    const [createManager] = useMutation(CREATE_MANAGER, { client: apolloClient });
    const [updateManager] = useMutation(UPDATE_MANAGER, { client: apolloClient });
    const [deleteManager] = useMutation(DELETE_MANAGER, { client: apolloClient });

    const { permissions: masterPermissions } = useMasterActionPermissions(apolloClient);

    const rows: ManagerRow[] = useMemo(() => data?.managers ?? [], [data]);
    const salesmanRows: SalesmanOptionRow[] = useMemo(() => salesmenData?.salesmen ?? [], [salesmenData]);
    const salesmanLabelById = useMemo(() => {
        const map = new Map<number, string>();
        salesmanRows.forEach((row) => {
            map.set(row.salesmanId, row.name?.trim() || `Salesman ${row.salesmanId}`);
        });
        return map;
    }, [salesmanRows]);
    const filteredSalesmanRows = useMemo(() => {
        const term = salesmanSearch.trim().toLowerCase();
        if (!term) return salesmanRows;
        return salesmanRows.filter((row) => {
            const text = `${row.salesmanId} ${row.name ?? ''}`.toLowerCase();
            return text.includes(term);
        });
    }, [salesmanRows, salesmanSearch]);
    const currentFormDigest = useMemo(() => JSON.stringify(form), [form]);
    const isFormDirty = useMemo(() => currentFormDigest !== JSON.stringify(initialForm), [currentFormDigest, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
    const detailSalesmanRows = useMemo(
        () =>
            normalizeIdList(detailRow?.salesmanIds).map((salesmanId) => ({
                salesmanId,
                name: salesmanLabelById.get(salesmanId) ?? `Salesman ${salesmanId}`
            })),
        [detailRow, salesmanLabelById]
    );
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

    const openNew = () => {
        setDryEditDigest('');
        if (!assertActionAllowed('add')) return;
        setEditing(null);
        setSalesmanSearch('');
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: ManagerRow) => {
        setDryEditDigest('');
        if (!assertActionAllowed('edit')) return;
        setEditing(row);
        setSalesmanSearch('');
        setForm({
            name: row.name ?? '',
            salesmanIds: normalizeIdList(row.salesmanIds)
        });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: ManagerRow) => {
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

    const updateSalesmanSelection = useCallback((salesmanId: number, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            salesmanIds: checked
                ? normalizeIdList([...prev.salesmanIds, salesmanId])
                : prev.salesmanIds.filter((value) => value !== salesmanId)
        }));
    }, []);

    const focusSalesmanGridStart = useCallback(() => {
        const firstRow = filteredSalesmanRows[0];
        if (firstRow) {
            focusElementById(getSalesmanCheckboxId(firstRow.salesmanId));
            return true;
        }
        focusElementById(saveButtonId);
        return true;
    }, [filteredSalesmanRows, saveButtonId]);

    const focusSalesmanSearch = useCallback(() => {
        focusElementById(salesmanSearchInputId);
        return true;
    }, [salesmanSearchInputId]);

    const selectVisibleSalesmen = useCallback(() => {
        const visibleIds = filteredSalesmanRows.map((row) => row.salesmanId);
        setForm((prev) => ({
            ...prev,
            salesmanIds: normalizeIdList([...prev.salesmanIds, ...visibleIds])
        }));
    }, [filteredSalesmanRows]);

    const clearVisibleSalesmen = useCallback(() => {
        const visibleIdSet = new Set(filteredSalesmanRows.map((row) => row.salesmanId));
        setForm((prev) => ({
            ...prev,
            salesmanIds: prev.salesmanIds.filter((id) => !visibleIdSet.has(id))
        }));
    }, [filteredSalesmanRows]);

    const handleSalesmanCheckboxKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>, salesmanId: number, index: number) => {
            if (event.key !== 'Enter' && event.key !== 'NumpadEnter') return;
            event.preventDefault();
            const currentlySelected = form.salesmanIds.includes(salesmanId);
            updateSalesmanSelection(salesmanId, !currentlySelected);
            const nextRow = filteredSalesmanRows[index + 1];
            window.setTimeout(() => {
                if (nextRow) {
                    focusElementById(getSalesmanCheckboxId(nextRow.salesmanId));
                    return;
                }
                focusElementById(saveButtonId);
            }, 0);
        },
        [filteredSalesmanRows, form.salesmanIds, saveButtonId, updateSalesmanSelection]
    );

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
                salesmanIds: normalizeIdList(form.salesmanIds)
            };

            if (editing) {
                await updateManager({
                    variables: {
                        managerId: editing.managerId,
                        ...variables
                    }
                });
            } else {
                await createManager({ variables });
            }

            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Manager saved.'
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

    const handleDelete = async (managerId: number) => {
        try {
            await deleteManager({ variables: { managerId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Manager deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: getDeleteFailureMessage(e, 'manager')
            });
        }
    };

    const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>, row: ManagerRow) => {
        if (!assertActionAllowed('delete')) return;
        const impact = await fetchAccountsMasterDeleteImpact('MANAGER', row.managerId);
        if (!impact.canDelete) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Cannot Delete',
                detail: getDeleteBlockedMessage('manager', impact),
                life: 7000
            });
            return;
        }

        confirmPopup({
            target: event.currentTarget,
            message: `Dry Delete Check passed. ${getDeleteConfirmMessage('manager')}`,
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.managerId)
        });
    };

    const formatSalesmanList = (salesmanIds?: number[] | null) => {
        const ids = normalizeIdList(salesmanIds);
        if (!ids.length) return '-';
        return ids.map((id) => salesmanLabelById.get(id) ?? `Salesman ${id}`).join(', ');
    };

    const mappedSalesmenBody = (row: ManagerRow) => {
        const ids = normalizeIdList(row.salesmanIds);
        if (!ids.length) return <span className="text-500">-</span>;
        const labels = ids.map((id) => salesmanLabelById.get(id) ?? `Salesman ${id}`);
        const preview = labels.slice(0, 2).join(', ');
        const summary = labels.length > 2 ? `${preview} +${labels.length - 2}` : preview;
        return <span title={labels.join(', ')}>{summary}</span>;
    };

    const actionsBody = (row: ManagerRow) => (
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
                        <h2 className="m-0">Managers</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain managers and assign the salesmen mapped under each manager.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Manager" icon="pi pi-plus" onClick={openNew} disabled={!masterPermissions.canAdd} />
                        <AppHelpDialogButton {...getMasterPageHelp('managers')} buttonAriaLabel="Open Managers help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading managers: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={rows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="managerId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => (masterPermissions.canEdit ? openEdit(e.data as ManagerRow) : openView(e.data as ManagerRow))}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search manager"
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
                            Showing {rows.length} manager{rows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${rows.length} manager${rows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="Assigned Salesmen" body={mappedSalesmenBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '11rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Manager' : 'New Manager'}
                visible={dialogVisible}
                style={{ width: MASTER_EDIT_DIALOG_WIDTHS.standard }}
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
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={closeDialog}
                        cancelDisabled={saving}
                        onSave={save}
                        saveLabel={saveButtonLabel}
                        saveDisabled={saving || !isFormDirty}
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
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            id={nameInputId}
                            autoFocus
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            onEnterNext={focusSalesmanSearch}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between gap-3 mb-2 flex-wrap">
                            <label className="block text-600 m-0">Salesman List</label>
                            <span className="text-500 text-sm">{form.salesmanIds.length} selected</span>
                        </div>
                        <div className="app-manager-salesman-grid">
                            <div className="app-manager-salesman-grid__toolbar">
                                <span className="p-input-icon-left app-manager-salesman-grid__search">
                                    <i className="pi pi-search" />
                                    <AppInput
                                        id={salesmanSearchInputId}
                                        value={salesmanSearch}
                                        onChange={(e) => setSalesmanSearch(e.target.value)}
                                        onEnterNext={focusSalesmanGridStart}
                                        placeholder="Search salesman list"
                                        style={{ width: '100%' }}
                                    />
                                </span>
                                <div className="app-manager-salesman-grid__actions">
                                    <Button
                                        type="button"
                                        label="Select Visible"
                                        className="p-button-text app-action-compact"
                                        onClick={selectVisibleSalesmen}
                                        disabled={filteredSalesmanRows.length === 0 || saving}
                                    />
                                    <Button
                                        type="button"
                                        label="Clear Visible"
                                        className="p-button-text app-action-compact"
                                        onClick={clearVisibleSalesmen}
                                        disabled={filteredSalesmanRows.length === 0 || saving}
                                    />
                                </div>
                            </div>
                            <div className="app-manager-salesman-grid__table-wrap">
                                <table className="app-manager-salesman-grid__table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '5rem' }}>S.No.</th>
                                            <th>Salesman</th>
                                            <th style={{ width: '7rem' }}>Select</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {salesmenLoading ? (
                                            <tr>
                                                <td colSpan={3} className="app-manager-salesman-grid__empty">
                                                    Loading salesmen...
                                                </td>
                                            </tr>
                                        ) : filteredSalesmanRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="app-manager-salesman-grid__empty">
                                                    No salesmen found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSalesmanRows.map((row, index) => {
                                                const checked = form.salesmanIds.includes(row.salesmanId);
                                                return (
                                                    <tr key={row.salesmanId}>
                                                        <td>{index + 1}</td>
                                                        <td>{row.name?.trim() || `Salesman ${row.salesmanId}`}</td>
                                                        <td>
                                                            <div
                                                                className="app-manager-salesman-grid__checkbox"
                                                                onKeyDown={(event) => handleSalesmanCheckboxKeyDown(event, row.salesmanId, index)}
                                                            >
                                                                <Checkbox
                                                                    inputId={getSalesmanCheckboxId(row.salesmanId)}
                                                                    checked={checked}
                                                                    onChange={(event) => updateSalesmanSelection(row.salesmanId, event.checked === true)}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Manager Details"
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
                    <div className="flex flex-column gap-3">
                        <MasterDetailGrid columns={1}>
                            <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        </MasterDetailGrid>
                        <MasterDetailSection
                            title="Assigned Salesmen"
                            description={`${detailSalesmanRows.length} ${detailSalesmanRows.length === 1 ? 'salesman' : 'salesmen'}`}
                        >
                            <div className="border-1 surface-border border-round overflow-hidden">
                                <DataTable
                                    value={detailSalesmanRows}
                                    dataKey="salesmanId"
                                    responsiveLayout="scroll"
                                    size="small"
                                    className="p-datatable-sm"
                                    emptyMessage="No salesmen assigned."
                                    scrollable
                                    scrollHeight="12rem"
                                >
                                    <Column
                                        header="#"
                                        body={(_row: { salesmanId: number; name: string }, options) => options.rowIndex + 1}
                                        style={{ width: '4rem' }}
                                    />
                                    <Column header="Salesman" body={(row: { salesmanId: number; name: string }) => row.name} />
                                </DataTable>
                            </div>
                        </MasterDetailSection>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
