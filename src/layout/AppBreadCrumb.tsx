import { useLocation, Link } from 'react-router-dom';
import { ObjectUtils } from 'primereact/utils';
import React, { useMemo } from 'react';
import type { Breadcrumb } from '@/types/layout';
import { Button } from 'primereact/button';
import { model } from './AppMenuModel';

const PAYMENT_VOUCHERS_PATH_PREFIX = '/apps/accounts/payment-vouchers/';
const VOUCHER_ENGINE_PATH_PREFIX = '/apps/accounts/vouchers/voucher/';
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

const VOUCHER_ENGINE_TYPE_LABELS: Record<string, string> = {
    payment: 'Payment Vouchers',
    receipt: 'Receipt Vouchers',
    contra: 'Contra Vouchers',
    sales: 'Sales Vouchers',
    purchase: 'Purchase Vouchers',
    'credit-note': 'Credit Notes',
    'debit-note': 'Debit Notes',
    'tax-invoice': 'Tax Invoices'
};

const VOUCHER_ENGINE_MODE_LABELS: Record<string, string> = {
    cash: 'Cash',
    bank: 'Bank',
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    transfer: 'Transfer'
};

const VOUCHER_ENGINE_MODE_LABELS_BY_TYPE: Record<string, Record<string, string>> = {
    sales: {
        cash: 'Entry'
    },
    purchase: {
        cash: 'Entry'
    },
    'credit-note': {
        cash: 'Entry'
    },
    'debit-note': {
        cash: 'Entry'
    },
    'tax-invoice': {
        cash: 'Sales',
        bank: 'Purchase'
    }
};

const resolveVoucherEngineBreadcrumb = (pathname: string): Breadcrumb | null => {
    if (!pathname.startsWith(VOUCHER_ENGINE_PATH_PREFIX)) return null;

    const segments = pathname.split('/').filter(Boolean);
    const voucherTypeSegment = segments[4] ?? '';
    const voucherTypeLabel = VOUCHER_ENGINE_TYPE_LABELS[voucherTypeSegment];
    if (!voucherTypeLabel) return null;

    const modeSegment = segments[5] ?? '';
    const modeLabel =
        VOUCHER_ENGINE_MODE_LABELS_BY_TYPE[voucherTypeSegment]?.[modeSegment] ?? VOUCHER_ENGINE_MODE_LABELS[modeSegment];
    if (!modeLabel) return null;

    const sectionSegment = segments[6] ?? '';
    const voucherNoSegment = segments[7] ? decodeRouteSegment(segments[7]) : '';
    const sectionLabel =
        sectionSegment === 'new'
            ? 'New'
            : sectionSegment === 'edit'
              ? voucherNoSegment
                  ? `Edit #${voucherNoSegment}`
                  : 'Edit'
              : 'Register';

    return {
        labels: ['Accounts', 'Vouchers', voucherTypeLabel, modeLabel, sectionLabel],
        to: pathname
    };
};

const AppBreadcrumb = () => {
    const location = useLocation();

    const breadcrumb = useMemo(() => {
        const paymentVoucherBreadcrumb = resolvePaymentVoucherBreadcrumb(location.pathname);
        if (paymentVoucherBreadcrumb) return paymentVoucherBreadcrumb;
        const voucherEngineBreadcrumb = resolveVoucherEngineBreadcrumb(location.pathname);
        if (voucherEngineBreadcrumb) return voucherEngineBreadcrumb;

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
