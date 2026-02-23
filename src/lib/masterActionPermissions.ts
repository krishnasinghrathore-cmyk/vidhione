import {
    gql,
    useQuery,
    type ApolloClient,
    type ApolloError,
    type NormalizedCacheObject
} from '@apollo/client';
import { useMemo } from 'react';

export type MasterAction = 'view' | 'add' | 'edit' | 'delete';

export type MasterActionPermissions = {
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    source?: string | null;
    matchedUserId?: number | null;
    matchedLoginId?: string | null;
};

type MasterActionPermissionsQueryData = {
    masterActionPermissions?: MasterActionPermissions | null;
};

export const MASTER_ACTION_PERMISSIONS_QUERY = gql`
    query MasterActionPermissions {
        masterActionPermissions {
            canView
            canAdd
            canEdit
            canDelete
            source
            matchedUserId
            matchedLoginId
        }
    }
`;

export const DEFAULT_MASTER_ACTION_PERMISSIONS: MasterActionPermissions = {
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    source: null,
    matchedUserId: null,
    matchedLoginId: null
};

const toBoolean = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

const normalizePermissions = (
    value: MasterActionPermissions | null | undefined
): MasterActionPermissions => ({
    canView: toBoolean(value?.canView, DEFAULT_MASTER_ACTION_PERMISSIONS.canView),
    canAdd: toBoolean(value?.canAdd, DEFAULT_MASTER_ACTION_PERMISSIONS.canAdd),
    canEdit: toBoolean(value?.canEdit, DEFAULT_MASTER_ACTION_PERMISSIONS.canEdit),
    canDelete: toBoolean(value?.canDelete, DEFAULT_MASTER_ACTION_PERMISSIONS.canDelete),
    source: typeof value?.source === 'string' ? value.source : DEFAULT_MASTER_ACTION_PERMISSIONS.source,
    matchedUserId:
        typeof value?.matchedUserId === 'number'
            ? value.matchedUserId
            : DEFAULT_MASTER_ACTION_PERMISSIONS.matchedUserId,
    matchedLoginId:
        typeof value?.matchedLoginId === 'string'
            ? value.matchedLoginId
            : DEFAULT_MASTER_ACTION_PERMISSIONS.matchedLoginId
});

export const isMasterActionAllowed = (permissions: MasterActionPermissions, action: MasterAction) => {
    switch (action) {
        case 'view':
            return permissions.canView;
        case 'add':
            return permissions.canAdd;
        case 'edit':
            return permissions.canEdit;
        case 'delete':
            return permissions.canDelete;
        default:
            return false;
    }
};

export const getMasterActionDeniedDetail = (action: MasterAction, entityLabel = 'this master') =>
    `You do not have permission to ${action} ${entityLabel}.`;

export type UseMasterActionPermissionsResult = {
    permissions: MasterActionPermissions;
    loadingPermissions: boolean;
    permissionsError: ApolloError | undefined;
    refetchPermissions: ReturnType<typeof useQuery<MasterActionPermissionsQueryData>>['refetch'];
};

export const useMasterActionPermissions = (
    client: ApolloClient<NormalizedCacheObject>
): UseMasterActionPermissionsResult => {
    const { data, loading, error, refetch } = useQuery<MasterActionPermissionsQueryData>(
        MASTER_ACTION_PERMISSIONS_QUERY,
        {
            client,
            fetchPolicy: 'cache-and-network',
            nextFetchPolicy: 'cache-first'
        }
    );

    const permissions = useMemo(
        () => normalizePermissions(data?.masterActionPermissions),
        [data?.masterActionPermissions]
    );

    return {
        permissions,
        loadingPermissions: loading,
        permissionsError: error,
        refetchPermissions: refetch
    };
};
