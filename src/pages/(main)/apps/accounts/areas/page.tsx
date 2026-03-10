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
import AppDropdown from '@/components/AppDropdown';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { MasterDetailCard } from '@/components/MasterDetailCard';
import { MasterDetailGrid } from '@/components/MasterDetailLayout';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import GeoImportDialog from '@/components/GeoImportDialog';
import { z } from 'zod';
import { apolloClient } from '@/lib/apolloClient';
import { useGeoCityOptions } from '@/lib/accounts/cities';
import { ACCOUNT_MASTER_QUERY_OPTIONS, invalidateAccountMasterLookups } from '@/lib/accounts/masterLookupCache';
import { MASTER_DETAIL_DIALOG_WIDTHS, MASTER_EDIT_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

interface AreaRow {
    areaId: number;
    name: string | null;
    cityId: number | null;
}

const AREAS = gql`
    query Areas($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
            cityId
        }
    }
`;

const CREATE_AREA = gql`
    mutation CreateArea($name: String!, $cityId: Int) {
        createArea(name: $name, cityId: $cityId) {
            areaId
        }
    }
`;

const UPDATE_AREA = gql`
    mutation UpdateArea($areaId: Int!, $name: String, $cityId: Int) {
        updateArea(areaId: $areaId, name: $name, cityId: $cityId) {
            areaId
        }
    }
`;

const DELETE_AREA = gql`
    mutation DeleteArea($areaId: Int!) {
        deleteArea(areaId: $areaId)
    }
`;

type FormState = {
    name: string;
    cityId: number | null;
};

const formSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    cityId: z.number().int().nonnegative().nullable()
});

const DEFAULT_FORM: FormState = {
    name: '',
    cityId: null
};

export default function AccountsAreasPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [dialogVisible, setDialogVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<AreaRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<AreaRow | null>(null);
    const [form, setForm] = useState<FormState>(DEFAULT_FORM);
    const [initialForm, setInitialForm] = useState<FormState>(DEFAULT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [geoImportVisible, setGeoImportVisible] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);

    const { data, loading, error, refetch } = useQuery(AREAS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit },
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });
    const { rows: cities, refetch: refetchCities } = useGeoCityOptions({ limit: 2000 });
    const [createArea] = useMutation(CREATE_AREA, { client: apolloClient });
    const [updateArea] = useMutation(UPDATE_AREA, { client: apolloClient });
    const [deleteArea] = useMutation(DELETE_AREA, { client: apolloClient });

    const rows: AreaRow[] = useMemo(() => data?.areas ?? [], [data]);
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);

    const cityMap = useMemo(() => {
        const map = new Map<number, string>();
        cities.forEach((city) => {
            const label = [
                city.name,
                city.districtName ? `(${city.districtName})` : null,
                city.stateName ? city.stateName : null
            ]
                .filter(Boolean)
                .join(' ');
            map.set(city.cityId, label || `#${city.cityId}`);
        });
        return map;
    }, [cities]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.areaId, row.name, row.cityId ? cityMap.get(row.cityId) : null]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search, cityMap]);
    const openNew = () => {
        setEditing(null);
        setForm(DEFAULT_FORM);
        setFormErrors({});
        setDialogVisible(true);
    };

    const openEdit = (row: AreaRow) => {
        setEditing(row);
        setForm({ name: row.name ?? '', cityId: row.cityId ?? null });
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: AreaRow) => {
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

        setSaving(true);
        try {
            const variables = {
                name: form.name.trim(),
                cityId: form.cityId
            };

            if (editing) {
                await updateArea({
                    variables: {
                        areaId: editing.areaId,
                        ...variables
                    }
                });
            } else {
                await createArea({ variables });
            }

            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                setDialogVisible(false);
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'Area saved.'
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

    const handleDelete = async (areaId: number) => {
        try {
            await deleteArea({ variables: { areaId } });
            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'Area deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: AreaRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this area?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.areaId)
        });
    };

    const cityBody = (row: AreaRow) => {
        if (!row.cityId) return <span className="text-500">-</span>;
        return cityMap.get(row.cityId) ?? row.cityId;
    };

    const actionsBody = (row: AreaRow) => (
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

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">Areas</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain area records for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-start">
                        <Button className="app-action-compact" label="New Area" icon="pi pi-plus" onClick={openNew} />
                        <AppHelpDialogButton {...getMasterPageHelp('areas')} buttonAriaLabel="Open Areas help" />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading areas: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="areaId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(e) => openEdit(e.data as AreaRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search area"
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
                            disabled={filteredRows.length === 0}
                        />
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} area{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} area${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column header="City" body={cityBody} />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? 'Edit Area' : 'New Area'}
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
                    <div className="col-12">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            value={form.name}
                            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                            style={{ width: '100%' }}
                            className={formErrors.name ? 'p-invalid' : undefined}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12">
                        <div className="flex align-items-center justify-content-between mb-1">
                            <label className="block text-600">City</label>
                            <Button
                                label="Import from master"
                                icon="pi pi-download"
                                className="p-button-text p-button-sm"
                                onClick={() => setGeoImportVisible(true)}
                            />
                        </div>
                        <AppDropdown
                            value={form.cityId}
                            options={cities.map((city) => ({
                                label: [
                                    city.name,
                                    city.districtName ? `(${city.districtName})` : null,
                                    city.stateName ? city.stateName : null
                                ]
                                    .filter(Boolean)
                                    .join(' '),
                                value: city.cityId
                            }))}
                            onChange={(e) => setForm((s) => ({ ...s, cityId: e.value ?? null }))}
                            placeholder="Select city"
                            showClear
                            filter
                            className="w-full"
                        />
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="Area Details"
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
                        <MasterDetailCard label="Name" value={detailRow.name ?? '-'} />
                        <MasterDetailCard label="City" value={cityMap.get(detailRow.cityId ?? -1) ?? '-'} />
                    </MasterDetailGrid>
                )}
            </Dialog>

            <GeoImportDialog
                visible={geoImportVisible}
                onHide={() => setGeoImportVisible(false)}
                onApply={(selection) => {
                    invalidateAccountMasterLookups(apolloClient);
                    if (selection.cityId) {
                        setForm((prev) => ({ ...prev, cityId: selection.cityId ?? null }));
                    }
                    refetchCities();
                }}
                title="Import location from master"
            />
        </div>
    );
}
