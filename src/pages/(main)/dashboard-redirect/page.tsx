'use client';
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { resolveTenantHomePath } from '@/lib/auth/defaultRoute';

export default function DashboardRedirectPage() {
    const { loading, tenantId, tenantIndustryKey, enabledApps } = useAuth();
    const location = useLocation();

    const target = useMemo(() => {
        return resolveTenantHomePath({ tenantId, tenantIndustryKey, enabledApps });
    }, [tenantId, tenantIndustryKey, enabledApps]);

    if (loading) return <div className="p-4">Loading dashboard...</div>;
    if (!tenantId) return <Navigate to="/admin/tenants" replace />;
    if (!target) return <div className="p-4">No dashboard available.</div>;
    if (location.pathname === target) return null;

    return <Navigate to={target} replace />;
}
