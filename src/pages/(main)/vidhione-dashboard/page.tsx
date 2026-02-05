'use client';
import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth/context';
import { APPS } from '@/config/appsConfig';
import AgencyDashboardSummarySection from './AgencyDashboardSummarySection';

export default function VidhioneDashboardPage() {
    const { enabledApps, tenantId } = useAuth();
    const navigate = useNavigate();
    const enabledSet = enabledApps ? new Set(enabledApps) : null;
    const alwaysAllowed = new Set<string>();
    const hasTenantContext = Boolean(tenantId);
    const appsLoaded = !hasTenantContext || enabledSet !== null;
    const visibleApps = hasTenantContext
        ? enabledSet
            ? APPS.filter((app) => enabledSet.has(app.id) || alwaysAllowed.has(app.id))
            : []
        : APPS;
    const showEmpty = hasTenantContext && appsLoaded && visibleApps.length === 0;
    const showAgencySummary = hasTenantContext && !!enabledSet?.has('agency');

    return (
        <div className="grid">
            <div className="col-12 mb-4">
                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between">
                    <div>
                        <h2 className="m-0">Vidhione Workspace</h2>
                        <p className="mt-2 mb-0 text-500">
                            One dashboard for all your industry apps, accounts, inventory, and add-ons.
                        </p>
                    </div>
                </div>
            </div>

            <AgencyDashboardSummarySection enabled={showAgencySummary} />

            {!appsLoaded && (
                <div className="col-12">
                    <Card className="h-full">
                        <p className="m-0 text-600">Loading apps for this tenant...</p>
                    </Card>
                </div>
            )}

            {showEmpty && (
                <div className="col-12">
                    <Card className="h-full">
                        <p className="m-0 text-600">No apps are enabled for this tenant yet.</p>
                    </Card>
                </div>
            )}

            {visibleApps.map((app) => {
                const isEnabled = !hasTenantContext || !enabledSet ? true : enabledSet.has(app.id) || alwaysAllowed.has(app.id);
                const actionLabel = 'Open App';
                const actionIcon = 'pi pi-arrow-right';

                return (
                <div key={app.id} className="col-12 md:col-6 lg:col-4">
                    <Card
                        title={app.name}
                        subTitle={app.category.toUpperCase()}
                        className="h-full flex flex-column justify-content-between"
                        footer={
                            <div className="flex justify-content-end">
                                <Button
                                    label={actionLabel}
                                    icon={actionIcon}
                                    onClick={() => {
                                        navigate(app.path);
                                    }}
                                />
                            </div>
                        }
                    >
                        <p className="m-0 text-600">
                            {isEnabled ? 'Available for your tenant.' : 'Available for your workspace.'}
                        </p>
                    </Card>
                </div>
            )})}
        </div>
    );
}
