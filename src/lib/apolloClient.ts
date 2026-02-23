import {
    ApolloClient,
    ApolloLink,
    HttpLink,
    InMemoryCache,
    fromPromise,
    type NormalizedCacheObject
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { getAccessToken } from '@/lib/auth/storage';
import { refreshAccessToken } from '@/lib/auth/api';
import { resolveGraphqlUrl } from '@/lib/graphqlUrl';

export type CreateApolloClientOptions = {
    ssrMode?: boolean;
    initialState?: NormalizedCacheObject | null;
    accessToken?: string | null;
    extraHeaders?: Record<string, string>;
    graphqlUrl?: string;
};

const readWindowApolloState = (): NormalizedCacheObject | null => {
    if (typeof window === 'undefined') return null;
    return window.__APOLLO_STATE__ ?? null;
};

export const createApolloClient = (options: CreateApolloClientOptions = {}) => {
    const ssrMode = Boolean(options.ssrMode);
    const cache = new InMemoryCache();
    if (options.initialState) {
        cache.restore(options.initialState);
    }

    const authLink = setContext((_, { headers }) => {
        const token = options.accessToken ?? getAccessToken();
        return {
            headers: {
                ...headers,
                ...(options.extraHeaders ?? {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        };
    });

    const links: ApolloLink[] = [];
    if (!ssrMode) {
        links.push(
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
            })
        );
    }
    links.push(authLink, new HttpLink({ uri: resolveGraphqlUrl(options.graphqlUrl) }));

    return new ApolloClient({
        ssrMode,
        link: ApolloLink.from(links),
        cache
    });
};

export const apolloClient = createApolloClient({
    initialState: readWindowApolloState()
});
