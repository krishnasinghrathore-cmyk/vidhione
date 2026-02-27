'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Column } from 'primereact/column';
import { ConfirmPopup, confirmPopup } from 'primereact/confirmpopup';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { gql, useLazyQuery, useMutation, useQuery } from '@apollo/client';
import AppDataTable from '@/components/AppDataTable';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { apolloClient } from '@/lib/apolloClient';
import { useGeoCityOptions } from '@/lib/accounts/cities';
import { invalidateAccountMasterLookups } from '@/lib/accounts/masterLookupCache';

interface CityRow {
    cityId: number;
    name: string | null;
    districtId: number | null;
    districtName: string | null;
    stateId: number | null;
    stateName: string | null;
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

interface AuthDistrictOption {
    id: number;
    stateId: number;
    name: string | null;
}

interface AuthCityOption {
    id: number;
    districtId: number;
    name: string | null;
}

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

const AUTH_GEO_DISTRICTS = gql`
    query AuthGeoDistricts($stateId: Int!, $search: String, $limit: Int) {
        authGeoDistricts(stateId: $stateId, search: $search, limit: $limit) {
            id
            stateId
            name
        }
    }
`;

const AUTH_GEO_CITIES = gql`
    query AuthGeoCities($districtId: Int!, $search: String, $limit: Int) {
        authGeoCities(districtId: $districtId, search: $search, limit: $limit) {
            id
            districtId
            name
        }
    }
`;

const ENSURE_GEO_CITY = gql`
    mutation EnsureGeoCity($authCityId: Int!) {
        ensureGeoCity(authCityId: $authCityId) {
            cityId
            districtId
            districtName
            stateId
            stateName
            countryId
            countryName
            name
        }
    }
`;

const DELETE_CITY = gql`
    mutation DeleteCity($cityId: Int!) {
        deleteCity(cityId: $cityId)
    }
`;

const limitOptions = [50, 100, 250, 500, 1000, 2000].map((value) => ({
    label: String(value),
    value
}));

export default function AccountsCitiesPage() {
    const toastRef = useRef<Toast>(null);
    const dtRef = useRef<any>(null);

    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(2000);
    const [authCountryId, setAuthCountryId] = useState<number | null>(null);
    const [authStateId, setAuthStateId] = useState<number | null>(null);
    const [authDistrictId, setAuthDistrictId] = useState<number | null>(null);
    const [authCityId, setAuthCityId] = useState<number | null>(null);
    const [syncingCity, setSyncingCity] = useState(false);

    const { rows, loading, error, refetch } = useGeoCityOptions({
        search: search.trim() || null,
        limit
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

    const [loadAuthDistricts, authDistrictsQuery] = useLazyQuery(AUTH_GEO_DISTRICTS, {
        client: apolloClient,
        fetchPolicy: 'network-only'
    });

    const [loadAuthCities, authCitiesQuery] = useLazyQuery(AUTH_GEO_CITIES, {
        client: apolloClient,
        fetchPolicy: 'network-only'
    });

    const [deleteCity] = useMutation(DELETE_CITY, { client: apolloClient });
    const [ensureGeoCity] = useMutation(ENSURE_GEO_CITY, { client: apolloClient });

    const authCountries: AuthCountryOption[] = useMemo(
        () => authCountriesData?.authGeoCountries ?? [],
        [authCountriesData]
    );
    const authStates: AuthStateOption[] = useMemo(
        () => authStatesQuery.data?.authGeoStates ?? [],
        [authStatesQuery.data]
    );
    const authDistricts: AuthDistrictOption[] = useMemo(
        () => authDistrictsQuery.data?.authGeoDistricts ?? [],
        [authDistrictsQuery.data]
    );
    const authCities: AuthCityOption[] = useMemo(
        () => authCitiesQuery.data?.authGeoCities ?? [],
        [authCitiesQuery.data]
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

    useEffect(() => {
        if (!authStateId) return;
        loadAuthDistricts({ variables: { stateId: authStateId, search: null, limit: 300 } });
    }, [authStateId, loadAuthDistricts]);

    useEffect(() => {
        if (!authDistrictId) return;
        loadAuthCities({ variables: { districtId: authDistrictId, search: null, limit: 300 } });
    }, [authDistrictId, loadAuthCities]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [
                row.cityId,
                row.name,
                row.districtName,
                row.stateName,
                row.countryName
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

    const authDistrictOptions = useMemo(
        () =>
            authDistricts.map((district) => ({
                label: district.name ?? '',
                value: district.id
            })),
        [authDistricts]
    );

    const authCityOptions = useMemo(
        () =>
            authCities.map((city) => ({
                label: city.name ?? '',
                value: city.id
            })),
        [authCities]
    );

    const handleDelete = async (cityId: number) => {
        try {
            await deleteCity({ variables: { cityId } });
            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Deleted',
                detail: 'City deleted.'
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Delete failed.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        }
    };

    const handleSyncCity = async () => {
        if (!authCityId) {
            toastRef.current?.show({
                severity: 'warn',
                summary: 'Select City',
                detail: 'Choose a city from master before adding.'
            });
            return;
        }

        setSyncingCity(true);
        try {
            await ensureGeoCity({ variables: { authCityId } });
            setAuthCityId(null);
            invalidateAccountMasterLookups(apolloClient);
            await refetch();
            toastRef.current?.show({
                severity: 'success',
                summary: 'Added',
                detail: 'City synced from master.'
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to sync city from master.';
            toastRef.current?.show({
                severity: 'error',
                summary: 'Error',
                detail: message
            });
        } finally {
            setSyncingCity(false);
        }
    };

    const confirmDelete = (event: React.MouseEvent<HTMLButtonElement>, row: CityRow) => {
        confirmPopup({
            target: event.currentTarget,
            message: 'Delete this city?',
            icon: 'pi pi-exclamation-triangle',
            acceptClassName: 'p-button-danger',
            acceptLabel: 'Delete',
            rejectLabel: 'Cancel',
            defaultFocus: 'none',
            dismissable: true,
            accept: () => handleDelete(row.cityId)
        });
    };

    const actionsBody = (row: CityRow) => (
        <div className="flex gap-2">
            <Button icon="pi pi-trash" className="p-button-text" severity="danger" onClick={(event) => confirmDelete(event, row)} />
        </div>
    );

    return (
        <div className="card">
            <Toast ref={toastRef} />
            <ConfirmPopup />

            <div className="flex flex-column gap-2 mb-3">
                <div>
                    <h2 className="m-0">Cities</h2>
                    <p className="mt-2 mb-0 text-600">
                        Maintain city records for the agency accounts masters.
                    </p>
                </div>
                <div className="surface-50 border-1 surface-border border-round p-3">
                    <div className="grid align-items-end">
                        <div className="col-12 md:col-3">
                            <label className="block text-600 mb-1">Country</label>
                            <AppDropdown
                                value={authCountryId}
                                options={countryOptions}
                                onChange={(event) => {
                                    setAuthCountryId((event.value as number | null) ?? null);
                                    setAuthStateId(null);
                                    setAuthDistrictId(null);
                                    setAuthCityId(null);
                                }}
                                placeholder="Select country"
                                filter
                                showClear
                                loading={authCountriesLoading}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-3">
                            <label className="block text-600 mb-1">State from master</label>
                            <AppDropdown
                                value={authStateId}
                                options={authStateOptions}
                                onChange={(event) => {
                                    setAuthStateId((event.value as number | null) ?? null);
                                    setAuthDistrictId(null);
                                    setAuthCityId(null);
                                }}
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
                            <label className="block text-600 mb-1">District from master</label>
                            <AppDropdown
                                value={authDistrictId}
                                options={authDistrictOptions}
                                onChange={(event) => {
                                    setAuthDistrictId((event.value as number | null) ?? null);
                                    setAuthCityId(null);
                                }}
                                placeholder={authStateId ? 'Search and select district' : 'Select state first'}
                                filter
                                showClear
                                disabled={!authStateId}
                                loading={authDistrictsQuery.loading}
                                onFilter={(event) => {
                                    if (!authStateId) return;
                                    const query = event.filter?.trim() ?? '';
                                    loadAuthDistricts({
                                        variables: {
                                            stateId: authStateId,
                                            search: query || null,
                                            limit: 300
                                        }
                                    });
                                }}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-2">
                            <label className="block text-600 mb-1">City from master</label>
                            <AppDropdown
                                value={authCityId}
                                options={authCityOptions}
                                onChange={(event) => setAuthCityId((event.value as number | null) ?? null)}
                                placeholder={authDistrictId ? 'Search and select city' : 'Select district first'}
                                filter
                                showClear
                                disabled={!authDistrictId}
                                loading={authCitiesQuery.loading}
                                onFilter={(event) => {
                                    if (!authDistrictId) return;
                                    const query = event.filter?.trim() ?? '';
                                    loadAuthCities({
                                        variables: {
                                            districtId: authDistrictId,
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
                                label={syncingCity ? 'Adding...' : 'Add'}
                                icon={syncingCity ? 'pi pi-spin pi-spinner' : 'pi pi-plus'}
                                onClick={handleSyncCity}
                                disabled={!authCityId || syncingCity}
                                className="w-full"
                            />
                        </div>
                    </div>
                    <small className="text-600">
                        Add cities only from auth master to keep naming consistent and avoid duplicate/manual variations.
                    </small>
                </div>
                {error && <p className="text-red-500 m-0">Error loading cities: {error.message}</p>}
            </div>

            <AppDataTable
                ref={dtRef}
                value={filteredRows}
                paginator
                rows={12}
                rowsPerPageOptions={[12, 24, 50, 100]}
                dataKey="cityId"
                stripedRows
                size="small"
                loading={loading}
                headerLeft={
                    <span className="p-input-icon-left" style={{ minWidth: '320px' }}>
                        <i className="pi pi-search" />
                        <AppInput
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search city"
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
                                onChange={(event) => setLimit((event.value as number) ?? 2000)}
                                className="w-6rem"
                            />
                        </span>
                        <span className="text-600 text-sm">
                            Showing {filteredRows.length} city{filteredRows.length === 1 ? '' : 'ies'}
                        </span>
                    </>
                }
                recordSummary={`${filteredRows.length} city${filteredRows.length === 1 ? '' : 'ies'}`}
            >
                <Column field="name" header="Name" sortable />
                <Column field="districtName" header="District" />
                <Column field="stateName" header="State" />
                <Column field="countryName" header="Country" />
                <Column header="Actions" body={actionsBody} style={{ width: '8rem' }} />
            </AppDataTable>
        </div>
    );
}
