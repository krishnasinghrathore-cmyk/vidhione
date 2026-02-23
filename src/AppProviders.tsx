import React from 'react';
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { ApolloProvider } from '@apollo/client';
import { PrimeReactProvider } from 'primereact/api';
import { HelmetProvider } from 'react-helmet-async';
import { RouterProvider } from 'react-router-dom';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { TenantApolloCacheGuard } from './components/TenantApolloCacheGuard';
import { AuthProvider, type AuthState } from './lib/auth/context';
import { LayoutProvider } from './layout/context/layoutcontext';

type AppRouter = React.ComponentProps<typeof RouterProvider>['router'];

export type AppProvidersProps = {
    router: AppRouter;
    apolloClient: ApolloClient<NormalizedCacheObject>;
    authInitialState?: Partial<AuthState> | null;
    skipInitialAuthRefresh?: boolean;
};

export function AppProviders({
    router,
    apolloClient,
    authInitialState = null,
    skipInitialAuthRefresh = false
}: AppProvidersProps) {
    return (
        <PrimeReactProvider>
            <HelmetProvider>
                <AuthProvider initialState={authInitialState} skipInitialRefresh={skipInitialAuthRefresh}>
                    <ApolloProvider client={apolloClient}>
                        <TenantApolloCacheGuard />
                        <LayoutProvider>
                            <AppErrorBoundary>
                                <RouterProvider router={router} />
                            </AppErrorBoundary>
                        </LayoutProvider>
                    </ApolloProvider>
                </AuthProvider>
            </HelmetProvider>
        </PrimeReactProvider>
    );
}
