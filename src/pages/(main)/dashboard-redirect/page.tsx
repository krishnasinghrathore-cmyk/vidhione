'use client';
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { APPS } from '@/config/appsConfig';

export default function DashboardRedirectPage() {
    const { loading, tenantId, tenantIndustryKey, enabledApps } = useAuth();
    const location = useLocation();

    const target = useMemo(() => {
        if (!tenantId) return null;
        const industryKey = tenantIndustryKey?.trim().toLowerCase() ?? null;
        const industryApp = industryKey
            ? APPS.find((app) => app.category === 'industry' && app.id === industryKey)
            : null;
        if (industryApp) return industryApp.path;

        const enabledIndustry = enabledApps
            ? APPS.find((app) => app.category === 'industry' && enabledApps.includes(app.id))
            : null;
        if (enabledIndustry) return enabledIndustry.path;

        return '/dashboards/sales';
    }, [tenantId, tenantIndustryKey, enabledApps]);

    if (loading) return <div className="p-4">Loading dashboard...</div>;
    if (!tenantId) return <Navigate to="/admin/tenants" replace />;
    if (!target) return <div className="p-4">No dashboard available.</div>;
    if (location.pathname === target) return null;

    return <Navigate to={target} replace />;
}
