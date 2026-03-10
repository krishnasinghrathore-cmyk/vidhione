'use client';
import React from 'react';
import { matchPath, useLocation, useParams } from 'react-router-dom';
import { InvoiceFormContainer } from './InvoiceFormContainer';
import { invoiceEditPathPatterns, invoiceNewPathPatterns } from './routes';
import type { InvoiceFormRouteView } from './types';

type RouteResolution = {
    routeView: InvoiceFormRouteView;
    routeSaleInvoiceId: number | null;
};

const resolveEditRouteMatch = (pathname: string) => {
    for (const pattern of invoiceEditPathPatterns) {
        const match = matchPath(pattern, pathname);
        const saleInvoiceId = Number(match?.params?.saleInvoiceId);
        if (Number.isFinite(saleInvoiceId) && saleInvoiceId > 0) {
            return saleInvoiceId;
        }
    }

    return null;
};

const resolveNewRouteMatch = (pathname: string) => invoiceNewPathPatterns.some((pattern) => matchPath(pattern, pathname));

const resolveInvoiceRoute = (pathname: string): RouteResolution => {
    const matchedSaleInvoiceId = resolveEditRouteMatch(pathname);
    if (matchedSaleInvoiceId != null) {
        return { routeView: 'edit', routeSaleInvoiceId: matchedSaleInvoiceId };
    }

    if (resolveNewRouteMatch(pathname)) {
        return { routeView: 'new', routeSaleInvoiceId: null };
    }

    return { routeView: 'register', routeSaleInvoiceId: null };
};

export default function InvoiceFormPage() {
    const location = useLocation();
    const params = useParams<{ saleInvoiceId?: string }>();
    const route = React.useMemo(() => {
        const saleInvoiceIdFromRoute = resolveEditRouteMatch(location.pathname);
        if (saleInvoiceIdFromRoute != null) {
            return { routeView: 'edit' as const, routeSaleInvoiceId: saleInvoiceIdFromRoute };
        }

        const idFromParam = Number(params.saleInvoiceId);
        if (Number.isFinite(idFromParam) && idFromParam > 0) {
            return { routeView: 'edit' as const, routeSaleInvoiceId: idFromParam };
        }

        if (resolveNewRouteMatch(location.pathname)) {
            return { routeView: 'new' as const, routeSaleInvoiceId: null };
        }

        return resolveInvoiceRoute(location.pathname);
    }, [location.pathname, params.saleInvoiceId]);

    return <InvoiceFormContainer routeView={route.routeView} routeSaleInvoiceId={route.routeSaleInvoiceId} />;
}