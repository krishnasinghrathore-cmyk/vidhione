import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import AppSubMenu from './AppSubMenu';
import { APPS } from '@/config/appsConfig';
import { useAuth } from '@/lib/auth/context';
import { defaultTextilePresetKey, isTextileIndustry, resolveTextileCapabilities } from '@/lib/textile/config';
import type { MenuModel } from '@/types/layout';
import { model } from './AppMenuModel';

const AppMenu = () => {
    const { user, enabledApps, tenantId, tenantIndustryKey, tenantSettings } = useAuth();
    const location = useLocation();

    const currentAppKey = useMemo(() => {
        if (!location.pathname.startsWith('/apps/')) return null;
        const parts = location.pathname.split('/').filter(Boolean);
        return parts[1] ?? null;
    }, [location.pathname]);

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
        const canAccessMarketplace = Boolean(isSuperadmin || (isTenantMode && user?.role === 'tenant_admin'));

        const filterItems = (items: any[]): any[] => {
            return items
                .map((item) => {
                    const next: any = { ...item };
                    if (Array.isArray(item.items)) {
                        next.items = filterItems(item.items);
                    }

                    const to = typeof item.to === 'string' ? item.to : null;
                    if (to && to.startsWith('/apps/')) {
                        const parts = to.split('/').filter(Boolean);
                        const appKey = parts[1];

                        if (appKey === 'marketplace') {
                            if (!canAccessMarketplace) return null;
                        } else if (appKey && enabledSet) {
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

        const promoteAddonSections = (sections: MenuModel[]) => {
            return sections.flatMap((section) => {
                if (section.label !== 'Add-ons' || !Array.isArray(section.items) || section.items.length === 0) {
                    return [section];
                }

                const promotedSections: MenuModel[] = [];
                const remainingItems: MenuModel[] = [];

                for (const item of section.items) {
                    if (Array.isArray(item.items) && item.items.length > 0 && !item.to) {
                        promotedSections.push({
                            label: item.label,
                            icon: item.icon,
                            items: item.items
                        });
                    } else {
                        remainingItems.push(item);
                    }
                }

                if (promotedSections.length === 0) {
                    return [section];
                }

                return remainingItems.length > 0
                    ? [...promotedSections, { ...section, items: remainingItems }]
                    : promotedSections;
            });
        };

        const applyTenantAppFocus = (sections: MenuModel[]) => {
            if (!isTenantMode || currentAppKey !== 'wealth') return sections;

            const workspaceSection = sections.find((section) => section.label === 'Workspace');
            const wealthSection = sections.find((section) => section.label === 'Wealth');
            const helpSection = sections.find((section) => section.label === 'Help');
            const focusedSections = [workspaceSection, wealthSection, helpSection].filter(Boolean) as MenuModel[];
            return focusedSections.length > 0 ? focusedSections : sections;
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

        const normalizedSections = applyTenantAppFocus(promoteAddonSections(filterItems(withoutIndustryApps)));
        const textileTenant = isTenantMode && isTextileIndustry(tenantIndustryKey);
        const textileEnabled = isSuperadmin || !enabledSet || enabledSet.has('textile');
        if (!textileTenant || !textileEnabled) return normalizedSections;

        const presetKey = tenantSettings?.textilePresetKey ?? defaultTextilePresetKey(tenantIndustryKey);
        const textileCapabilities = resolveTextileCapabilities(presetKey, tenantSettings?.textileCapabilities ?? null);
        const canAccessSharedFlows = textileCapabilities.processor || textileCapabilities.jobwork || textileCapabilities.inhouse;

        const textileItems: MenuModel[] = [{ label: 'Textile Home', icon: 'pi pi-home', to: '/apps/textile' }];
        const textileBookItems: MenuModel[] = [];

        if (textileCapabilities.processor) {
            textileItems.push({
                label: 'Processor',
                icon: 'pi pi-pencil',
                items: [
                    { label: 'Purchase Orders', icon: 'pi pi-file-edit', to: '/apps/textile/purchase-orders' },
                    { label: 'Fabric Inward', icon: 'pi pi-download', to: '/apps/textile/fabric-inward' },
                    { label: 'Packing Slips', icon: 'pi pi-box', to: '/apps/textile/packing-slips' },
                    { label: 'Delivery Challans', icon: 'pi pi-truck', to: '/apps/textile/delivery-challans' }
                ]
            });
            textileBookItems.push(
                { label: 'Purchase Order Book', icon: 'pi pi-book', to: '/apps/textile/purchase-order-book' },
                { label: 'Fabric Inward Book', icon: 'pi pi-book', to: '/apps/textile/fabric-inward-book' },
                { label: 'Packing Slip Book', icon: 'pi pi-book', to: '/apps/textile/packing-slip-book' },
                { label: 'Delivery Challan Book', icon: 'pi pi-book', to: '/apps/textile/delivery-challan-book' },
                { label: 'Dispatch Book', icon: 'pi pi-directions-alt', to: '/apps/textile/dispatch-book' }
            );
        }

        if (textileCapabilities.jobwork) {
            textileItems.push({
                label: 'Jobwork',
                icon: 'pi pi-share-alt',
                items: [
                    { label: 'Job Work Issue', icon: 'pi pi-send', to: '/apps/textile/job-work-issue' },
                    { label: 'Daily Outward', icon: 'pi pi-upload', to: '/apps/textile/daily-outward' }
                ]
            });
            textileBookItems.push(
                { label: 'Job Work Issue Book', icon: 'pi pi-book', to: '/apps/textile/job-work-issue-book' },
                { label: 'Daily Outward Book', icon: 'pi pi-book', to: '/apps/textile/daily-outward-book' }
            );
        }

        if (textileBookItems.length > 0) {
            textileItems.push({
                label: 'Books',
                icon: 'pi pi-book',
                items: textileBookItems
            });
        }

        if (canAccessSharedFlows) {
            textileItems.push({
                label: 'Billing',
                icon: 'pi pi-receipt',
                items: [
                    { label: 'Bill Book', icon: 'pi pi-book', to: '/apps/textile/bill-book' },
                    { label: 'GST Invoice', icon: 'pi pi-file-edit', to: '/apps/textile/gst-invoices/new' }
                ]
            });
        }

        if (canAccessSharedFlows) {
            textileItems.push({
                label: 'Reports',
                icon: 'pi pi-chart-line',
                items: [
                    { label: 'Fabric Statement', icon: 'pi pi-chart-bar', to: '/apps/textile/fabric-statement' },
                    { label: 'Fabric Stock Statement', icon: 'pi pi-box', to: '/apps/textile/fabric-stock-statement' }
                ]
            });
        }

        const textileSection: MenuModel = {
            label: 'Textile',
            icon: 'pi pi-palette',
            items: textileItems
        };

        if (normalizedSections.length === 0) return [textileSection];
        return [normalizedSections[0], textileSection, ...normalizedSections.slice(1)];
    }, [currentAppKey, currentIndustryApp, enabledApps, tenantId, tenantIndustryKey, tenantSettings, user?.role]);

    return <AppSubMenu model={visibleModel} />;
};

export default AppMenu;

