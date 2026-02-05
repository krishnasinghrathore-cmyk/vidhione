'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { gql, useLazyQuery, useMutation } from '@apollo/client';
import AppDropdown from '@/components/AppDropdown';

const AUTH_GEO_COUNTRIES = gql`
    query AuthGeoCountries($search: String, $limit: Int) {
        authGeoCountries(search: $search, limit: $limit) {
            id
            iso2
            iso3
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

const ENSURE_GEO_COUNTRY = gql`
    mutation EnsureGeoCountry($authCountryId: Int!) {
        ensureGeoCountry(authCountryId: $authCountryId) {
            countryId
        }
    }
`;

const ENSURE_GEO_STATE = gql`
    mutation EnsureGeoState($authStateId: Int!) {
        ensureGeoState(authStateId: $authStateId) {
            stateId
            countryId
        }
    }
`;

const ENSURE_GEO_DISTRICT = gql`
    mutation EnsureGeoDistrict($authDistrictId: Int!) {
        ensureGeoDistrict(authDistrictId: $authDistrictId) {
            districtId
            stateId
            countryId
        }
    }
`;

const ENSURE_GEO_CITY = gql`
    mutation EnsureGeoCity($authCityId: Int!) {
        ensureGeoCity(authCityId: $authCityId) {
            cityId
            districtId
            stateId
            countryId
        }
    }
`;

type GeoSelection = {
    countryId?: number | null;
    stateId?: number | null;
    districtId?: number | null;
    cityId?: number | null;
};

type AuthOption = { id: number; name: string; code?: string | null; iso2?: string | null; iso3?: string | null };

type GeoImportDialogProps = {
    visible: boolean;
    onHide: () => void;
    onApply: (selection: GeoSelection) => void;
    title?: string;
};

const buildLabel = (option: AuthOption) => {
    const code = option.code || option.iso2 || option.iso3;
    return code ? `${option.name} (${code})` : option.name;
};

export default function GeoImportDialog({ visible, onHide, onApply, title }: GeoImportDialogProps) {
    const [authCountryId, setAuthCountryId] = useState<number | null>(null);
    const [authStateId, setAuthStateId] = useState<number | null>(null);
    const [authDistrictId, setAuthDistrictId] = useState<number | null>(null);
    const [authCityId, setAuthCityId] = useState<number | null>(null);

    const [loadCountries, countriesQuery] = useLazyQuery(AUTH_GEO_COUNTRIES, { fetchPolicy: 'network-only' });
    const [loadStates, statesQuery] = useLazyQuery(AUTH_GEO_STATES, { fetchPolicy: 'network-only' });
    const [loadDistricts, districtsQuery] = useLazyQuery(AUTH_GEO_DISTRICTS, { fetchPolicy: 'network-only' });
    const [loadCities, citiesQuery] = useLazyQuery(AUTH_GEO_CITIES, { fetchPolicy: 'network-only' });

    const [ensureCountry] = useMutation(ENSURE_GEO_COUNTRY);
    const [ensureState] = useMutation(ENSURE_GEO_STATE);
    const [ensureDistrict] = useMutation(ENSURE_GEO_DISTRICT);
    const [ensureCity] = useMutation(ENSURE_GEO_CITY);

    useEffect(() => {
        if (visible) {
            loadCountries({ variables: { search: null, limit: 200 } });
        }
    }, [visible, loadCountries]);

    useEffect(() => {
        if (authCountryId) {
            loadStates({ variables: { countryId: authCountryId, search: null, limit: 200 } });
        }
    }, [authCountryId, loadStates]);

    useEffect(() => {
        if (authStateId) {
            loadDistricts({ variables: { stateId: authStateId, search: null, limit: 200 } });
        }
    }, [authStateId, loadDistricts]);

    useEffect(() => {
        if (authDistrictId) {
            loadCities({ variables: { districtId: authDistrictId, search: null, limit: 200 } });
        }
    }, [authDistrictId, loadCities]);

    const countries = (countriesQuery.data?.authGeoCountries ?? []) as AuthOption[];
    const states = (statesQuery.data?.authGeoStates ?? []) as AuthOption[];
    const districts = (districtsQuery.data?.authGeoDistricts ?? []) as AuthOption[];
    const cities = (citiesQuery.data?.authGeoCities ?? []) as AuthOption[];

    const countryOptions = useMemo(
        () => countries.map((c) => ({ label: buildLabel(c), value: c.id })),
        [countries]
    );
    const stateOptions = useMemo(
        () => states.map((s) => ({ label: buildLabel(s), value: s.id })),
        [states]
    );
    const districtOptions = useMemo(
        () => districts.map((d) => ({ label: d.name, value: d.id })),
        [districts]
    );
    const cityOptions = useMemo(
        () => cities.map((c) => ({ label: c.name, value: c.id })),
        [cities]
    );

    const resetSelections = () => {
        setAuthCountryId(null);
        setAuthStateId(null);
        setAuthDistrictId(null);
        setAuthCityId(null);
    };

    const handleApply = async () => {
        if (authCityId) {
            const result = await ensureCity({ variables: { authCityId } });
            const payload = result.data?.ensureGeoCity;
            onApply({
                countryId: payload?.countryId ?? null,
                stateId: payload?.stateId ?? null,
                districtId: payload?.districtId ?? null,
                cityId: payload?.cityId ?? null
            });
            onHide();
            resetSelections();
            return;
        }
        if (authDistrictId) {
            const result = await ensureDistrict({ variables: { authDistrictId } });
            const payload = result.data?.ensureGeoDistrict;
            onApply({
                countryId: payload?.countryId ?? null,
                stateId: payload?.stateId ?? null,
                districtId: payload?.districtId ?? null
            });
            onHide();
            resetSelections();
            return;
        }
        if (authStateId) {
            const result = await ensureState({ variables: { authStateId } });
            const payload = result.data?.ensureGeoState;
            onApply({
                countryId: payload?.countryId ?? null,
                stateId: payload?.stateId ?? null
            });
            onHide();
            resetSelections();
            return;
        }
        if (authCountryId) {
            const result = await ensureCountry({ variables: { authCountryId } });
            const payload = result.data?.ensureGeoCountry;
            onApply({ countryId: payload?.countryId ?? null });
            onHide();
            resetSelections();
        }
    };

    const applyDisabled = !authCountryId;

    return (
        <Dialog
            visible={visible}
            onHide={() => {
                onHide();
                resetSelections();
            }}
            header={title ?? 'Import from Master'}
            style={{ width: 'min(720px, 96vw)' }}
            modal
        >
            <div className="grid">
                <div className="col-12 md:col-6">
                    <label className="font-medium text-700">Country</label>
                    <div className="flex align-items-center gap-2 mt-2">
                        <AppDropdown
                            value={authCountryId}
                            options={countryOptions}
                            placeholder="Search country"
                            filter
                            onFilter={(e) => {
                                const query = e.filter ?? '';
                                loadCountries({ variables: { search: query || null, limit: 200 } });
                            }}
                            onChange={(e) => {
                                const nextId = (e.value as number | null) ?? null;
                                setAuthCountryId(nextId);
                                setAuthStateId(null);
                                setAuthDistrictId(null);
                                setAuthCityId(null);
                            }}
                            showClear
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="col-12 md:col-6">
                    <label className="font-medium text-700">State</label>
                    <div className="flex align-items-center gap-2 mt-2">
                        <AppDropdown
                            value={authStateId}
                            options={stateOptions}
                            placeholder={authCountryId ? 'Search state' : 'Select country first'}
                            filter
                            disabled={!authCountryId}
                            onFilter={(e) => {
                                const query = e.filter ?? '';
                                if (authCountryId) {
                                    loadStates({ variables: { countryId: authCountryId, search: query || null, limit: 200 } });
                                }
                            }}
                            onChange={(e) => {
                                const nextId = (e.value as number | null) ?? null;
                                setAuthStateId(nextId);
                                setAuthDistrictId(null);
                                setAuthCityId(null);
                            }}
                            showClear
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="col-12 md:col-6">
                    <label className="font-medium text-700">District</label>
                    <div className="flex align-items-center gap-2 mt-2">
                        <AppDropdown
                            value={authDistrictId}
                            options={districtOptions}
                            placeholder={authStateId ? 'Search district' : 'Select state first'}
                            filter
                            disabled={!authStateId}
                            onFilter={(e) => {
                                const query = e.filter ?? '';
                                if (authStateId) {
                                    loadDistricts({ variables: { stateId: authStateId, search: query || null, limit: 200 } });
                                }
                            }}
                            onChange={(e) => {
                                const nextId = (e.value as number | null) ?? null;
                                setAuthDistrictId(nextId);
                                setAuthCityId(null);
                            }}
                            showClear
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="col-12 md:col-6">
                    <label className="font-medium text-700">City</label>
                    <div className="flex align-items-center gap-2 mt-2">
                        <AppDropdown
                            value={authCityId}
                            options={cityOptions}
                            placeholder={authDistrictId ? 'Search city' : 'Select district first'}
                            filter
                            disabled={!authDistrictId}
                            onFilter={(e) => {
                                const query = e.filter ?? '';
                                if (authDistrictId) {
                                    loadCities({ variables: { districtId: authDistrictId, search: query || null, limit: 200 } });
                                }
                            }}
                            onChange={(e) => setAuthCityId((e.value as number | null) ?? null)}
                            showClear
                            className="w-full"
                        />
                    </div>
                </div>
                <div className="col-12">
                    <small className="text-600">Pick as deep as you need; Apply will import the selected level.</small>
                </div>
            </div>
            <div className="flex justify-content-end gap-2 mt-3">
                <Button label="Cancel" severity="secondary" onClick={onHide} />
                <Button label="Apply" onClick={handleApply} disabled={applyDisabled} />
            </div>
        </Dialog>
    );
}
