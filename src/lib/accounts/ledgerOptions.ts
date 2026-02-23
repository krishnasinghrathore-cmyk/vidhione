import { gql, useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

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

type LedgerSummaryFallbackRow = {
    ledgerId: number;
    name: string | null;
    address: string | null;
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

const LEDGER_SUMMARY_NAME_FALLBACK = gql`
    query LedgerSummaryNameFallback($search: String, $ledgerGroupId: Int, $limit: Int) {
        ledgerSummaries(
            search: $search
            ledgerGroupId: $ledgerGroupId
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                address
            }
        }
    }
`;

export const useLedgerOptionsByPurpose = (args: LedgerOptionsByPurposeArgs) => {
    const purpose = args.purpose?.trim() ?? '';
    const skip = args.skip || !purpose;
    const limit = args.limit ?? 2000;
    const search = args.search ?? null;
    const ledgerGroupId = args.ledgerGroupId ?? null;

    const { data, loading, error, refetch } = useQuery<{ ledgerOptionsByPurpose: LedgerOptionRow[] }>(
        LEDGER_OPTIONS_BY_PURPOSE,
        {
            client: apolloClient,
            variables: {
                purpose,
                ledgerGroupId,
                areaId: args.areaId ?? null,
                areaIds: args.areaIds ?? null,
                excludeLedgerId: args.excludeLedgerId ?? null,
                search,
                limit,
                includeNone: args.includeNone ?? null
            },
            skip,
            ...ACCOUNT_MASTER_QUERY_OPTIONS
        }
    );

    const purposeRows = data?.ledgerOptionsByPurpose ?? [];
    const hasUnnamedRows = purposeRows.some((row) => {
        const label = row.name?.trim() ?? '';
        return !label;
    });
    const shouldLoadNameFallback = !skip && hasUnnamedRows;

    const { data: fallbackData, loading: fallbackLoading } = useQuery<{
        ledgerSummaries: { items: LedgerSummaryFallbackRow[] };
    }>(LEDGER_SUMMARY_NAME_FALLBACK, {
        client: apolloClient,
        variables: {
            search,
            ledgerGroupId,
            limit
        },
        skip: !shouldLoadNameFallback,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const fallbackNameById = new Map<number, LedgerSummaryFallbackRow>();
    (fallbackData?.ledgerSummaries?.items ?? []).forEach((row) => {
        const ledgerId = Number(row.ledgerId);
        if (!Number.isFinite(ledgerId)) return;
        fallbackNameById.set(ledgerId, row);
    });

    const options: LedgerOption[] = purposeRows.map((row) => {
        const ledgerId = Number(row.ledgerId);
        const fallback = fallbackNameById.get(ledgerId);
        const label = row.name?.trim() || fallback?.name?.trim() || `Ledger ${row.ledgerId}`;
        const address = row.address ?? fallback?.address ?? null;
        return {
            value: ledgerId,
            label,
            address
        };
    });

    return { options, loading: loading || fallbackLoading, error, refetch };
};
