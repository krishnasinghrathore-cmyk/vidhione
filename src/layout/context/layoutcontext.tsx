'use client';
import { Helmet } from 'react-helmet-async';
import React, { useState, PropsWithChildren, useCallback, useMemo, useEffect, useRef, useContext } from 'react';
import type { LayoutContextProps, LayoutConfig, LayoutState, Breadcrumb } from '../../types/layout';
import { useAuth } from '@/lib/auth/context';
import { PrimeReactContext } from 'primereact/api';
import { saveLayoutConfig } from '@/lib/auth/api';

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    ripple: true,
    inputStyle: 'outlined',
    menuMode: 'slim-plus',
    colorScheme: 'light',
    componentTheme: 'indigo',
    scale: 14,
    menuTheme: 'light',
    topbarTheme: 'indigo',
    menuProfilePosition: 'end',
    desktopMenuActive: true,
    mobileMenuActive: false,
    mobileTopbarActive: false
};

export const LayoutContext = React.createContext({} as LayoutContextProps);

export const LayoutProvider = (props: PropsWithChildren) => {
    const { companyContext, loading: authLoading, user, layoutConfig: savedLayoutConfig } = useAuth();
    const { changeTheme, setRipple } = useContext(PrimeReactContext);
    const hasAppliedConfig = useRef(false);
    const lastUserId = useRef<string | null>(null);
    const lastSavedSnapshot = useRef<string | null>(null);
    const persistTimeout = useRef<number | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
    const [pageTitle, setPageTitle] = useState<string | null>(null);
    const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(DEFAULT_LAYOUT_CONFIG);

    const [layoutState, setLayoutState] = useState<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        profileSidebarVisible: false,
        staticMenuMobileActive: false,
        menuHoverActive: false,
        rightMenuActive: false,
        topbarMenuActive: false,
        sidebarActive: false,
        anchored: false,
        overlaySubmenuActive: false,
        menuProfileActive: false,
        resetMenu: false
    });

    const applyLayoutConfig = useCallback(
        (nextConfig: LayoutConfig) => {
            if (changeTheme && nextConfig.colorScheme !== layoutConfig.colorScheme) {
                changeTheme(layoutConfig.colorScheme, nextConfig.colorScheme, 'theme-link');
            }
            if (changeTheme && nextConfig.componentTheme !== layoutConfig.componentTheme) {
                changeTheme(layoutConfig.componentTheme, nextConfig.componentTheme, 'theme-link');
            }
            if (typeof nextConfig.ripple === 'boolean') {
                setRipple?.(nextConfig.ripple);
            }
            setLayoutConfig(nextConfig);
        },
        [changeTheme, layoutConfig.colorScheme, layoutConfig.componentTheme, setRipple]
    );

    useEffect(() => {
        if (authLoading) return;
        const userId = user?.id ?? null;

        if (lastUserId.current !== userId) {
            lastUserId.current = userId;
            hasAppliedConfig.current = false;
            if (persistTimeout.current) {
                window.clearTimeout(persistTimeout.current);
                persistTimeout.current = null;
            }
        }

        if (hasAppliedConfig.current) return;

        const mergedConfig = userId
            ? { ...DEFAULT_LAYOUT_CONFIG, ...(savedLayoutConfig ?? {}) }
            : DEFAULT_LAYOUT_CONFIG;

        applyLayoutConfig(mergedConfig);
        lastSavedSnapshot.current = JSON.stringify(mergedConfig);
        hasAppliedConfig.current = true;
    }, [authLoading, user?.id, savedLayoutConfig, applyLayoutConfig]);

    useEffect(() => {
        const userId = user?.id ?? null;
        if (authLoading || !userId) return;
        if (!hasAppliedConfig.current) return;

        const nextSnapshot = JSON.stringify(layoutConfig);
        if (nextSnapshot === lastSavedSnapshot.current) return;

        if (persistTimeout.current) {
            window.clearTimeout(persistTimeout.current);
        }

        persistTimeout.current = window.setTimeout(() => {
            saveLayoutConfig(layoutConfig)
                .then(() => {
                    lastSavedSnapshot.current = nextSnapshot;
                })
                .catch(() => {});
        }, 600);

        return () => {
            if (persistTimeout.current) {
                window.clearTimeout(persistTimeout.current);
                persistTimeout.current = null;
            }
        };
    }, [authLoading, user?.id, layoutConfig]);

    const onMenuProfileToggle = useCallback(() => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            menuProfileActive: !prevLayoutState.menuProfileActive
        }));
    }, []);

    const isSidebarActive = useCallback(() => layoutState.overlayMenuActive || layoutState.staticMenuMobileActive || layoutState.overlaySubmenuActive, [layoutState.overlayMenuActive, layoutState.staticMenuMobileActive, layoutState.overlaySubmenuActive]);

    const isOverlay = useCallback(() => {
        return layoutConfig.menuMode === 'overlay';
    }, [layoutConfig.menuMode]);

    const isSlim = useCallback(() => {
        return layoutConfig.menuMode === 'slim';
    }, [layoutConfig.menuMode]);

    const isSlimPlus = useCallback(() => {
        return layoutConfig.menuMode === 'slim-plus';
    }, [layoutConfig.menuMode]);

    const isHorizontal = useCallback(() => {
        return layoutConfig.menuMode === 'horizontal';
    }, [layoutConfig.menuMode]);

    const isDesktop = useCallback(() => {
        return window.innerWidth > 991;
    }, []);

    const onMenuToggle = useCallback(() => {
        if (isOverlay()) {
            setLayoutState((prevLayoutState: LayoutState) => ({
                ...prevLayoutState,
                overlayMenuActive: !prevLayoutState.overlayMenuActive
            }));
        }

        if (isDesktop()) {
            setLayoutState((prevLayoutState: LayoutState) => ({
                ...prevLayoutState,
                staticMenuDesktopInactive: !prevLayoutState.staticMenuDesktopInactive
            }));
        } else {
            setLayoutState((prevLayoutState: LayoutState) => ({
                ...prevLayoutState,
                staticMenuMobileActive: !prevLayoutState.staticMenuMobileActive
            }));
        }
    }, [isOverlay, isDesktop]);

    const onTopbarMenuToggle = useCallback(() => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            topbarMenuActive: !prevLayoutState.topbarMenuActive
        }));
    }, []);
    const showRightSidebar = useCallback(() => {
        setLayoutState((prevLayoutState: LayoutState) => ({
            ...prevLayoutState,
            rightMenuActive: true
        }));
    }, []);

    const value = useMemo(
        () => ({
            layoutConfig,
            setLayoutConfig,
            layoutState,
            setLayoutState,
            onMenuToggle,
            isSlim,
            isSlimPlus,
            isHorizontal,
            isDesktop,
            isSidebarActive,
            breadcrumbs,
            setBreadcrumbs,
            pageTitle,
            setPageTitle,
            onMenuProfileToggle,
            onTopbarMenuToggle,
            showRightSidebar
        }),
        [
            layoutConfig,
            layoutState,
            onMenuToggle,
            isSlim,
            isSlimPlus,
            isHorizontal,
            isDesktop,
            isSidebarActive,
            breadcrumbs,
            pageTitle,
            onMenuProfileToggle,
            onTopbarMenuToggle,
            showRightSidebar
        ]
    );

    const companyName = companyContext?.companyName?.trim() ?? '';
    const companyAlias = companyContext?.companyAlias?.trim() ?? '';
    const extractYear = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        if (/^\d{8}$/.test(trimmed)) return trimmed.slice(0, 4);
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed.slice(0, 4);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed.slice(6, 10);
        const parsed = new Date(trimmed);
        if (!Number.isFinite(parsed.getTime())) return null;
        return String(parsed.getFullYear());
    };
    const startYear = extractYear(companyContext?.fiscalYearStart);
    const endYear = extractYear(companyContext?.fiscalYearEnd);
    const yearLabel = startYear && endYear ? `${startYear} - ${endYear}` : startYear || endYear || '';
    const titleName = companyAlias || companyName;
    const contextLabel = titleName && yearLabel ? `${titleName} [${yearLabel}]` : titleName || (yearLabel ? `FY ${yearLabel}` : '');
    const baseTitle = contextLabel ? `Vidhione | ${contextLabel}` : 'Vidhione';
    const resolvedPageTitle = pageTitle
        ? contextLabel
            ? `Vidhione | ${pageTitle} | ${contextLabel}`
            : `Vidhione | ${pageTitle}`
        : baseTitle;
    const ogUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const ogImage = ogUrl ? `${ogUrl}/layout/images/logo/vidhione-wordmark.svg` : '/layout/images/logo/vidhione-wordmark.svg';
    const metaDescription = 'Vidhione agency management platform for inventory, billing, and accounts.';

    return (
        <LayoutContext.Provider value={value}>
            <>
                <Helmet>
                    <title>{resolvedPageTitle}</title>
                    <meta charSet="UTF-8" />
                    <meta name="description" content={metaDescription} />
                    <meta name="robots" content="index, follow" />
                    <meta name="viewport" content="initial-scale=1, width=device-width" />
                    <meta property="og:type" content="website"></meta>
                    <meta property="og:title" content={resolvedPageTitle}></meta>
                    <meta property="og:url" content={ogUrl}></meta>
                    <meta property="og:description" content={metaDescription} />
                    <meta property="og:image" content={ogImage}></meta>
                    <meta property="og:ttl" content="604800"></meta>
                    <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
                    <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"></link>
                    <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16"></link>
                    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></link>
                    <link rel="manifest" href="/site.webmanifest"></link>
                    <meta name="theme-color" content="#0f172a" />
                    <meta name="msapplication-config" content="/browserconfig.xml" />
                    <meta name="msapplication-TileColor" content="#0f172a" />
                </Helmet>
                {props.children}
            </>
        </LayoutContext.Provider>
    );
};
