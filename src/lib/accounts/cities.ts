import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

export type GeoCityRow = {
    cityId: number;
    name: string | null;
    districtId: number | null;
    districtName: string | null;
    stateId: number | null;
    stateName: string | null;
    countryId: number | null;
    countryName: string | null;
};

export type GeoCityOption = {
    value: number;
    label: string;
    cityId: number;
    districtId: number | null;
    districtName: string | null;
    stateId: number | null;
    stateName: string | null;
    countryId: number | null;
    countryName: string | null;
};

export type GeoCityOptionsArgs = {
    districtId?: number | null;
    stateId?: number | null;
    search?: string | null;
    limit?: number | null;
    includeInactive?: boolean | null;
    skip?: boolean;
};

const GEO_CITY_LOOKUP = gql`
    query GeoCityLookup($districtId: Int, $stateId: Int, $search: String, $limit: Int, $includeInactive: Boolean) {
        geoCities(
            districtId: $districtId
            stateId: $stateId
            search: $search
            limit: $limit
            includeInactive: $includeInactive
        ) {
            cityId
            name
            districtId
            districtName
            stateId
            stateName
            countryId
            countryName
        }
    }
`;

export const useGeoCityOptions = (args: GeoCityOptionsArgs = {}) => {
    const variables = useMemo(
        () => ({
            districtId: args.districtId ?? null,
            stateId: args.stateId ?? null,
            search: args.search ?? null,
            limit: args.limit ?? 2000,
            includeInactive: args.includeInactive ?? null
        }),
        [args.districtId, args.includeInactive, args.limit, args.search, args.stateId]
    );

    const { data, loading, error, refetch } = useQuery<{ geoCities: GeoCityRow[] }>(GEO_CITY_LOOKUP, {
        client: apolloClient,
        variables,
        skip: args.skip,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows = useMemo(() => data?.geoCities ?? [], [data]);
    const options = useMemo<GeoCityOption[]>(
        () =>
            rows.map((row) => {
                const cityId = Number(row.cityId);
                const name = row.name?.trim() ?? '';
                const context = [row.districtName, row.stateName].filter(Boolean).join(', ');
                const label = [name || `City ${cityId}`, context ? `(${context})` : null].filter(Boolean).join(' ');
                return {
                    value: cityId,
                    label,
                    cityId,
                    districtId: row.districtId != null ? Number(row.districtId) : null,
                    districtName: row.districtName ?? null,
                    stateId: row.stateId != null ? Number(row.stateId) : null,
                    stateName: row.stateName ?? null,
                    countryId: row.countryId != null ? Number(row.countryId) : null,
                    countryName: row.countryName ?? null
                };
            }),
        [rows]
    );

    return { rows, options, loading, error, refetch };
};
