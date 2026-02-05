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

interface DistrictRow {
    districtId: number;
    name: string | null;
    stateId: number | null;
    stateName: string | null;
    countryId: number | null;
    countryName: string | null;
}

const GEO_DISTRICTS = gql`
    query GeoDistricts($search: String, $limit: Int) {
        geoDistricts(search: $search, limit: $limit) {
            districtId
            name
            stateId
            stateName
            countryId
            countryName
        }
    }
`;

const DELETE_DISTRICT = gql`
    mutation DeleteDistrict($districtId: Int!) {
        deleteDistrict(districtId: $districtId)
    }
`;

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function AccountsDistrictsPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [geoImportVisible, setGeoImportVisible] = useState(false);

    const { data, loading, error, refetch } = useQuery(GEO_DISTRICTS, {
        client: apolloClient,
        variables: { search: search.trim() || null, limit }
    });
    const [deleteDistrict] = useMutation(DELETE_DISTRICT, { client: apolloClient });

    const rows: DistrictRow[] = useMemo(() => data?.geoDistricts ?? [], [data]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.districtId, row.name, row.stateName, row.countryName]
                .map((value) => String(value ?? '').toLowerCase())
                .join(' ')
                .includes(term)
        );
    }, [rows, search]);

    const handleDelete = async (districtId: number) => {
        try {
            await deleteDistrict({ variables: { districtId } });
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'District deleted.'
            });
        } catch (e: any) {
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: e?.message ?? 'Delete failed.'
            });
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: DistrictRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this district?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.districtId)
        });
    };

    const actionsBody = (row: DistrictRow) => (
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
                        <h2 className="m-0">Districts</h2>
                        <p className="mt-2 mb-0 text-600">Maintain district records for the agency accounts masters.</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Import from master" icon="pi pi-download" onClick={() => setGeoImportVisible(true)} />
                    </div>
                </div>
                {error && <p className="text-red-500 m-0">Error loading districts: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="districtId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <InputText
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search district"
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
                            Showing {filteredRows.length} district{filteredRows.length === 1 ? '' : 's'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} district${filteredRows.length === 1 ? '' : 's'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="stateName" header="State" />
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
