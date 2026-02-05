import { apiUrl } from '@/lib/apiBaseUrl';
import type { LayoutConfig } from '@/types/layout';
import { getAccessToken, setAccessToken } from './storage';

export type AuthRole = 'superadmin' | 'tenant_admin' | 'user' | 'viewer';

export type AuthUser = {
    id: string;
    email: string;
    role: AuthRole;
};

export type TenantSettings = {
    salesInvoiceProfileKey: string | null;
    purchaseInvoiceProfileKey: string | null;
} | null;

export type InviteDetails = {
    email: string;
    tenantName: string;
    role: AuthRole;
    expiresAt: string | null;
    phoneHint: string | null;
};

export type UserLayoutConfig = Partial<LayoutConfig> | null;

export type TenantMigrationResult = {
    tenantId: string;
    tenantName: string | null;
    ok: boolean;
    message?: string | null;
};

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const authGraphqlUrl = apiUrl('/auth/graphql');

let refreshPromise: Promise<string | null> | null = null;

const requestAuthGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(authGraphqlUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as GraphqlResponse<T>) : null;
    const errors = json?.errors ?? [];

    if (errors.length) {
        const code = errors[0]?.extensions?.code;
        if (retryOnAuth && code === 'UNAUTHENTICATED') {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return await requestAuthGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

export const refreshAccessToken = async () => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                const data = await requestAuthGraphql<{ refresh: { accessToken: string } }>(
                    `mutation Refresh { refresh { accessToken } }`,
                    undefined,
                    false
                );

                const nextToken = data.refresh?.accessToken;
                if (nextToken) {
                    setAccessToken(nextToken);
                    return nextToken;
                }
                return null;
            } catch {
                return null;
            } finally {
                refreshPromise = null;
            }
        })();
    }

    return await refreshPromise;
};

export const login = async (email: string, password: string) => {
    const data = await requestAuthGraphql<{ login: { accessToken: string; user: AuthUser; tenantId: string | null } }>(
        `mutation Login($input: LoginInput!) {
            login(input: $input) {
                accessToken
                tenantId
                user { id email role }
            }
        }`,
        { input: { email, password } },
        false
    );
    return data.login;
};

export const register = async (input: { name?: string | null; email: string; password: string }) => {
    const data = await requestAuthGraphql<{ register: { ok: boolean; message?: string | null } }>(
        `mutation Register($input: RegisterInput!) {
            register(input: $input) { ok message }
        }`,
        { input },
        false
    );
    return data.register;
};

export const getInviteDetails = async (token: string) => {
    const data = await requestAuthGraphql<{ inviteDetails: InviteDetails }>(
        `query InviteDetails($token: String!) {
            inviteDetails(token: $token) {
                email
                tenantName
                role
                expiresAt
                phoneHint
            }
        }`,
        { token },
        false
    );
    return data.inviteDetails;
};

export const acceptInvite = async (input: {
    token: string;
    fullName: string;
    password: string;
    phoneNumber: string;
    whatsappNumber?: string | null;
}) => {
    const data = await requestAuthGraphql<{ acceptInvite: { ok: boolean; message?: string | null; email?: string | null; phoneNumber?: string | null } }>(
        `mutation AcceptInvite($input: AcceptInviteInput!) {
            acceptInvite(input: $input) {
                ok
                message
                email
                phoneNumber
            }
        }`,
        { input },
        false
    );
    return data.acceptInvite;
};

export const inviteResendEmailOtp = async (token: string) => {
    const data = await requestAuthGraphql<{ inviteResendEmailOtp: { ok: boolean; message?: string | null } }>(
        `mutation InviteResendEmailOtp($input: InviteTokenInput!) {
            inviteResendEmailOtp(input: $input) { ok message }
        }`,
        { input: { token } },
        false
    );
    return data.inviteResendEmailOtp;
};

export const inviteResendPhoneOtp = async (token: string) => {
    const data = await requestAuthGraphql<{ inviteResendPhoneOtp: { ok: boolean; message?: string | null } }>(
        `mutation InviteResendPhoneOtp($input: InviteTokenInput!) {
            inviteResendPhoneOtp(input: $input) { ok message }
        }`,
        { input: { token } },
        false
    );
    return data.inviteResendPhoneOtp;
};

export const verifyEmailOtp = async (input: { email: string; otp: string }) => {
    const data = await requestAuthGraphql<{ verifyEmailOtp: { ok: boolean } }>(
        `mutation VerifyEmailOtp($input: VerifyEmailOtpInput!) {
            verifyEmailOtp(input: $input) { ok }
        }`,
        { input },
        false
    );
    return data.verifyEmailOtp;
};

export const verifyPhoneOtp = async (input: { email: string; phoneNumber: string; otp: string }) => {
    const data = await requestAuthGraphql<{ verifyPhoneOtp: { ok: boolean } }>(
        `mutation VerifyPhoneOtp($input: VerifyPhoneOtpInput!) {
            verifyPhoneOtp(input: $input) { ok }
        }`,
        { input },
        false
    );
    return data.verifyPhoneOtp;
};

export const verifyEmail = async (token: string) => {
    const data = await requestAuthGraphql<{ verifyEmail: { ok: boolean } }>(
        `mutation VerifyEmail($token: String!) {
            verifyEmail(token: $token) { ok }
        }`,
        { token },
        false
    );
    return data.verifyEmail;
};

export const forgotPassword = async (email: string) => {
    const data = await requestAuthGraphql<{ forgotPassword: { ok: boolean; message?: string | null } }>(
        `mutation ForgotPassword($email: String!) {
            forgotPassword(email: $email) { ok message }
        }`,
        { email },
        false
    );
    return data.forgotPassword;
};

export const resetPassword = async (input: { token: string; password: string }) => {
    const data = await requestAuthGraphql<{ resetPassword: { ok: boolean } }>(
        `mutation ResetPassword($input: ResetPasswordInput!) {
            resetPassword(input: $input) { ok }
        }`,
        { input },
        false
    );
    return data.resetPassword;
};

export const me = async () => {
    const data = await requestAuthGraphql<{
        me: {
            user: AuthUser;
            tenantId: string | null;
            expiresAt: number;
            tenantSettings: TenantSettings;
            tenantIndustryKey: string | null;
            layoutConfig: UserLayoutConfig;
        };
    }>(
        `query Me {
            me {
                user { id email role }
                tenantId
                expiresAt
                tenantSettings { salesInvoiceProfileKey purchaseInvoiceProfileKey }
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
        }`
    );
    return data.me;
};

export const saveLayoutConfig = async (input: LayoutConfig) => {
    const data = await requestAuthGraphql<{ setLayoutConfig: { ok: boolean } }>(
        `mutation SetLayoutConfig($input: LayoutConfigInput!) {
            setLayoutConfig(input: $input) { ok }
        }`,
        { input }
    );
    return data.setLayoutConfig;
};

export const enabledApps = async () => {
    const data = await requestAuthGraphql<{ enabledApps: { items: string[] } }>(
        `query EnabledApps { enabledApps { items } }`
    );
    return data.enabledApps;
};

export const listTenants = async () => {
    const data = await requestAuthGraphql<{ adminTenants: { items: {
        id: string;
        tenantCode: string | null;
        name: string;
        industry: string | null;
        isActive: boolean;
        databaseUrl: string | null;
        migrationDatabaseUrl: string | null;
        hasUsers?: boolean | null;
        hasDatabase?: boolean | null;
        hasBilling?: boolean | null;
        isLocked?: boolean | null;
    }[] } }>(
        `query AdminTenants {
            adminTenants {
                items {
                    id
                    tenantCode
                    name
                    industry
                    isActive
                    databaseUrl
                    migrationDatabaseUrl
                    hasUsers
                    hasDatabase
                    hasBilling
                    isLocked
                }
            }
        }`
    );
    return data.adminTenants;
};

export const createTenant = async (input: { name: string; industry: string }) => {
    const data = await requestAuthGraphql<{ adminCreateTenant: { tenant: { id: string; tenantCode: string | null; name: string; industry: string | null; isActive: boolean } } }>(
        `mutation AdminCreateTenant($input: CreateTenantInput!) {
            adminCreateTenant(input: $input) {
                tenant { id tenantCode name industry isActive }
            }
        }`,
        { input }
    );
    return data.adminCreateTenant;
};

export const updateTenant = async (input: { tenantId: string; name: string; industry: string }) => {
    const data = await requestAuthGraphql<{ adminUpdateTenant: { tenant: { id: string; tenantCode: string | null; name: string; industry: string | null; isActive: boolean } } }>(
        `mutation AdminUpdateTenant($input: UpdateTenantInput!) {
            adminUpdateTenant(input: $input) {
                tenant { id tenantCode name industry isActive }
            }
        }`,
        { input }
    );
    return data.adminUpdateTenant;
};

export const deleteTenant = async (tenantId: string) => {
    const data = await requestAuthGraphql<{ adminDeleteTenant: { ok: boolean } }>(
        `mutation AdminDeleteTenant($input: TenantIdInput!) {
            adminDeleteTenant(input: $input) { ok }
        }`,
        { input: { tenantId } }
    );
    return data.adminDeleteTenant;
};

export const setTenantDb = async (input: { tenantId: string; databaseUrl: string }) => {
    const data = await requestAuthGraphql<{ adminSetTenantDb: { ok: boolean } }>(
        `mutation AdminSetTenantDb($input: SetTenantDbInput!) {
            adminSetTenantDb(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetTenantDb;
};

export const setTenantMigrationDb = async (input: { tenantId: string; databaseUrl: string }) => {
    const data = await requestAuthGraphql<{ adminSetTenantMigrationDb: { ok: boolean } }>(
        `mutation AdminSetTenantMigrationDb($input: SetTenantDbInput!) {
            adminSetTenantMigrationDb(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetTenantMigrationDb;
};

export const runTenantMigrations = async (input: { tenantId: string }) => {
    const data = await requestAuthGraphql<{ adminRunTenantMigrations: TenantMigrationResult }>(
        `mutation AdminRunTenantMigrations($input: RunTenantMigrationsInput!) {
            adminRunTenantMigrations(input: $input) {
                tenantId
                tenantName
                ok
                message
            }
        }`,
        { input }
    );
    return data.adminRunTenantMigrations;
};

export const runAllTenantMigrations = async () => {
    const data = await requestAuthGraphql<{ adminRunAllTenantMigrations: { results: TenantMigrationResult[] } }>(
        `mutation AdminRunAllTenantMigrations {
            adminRunAllTenantMigrations {
                results {
                    tenantId
                    tenantName
                    ok
                    message
                }
            }
        }`,
        undefined
    );
    return data.adminRunAllTenantMigrations;
};

export const setTenantActive = async (input: { tenantId: string; isActive: boolean }) => {
    const data = await requestAuthGraphql<{ adminSetTenantActive: { ok: boolean } }>(
        `mutation AdminSetTenantActive($input: SetTenantActiveInput!) {
            adminSetTenantActive(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetTenantActive;
};

export const launchTenant = async (tenantId: string) => {
    const data = await requestAuthGraphql<{ launchTenant: { accessToken: string; tenantId: string } }>(
        `mutation LaunchTenant($input: TenantIdInput!) {
            launchTenant(input: $input) { accessToken tenantId }
        }`,
        { input: { tenantId } }
    );
    return data.launchTenant;
};

export const exitTenant = async () => {
    const data = await requestAuthGraphql<{ exitTenant: { accessToken: string; tenantId: string | null } }>(
        `mutation ExitTenant {
            exitTenant { accessToken tenantId }
        }`,
        undefined
    );
    return data.exitTenant;
};

export const logout = async () => {
    const data = await requestAuthGraphql<{ logout: { ok: boolean } }>(
        `mutation Logout { logout { ok } }`,
        undefined,
        false
    );
    return data.logout;
};

export const getTenantApps = async (tenantId: string) => {
    const data = await requestAuthGraphql<{ adminTenantApps: { tenantId: string; items: { appKey: string; isEnabled: boolean }[] } }>(
        `query AdminTenantApps($input: TenantIdInput!) {
            adminTenantApps(input: $input) {
                tenantId
                items { appKey isEnabled }
            }
        }`,
        { input: { tenantId } }
    );
    return data.adminTenantApps;
};

export const setTenantApps = async (input: { tenantId: string; items: { appKey: string; isEnabled: boolean }[] }) => {
    const data = await requestAuthGraphql<{ adminSetTenantApps: { ok: boolean } }>(
        `mutation AdminSetTenantApps($input: SetTenantAppsInput!) {
            adminSetTenantApps(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetTenantApps;
};

export const setTenantSettings = async (input: {
    tenantId: string;
    salesInvoiceProfileKey: string | null;
    purchaseInvoiceProfileKey: string | null;
}) => {
    const data = await requestAuthGraphql<{ adminSetTenantSettings: { ok: boolean } }>(
        `mutation AdminSetTenantSettings($input: SetTenantSettingsInput!) {
            adminSetTenantSettings(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetTenantSettings;
};

export const listUsers = async () => {
    const data = await requestAuthGraphql<{ adminUsers: { items: { id: string; email: string; role: AuthRole; isActive: boolean; tenants: { id: string; name: string }[] }[] } }>(
        `query AdminUsers {
            adminUsers {
                items {
                    id
                    email
                    role
                    isActive
                    tenants { id name }
                }
            }
        }`
    );
    return data.adminUsers;
};

export const createUser = async (input: { email: string; password: string; role: AuthRole; tenantId?: string | null }) => {
    const data = await requestAuthGraphql<{ adminCreateUser: { user: { id: string; email: string; role: AuthRole; isActive: boolean; tenantId: string | null } } }>(
        `mutation AdminCreateUser($input: CreateUserInput!) {
            adminCreateUser(input: $input) {
                user { id email role isActive tenantId }
            }
        }`,
        { input }
    );
    return data.adminCreateUser;
};

export const inviteUser = async (input: { email: string; role: AuthRole; tenantId: string; phoneNumber?: string | null }) => {
    const data = await requestAuthGraphql<{ adminInviteUser: { ok: boolean; message?: string | null } }>(
        `mutation AdminInviteUser($input: InviteUserInput!) {
            adminInviteUser(input: $input) { ok message }
        }`,
        { input }
    );
    return data.adminInviteUser;
};

export const setUserActive = async (input: { userId: string; isActive: boolean }) => {
    const data = await requestAuthGraphql<{ adminSetUserActive: { ok: boolean } }>(
        `mutation AdminSetUserActive($input: SetUserActiveInput!) {
            adminSetUserActive(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetUserActive;
};

export const setUserPassword = async (input: { userId: string; password: string }) => {
    const data = await requestAuthGraphql<{ adminSetUserPassword: { ok: boolean } }>(
        `mutation AdminSetUserPassword($input: SetUserPasswordInput!) {
            adminSetUserPassword(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetUserPassword;
};

export const setUserTenant = async (input: { userId: string; tenantId: string }) => {
    const data = await requestAuthGraphql<{ adminSetUserTenant: { ok: boolean } }>(
        `mutation AdminSetUserTenant($input: SetUserTenantInput!) {
            adminSetUserTenant(input: $input) { ok }
        }`,
        { input }
    );
    return data.adminSetUserTenant;
};
