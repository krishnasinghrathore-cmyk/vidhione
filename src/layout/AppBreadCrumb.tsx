import { useLocation, Link } from 'react-router-dom';
import { ObjectUtils } from 'primereact/utils';
import React, { useMemo } from 'react';
import type { Breadcrumb } from '@/types/layout';
import { Button } from 'primereact/button';
import { model } from './AppMenu'; // Assuming AppMenu is in the same directory

const PAYMENT_VOUCHERS_PATH_PREFIX = '/apps/accounts/payment-vouchers/';
const decodeRouteSegment = (value: string) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const resolvePaymentVoucherBreadcrumb = (pathname: string): Breadcrumb | null => {
    if (!pathname.startsWith(PAYMENT_VOUCHERS_PATH_PREFIX)) return null;

    const segments = pathname.split('/').filter(Boolean);
    const modeSegment = segments[3] ?? '';
    const modeLabel = modeSegment === 'cash' ? 'Cash' : modeSegment === 'bank' ? 'Bank' : null;
    if (!modeLabel) return null;

    const sectionSegment = segments[4] ?? '';
    const voucherNoSegment = segments[5] ? decodeRouteSegment(segments[5]) : '';
    const sectionLabel =
        sectionSegment === 'new'
            ? 'New'
            : sectionSegment === 'edit'
              ? voucherNoSegment
                  ? `Edit #${voucherNoSegment}`
                  : 'Edit'
              : 'Register';

    return {
        labels: ['Accounts', 'Payment Vouchers', modeLabel, sectionLabel],
        to: pathname
    };
};

const AppBreadcrumb = () => {
    const location = useLocation();

    const breadcrumb = useMemo(() => {
        const paymentVoucherBreadcrumb = resolvePaymentVoucherBreadcrumb(location.pathname);
        if (paymentVoucherBreadcrumb) return paymentVoucherBreadcrumb;

        let activeBreadcrumb: Breadcrumb | null = null;
        let activeMatchLength = -1;

        const search = (items: any[], parent: any[]) => {
            for (const item of items) {
                const path = [...parent, item];

                if (typeof item.to === 'string') {
                    const isMatch =
                        item.to === location.pathname ||
                        (location.pathname.startsWith(item.to) && location.pathname.charAt(item.to.length) === '/');
                    if (isMatch && item.to.length > activeMatchLength) {
                        activeMatchLength = item.to.length;
                        activeBreadcrumb = {
                            labels: path.map((p) => p.label),
                            to: item.to
                        };
                    }
                }

                if (item.items) {
                    search(item.items, path);
                }
            }
        };

        search(model, []);
        return activeBreadcrumb;
    }, [location.pathname]);

    return (
        <div className="layout-breadcrumb-container">
            <nav className="layout-breadcrumb">
                <ol>
                    <li>
                        <Link to={'/'} style={{ color: 'inherit' }}>
                            <i className="pi pi-home"></i>
                        </Link>
                    </li>
                    {ObjectUtils.isNotEmpty(breadcrumb?.labels)
                        ? breadcrumb?.labels?.map((label, index) => {
                            return (
                                <React.Fragment key={index}>
                                    <i className="pi pi-angle-right"></i>
                                    <li key={index}>{label}</li>
                                </React.Fragment>
                            );
                        })
                        : location.pathname + location.search === '/' && (
                            <>
                                <i className="pi pi-angle-right"></i>
                                <li key={'home'}>Dashboard</li>
                            </>
                        )}
                </ol>
            </nav>
            <div className="layout-breadcrumb-buttons">
                <Button icon="pi pi-cloud-upload" rounded text className="p-button-plain"></Button>
                <Button icon="pi pi-bookmark" rounded text className="p-button-plain"></Button>
                <Button icon="pi pi-power-off" rounded text className="p-button-plain"></Button>
            </div>
        </div>
    );
};

export default AppBreadcrumb;
