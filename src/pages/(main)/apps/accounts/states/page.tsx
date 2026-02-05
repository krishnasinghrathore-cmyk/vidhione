'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import { apolloClient } from '@/lib/apolloClient';
import GeoImportDialog from '@/components/GeoImportDialog';

interface StateRow {
    stateId: number;
    name: string | null;
    stateCode: string | null;
    countryId: number | null;
    countryName: string | null;
}

const GEO_STATES = gql`
    query GeoStates($search: String, $limit: Int) {
        geoStates(search: $search, limit: $limit) {
            stateId
            name
            stateCode
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

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function AccountsStatesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [geoImportVisible, setGeoImportVisible] = useState(false);

    const { data, loading, error, refetch } = useQuery(GEO_STATES, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [deleteState] = useMutation(DELETE_STATE, { client: apolloClient });

    const rows: StateRow[] = useMemo(() => data?.geoStates ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.stateId, row.name, row.stateCode]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const handleDelete = async (stateId: number) => {
        try {
            await deleteState({ variables: { stateId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'State deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: StateRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this state?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.stateId)
        });
    };

    const actionsBody = (row: StateRow) => (
        <div className="flex gap-2">
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
                        <h2 className="m-0">States</h2>
                        <p className="mt-2 mb-0 text-600">
                            Maintain state records for the agency accounts masters.
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Import from master" icon="pi pi-download" onClick={() => setGeoImportVisible(true)} />
                    </div>
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
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search state"
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
                            Showing {filteredRows.length} state{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} state${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="stateCode" header="Code" sortable />
                <Column field="countryName" header="Country" />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>
            <GeoImportDialog
                visible={geoImportVisible}
                onHide={() => setGeoImportVisible(false)}
                onApply={() => refetch()}
                title="Import location from master"
            />
        </div>
    );
}
