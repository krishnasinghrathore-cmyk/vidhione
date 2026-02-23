import type { ApolloClient } from '@apollo/client';

export const ACCOUNT_MASTER_QUERY_OPTIONS = {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true
} as const;

export const ACCOUNT_MASTER_LAZY_QUERY_OPTIONS = {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true
} as const;

const ROOT_QUERY_ID = 'ROOT_QUERY';

export const ACCOUNT_MASTER_LOOKUP_FIELDS = [
    'ledgerGroups',
    'ledgerGroupMasters',
    'voucherTypes',
    'voucherTypeMasters',
    'ledgerOptions',
    'ledgerOptionsByPurpose',
    'partyLedgerOptions',
    'ledgerSummaries',
    'areas',
    'cities',
    'geoCountries',
    'geoStates',
    'geoDistricts',
    'geoCities'
] as const;

export const invalidateAccountMasterLookups = (client: ApolloClient<object>) => {
    ACCOUNT_MASTER_LOOKUP_FIELDS.forEach((fieldName) => {
        client.cache.evict({ id: ROOT_QUERY_ID, fieldName });
    });
    client.cache.gc();
};
