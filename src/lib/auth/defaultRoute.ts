import { APPS } from '@/config/appsConfig';

type ResolveTenantHomePathArgs = {
    tenantId: string | null;
    tenantIndustryKey: string | null;
    enabledApps: string[] | null;
    fallbackPath?: string;
};

export const resolveTenantHomePath = ({
    tenantId,
    tenantIndustryKey,
    enabledApps,
    fallbackPath = '/dashboards/sales'
}: ResolveTenantHomePathArgs) => {
    if (!tenantId) return null;

    const accessibleApps = enabledApps ? APPS.filter((app) => enabledApps.includes(app.id)) : [];
    const normalizedIndustryKey = tenantIndustryKey?.trim().toLowerCase() ?? null;

    if (normalizedIndustryKey) {
        const industryMatch = accessibleApps.find((app) => app.id === normalizedIndustryKey);
        if (industryMatch) return industryMatch.path;

        if (!enabledApps) {
            const tenantIndustryApp = APPS.find((app) => app.id === normalizedIndustryKey);
            if (tenantIndustryApp) return tenantIndustryApp.path;
        }
    }

    if (accessibleApps.length > 0) {
        return accessibleApps[0].path;
    }

    return fallbackPath;
};
