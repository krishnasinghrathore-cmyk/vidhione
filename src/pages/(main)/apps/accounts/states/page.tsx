'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { AppHelpDialogButton } from '@/components/AppHelpDialogButton';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import { z } from 'zod';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { MasterDetailDialogFooter, MasterEditDialogFooter } from '@/components/MasterDialogFooter';
import { findMasterRowIndex, getMasterRowByDirection, type MasterDialogDirection } from '@/lib/masterDialogNavigation';
import { getMasterPageHelp } from '@/lib/masterPageHelp';
import { apolloClient } from '@/lib/apolloClient';
import { MASTER_DETAIL_DIALOG_WIDTHS, MASTER_EDIT_DIALOG_WIDTHS } from '@/lib/masterDialogLayout';

interface StateRow {
    stateId: number;
    name: string | null;
    code: string | null;
    stateCode: string | null;
    ownState: boolean | null;
    eInvoiceStateName: string | null;
    countryId: number | null;
    countryName: string | null;
}

interface AuthCountryOption {
    id: number;
    iso2: string | null;
    name: string | null;
}

interface AuthStateOption {
    id: number;
    countryId: number;
    code: string | null;
    name: string | null;
}

type StateEditForm = {
    name: string;
    stateCode: string;
    eInvoiceStateName: string;
    ownState: boolean;
};

const DEFAULT_EDIT_FORM: StateEditForm = {
    name: '',
    stateCode: '',
    eInvoiceStateName: '',
    ownState: false
};

const stateEditSchema = z.object({
    name: z.string().trim().min(1, 'Name is required'),
    stateCode: z.string().trim().max(20, 'Code must be at most 20 characters').optional(),
    eInvoiceStateName: z.string().trim().max(150, 'eInvoice name must be at most 150 characters').optional(),
    ownState: z.boolean()
});

const GEO_STATES = gql`
    query GeoStates($search: String, $limit: Int) {
        geoStates(search: $search, limit: $limit) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`;

const AUTH_GEO_COUNTRIES = gql`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            name
        }
    }
`;

const AUTH_GEO_STATES = gql`
    query AuthGeoStates($countryId: Int!, $search: String, $limit: Int) {
        authGeoStates(countryId: $countryId, search: $search, limit: $limit) {
            id
            countryId
            code
            name
        }
    }
`;

const ENSURE_GEO_STATE = gql`
    mutation EnsureGeoState($authStateId: Int!) {
        ensureGeoState(authStateId: $authStateId) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`;

const UPDATE_GEO_STATE = gql`
    mutation UpdateGeoState(
        $stateId: Int!
        $name: String
        $stateCode: String
        $ownState: Boolean
        $eInvoiceStateName: String
    ) {
        updateGeoState(
            stateId: $stateId
            name: $name
            stateCode: $stateCode
            ownState: $ownState
            eInvoiceStateName: $eInvoiceStateName
        ) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`;

const LINK_GEO_STATE_FROM_AUTH = gql`
    mutation LinkGeoStateFromAuth($stateId: Int!, $authStateId: Int!, $overwriteName: Boolean) {
        linkGeoStateFromAuth(stateId: $stateId, authStateId: $authStateId, overwriteName: $overwriteName) {
            stateId
            name
            code
            stateCode
            ownState
            eInvoiceStateName
            countryId
            countryName
        }
    }
`;

const DELETE_STATE = gql`
    mutation DeleteState($stateId: Int!) {
        deleteState(stateId: $stateId)
    }
`;

export default function AccountsStatesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const limit = 2000;
    const [authCountryId, setAuthCountryId] = useState<number | null>(null);
    const [authStateId, setAuthStateId] = useState<number | null>(null);
    const [syncingState, setSyncingState] = useState(false);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editing, setEditing] = useState<StateRow | null>(null);
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailRow, setDetailRow] = useState<StateRow | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<StateEditForm>(DEFAULT_EDIT_FORM);
    const [initialForm, setInitialForm] = useState<StateEditForm>(DEFAULT_EDIT_FORM);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [editAuthCountryId, setEditAuthCountryId] = useState<number | null>(null);
    const [editAuthStateId, setEditAuthStateId] = useState<number | null>(null);
    const [mappingAuthState, setMappingAuthState] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);

    const { data, loading, error, refetch } = useQuery(GEO_STATES, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });

    const { data: authCountriesData, loading: authCountriesLoading } = useQuery(AUTH_GEO_COUNTRIES, {
        client: apolloClient,
        variables: { search: null, limit: 300 },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });

    const [loadAuthStates, authStatesQuery] = useLazyQuery(AUTH_GEO_STATES, {
        client: apolloClient,
        fetchPolicy: 'network-only'
    });
    const [loadEditAuthStates, editAuthStatesQuery] = useLazyQuery(AUTH_GEO_STATES, {
        client: apolloClient,
        fetchPolicy: 'network-only'
    });

    const [deleteState] = useMutation(DELETE_STATE, { client: apolloClient });
    const [ensureGeoState] = useMutation(ENSURE_GEO_STATE, { client: apolloClient });
    const [updateGeoState] = useMutation(UPDATE_GEO_STATE, { client: apolloClient });
    const [linkGeoStateFromAuth] = useMutation(LINK_GEO_STATE_FROM_AUTH, { client: apolloClient });

    const rows: StateRow[] = useMemo(() => data?.geoStates ?? [], [data]);
    const isFormDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);
    const editingIndex = useMemo(() => findMasterRowIndex(rows, editing), [rows, editing]);
    const detailIndex = useMemo(() => findMasterRowIndex(rows, detailRow), [rows, detailRow]);
    const authCountries: AuthCountryOption[] = useMemo(
        () => authCountriesData?.authGeoCountries ?? [],
        [authCountriesData]
    );
    const authStates: AuthStateOption[] = useMemo(
        () => authStatesQuery.data?.authGeoStates ?? [],
        [authStatesQuery.data]
    );
    const editAuthStates: AuthStateOption[] = useMemo(
        () => editAuthStatesQuery.data?.authGeoStates ?? [],
        [editAuthStatesQuery.data]
    );

    useEffect(() => {
        if (authCountryId || authCountries.length === 0) return;
        const india = authCountries.find((country) => country.iso2?.toUpperCase() === 'IN');
        const fallback = authCountries[0] ?? null;
        setAuthCountryId(india?.id ?? fallback?.id ?? null);
    }, [authCountries, authCountryId]);

    useEffect(() => {
        if (!authCountryId) return;
        loadAuthStates({ variables: { countryId: authCountryId, search: null, limit: 300 } });
    }, [authCountryId, loadAuthStates]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [
                row.stateId,
                row.name,
                row.stateCode,
                row.code,
                row.eInvoiceStateName,
                row.countryName,
                row.ownState ? 'yes' : 'no'
            ]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const countryOptions = useMemo(
        () =>
            authCountries.map((country) => ({
                label: `${country.name ?? ''}${country.iso2 ? ` (${country.iso2})` : ''}`,
                value: country.id
            })),
        [authCountries]
    );

    const authStateOptions = useMemo(
        () =>
            authStates.map((state) => ({
                label: `${state.name ?? ''}${state.code ? ` (${state.code})` : ''}`,
                value: state.id
            })),
        [authStates]
    );
    const editAuthStateOptions = useMemo(
        () =>
            editAuthStates.map((state) => ({
                label: `${state.name ?? ''}${state.code ? ` (${state.code})` : ''}`,
                value: state.id
            })),
        [editAuthStates]
    );

    const resolveDefaultAuthCountryId = (countryName?: string | null) => {
        const normalizedName = (countryName ?? '').trim().toLowerCase();
        if (normalizedName) {
            const byName = authCountries.find(
                (country) => (country.name ?? '').trim().toLowerCase() === normalizedName
            );
            if (byName?.id) return byName.id;
        }
        const india = authCountries.find((country) => country.iso2?.toUpperCase() === 'IN');
        const fallback = authCountries[0] ?? null;
        return india?.id ?? fallback?.id ?? null;
    };

    const openEdit = (row: StateRow) => {
        setEditing(row);
        setForm({
            name: row.name ?? '',
            stateCode: row.stateCode ?? row.code ?? '',
            eInvoiceStateName: row.eInvoiceStateName ?? '',
            ownState: Boolean(row.ownState)
        });
        const defaultCountryId = resolveDefaultAuthCountryId(row.countryName);
        setEditAuthCountryId(defaultCountryId);
        setEditAuthStateId(null);
        if (defaultCountryId) {
            loadEditAuthStates({
                variables: {
                    countryId: defaultCountryId,
                    search: null,
                    limit: 300
                }
            });
        }
        setFormErrors({});
        setDialogVisible(true);
    };

    const openView = (row: StateRow) => {
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

    const closeEdit = () => {
        if (saving) return;
        setDialogVisible(false);
        setEditing(null);
        setForm(DEFAULT_EDIT_FORM);
        setFormErrors({});
        setEditAuthCountryId(null);
        setEditAuthStateId(null);
    };

    const mapStateFromAuth = async () => {
        if (!editing) return;
        if (!editAuthStateId) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Select Auth State',
                detail: 'Choose a state from auth master to map.'
            });
            return;
        }

        setMappingAuthState(true);
        try {
            const result = await linkGeoStateFromAuth({
                variables: {
                    stateId: editing.stateId,
                    authStateId: editAuthStateId,
                    overwriteName: true
                }
            });
            const mapped = result.data?.linkGeoStateFromAuth as StateRow | undefined;
            if (mapped) {
                setEditing(mapped);
                setForm({
                    name: mapped.name ?? '',
                    stateCode: mapped.stateCode ?? mapped.code ?? '',
                    eInvoiceStateName: mapped.eInvoiceStateName ?? '',
                    ownState: Boolean(mapped.ownState)
                });
            }
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Mapped',
                detail: 'State mapped from auth master.'
            });
        } catch (mapError) {
            const message = mapError instanceof Error ? mapError.message : 'Mapping failed.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        } finally {
            setMappingAuthState(false);
        }
    };

    const saveEdit = async () => {
        if (!editing) return;

        const parsed = stateEditSchema.safeParse(form);
        if (!parsed.success) {
            const nextErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                if (issue.path[0]) nextErrors[String(issue.path[0])] = issue.message;
            });
            setFormErrors(nextErrors);
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Fix validation errors'
            });
            return;
        }

        setSaving(true);
        try {
            await updateGeoState({
                variables: {
                    stateId: editing.stateId,
                    name: form.name.trim(),
                    stateCode: form.stateCode.trim() || null,
                    ownState: Boolean(form.ownState),
                    eInvoiceStateName: form.eInvoiceStateName.trim() || null
                }
            });
            await refetch();
            setInitialForm(form);
            if (!isBulkMode) {
                closeEdit();
            }
            toastRef.current?.show({
                severity: 'success',
                summary: 'Saved',
                detail: 'State updated.'
            });
        } catch (stateError) {
            const message = stateError instanceof Error ? stateError.message : 'Update failed.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (stateId: number) => {
        try {
            await deleteState({ variables: { stateId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'State deleted.'
            });
        } catch (deleteError) {
            const message = deleteError instanceof Error ? deleteError.message : 'Delete failed.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        }
    };

    const handleSyncState = async () => {
        if (!authStateId) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Select State',
                detail: 'Choose a state from master before adding.'
            });
            return;
        }

        setSyncingState(true);
        try {
            await ensureGeoState({ variables: { authStateId } });
            setAuthStateId(null);
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Added',
                detail: 'State synced from master.'
            });
        } catch (syncError) {
            const message = syncError instanceof Error ? syncError.message : 'Failed to sync state from master.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        } finally {
            setSyncingState(false);
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: StateRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this state?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Yes',
            rejectLabel: 'No',
            defaultFocus: 'reject',
            dismissable: true,
            accept: () => handleDelete(row.stateId)
        });
    };

    const ownStateBody = (row: StateRow) => (row.ownState ? 'Yes' : 'No');

    const actionsBody = (row: StateRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-eye" className="p-button-text" onClick={() => openView(row)} />
            <Button icon="pi pi-pencil" className="p-button-text" onClick={() => openEdit(row)} />
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(event) => confirmDelete(event, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                    <div>
                        <h2 className="m-0">States</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain state records for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex justify-content-end">
                        <AppHelpDialogButton {...getMasterPageHelp('states')} buttonAriaLabel="Open States help" />
                    </div>
                </div>
                <div className="surface-50 border-1 surface-border border-round p-3">
                    <div className="grid align-items-end">
                        <div className="col-12 md:col-4">
                            <label className="block text-600 mb-1">Country</label>
                            <AppDropdown
                                value={authCountryId}
                                options={countryOptions}
                                onChange={(event) => {
                                    setAuthCountryId((event.value as number | null) ?? null);
                                    setAuthStateId(null);
                                }}
                                placeholder="Select country"
                                filter
                                showClear
                                loading={authCountriesLoading}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label className="block text-600 mb-1">State from master</label>
                            <AppDropdown
                                value={authStateId}
                                options={authStateOptions}
                                onChange={(event) => setAuthStateId((event.value as number | null) ?? null)}
                                placeholder={authCountryId ? 'Search and select state' : 'Select country first'}
                                filter
                                showClear
                                disabled={!authCountryId}
                                loading={authStatesQuery.loading}
                                onFilter={(event) => {
                                    if (!authCountryId) return;
                                    const query = event.filter?.trim() ?? '';
                                    loadAuthStates({
                                        variables: {
                                            countryId: authCountryId,
                                            search: query || null,
                                            limit: 300
                                        }
                                    });
                                }}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <Button
                                label={syncingState ? 'Adding...' : 'Add'}
                                icon={syncingState ? 'pi pi-spin pi-spinner' : 'pi pi-plus'}
                                onClick={handleSyncState}
                                disabled={!authStateId || syncingState}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <small className="text-600">
                        Add states only from auth master to keep naming consistent and avoid duplicate/manual variations.
                    </small>
                </div>
                {error && <p className="text-red-500 m-0">Error loading states: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="stateId"
                stripedRows
                size="small"
                loading={loading}
                onRowDoubleClick={(event) => openEdit(event.data as StateRow)}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search state"
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
                            Showing {filteredRows.length} state{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} state${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="stateCode" header="Code" sortable />
                <Column field="eInvoiceStateName" header="eInvoice Name" sortable />
                <Column header="Own State" body={ownStateBody} sortable sortField="ownState" />
                <Column field="countryName" header="Country" />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>

            <Dialog
                header={editing ? `Edit State #${editing.stateId}` : 'Edit State'}
                visible={dialogVisible}
                style={{ width: MASTER_EDIT_DIALOG_WIDTHS.standard }}
                onShow={() => setInitialForm(form)}
                onHide={closeEdit}
                footer={
                    <MasterEditDialogFooter
                        index={editingIndex}
                        total={rows.length}
                        onNavigate={navigateEditRecord}
                        navigateDisabled={saving}
                        bulkMode={{ checked: isBulkMode, onChange: setIsBulkMode, disabled: saving }}
                        onCancel={closeEdit}
                        cancelDisabled={saving}
                        onSave={saveEdit}
                        saveLabel={saving ? 'Saving...' : 'Save'}
                        saveDisabled={saving || !isFormDirty}
                    />
                }
            >
                <div className="grid">
                    <div className="col-12 md:col-8">
                        <div className="surface-50 border-1 surface-border border-round p-3 mb-3">
                            <div className="grid align-items-end">
                                <div className="col-12 md:col-4">
                                    <label className="block text-600 mb-1">Auth Country</label>
                                    <AppDropdown
                                        value={editAuthCountryId}
                                        options={countryOptions}
                                        onChange={(event) => {
                                            const nextCountryId = (event.value as number | null) ?? null;
                                            setEditAuthCountryId(nextCountryId);
                                            setEditAuthStateId(null);
                                            if (!nextCountryId) return;
                                            loadEditAuthStates({
                                                variables: {
                                                    countryId: nextCountryId,
                                                    search: null,
                                                    limit: 300
                                                }
                                            });
                                        }}
                                        placeholder="Select country"
                                        filter
                                        showClear
                                        loading={authCountriesLoading}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-5">
                                    <label className="block text-600 mb-1">Auth State</label>
                                    <AppDropdown
                                        value={editAuthStateId}
                                        options={editAuthStateOptions}
                                        onChange={(event) => setEditAuthStateId((event.value as number | null) ?? null)}
                                        placeholder={editAuthCountryId ? 'Search and select state' : 'Select country first'}
                                        filter
                                        showClear
                                        disabled={!editAuthCountryId}
                                        loading={editAuthStatesQuery.loading}
                                        onFilter={(event) => {
                                            if (!editAuthCountryId) return;
                                            const query = event.filter?.trim() ?? '';
                                            loadEditAuthStates({
                                                variables: {
                                                    countryId: editAuthCountryId,
                                                    search: query || null,
                                                    limit: 300
                                                }
                                            });
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <div className="col-12 md:col-3">
                                    <Button
                                        label={mappingAuthState ? 'Mapping...' : 'Map from Auth'}
                                        icon={mappingAuthState ? 'pi pi-spin pi-spinner' : 'pi pi-link'}
                                        onClick={mapStateFromAuth}
                                        disabled={!editAuthStateId || mappingAuthState}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            <small className="text-600">
                                Maps this client state to selected auth state and applies canonical name/code.
                            </small>
                        </div>
                    </div>
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">Name</label>
                        <AppInput
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            className={`w-full ${formErrors.name ? 'p-invalid' : ''}`}
                        />
                        {formErrors.name && <small className="p-error">{formErrors.name}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Code</label>
                        <AppInput
                            value={form.stateCode}
                            onChange={(event) => setForm((prev) => ({ ...prev, stateCode: event.target.value }))}
                            className={`w-full ${formErrors.stateCode ? 'p-invalid' : ''}`}
                        />
                        {formErrors.stateCode && <small className="p-error">{formErrors.stateCode}</small>}
                    </div>
                    <div className="col-12 md:col-8">
                        <label className="block text-600 mb-1">eInvoice State Name</label>
                        <AppInput
                            value={form.eInvoiceStateName}
                            onChange={(event) => setForm((prev) => ({ ...prev, eInvoiceStateName: event.target.value }))}
                            className={`w-full ${formErrors.eInvoiceStateName ? 'p-invalid' : ''}`}
                        />
                        {formErrors.eInvoiceStateName && <small className="p-error">{formErrors.eInvoiceStateName}</small>}
                    </div>
                    <div className="col-12 md:col-4">
                        <label className="block text-600 mb-1">Own State</label>
                        <div className="flex align-items-center gap-2 border-1 surface-border border-round px-3 py-2">
                            <InputSwitch
                                checked={Boolean(form.ownState)}
                                onChange={(event) => setForm((prev) => ({ ...prev, ownState: Boolean(event.value) }))}
                            />
                            <span className="text-700">{form.ownState ? 'Yes' : 'No'}</span>
                        </div>
                    </div>
                    <div className="col-12">
                        <small className="text-600">
                            Country is managed by master mapping. Use Add from master for canonical link, then edit names/flags as needed.
                        </small>
                    </div>
                </div>
            </Dialog>

            <Dialog
                header="State Details"
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
                    <div className="flex flex-column gap-2">
                        <div><strong>Name:</strong> {detailRow.name ?? '-'}</div>
                        <div><strong>Code:</strong> {detailRow.stateCode ?? detailRow.code ?? '-'}</div>
                        <div><strong>eInvoice Name:</strong> {detailRow.eInvoiceStateName ?? '-'}</div>
                        <div><strong>Own State:</strong> {detailRow.ownState ? 'Yes' : 'No'}</div>
                        <div><strong>Country:</strong> {detailRow.countryName ?? '-'}</div>
                    </div>
                )}
            </Dialog>
        </div>
    );
}
