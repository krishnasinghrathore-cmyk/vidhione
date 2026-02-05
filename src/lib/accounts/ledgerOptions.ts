import { gql, useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apolloClient';

type LedgerOptionRow = {
    ledgerId: number;
    name: string | null;
    address: string | null;
};

export type LedgerOption = {
    value: number;
    label: string;
    address: string | null;
};

export type LedgerOptionsByPurposeArgs = {
    purpose?: string | null;
    ledgerGroupId?: number | null;
    areaId?: number | null;
    areaIds?: number[] | null;
    excludeLedgerId?: number | null;
    search?: string | null;
    limit?: number | null;
    includeNone?: boolean | null;
    skip?: boolean;
};

const LEDGER_OPTIONS_BY_PURPOSE = gql`
    query LedgerOptionsByPurpose(
        $purpose: String!
        $ledgerGroupId: Int
        $areaId: Int
        $areaIds: [Int!]
        $excludeLedgerId: Int
        $search: String
        $limit: Int
        $includeNone: Boolean
    ) {
        ledgerOptionsByPurpose(
            purpose: $purpose
            ledgerGroupId: $ledgerGroupId
            areaId: $areaId
            areaIds: $areaIds
            excludeLedgerId: $excludeLedgerId
            search: $search
            limit: $limit
            includeNone: $includeNone
        ) {
            ledgerId
            name
            address
        }
    }
`;

export const useLedgerOptionsByPurpose = (args: LedgerOptionsByPurposeArgs) => {
    const purpose = args.purpose?.trim() ?? '';
    const skip = args.skip || !purpose;

    const { data, loading, error, refetch } = useQuery<{ ledgerOptionsByPurpose: LedgerOptionRow[] }>(
        LEDGER_OPTIONS_BY_PURPOSE,
        {
            client: apolloClient,
            variables: {
                purpose,
                ledgerGroupId: args.ledgerGroupId ?? null,
                areaId: args.areaId ?? null,
                areaIds: args.areaIds ?? null,
                excludeLedgerId: args.excludeLedgerId ?? null,
                search: args.search ?? null,
                limit: args.limit ?? 2000,
                includeNone: args.includeNone ?? null
            },
            skip
        }
    );

    const options: LedgerOption[] = (data?.ledgerOptionsByPurpose ?? []).map((row) => ({
        value: Number(row.ledgerId),
        label: row.name ?? `Ledger ${row.ledgerId}`,
        address: row.address ?? null
    }));

    return { options, loading, error, refetch };
};
