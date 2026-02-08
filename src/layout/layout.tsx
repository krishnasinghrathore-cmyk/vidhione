'use client';
import { useEventListener, useMountEffect, useResizeListener, useUnmountEffect } from 'primereact/hooks';
import { classNames, DomHandler } from 'primereact/utils';
import React, { useCallback, useContext, useEffect, useRef, Context } from 'react';
import AppConfig from './AppConfig';
import AppRightMenu from './AppRightMenu';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';
import { LayoutContext } from './context/layoutcontext';
import AppBreadcrumb from './AppBreadCrumb';
import AppFooter from './AppFooter';
import type { AppTopbarRef } from '@/types/layout';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { PrimeReactContext, APIOptions } from 'primereact/api';

const Layout = () => {
    const { layoutConfig, layoutState, setLayoutState, setLayoutConfig, isSlim, isSlimPlus, isHorizontal, isDesktop, isSidebarActive } = useContext(LayoutContext);
    const { setRipple } = useContext(PrimeReactContext as Context<APIOptions>);
    const topbarRef = useRef<AppTopbarRef>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const [searchParams] = useSearchParams();
    let timeout: number | null = null;

    const [bindMenuOutsideClickListener, unbindMenuOutsideClickListener] = useEventListener({
        type: 'click',
        listener: (event) => {
            const isOutsideClicked = !(
                sidebarRef.current?.isSameNode(event.target as Node) ||
                sidebarRef.current?.contains(event.target as Node) ||
                topbarRef.current?.menubutton?.isSameNode(event.target as Node) ||
                topbarRef.current?.menubutton?.contains(event.target as Node)
            );

            if (isOutsideClicked) {
                hideMenu();
            }
        }
    });

    const [bindDocumentResizeListener, unbindDocumentResizeListener] = useResizeListener({
        listener: () => {
            if (isDesktop() && !DomHandler.isTouchDevice()) {
                hideMenu();
            }
        }
    });

    const hideMenu = useCallback(() => {
        setLayoutState((prevLayoutState) => ({
            ...prevLayoutState,
            overlayMenuActive: false,
            overlaySubmenuActive: false,
            staticMenuMobileActive: false,
            menuHoverActive: false,
            resetMenu: (isSlim() || isSlimPlus() || isHorizontal()) && isDesktop()
        }));
         
    }, [isSlim, isSlimPlus, isHorizontal, isDesktop]);

    const blockBodyScroll = () => {
        if (document.body.classList) {
            document.body.classList.add('blocked-scroll');
        } else {
            document.body.className += ' blocked-scroll';
        }
    };

    const unblockBodyScroll = () => {
        if (document.body.classList) {
            document.body.classList.remove('blocked-scroll');
        } else {
            document.body.className = document.body.className.replace(new RegExp('(^|\\b)' + 'blocked-scroll'.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    };
    useMountEffect(() => {
        setRipple?.(layoutConfig.ripple);
    });

    const onMouseEnter = () => {
        if (!layoutState.anchored) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            setLayoutState((prevLayoutState) => ({
                ...prevLayoutState,
                sidebarActive: true
            }));
        }
    };

    const onMouseLeave = () => {
        if (!layoutState.anchored) {
            if (!timeout) {
                timeout = setTimeout(
                    () =>
                        setLayoutState((prevLayoutState) => ({
                            ...prevLayoutState,
                            sidebarActive: false
                        })),
                    300
                );
            }
        }
    };

    useEffect(() => {
        console.log('[LAYOUT] useEffect location.pathname:', location.pathname);
        console.log('[LAYOUT] useEffect searchParams.toString():', searchParams.toString());
        setLayoutState((prev) => ({
            ...prev,
            overlayMenuActive: false,
            overlaySubmenuActive: false,
            staticMenuMobileActive: false,
            menuHoverActive: false,
            resetMenu: (isSlim() || isSlimPlus() || isHorizontal()) && isDesktop()
        }));

        if (layoutConfig.colorScheme === 'dark') {
            setLayoutConfig((prev) => ({ ...prev, menuTheme: 'dark' }));
        }
    }, [location.pathname, searchParams.toString()]);

    useEffect(() => {
        if (typeof document === 'undefined') return;

        const focusNext = (current: HTMLElement, scope: ParentNode) => {
            const focusables = Array.from(
                scope.querySelectorAll<HTMLElement>(
                    'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
                )
            ).filter((element) => {
                if (element.hasAttribute('disabled')) return false;
                if (element.getAttribute('aria-disabled') === 'true') return false;
                if (element.tabIndex < 0) return false;
                const style = window.getComputedStyle(element);
                if (style.visibility === 'hidden' || style.display === 'none') return false;
                if (!element.getClientRects().length) return false;
                return true;
            });

            const startIndex = focusables.indexOf(current);
            if (startIndex < 0) return;
            for (let i = startIndex + 1; i < focusables.length; i += 1) {
                const candidate = focusables[i];
                if (candidate) {
                    candidate.focus();
                    break;
                }
            }
        };

        const handleEnterAsTab = (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            if (event.defaultPrevented) return;
            if (event.isComposing) return;
            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

            const target = event.target as HTMLElement | null;
            if (!target) return;
            if (target.closest('[data-enter-tab="false"], [data-enter-submit="true"]')) return;

            const tag = target.tagName.toLowerCase();
            if (tag === 'textarea') return;
            if (tag === 'button') return;
            if (target.getAttribute('contenteditable') === 'true') return;
            if (tag === 'input') {
                const input = target as HTMLInputElement;
                const type = (input.type || '').toLowerCase();
                if (['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file'].includes(type)) return;
            }

            const scope =
                target.closest('form') ??
                target.closest('.p-dialog, .p-overlaypanel, .p-sidebar, .layout-content') ??
                document.body;

            event.preventDefault();
            focusNext(target, scope);
        };

        document.addEventListener('keydown', handleEnterAsTab);
        return () => {
            document.removeEventListener('keydown', handleEnterAsTab);
        };
    }, []);

    useEffect(() => {
        if (isSidebarActive()) {
            bindMenuOutsideClickListener();
        }

        if (layoutState.staticMenuMobileActive) {
            blockBodyScroll();
            (isSlim() || isSlimPlus() || isHorizontal()) && bindDocumentResizeListener();
        }

        return () => {
            unbindMenuOutsideClickListener();
            unbindDocumentResizeListener();
            unblockBodyScroll();
        };
         
    }, [layoutState.overlayMenuActive, layoutState.staticMenuMobileActive, layoutState.overlaySubmenuActive]);

    useUnmountEffect(() => {
        unbindMenuOutsideClickListener();
    });

    const containerClassName = classNames('layout-topbar-' + layoutConfig.topbarTheme, 'layout-menu-' + layoutConfig.menuTheme, 'layout-menu-profile-' + layoutConfig.menuProfilePosition, {
        'layout-overlay': layoutConfig.menuMode === 'overlay',
        'layout-static': layoutConfig.menuMode === 'static',
        'layout-slim': layoutConfig.menuMode === 'slim',
        'layout-slim-plus': layoutConfig.menuMode === 'slim-plus',
        'layout-horizontal': layoutConfig.menuMode === 'horizontal',
        'layout-reveal': layoutConfig.menuMode === 'reveal',
        'layout-drawer': layoutConfig.menuMode === 'drawer',
        'p-input-filled': layoutConfig.inputStyle === 'filled',
        'layout-sidebar-dark': layoutConfig.colorScheme === 'dark',
        'p-ripple-disabled': !layoutConfig.ripple,
        'layout-static-inactive': layoutState.staticMenuDesktopInactive && layoutConfig.menuMode === 'static',
        'layout-overlay-active': layoutState.overlayMenuActive,
        'layout-mobile-active': layoutState.staticMenuMobileActive,
        'layout-topbar-menu-active': layoutState.topbarMenuActive,
        'layout-menu-profile-active': layoutState.menuProfileActive,
        'layout-sidebar-active': layoutState.sidebarActive,
        'layout-sidebar-anchored': layoutState.anchored
    });

    return (
        <React.Fragment>
            <div className={classNames('layout-container', containerClassName)}>
                <AppTopbar ref={topbarRef} />
                <AppRightMenu />
                <div ref={sidebarRef} className="layout-sidebar" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                    <AppSidebar />
                </div>
                <div className="layout-content-wrapper">
                    <AppBreadcrumb></AppBreadcrumb>
                    <div className="layout-content">
                        <Outlet />
                    </div>
                    <AppFooter></AppFooter>
                </div>
                <AppConfig />
                <div className="layout-mask"></div>
            </div>
        </React.Fragment>
    );
};

export default Layout;
