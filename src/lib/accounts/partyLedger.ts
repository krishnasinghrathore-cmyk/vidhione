import { gql, useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apolloClient';
import { useMemo } from 'react';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

export const PARTY_LEDGER_OPTIONS = gql`
    query PartyLedgerOptions(
        $search: String
        $limit: Int
        $ledgerGroupId: Int
        $cityId: Int
        $includeNone: Boolean
    ) {
        partyLedgerOptions(
            search: $search
            limit: $limit
            ledgerGroupId: $ledgerGroupId
            cityId: $cityId
            includeNone: $includeNone
        ) {
            ledgerId
            name
            address
        }
    }
`;

export type PartyLedgerOptionRow = {
    ledgerId: number;
    name: string | null;
    address: string | null;
};

export type PartyLedgerOption = {
    label: string;
    value: number | null;
    address: string | null;
};

export type PartyLedgerOptionsArgs = {
    search?: string | null;
    limit?: number | null;
    ledgerGroupId?: number | null;
    cityId?: number | null;
    includeNone?: boolean | null;
    skip?: boolean;
};

export const usePartyLedgerOptions = (args: PartyLedgerOptionsArgs = {}) => {
    const variables = useMemo(
        () => ({
            search: args.search ?? null,
            limit: args.limit ?? 2000,
            ledgerGroupId: args.ledgerGroupId ?? null,
            cityId: args.cityId ?? null,
            includeNone: args.includeNone ?? true
        }),
        [args.cityId, args.includeNone, args.ledgerGroupId, args.limit, args.search]
    );

    const { data, loading, error, refetch } = useQuery(PARTY_LEDGER_OPTIONS, {
        client: apolloClient,
        variables,
        skip: args.skip,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows = useMemo(() => {
        const items = (data as any)?.partyLedgerOptions ?? [];
        return (Array.isArray(items) ? items : []) as PartyLedgerOptionRow[];
    }, [data]);

    const options = useMemo(() => {
        return rows.map((row) => {
            const ledgerId = Number(row.ledgerId);
            const value = Number.isFinite(ledgerId) && ledgerId > 0 ? ledgerId : null;
            return {
                label: row.name ?? (value ? `Ledger ${ledgerId}` : '[None]'),
                value,
                address: row.address ?? null
            };
        });
    }, [rows]);

    return { rows, options, loading, error, refetch };
};
