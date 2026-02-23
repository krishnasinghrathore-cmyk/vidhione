'use client';
import React from 'react';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { InvoiceFormContainer } from './InvoiceFormContainer';
import type { InvoiceFormRouteView } from './types';

type RouteResolution = {
    routeView: InvoiceFormRouteView;
    routeSaleInvoiceId: number | null;
};

const resolveInvoiceRoute = (pathname: string): RouteResolution => {
    if (/\/billing\/invoice-form\/new\/?$/.test(pathname)) {
        return { routeView: 'new', routeSaleInvoiceId: null };
    }

    const editMatch = pathname.match(/\/billing\/invoice-form\/edit\/(\d+)\/?$/);
    if (editMatch) {
        return {
            routeView: 'edit',
            routeSaleInvoiceId: Number(editMatch[1])
        };
    }

    return { routeView: 'register', routeSaleInvoiceId: null };
};

export default function InvoiceFormPage() {
    const location = useLocation();
    const params = useParams<{ saleInvoiceId?: string }>();
    const route = React.useMemo(() => {
        const editMatch =
            matchPath('/apps/billing/invoice-form/edit/:saleInvoiceId', location.pathname) ??
            matchPath('/billing/invoice-form/edit/:saleInvoiceId', location.pathname);
        if (editMatch?.params?.saleInvoiceId) {
            const idFromMatch = Number(editMatch.params.saleInvoiceId);
            if (Number.isFinite(idFromMatch) && idFromMatch > 0) {
                return { routeView: 'edit' as const, routeSaleInvoiceId: idFromMatch };
            }
        }

        const idFromParam = Number(params.saleInvoiceId);
        if (Number.isFinite(idFromParam) && idFromParam > 0) {
            return { routeView: 'edit' as const, routeSaleInvoiceId: idFromParam };
        }

        const newMatch =
            matchPath('/apps/billing/invoice-form/new', location.pathname) ??
            matchPath('/billing/invoice-form/new', location.pathname);
        if (newMatch) {
            return { routeView: 'new' as const, routeSaleInvoiceId: null };
        }

        return resolveInvoiceRoute(location.pathname);
    }, [location.pathname, params.saleInvoiceId]);

    return <InvoiceFormContainer routeView={route.routeView} routeSaleInvoiceId={route.routeSaleInvoiceId} />;
}
