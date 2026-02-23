import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

type LedgerGroupRow = {
    ledgerGroupId: number;
    name: string | null;
    groupTypeCode: number | null;
};

export type LedgerGroupOption = {
    value: number;
    label: string;
    name: string | null;
    groupTypeCode: number | null;
};

export type LedgerGroupOptionsArgs = {
    skip?: boolean;
};

const LEDGER_GROUPS = gql`
    query LedgerGroups {
        ledgerGroups {
            ledgerGroupId
            name
            groupTypeCode
        }
    }
`;

export const useLedgerGroupOptions = (args: LedgerGroupOptionsArgs = {}) => {
    const { data, loading, error, refetch } = useQuery<{ ledgerGroups: LedgerGroupRow[] }>(LEDGER_GROUPS, {
        client: apolloClient,
        skip: args.skip,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows = useMemo(() => data?.ledgerGroups ?? [], [data]);
    const options: LedgerGroupOption[] = useMemo(() => {
        const sorted = [...rows].sort((a, b) =>
            (a.name ?? '').localeCompare(b.name ?? '', 'en', { sensitivity: 'base' })
        );
        return sorted.map((row) => ({
            value: Number(row.ledgerGroupId),
            label: row.name ?? `Group ${row.ledgerGroupId}`,
            name: row.name ?? null,
            groupTypeCode: row.groupTypeCode != null ? Number(row.groupTypeCode) : null
        }));
    }, [rows]);

    return { options, loading, error, refetch };
};
