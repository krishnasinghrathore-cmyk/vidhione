import { InputText } from 'primereact/inputtext';
import { forwardRef, useContext, useImperativeHandle, useMemo, useRef } from 'react';
import { LayoutContext } from './context/layoutcontext';
import type { AppTopbarRef } from '../types/layout';
import { Button } from 'primereact/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StyleClass } from 'primereact/styleclass';
import { classNames } from 'primereact/utils';
import { Ripple } from 'primereact/ripple';
import { useAuth } from '@/lib/auth/context';
import { APPS } from '@/config/appsConfig';

const AppTopbar = forwardRef<AppTopbarRef>((_props, ref) => {
    const { onMenuToggle, showRightSidebar, onTopbarMenuToggle } = useContext(LayoutContext);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, tenantId, enabledApps, logout, exitTenant, companyContext } = useAuth();
    const menubuttonRef = useRef(null);
    const searchInputRef = useRef(null);
    const mobileButtonRef = useRef(null);
    const closeBtnRef = useRef(null);

    const searchRef = useRef(null);
    const bellRef = useRef(null);
    const avatarRef = useRef(null);
    const tableRef = useRef(null);

    const onMenuButtonClick = () => {
        onMenuToggle();
    };

    const onRightMenuButtonClick = () => {
        showRightSidebar();
    };

    const onMobileTopbarMenuButtonClick = () => {
        onTopbarMenuToggle();
    };

    const focusSearchInput = () => {
        setTimeout(() => {
            (searchInputRef.current as any)?.focus();
        }, 0);
    };

    const isAdminMode = user?.role === 'superadmin' && !tenantId;
    const enabledSet = useMemo(() => (tenantId && enabledApps ? new Set(enabledApps) : null), [tenantId, enabledApps]);
    const canAccessMarketplace = Boolean(tenantId && (user?.role === 'superadmin' || user?.role === 'tenant_admin'));
    const accessibleApps = useMemo(() => {
        if (tenantId) {
            if (!enabledSet) return [];
            return APPS.filter((app) => enabledSet.has(app.id));
        }
        if (user?.role === 'superadmin') {
            return APPS.filter((app) => app.category !== 'addon');
        }
        return APPS;
    }, [enabledSet, tenantId, user?.role]);
    const canChangeSession = Boolean(tenantId && enabledSet?.has('accounts'));
    const currentAppName = useMemo(() => {
        if (!location.pathname.startsWith('/apps/')) return null;
        const match = APPS.find((app) => location.pathname === app.path || location.pathname.startsWith(`${app.path}/`));
        if (match) return match.name;
        if (location.pathname.startsWith('/apps/marketplace')) return 'Marketplace';
        return null;
    }, [location.pathname]);
    const brandLabel = currentAppName ? `Vidhione - ${currentAppName}` : 'Vidhione';
    const companyBanner = useMemo(() => {
        if (!tenantId || isAdminMode) return null;
        const name = companyContext?.companyName?.trim() ?? '';
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
        const yearLabel = startYear && endYear ? `${startYear} - ${endYear}` : startYear || endYear || null;
        if (!name && !yearLabel) return null;
        if (name && yearLabel) return `${name} [${yearLabel}]`;
        return name || (yearLabel ? `FY ${yearLabel}` : null);
    }, [tenantId, isAdminMode, companyContext?.companyName, companyContext?.fiscalYearStart, companyContext?.fiscalYearEnd]);

    useImperativeHandle(ref, () => ({
        menubutton: menubuttonRef.current
    }));

    return (
        <div className="layout-topbar">
            <div className="layout-topbar-start">
                <Link className="layout-topbar-logo" to="/">
                    <img
                        src="/layout/images/logo/vidhione-mark.svg"
                        alt="Vidhione"
                        className="layout-topbar-logo-mark"
                    />
                    <span className="layout-topbar-brand">{brandLabel}</span>
                </Link>

                <a ref={menubuttonRef} className="p-ripple layout-menu-button" onClick={onMenuButtonClick}>
                    <i className="pi pi-chevron-right"></i>
                    <Ripple />
                </a>

                <a ref={mobileButtonRef} className="p-ripple layout-topbar-mobile-button" onClick={onMobileTopbarMenuButtonClick}>
                    <i className="pi pi-ellipsis-v"></i>
                    <Ripple />
                </a>
            </div>

            {companyBanner && (
                <div className="layout-topbar-center">
                    <div className="layout-topbar-context" title={companyBanner}>
                        {companyBanner}
                    </div>
                </div>
            )}

            <div className="layout-topbar-end">
                <div className="layout-topbar-actions-end">
                    <ul className="layout-topbar-items">
                        <li className="layout-topbar-search">
                            <StyleClass nodeRef={searchRef} selector="@next" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                <a className="p-ripple" ref={searchRef} onClick={focusSearchInput}>
                                    <i className="pi pi-search"></i>
                                    <Ripple />
                                </a>
                            </StyleClass>
                            <div className="layout-search-panel hidden p-input-filled">
                                <i className="pi pi-search"></i>
                                <InputText ref={searchInputRef} placeholder="Search" />
                                <StyleClass nodeRef={closeBtnRef} selector=".layout-search-panel" leaveActiveClassName="fadeout" leaveToClassName="hidden">
                                    <Button ref={closeBtnRef} type="button" icon="pi pi-times" rounded text className="p-button-plain"></Button>
                                </StyleClass>
                            </div>
                        </li>
                        <li>
                            <StyleClass nodeRef={bellRef} selector="@next" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                <a className="p-ripple" ref={bellRef}>
                                    <i className="pi pi-bell"></i>
                                    <Ripple />
                                </a>
                            </StyleClass>
                            <div className="hidden">
                                <ul className="list-none p-0 m-0">
                                    <li className="px-3 py-1">
                                        <span>
                                            You have <b>4</b> new notifications
                                        </span>
                                    </li>
                                    <hr className="mb-2 mx-3 border-top-1 border-none surface-border" />
                                    <li className="flex align-items-center py-2 px-3">
                                        <i className="pi pi-shopping-cart border-1 surface-border flex-shrink-0 border-circle text-primary p-2 mr-3"></i>
                                        <div>
                                            <h6 className="m-0">New Order</h6>
                                            <span className="text-600">35 mins ago</span>
                                        </div>
                                    </li>
                                    <li className="flex align-items-center py-2 px-3">
                                        <i className="pi pi-check-square border-1 surface-border flex-shrink-0 border-circle text-primary p-2 mr-3"></i>
                                        <div>
                                            <h6 className="m-0">Withdrawn Completed</h6>
                                            <span className="text-600">45 mins ago</span>
                                        </div>
                                    </li>
                                    <li className="flex align-items-center py-2 px-3">
                                        <i className="pi pi-chart-line border-1 surface-border flex-shrink-0 border-circle text-primary p-2 mr-3"></i>
                                        <div>
                                            <h6 className="m-0">Monthly Report</h6>
                                            <span className="text-600">1 hour ago</span>
                                        </div>
                                    </li>
                                    <li className="flex align-items-center py-2 px-3">
                                        <i className="pi pi-comments border-1 surface-border flex-shrink-0 border-circle text-primary p-2 mr-3"></i>
                                        <div>
                                            <h6 className="m-0">New Comment</h6>
                                            <span className="text-600">2 hours ago</span>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </li>
                        {!isAdminMode && (accessibleApps.length > 0 || canAccessMarketplace) && (
                            <li>
                                <StyleClass
                                    nodeRef={tableRef}
                                    selector="@next"
                                    enterClassName="hidden"
                                    enterActiveClassName="px-scalein"
                                    leaveToClassName="hidden"
                                    leaveActiveClassName="px-fadeout"
                                    hideOnOutsideClick
                                >
                                    <a className="p-ripple" ref={tableRef}>
                                        <i className="pi pi-table"></i>
                                        <Ripple />
                                    </a>
                                </StyleClass>
                                <div className="hidden">
                                    <div className="flex flex-wrap">
                                        {accessibleApps.map((app) => (
                                            <div key={app.id} className="w-4 flex flex-column align-items-center p-3">
                                                <Button rounded className="mb-2" icon={app.icon} onClick={() => navigate(app.path)} />
                                                <span>{app.name}</span>
                                            </div>
                                        ))}
                                        {canAccessMarketplace && (
                                            <div className="w-4 flex flex-column align-items-center p-3">
                                                <Button
                                                    rounded
                                                    className="mb-2"
                                                    icon="pi pi-shop"
                                                    onClick={() => navigate('/apps/marketplace')}
                                                />
                                                <span>Marketplace</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </li>
                        )}
                        {canChangeSession && (
                            <li>
                                <a className="p-ripple" onClick={() => navigate('/apps/accounts/change-session')}>
                                    <i className="pi pi-refresh"></i>
                                    <Ripple />
                                </a>
                            </li>
                        )}
                        <li>
                            <StyleClass nodeRef={avatarRef} selector="@next" enterClassName="hidden" enterActiveClassName="px-scalein" leaveToClassName="hidden" leaveActiveClassName="px-fadeout" hideOnOutsideClick>
                                <a className="p-ripple" ref={avatarRef}>
                                    <img src="/layout/images/avatar/amyelsner.png" alt="avatar" className="w-2rem h-2rem" />
                                    <Ripple />
                                </a>
                            </StyleClass>

                            <div className={classNames('hidden')}>
                                <ul className="list-none p-0 m-0">
                                    {user && (
                                        <li className="px-3 py-2">
                                            <div className="text-600 font-medium">{user.email}</div>
                                            <div className="text-500 text-sm">{user.role}</div>
                                        </li>
                                    )}
                                    {user?.role === 'superadmin' && tenantId && (
                                        <li>
                                            <a
                                                className="p-ripple flex align-items-center px-3 py-2"
                                                onClick={async () => {
                                                    await exitTenant();
                                                    navigate('/admin/tenants');
                                                }}
                                            >
                                                <i className="pi pi-sign-out mr-2"></i>
                                                <span>Exit Tenant</span>
                                                <Ripple />
                                            </a>
                                        </li>
                                    )}
                                    <li>
                                        <a
                                            className="p-ripple flex align-items-center px-3 py-2"
                                            onClick={() => navigate('/apps/accounts/change-password')}
                                        >
                                            <i className="pi pi-key mr-2"></i>
                                            <span>Change Password</span>
                                            <Ripple />
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            className="p-ripple flex align-items-center px-3 py-2"
                                            onClick={() => {
                                                logout();
                                                navigate('/auth/login');
                                            }}
                                        >
                                            <i className="pi pi-power-off mr-2"></i>
                                            <span>Logout</span>
                                            <Ripple />
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </li>
                        <li className="layout-topbar-right-button">
                            <a className="p-ripple" onClick={onRightMenuButtonClick}>
                                <i className="pi pi-arrow-left"></i>
                                <Ripple />
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
});

export default AppTopbar;