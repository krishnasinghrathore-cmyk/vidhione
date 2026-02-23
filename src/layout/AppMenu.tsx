import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import AppSubMenu from './AppSubMenu';
import { APPS } from '@/config/appsConfig';
import { useAuth } from '@/lib/auth/context';
import { model } from './AppMenuModel';

const AppMenu = () => {
    const { user, enabledApps, tenantId } = useAuth();
    const location = useLocation();
    const currentIndustryApp = useMemo(() => {
        if (!location.pathname.startsWith('/apps/')) return null;
        return (
            APPS.find(
                (app) =>
                    app.category === 'industry' &&
                    (location.pathname === app.path || location.pathname.startsWith(`${app.path}/`))
            ) ?? null
        );
    }, [location.pathname]);
    const visibleModel = useMemo(() => {
        const isSuperadmin = user?.role === 'superadmin';
        const isTenantMode = Boolean(tenantId);
        const enabledSet = isTenantMode && enabledApps ? new Set(enabledApps) : null;
        const alwaysVisibleApps = new Set(['marketplace']);

        const filterItems = (items: any[]): any[] => {
            return items
                .map((item) => {
                    const next: any = { ...item };
                    if (Array.isArray(item.items)) {
                        next.items = filterItems(item.items);
                    }

                    const to = typeof item.to === 'string' ? item.to : null;
                    if (to && to.startsWith('/apps/') && enabledSet) {
                        const parts = to.split('/').filter(Boolean);
                        const appKey = parts[1];
                        if (appKey && !alwaysVisibleApps.has(appKey)) {
                            const appCategory = APPS.find((app) => app.id === appKey)?.category ?? null;
                            const isAddon = appCategory === 'addon';
                            const isEnabled = enabledSet.has(appKey);
                            if (!isEnabled && (!isSuperadmin || isAddon)) return null;
                        }
                    }

                    if (Array.isArray(next.items) && next.items.length === 0 && !next.to) return null;
                    return next;
                })
                .filter(Boolean);
        };

        const base = isSuperadmin
            ? isTenantMode
                ? model.filter((section) => section.label !== 'Admin')
                : model.filter((section) => section.label === 'Admin')
            : model.filter((section) => section.label !== 'Admin');
        const withAppDashboard = base.map((section) => {
            if (section.label !== 'Workspace') return section;
            if (!isTenantMode || !currentIndustryApp) return section;
            const items = Array.isArray(section.items) ? [...section.items] : [];
            const dashboardLabel = `${currentIndustryApp.name} Dashboard`;
            if (items.length > 0) {
                items[0] = {
                    ...items[0],
                    label: dashboardLabel,
                    to: currentIndustryApp.path
                };
            }
            return { ...section, items };
        });
        const withoutIndustryApps = isTenantMode
            ? withAppDashboard.filter((section) => section.label !== 'Industry Apps')
            : withAppDashboard;
        return enabledSet ? filterItems(withoutIndustryApps) : withoutIndustryApps;
    }, [user?.role, tenantId, enabledApps, currentIndustryApp, location.pathname]);

    return <AppSubMenu model={visibleModel} />;
};

export default AppMenu;
