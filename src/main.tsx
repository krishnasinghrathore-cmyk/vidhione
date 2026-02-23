// main.tsx
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import AppRoutes from './Router';

import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './styles/layout/layout.scss';
import './styles/demo/flags/flags.css';
import './styles/demo/Demos.scss';

import { apolloClient } from './lib/apolloClient';
import { AppProviders } from './AppProviders';
import type { AuthState } from './lib/auth/context';

// ✅ Create router with future flags (recommended for React Router v7+)
const router = createBrowserRouter(AppRoutes);
const initialAuthState = (window.__AUTH_STATE__ ?? null) as Partial<AuthState> | null;
const shouldHydrate = (document.getElementById('root') as HTMLElement).hasChildNodes();
const app = (
    <StrictMode>
        <AppProviders
            router={router}
            apolloClient={apolloClient}
            authInitialState={initialAuthState}
            skipInitialAuthRefresh={Boolean(initialAuthState)}
        />
    </StrictMode>
);
const rootElement = document.getElementById('root') as HTMLElement;

if (shouldHydrate) {
    hydrateRoot(rootElement, app);
} else {
    createRoot(rootElement).render(app);
}
