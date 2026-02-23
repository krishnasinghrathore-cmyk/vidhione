import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

export type AreaRow = {
    areaId: number;
    name: string | null;
    cityId: number | null;
};

export type AreaOption = {
    value: number;
    label: string;
    areaId: number;
    cityId: number | null;
};

export type AreaOptionsArgs = {
    search?: string | null;
    limit?: number | null;
    skip?: boolean;
};

const AREA_LOOKUP = gql`
    query AreaLookup($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
            cityId
        }
    }
`;

export const useAreaOptions = (args: AreaOptionsArgs = {}) => {
    const variables = useMemo(
        () => ({
            search: args.search ?? null,
            limit: args.limit ?? 2000
        }),
        [args.limit, args.search]
    );

    const { data, loading, error, refetch } = useQuery<{ areas: AreaRow[] }>(AREA_LOOKUP, {
        client: apolloClient,
        variables,
        skip: args.skip,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows = useMemo(() => data?.areas ?? [], [data]);
    const options = useMemo<AreaOption[]>(
        () =>
            rows.map((row) => {
                const areaId = Number(row.areaId);
                return {
                    value: areaId,
                    label: row.name?.trim() || `Area ${areaId}`,
                    areaId,
                    cityId: row.cityId != null ? Number(row.cityId) : null
                };
            }),
        [rows]
    );

    return { rows, options, loading, error, refetch };
};
