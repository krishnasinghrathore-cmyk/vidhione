// main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import AppRoutes from './Router';

import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './styles/layout/layout.scss';
import './styles/demo/flags/flags.css';
import './styles/demo/Demos.scss';

import { LayoutProvider } from './layout/context/layoutcontext';
import { PrimeReactProvider } from 'primereact/api';
import { HelmetProvider } from 'react-helmet-async';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from './lib/apolloClient';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AuthProvider } from './lib/auth/context';

// ✅ Create router with future flags (recommended for React Router v7+)
const router = createBrowserRouter(AppRoutes);

createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
        <PrimeReactProvider>
            <HelmetProvider>
                <AuthProvider>
                    <ApolloProvider client={apolloClient}>
                        <LayoutProvider>
                            <AppErrorBoundary>
                                <RouterProvider router={router} />
                            </AppErrorBoundary>
                        </LayoutProvider>
                    </ApolloProvider>
                </AuthProvider>
            </HelmetProvider>
        </PrimeReactProvider>
    </StrictMode>
);
