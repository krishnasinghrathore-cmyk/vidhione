import React from 'react';
import { renderToStringWithData } from '@apollo/client/react/ssr';
import { createMemoryRouter } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import AppRoutes from './Router';
import { createApolloClient } from './lib/apolloClient';
import { resolveGraphqlUrl } from './lib/graphqlUrl';
import { isReportRoute } from './lib/ssr/reportRoutes';
import type { AuthRole, TenantSettings, UserLayoutConfig } from './lib/auth/api';
import type { AgencyOptions, CompanyContext } from './lib/invoicing/api';
import type { AuthState } from './lib/auth/context';

type SsrRenderRequest = {
    cookie?: string | null;
};

type AuthBootstrapResult = {
    authState: Partial<AuthState> | null;
    accessToken: string | null;
};

export type SsrRenderResult = {
    statusCode: number;
    redirectTo: string | null;
    appHtml: string;
    apolloState: Record<string, unknown>;
    authState: Partial<AuthState> | null;
};

type GraphqlError = {
    message?: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

type MeResponse = {
    me: {
        user: { id: string; email: string; role: AuthRole };
        tenantId: string | null;
        tenantSettings: TenantSettings;
        tenantIndustryKey: string | null;
        layoutConfig: UserLayoutConfig;
    };
};

type EnabledAppsResponse = {
    enabledApps: { items: string[] };
};

type CompanyContextResponse = {
    companyContext: CompanyContext;
};

type AgencyOptionsResponse = {
    agencyOptions: AgencyOptions;
};

const resolveApiBaseUrl = () => {
    const graphqlUrl = resolveGraphqlUrl();
    if (/\/graphql\/?$/i.test(graphqlUrl)) {
        return graphqlUrl.replace(/\/graphql\/?$/i, '');
    }
    return graphqlUrl.replace(/\/$/, '');
};

const requestGraphql = async <T,>(args: {
    url: string;
    query: string;
    variables?: Record<string, unknown>;
    cookie?: string | null;
    accessToken?: string | null;
}) => {
    const headers = new Headers();
    headers.set('content-type', 'application/json');
    if (args.cookie) headers.set('cookie', args.cookie);
    if (args.accessToken) headers.set('authorization', `Bearer ${args.accessToken}`);

    const response = await fetch(args.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: args.query, variables: args.variables ?? null }),
    });
    const payload = (await response.json()) as GraphqlResponse<T>;
    if (payload.errors?.length) {
        throw new Error(payload.errors[0]?.message || `GraphQL request failed: ${args.url}`);
    }
    if (!response.ok || !payload.data) {
        throw new Error(`Request failed (${response.status}): ${args.url}`);
    }
    return payload.data;
};

const bootstrapAuthState = async (cookie: string | null | undefined): Promise<AuthBootstrapResult> => {
    const apiBase = resolveApiBaseUrl();
    const authGraphqlUrl = `${apiBase}/auth/graphql`;
    const invoicingGraphqlUrl = `${apiBase}/invoicing/graphql`;

    try {
        const refresh = await requestGraphql<{ refresh: { accessToken: string | null } }>({
            url: authGraphqlUrl,
            query: `mutation Refresh { refresh { accessToken } }`,
            cookie,
        });
        const accessToken = refresh.refresh?.accessToken ?? null;
        if (!accessToken) {
            return { authState: null, accessToken: null };
        }

        const me = await requestGraphql<MeResponse>({
            url: authGraphqlUrl,
            query: `query Me {
                me {
                    user { id email role }
                    tenantId
                    tenantSettings {
                        salesInvoiceProfileKey
                        salesInvoiceProfileOptions {
                            showTaxColumns
                            showTypeDetails
                            showAdditionalTaxation
                            showSchemeToggle
                            showBizomInvoiceField
                            showInterStateToggle
                            transportEnabled
                            transportDefaultApplied
                            showTransporterField
                            requireTransporterWhenApplied
                            dryCheckRequired
                            strictPostingParity
                            linkedEstimateEnabled
                            linkedCreditNoteEnabled
                            linkedDebitNoteEnabled
                            salesmanMode
                        }
                        purchaseInvoiceProfileKey
                    }
                    tenantIndustryKey
                    layoutConfig {
                        ripple
                        inputStyle
                        menuMode
                        menuTheme
                        colorScheme
                        scale
                        desktopMenuActive
                        mobileMenuActive
                        mobileTopbarActive
                        menuProfilePosition
                        componentTheme
                        topbarTheme
                    }
                }
            }`,
            cookie,
            accessToken,
        });

        let enabledApps: string[] | null = null;
        if (me.me.tenantId) {
            try {
                const apps = await requestGraphql<EnabledAppsResponse>({
                    url: authGraphqlUrl,
                    query: `query EnabledApps { enabledApps { items } }`,
                    cookie,
                    accessToken,
                });
                enabledApps = apps.enabledApps?.items ?? null;
            } catch {
                enabledApps = null;
            }
        }

        let companyContext: CompanyContext | null = null;
        if (me.me.tenantId) {
            try {
                const company = await requestGraphql<CompanyContextResponse>({
                    url: invoicingGraphqlUrl,
                    query: `query CompanyContext {
                        companyContext {
                            companyName
                            companyAlias
                            addressLine1
                            addressLine2
                            addressLine3
                            postalCode
                            companyFiscalYearId
                            fiscalYearStart
                            fiscalYearEnd
                        }
                    }`,
                    cookie,
                    accessToken,
                });
                companyContext = company.companyContext ?? null;
            } catch {
                companyContext = null;
            }
        }

        let agencyOptions: AgencyOptions | null = null;
        if (me.me.tenantId && enabledApps?.includes('agency')) {
            try {
                const agency = await requestGraphql<AgencyOptionsResponse>({
                    url: invoicingGraphqlUrl,
                    query: `query AgencyOptions {
                        agencyOptions {
                            dbBackupPath
                            discountLedgerId
                            chequeCancelLedgerId
                            roundOffLedgerId
                            isFormWiseRights
                            isVoucherDateLowerAllow
                            isManualInvoiceNumber
                            defaultExpenditureLedgerId
                            defaultStockLedgerId
                            agencyCustomerId
                            defaultTransportImportColumnSno
                            defaultSaleInvoiceImportColumnSno
                            transportUnitId
                            reportFolderPath
                            isReportSetting
                            einvoiceAckColumns1
                            einvoiceAckColumns2
                            einvoiceCancelAckColumns
                            isInvoiceLock
                            isShowRemark
                        }
                    }`,
                    cookie,
                    accessToken,
                });
                agencyOptions = agency.agencyOptions ?? null;
            } catch {
                agencyOptions = null;
            }
        }

        const isSuperadmin = me.me.user.role === 'superadmin';
        const authState: Partial<AuthState> = {
            loading: false,
            user: me.me.user,
            tenantId: me.me.tenantId,
            tenantSettings: me.me.tenantSettings ?? null,
            layoutConfig: me.me.layoutConfig ?? null,
            accessToken,
            adminToken: isSuperadmin ? accessToken : null,
            enabledApps,
            tenantIndustryKey: me.me.tenantIndustryKey ?? null,
            companyContext,
            agencyOptions,
            sessionFiscalYear: null,
        };
        return { authState, accessToken };
    } catch {
        return { authState: null, accessToken: null };
    }
};

export const isSsrReportRoute = isReportRoute;

export const render = async (
    url: string,
    request: SsrRenderRequest = {}
): Promise<SsrRenderResult> => {
    const { authState, accessToken } = await bootstrapAuthState(request.cookie);
    if (!authState?.user) {
        const loginRedirect = `/auth/login?from=${encodeURIComponent(url)}`;
        return {
            statusCode: 302,
            redirectTo: loginRedirect,
            appHtml: '',
            apolloState: {},
            authState: null,
        };
    }

    const apolloClient = createApolloClient({
        ssrMode: true,
        accessToken,
        extraHeaders: request.cookie ? { cookie: request.cookie } : undefined,
    });
    const router = createMemoryRouter(AppRoutes, { initialEntries: [url] });
    const appHtml = await renderToStringWithData(
        <AppProviders
            router={router}
            apolloClient={apolloClient}
            authInitialState={authState}
            skipInitialAuthRefresh
        />
    );

    return {
        statusCode: 200,
        redirectTo: null,
        appHtml,
        apolloState: apolloClient.extract(),
        authState,
    };
};
