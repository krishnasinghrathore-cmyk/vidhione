import React from 'react';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';

const AppFooter = () => {
    const { user, tenantId, adminToken, exitTenant } = useAuth();
    const navigate = useNavigate();
    const showSupportMode = user?.role === 'superadmin' && Boolean(tenantId) && Boolean(adminToken);
    const supportTenantLabel = tenantId ? tenantId.slice(0, 8) : null;

    const handleExitTenant = async () => {
        await exitTenant();
        navigate('/admin/tenants');
    };

    return (
        <div className="layout-footer">
            <span className="text-900 font-semibold text-lg">Vidhione</span>
            <div className="layout-footer-actions">
                {showSupportMode && (
                    <div className="layout-footer-support">
                        <span className="text-600 text-sm">Support Mode</span>
                        <span className="text-900 text-sm font-semibold" title={tenantId ?? undefined}>
                            Tenant: {supportTenantLabel}
                        </span>
                        <Button
                            type="button"
                            label="Exit Tenant"
                            icon="pi pi-sign-out"
                            className="p-button-text p-button-sm"
                            onClick={handleExitTenant}
                        />
                    </div>
                )}
                <div className="flex gap-2">
                    <Button type="button" icon="pi pi-github" rounded text className="p-button-plain"></Button>
                    <Button type="button" icon="pi pi-facebook" rounded text className="p-button-plain"></Button>
                    <Button type="button" icon="pi pi-twitter" rounded text className="p-button-plain"></Button>
                </div>
            </div>
        </div>
    );
};

export default AppFooter;
