import { useApolloClient, type ApolloClient } from '@apollo/client';
import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';
import { billingApolloClient } from '@/lib/billingApolloClient';
import { inventoryApolloClient } from '@/lib/inventoryApolloClient';
import { wealthApolloClient } from '@/lib/wealthApolloClient';

const buildCacheScopeKey = (userId: string | null, tenantId: string | null) => {
    if (!userId) return 'anonymous';
    if (!tenantId) return `workspace:${userId}`;
    return `tenant:${tenantId}:user:${userId}`;
};

const toUniqueClients = (clients: ApolloClient<object>[]) => {
    const seen = new Set<ApolloClient<object>>();
    const unique: ApolloClient<object>[] = [];
    clients.forEach((client) => {
        if (seen.has(client)) return;
        seen.add(client);
        unique.push(client);
    });
    return unique;
};

const clearClientStores = async (clients: ApolloClient<object>[]) => {
    await Promise.all(
        clients.map((client) =>
            client.clearStore().catch(() => {
                return undefined;
            })
        )
    );
};

export const TenantApolloCacheGuard = () => {
    const apolloClient = useApolloClient();
    const { user, tenantId } = useAuth();
    const scopeKey = useMemo(() => buildCacheScopeKey(user?.id ?? null, tenantId), [tenantId, user?.id]);
    const previousScopeRef = useRef(scopeKey);

    useEffect(() => {
        if (previousScopeRef.current === scopeKey) return;
        previousScopeRef.current = scopeKey;
        const clients = toUniqueClients([apolloClient, billingApolloClient, inventoryApolloClient, wealthApolloClient]);
        void clearClientStores(clients);
    }, [apolloClient, scopeKey]);

    return null;
};
