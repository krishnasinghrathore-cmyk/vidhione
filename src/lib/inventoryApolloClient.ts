import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, fromPromise } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getAccessToken } from '@/lib/auth/storage';
import { refreshAccessToken } from '@/lib/auth/api';

const getDefaultGraphqlUrl = () =>
    import.meta.env.VITE_GRAPHQL_URL || 'http://127.0.0.1:4000/graphql';

export const getInventoryGraphqlUrl = () => {
    const configured = import.meta.env.VITE_INVENTORY_GRAPHQL_URL;
    if (configured) return configured;

    const base = getDefaultGraphqlUrl();
    if (/\/graphql\/?$/.test(base)) return base.replace(/\/graphql\/?$/, '/inventory/graphql');
    return `${base.replace(/\/$/, '')}/inventory/graphql`;
};

export const inventoryGraphqlUrl = getInventoryGraphqlUrl();

const authLink = setContext((_, { headers }) => {
    const token = getAccessToken();
    return {
        headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    };
});

export const inventoryApolloClient = new ApolloClient({
    link: ApolloLink.from([
        onError(({ graphQLErrors, networkError, operation, forward }) => {
            const statusCode =
                (networkError as { statusCode?: number } | null)?.statusCode ??
                (networkError as { status?: number } | null)?.status;
            const hasAuthError =
                statusCode === 401 ||
                (graphQLErrors ?? []).some((err) => err.extensions?.code === 'UNAUTHENTICATED');

            if (!hasAuthError) return;

            const alreadyTried = Boolean(operation.getContext().refreshAttempted);
            if (alreadyTried) return;

            operation.setContext({ refreshAttempted: true });

            return fromPromise(
                refreshAccessToken().then((token) => {
                    if (!token) throw new Error('Refresh failed');
                    return token;
                })
            ).flatMap((token) => {
                const prevHeaders = operation.getContext().headers ?? {};
                operation.setContext({
                    headers: {
                        ...prevHeaders,
                        Authorization: `Bearer ${token}`
                    }
                });
                return forward(operation);
            });
        }),
        authLink,
        new HttpLink({ uri: inventoryGraphqlUrl })
    ]),
    cache: new InMemoryCache()
});
