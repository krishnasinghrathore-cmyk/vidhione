import { gql, useQuery } from '@apollo/client';
import { useMemo } from 'react';

export const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                ledgerGroupId
                gstNumber
                taxRate
                taxTypeCode
                address
                cityName
                stateName
            }
        }
    }
`;

export type LedgerSummary = {
    ledgerId: number;
    name: string | null;
    ledgerGroupId: number | null;
    gstNumber: string | null;
    taxRate: string | null;
    taxTypeCode: number | null;
    address: string | null;
    cityName: string | null;
    stateName: string | null;
};

export type LedgerOption = { label: string; value: number };

export const useLedgerLookup = () => {
    const { data, loading, error } = useQuery(LEDGER_LOOKUP, {
        variables: { search: null, limit: 500 }
    });

    const ledgers = useMemo(() => {
        const items = (data as any)?.ledgerSummaries?.items ?? [];
        return (Array.isArray(items) ? items : []) as LedgerSummary[];
    }, [data]);

    const ledgerById = useMemo(() => {
        const map = new Map<number, LedgerSummary>();
        for (const l of ledgers) {
            if (l && typeof (l as any).ledgerId === 'number') map.set(Number(l.ledgerId), l);
        }
        return map;
    }, [ledgers]);

    const ledgerOptions = useMemo(() => {
        return ledgers
            .filter((l) => typeof l.ledgerId === 'number')
            .map((l) => ({
                label: `${l.name || `Ledger ${l.ledgerId}`}${l.gstNumber ? ` • GSTIN ${l.gstNumber}` : ''}`,
                value: Number(l.ledgerId)
            })) as LedgerOption[];
    }, [ledgers]);

    return { ledgers, ledgerById, ledgerOptions, loading, error };
};

export type LedgerLookupResult = ReturnType<typeof useLedgerLookup>;
