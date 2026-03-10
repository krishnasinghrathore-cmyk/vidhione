'use client';
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context';
import { APPS } from '@/config/appsConfig';
import { resolveTenantHomePath } from './defaultRoute';

export const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    const { loading, user, tenantId, enabledApps, tenantIndustryKey } = useAuth();
    const location = useLocation();
    const tenantHomePath = resolveTenantHomePath({ tenantId, tenantIndustryKey, enabledApps }) ?? '/';

    if (loading) return <div className="p-4">Loading...</div>;
    if (!user) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;

    if (user.role === 'superadmin' && !tenantId && !location.pathname.startsWith('/admin')) {
        return <Navigate to="/admin/tenants" replace />;
    }

    if (tenantId && location.pathname.startsWith('/apps/')) {
        const parts = location.pathname.split('/').filter(Boolean);
        const appKey = parts[1];
        const canAccessMarketplace = user.role === 'superadmin' || user.role === 'tenant_admin';

        if (appKey === 'marketplace' && !canAccessMarketplace) {
            return <Navigate to={tenantHomePath} replace />;
        }

        if (enabledApps) {
            const appCategory = appKey ? APPS.find((app) => app.id === appKey)?.category ?? null : null;
            const isAddon = appCategory === 'addon';
            const enforceEntitlement = user.role !== 'superadmin' || isAddon;

            if (enforceEntitlement && appKey && appKey !== 'marketplace' && !enabledApps.includes(appKey)) {
                if (canAccessMarketplace) {
                    const qp = new URLSearchParams({
                        unlock: appKey,
                        returnTo: location.pathname + location.search
                    });
                    const redirectTo = '/apps/marketplace?' + qp.toString();
                    return <Navigate to={redirectTo} replace />;
                }
                return <Navigate to={tenantHomePath} replace />;
            }
        }
    }

    return <>{children}</>;
};

export const RequireSuperadmin = ({ children }: { children: React.ReactNode }) => {
    const { loading, user } = useAuth();
    const location = useLocation();

    if (loading) return <div className="p-4">Loading...</div>;
    if (!user) return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
    if (user.role !== 'superadmin') return <Navigate to="/" replace />;

    return <>{children}</>;
};
