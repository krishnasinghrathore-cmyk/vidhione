'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser, TenantSettings, UserLayoutConfig } from './api';
import * as authApi from './api';
import {
    clearAuthStorage,
    getAdminToken,
    getAccessToken,
    getSessionFiscalYear,
    setAdminToken,
    setAccessToken,
    setSessionFiscalYear as setSessionFiscalYearStorage,
    type SessionFiscalYear
} from './storage';
import { fetchAgencyOptions, fetchCompanyContext, type AgencyOptions, type CompanyContext } from '@/lib/invoicing/api';

export type AuthState = {
    loading: boolean;
    user: AuthUser | null;
    tenantId: string | null;
    tenantSettings: TenantSettings;
    layoutConfig: UserLayoutConfig;
    accessToken: string | null;
    adminToken: string | null;
    enabledApps: string[] | null;
    tenantIndustryKey: string | null;
    companyContext: CompanyContext | null;
    agencyOptions: AgencyOptions | null;
    sessionFiscalYear: SessionFiscalYear | null;
};

export type LoginResult = {
    user: AuthUser;
    tenantId: string | null;
    enabledApps: string[] | null;
    tenantIndustryKey: string | null;
};

export type AuthContextValue = AuthState & {
    refresh: () => Promise<void>;
    login: (email: string, password: string) => Promise<LoginResult>;
    logout: () => void;
    launchTenant: (tenantId: string) => Promise<void>;
    exitTenant: () => Promise<void>;
    setSessionFiscalYear: (value: SessionFiscalYear | null) => void;
};

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue);

export const useAuth = () => useContext(AuthContext);

export type AuthProviderProps = {
    children: React.ReactNode;
    initialState?: Partial<AuthState> | null;
    skipInitialRefresh?: boolean;
};

export const AuthProvider = ({ children, initialState = null, skipInitialRefresh = false }: AuthProviderProps) => {
    const [loading, setLoading] = useState<boolean>(() => initialState?.loading ?? (skipInitialRefresh ? false : true));
    const [user, setUser] = useState<AuthUser | null>(initialState?.user ?? null);
    const [tenantId, setTenantId] = useState<string | null>(initialState?.tenantId ?? null);
    const [tenantSettings, setTenantSettings] = useState<TenantSettings>(initialState?.tenantSettings ?? null);
    const [layoutConfig, setLayoutConfig] = useState<UserLayoutConfig>(initialState?.layoutConfig ?? null);
    const [accessToken, setAccessTokenState] = useState<string | null>(() => initialState?.accessToken ?? getAccessToken());
    const [adminToken, setAdminTokenState] = useState<string | null>(() => initialState?.adminToken ?? getAdminToken());
    const [enabledApps, setEnabledApps] = useState<string[] | null>(initialState?.enabledApps ?? null);
    const [tenantIndustryKey, setTenantIndustryKey] = useState<string | null>(initialState?.tenantIndustryKey ?? null);
    const [companyContext, setCompanyContext] = useState<CompanyContext | null>(initialState?.companyContext ?? null);
    const [agencyOptions, setAgencyOptions] = useState<AgencyOptions | null>(initialState?.agencyOptions ?? null);
    const [sessionFiscalYear, setSessionFiscalYearState] = useState<SessionFiscalYear | null>(
        () => initialState?.sessionFiscalYear ?? getSessionFiscalYear()
    );
    const companyContextRawRef = useRef<CompanyContext | null>(initialState?.companyContext ?? null);
    const sessionFiscalYearRef = useRef<SessionFiscalYear | null>(sessionFiscalYear);

    const applySessionOverride = useCallback(
        (base: CompanyContext | null, session: SessionFiscalYear | null) => {
            if (!base) return base;
            if (!session) return base;
            const id = Number(session.companyFiscalYearId ?? 0);
            if (!Number.isFinite(id) || id <= 0) return base;
            return {
                ...base,
                companyFiscalYearId: id,
                fiscalYearStart: session.fiscalYearStart ?? null,
                fiscalYearEnd: session.fiscalYearEnd ?? null
            };
        },
        []
    );

    const setCompanyContextWithSession = useCallback(
        (base: CompanyContext | null, sessionOverride?: SessionFiscalYear | null) => {
            const session = sessionOverride !== undefined ? sessionOverride : sessionFiscalYearRef.current;
            companyContextRawRef.current = base;
            setCompanyContext(applySessionOverride(base, session));
        },
        [applySessionOverride]
    );

    const updateSessionFiscalYear = useCallback(
        (value: SessionFiscalYear | null) => {
            sessionFiscalYearRef.current = value;
            setSessionFiscalYearState(value);
            setSessionFiscalYearStorage(value);
            const base = companyContextRawRef.current ?? null;
            setCompanyContext(applySessionOverride(base, value));
        },
        [applySessionOverride]
    );

    const refresh = useCallback(async () => {
        const resetState = () => {
            clearAuthStorage();
            setAccessTokenState(null);
            setAdminTokenState(null);
            setUser(null);
            setTenantId(null);
            setTenantSettings(null);
            setLayoutConfig(null);
            setEnabledApps(null);
            setTenantIndustryKey(null);
            setCompanyContext(null);
            companyContextRawRef.current = null;
            sessionFiscalYearRef.current = null;
            setSessionFiscalYearState(null);
            setAgencyOptions(null);
        };

        const hydrateFromMe = async () => {
            const data = await authApi.me();
            setUser(data.user);
            setTenantId(data.tenantId);
            setTenantSettings(data.tenantSettings);
            setTenantIndustryKey(data.tenantIndustryKey ?? null);
            setLayoutConfig(data.layoutConfig ?? null);

            const currentToken = getAccessToken();
            if (data.user.role === 'superadmin' && currentToken) {
                setAdminToken(currentToken);
                setAdminTokenState(currentToken);
            } else if (data.user.role !== 'superadmin') {
                setAdminToken(null);
                setAdminTokenState(null);
            }

            let enabled: string[] | null = null;
            if (data.tenantId) {
                try {
                    const apps = await authApi.enabledApps();
                    enabled = apps.items;
                    setEnabledApps(apps.items);
                } catch {
                    enabled = null;
                    setEnabledApps(null);
                }
            } else {
                setEnabledApps(null);
            }

            let nextCompanyContext: CompanyContext | null = null;
            if (data.tenantId) {
                try {
                    nextCompanyContext = await fetchCompanyContext();
                    const storedSession = getSessionFiscalYear();
                    sessionFiscalYearRef.current = storedSession;
                    setSessionFiscalYearState(storedSession);
                    setCompanyContextWithSession(nextCompanyContext, storedSession);
                } catch {
                    nextCompanyContext = null;
                    setCompanyContextWithSession(null, null);
                }
            } else {
                setCompanyContextWithSession(null, null);
            }

            if (data.tenantId && enabled?.includes('agency')) {
                try {
                    const options = await fetchAgencyOptions();
                    setAgencyOptions(options);
                } catch {
                    setAgencyOptions(null);
                }
            } else {
                setAgencyOptions(null);
            }
        };

        let token = getAccessToken();
        setAccessTokenState(token);
        setAdminTokenState(getAdminToken());

        if (!token) {
            const refreshed = await authApi.refreshAccessToken();
            if (refreshed) {
                token = refreshed;
                setAccessTokenState(refreshed);
            } else {
                resetState();
                setLoading(false);
                return;
            }
        }

        try {
            await hydrateFromMe();
        } catch {
            try {
                const refreshed = await authApi.refreshAccessToken();
                if (!refreshed) throw new Error('refresh failed');
                setAccessTokenState(refreshed);
                await hydrateFromMe();
            } catch {
                resetState();
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!initialState) return;
        if (initialState.accessToken) setAccessToken(initialState.accessToken);
        if (initialState.adminToken) setAdminToken(initialState.adminToken);
        if (initialState.sessionFiscalYear) setSessionFiscalYearStorage(initialState.sessionFiscalYear);
    }, [initialState]);

    useEffect(() => {
        if (skipInitialRefresh) {
            setLoading(false);
            return;
        }
        refresh().catch(() => {
            setLoading(false);
        });
    }, [refresh, skipInitialRefresh]);

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        try {
            const result = await authApi.login(email, password);
            setAccessToken(result.accessToken);
            setAccessTokenState(result.accessToken);
            if (result.user.role === 'superadmin') {
                setAdminToken(result.accessToken);
                setAdminTokenState(result.accessToken);
            } else {
                setAdminToken(null);
                setAdminTokenState(null);
            }
            setUser(result.user);
            setTenantId(result.tenantId);
            let nextTenantIndustryKey: string | null = null;
            try {
                const me = await authApi.me();
                setTenantSettings(me.tenantSettings);
                nextTenantIndustryKey = me.tenantIndustryKey ?? null;
                setTenantIndustryKey(nextTenantIndustryKey);
                setLayoutConfig(me.layoutConfig ?? null);
            } catch {
                setTenantSettings(null);
                setTenantIndustryKey(null);
                setLayoutConfig(null);
            }
            let enabled: string[] | null = null;
            if (result.tenantId) {
                try {
                    const apps = await authApi.enabledApps();
                    enabled = apps.items;
                    setEnabledApps(apps.items);
                } catch {
                    enabled = null;
                    setEnabledApps(null);
                }
            } else {
                setEnabledApps(null);
            }
            let nextCompanyContext: CompanyContext | null = null;
            if (result.tenantId) {
                try {
                    nextCompanyContext = await fetchCompanyContext();
                    const storedSession = getSessionFiscalYear();
                    sessionFiscalYearRef.current = storedSession;
                    setSessionFiscalYearState(storedSession);
                    setCompanyContextWithSession(nextCompanyContext, storedSession);
                } catch {
                    nextCompanyContext = null;
                    setCompanyContextWithSession(null, null);
                }
            } else {
                setCompanyContextWithSession(null, null);
            }
            if (result.tenantId && enabled?.includes('agency')) {
                try {
                    const options = await fetchAgencyOptions();
                    setAgencyOptions(options);
                } catch {
                    setAgencyOptions(null);
                }
            } else {
                setAgencyOptions(null);
            }
            return {
                user: result.user,
                tenantId: result.tenantId,
                enabledApps: enabled,
                tenantIndustryKey: nextTenantIndustryKey
            };
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        authApi.logout().catch(() => {});
        clearAuthStorage();
        setAccessTokenState(null);
        setAdminTokenState(null);
        setUser(null);
        setTenantId(null);
        setTenantSettings(null);
        setLayoutConfig(null);
        setEnabledApps(null);
        setTenantIndustryKey(null);
        setCompanyContext(null);
        companyContextRawRef.current = null;
        sessionFiscalYearRef.current = null;
        setSessionFiscalYearState(null);
        setAgencyOptions(null);
    }, []);

    const launchTenant = useCallback(
        async (nextTenantId: string) => {
            if (!user || user.role !== 'superadmin') throw new Error('Forbidden');
            const result = await authApi.launchTenant(nextTenantId);
            setAccessToken(result.accessToken);
            setAccessTokenState(result.accessToken);
            setTenantId(result.tenantId);
            let nextTenantIndustryKey: string | null = null;
            try {
                const me = await authApi.me();
                setTenantSettings(me.tenantSettings);
                nextTenantIndustryKey = me.tenantIndustryKey ?? null;
                setTenantIndustryKey(nextTenantIndustryKey);
                setLayoutConfig(me.layoutConfig ?? null);
            } catch {
                setTenantSettings(null);
                setTenantIndustryKey(null);
                setLayoutConfig(null);
            }
            let enabled: string[] | null = null;
            try {
                const apps = await authApi.enabledApps();
                enabled = apps.items;
                setEnabledApps(apps.items);
            } catch {
                enabled = null;
                setEnabledApps(null);
            }
            let nextCompanyContext: CompanyContext | null = null;
            try {
                nextCompanyContext = await fetchCompanyContext();
                const storedSession = getSessionFiscalYear();
                sessionFiscalYearRef.current = storedSession;
                setSessionFiscalYearState(storedSession);
                setCompanyContextWithSession(nextCompanyContext, storedSession);
            } catch {
                nextCompanyContext = null;
                setCompanyContextWithSession(null, null);
            }
            if (enabled?.includes('agency')) {
                try {
                    const options = await fetchAgencyOptions();
                    setAgencyOptions(options);
                } catch {
                    setAgencyOptions(null);
                }
            } else {
                setAgencyOptions(null);
            }
        },
        [user]
    );

    const exitTenant = useCallback(async () => {
        try {
            const result = await authApi.exitTenant();
            setAccessToken(result.accessToken);
            setAccessTokenState(result.accessToken);
            setAdminToken(result.accessToken);
            setAdminTokenState(result.accessToken);
            setTenantId(result.tenantId);
            let nextTenantIndustryKey: string | null = null;
            try {
                const me = await authApi.me();
                setUser(me.user);
                setTenantSettings(me.tenantSettings);
                nextTenantIndustryKey = me.tenantIndustryKey ?? null;
                setTenantIndustryKey(nextTenantIndustryKey);
                setLayoutConfig(me.layoutConfig ?? null);
            } catch {
                setTenantSettings(null);
                setTenantIndustryKey(null);
                setLayoutConfig(null);
            }
            setEnabledApps(null);
            setCompanyContext(null);
            companyContextRawRef.current = null;
            sessionFiscalYearRef.current = null;
            setSessionFiscalYearState(null);
            setAgencyOptions(null);
        } catch {
            const storedAdminToken = getAdminToken();
            if (!storedAdminToken) return;
            setAccessToken(storedAdminToken);
            setAccessTokenState(storedAdminToken);
            await refresh();
        }
    }, [refresh]);

    const value = useMemo<AuthContextValue>(
        () => ({
            loading,
            user,
            tenantId,
            tenantSettings,
            layoutConfig,
            accessToken,
            adminToken,
            enabledApps,
            tenantIndustryKey,
            companyContext,
            agencyOptions,
            sessionFiscalYear,
            refresh,
            login,
            logout,
            launchTenant,
            exitTenant,
            setSessionFiscalYear: updateSessionFiscalYear
        }),
        [
            loading,
            user,
            tenantId,
            tenantSettings,
            layoutConfig,
            accessToken,
            adminToken,
            enabledApps,
            tenantIndustryKey,
            companyContext,
            agencyOptions,
            sessionFiscalYear,
            refresh,
            login,
            logout,
            launchTenant,
            exitTenant,
            updateSessionFiscalYear
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

