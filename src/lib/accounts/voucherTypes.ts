import { gql, useQuery } from '@apollo/client';
import { apolloClient } from '@/lib/apolloClient';
import { ACCOUNT_MASTER_QUERY_OPTIONS } from '@/lib/accounts/masterLookupCache';

type VoucherTypeRow = {
    voucherTypeId: number;
    displayName: string | null;
    voucherTypeName: string | null;
};

export type VoucherTypeOption = {
    value: number;
    label: string;
    voucherTypeName: string | null;
    displayName: string | null;
};

export type VoucherTypeOptionsArgs = {
    skip?: boolean;
};

const VOUCHER_TYPES = gql`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            displayName
            voucherTypeName
        }
    }
`;

export const useVoucherTypeOptions = (args: VoucherTypeOptionsArgs = {}) => {
    const { data, loading, error, refetch } = useQuery<{ voucherTypes: VoucherTypeRow[] }>(VOUCHER_TYPES, {
        client: apolloClient,
        skip: args.skip,
        ...ACCOUNT_MASTER_QUERY_OPTIONS
    });

    const rows = data?.voucherTypes ?? [];
    const sorted = [...rows].sort((a, b) =>
        (a.displayName ?? a.voucherTypeName ?? '').localeCompare(b.displayName ?? b.voucherTypeName ?? '', 'en', {
            sensitivity: 'base'
        })
    );

    const options: VoucherTypeOption[] = sorted.map((row) => ({
        value: Number(row.voucherTypeId),
        label: row.displayName ?? row.voucherTypeName ?? `Voucher ${row.voucherTypeId}`,
        voucherTypeName: row.voucherTypeName ?? null,
        displayName: row.displayName ?? null
    }));

    return { options, loading, error, refetch };
};
