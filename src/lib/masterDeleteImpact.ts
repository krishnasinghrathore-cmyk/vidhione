import { gql } from '@apollo/client';
import { apolloClient } from '@/lib/apolloClient';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';

export type InventoryMasterDeleteEntity =
    | 'PRODUCT_GROUP'
    | 'PRODUCT_BRAND'
    | 'PRODUCT_ATTRIBUTE_TYPE'
    | 'UNIT'
    | 'HSN_CODE'
    | 'SCHEME_BATCH'
    | 'DELIVERY_BY'
    | 'DELIVERY_STATUS'
    | 'CHECKED_BY'
    | 'BILL_COLLECTION_STATUS'
    | 'TRANSPORTER'
    | 'GODOWN'
    | 'PRODUCT';

export type AccountsMasterDeleteEntity = 'LEDGER' | 'LEDGER_GROUP' | 'SALESMAN';

export interface MasterDeleteDependencyCount {
    key: string;
    label: string;
    count: number;
}

export interface MasterDeleteImpact {
    canDelete: boolean;
    totalReferences: number;
    dependencies: MasterDeleteDependencyCount[];
}

const INVENTORY_MASTER_DELETE_IMPACT = gql`
    query InventoryMasterDeleteImpact($entity: InventoryMasterDeleteEntity!, $recordId: Int!) {
        inventoryMasterDeleteImpact(entity: $entity, recordId: $recordId) {
            canDelete
            totalReferences
            dependencies {
                key
                label
                count
            }
        }
    }
`;

const ACCOUNTS_MASTER_DELETE_IMPACT = gql`
    query AccountsMasterDeleteImpact($entity: AccountsMasterDeleteEntity!, $recordId: Int!) {
        accountsMasterDeleteImpact(entity: $entity, recordId: $recordId) {
            canDelete
            totalReferences
            dependencies {
                key
                label
                count
            }
        }
    }
`;

const normalizeImpact = (impact: unknown): MasterDeleteImpact => {
    const value = impact as
        | {
              canDelete?: unknown;
              totalReferences?: unknown;
              dependencies?: Array<{
                  key?: unknown;
                  label?: unknown;
                  count?: unknown;
              }>;
          }
        | undefined;

    const dependencies = Array.isArray(value?.dependencies)
        ? value.dependencies
              .map((entry) => ({
                  key: typeof entry?.key === 'string' ? entry.key : '',
                  label: typeof entry?.label === 'string' ? entry.label : '',
                  count: Number(entry?.count ?? 0)
              }))
              .filter((entry) => entry.key && entry.label && Number.isFinite(entry.count) && entry.count > 0)
        : [];

    const totalReferences = Number(value?.totalReferences ?? 0);
    const safeTotalReferences = Number.isFinite(totalReferences) && totalReferences > 0 ? totalReferences : 0;
    const canDeleteFlag =
        typeof value?.canDelete === 'boolean' ? value.canDelete : safeTotalReferences === 0;
    const canDelete = canDeleteFlag && safeTotalReferences === 0;

    return {
        canDelete,
        totalReferences: safeTotalReferences,
        dependencies
    };
};

export const fetchInventoryMasterDeleteImpact = async (
    entity: InventoryMasterDeleteEntity,
    recordId: number
): Promise<MasterDeleteImpact> => {
    try {
        const result = await inventoryApolloClient.query<{
            inventoryMasterDeleteImpact?: MasterDeleteImpact;
        }>({
            query: INVENTORY_MASTER_DELETE_IMPACT,
            variables: { entity, recordId },
            fetchPolicy: 'network-only'
        });
        return normalizeImpact(result.data?.inventoryMasterDeleteImpact);
    } catch {
        return {
            canDelete: true,
            totalReferences: 0,
            dependencies: []
        };
    }
};

export const fetchAccountsMasterDeleteImpact = async (
    entity: AccountsMasterDeleteEntity,
    recordId: number
): Promise<MasterDeleteImpact> => {
    try {
        const result = await apolloClient.query<{
            accountsMasterDeleteImpact?: MasterDeleteImpact;
        }>({
            query: ACCOUNTS_MASTER_DELETE_IMPACT,
            variables: { entity, recordId },
            fetchPolicy: 'network-only'
        });
        return normalizeImpact(result.data?.accountsMasterDeleteImpact);
    } catch {
        return {
            canDelete: true,
            totalReferences: 0,
            dependencies: []
        };
    }
};

export const getDeleteBlockedMessage = (entityLabel: string, impact: MasterDeleteImpact) => {
    if (!impact.dependencies.length) {
        return `Cannot delete ${entityLabel} because it is referenced by other records.`;
    }

    const preview = impact.dependencies
        .slice(0, 3)
        .map((entry) => `${entry.label}: ${entry.count}`)
        .join(', ');
    const remaining = impact.dependencies.length > 3 ? `, +${impact.dependencies.length - 3} more` : '';
    return `Cannot delete ${entityLabel}. Referenced in ${impact.totalReferences} record(s): ${preview}${remaining}.`;
};
