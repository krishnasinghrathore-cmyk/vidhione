export type InvoiceRoutePaths = {
    registerRoute: string;
    newRoute: string;
    editRoutePrefix: string;
};

const BILLING_INVOICE_REGISTER_ROUTE = '/apps/billing/sale-book';
const BILLING_INVOICE_NEW_ROUTE = '/apps/billing/sale-book/new';
const BILLING_INVOICE_EDIT_ROUTE_PREFIX = '/apps/billing/sale-book/edit';
const TEXTILE_INVOICE_REGISTER_ROUTE = '/apps/textile/bill-book';
const TEXTILE_INVOICE_NEW_ROUTE = '/apps/textile/gst-invoices/new';
const TEXTILE_INVOICE_EDIT_ROUTE_PREFIX = '/apps/textile/gst-invoices/edit';

const TEXTILE_INVOICE_ROUTE_PREFIXES = ['/apps/textile/gst-invoices', '/textile/gst-invoices'] as const;

export const invoiceEditPathPatterns = [
    '/apps/billing/sale-book/edit/:saleInvoiceId',
    '/billing/sale-book/edit/:saleInvoiceId',
    '/apps/billing/invoice-form/edit/:saleInvoiceId',
    '/billing/invoice-form/edit/:saleInvoiceId',
    '/apps/textile/gst-invoices/edit/:saleInvoiceId',
    '/textile/gst-invoices/edit/:saleInvoiceId'
] as const;

export const invoiceNewPathPatterns = [
    '/apps/billing/sale-book/new',
    '/billing/sale-book/new',
    '/apps/billing/invoice-form/new',
    '/billing/invoice-form/new',
    '/apps/textile/gst-invoices/new',
    '/textile/gst-invoices/new'
] as const;

export const resolveInvoiceRoutePaths = (pathname: string): InvoiceRoutePaths => {
    const isTextileInvoiceRoute = TEXTILE_INVOICE_ROUTE_PREFIXES.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (isTextileInvoiceRoute) {
        return {
            registerRoute: TEXTILE_INVOICE_REGISTER_ROUTE,
            newRoute: TEXTILE_INVOICE_NEW_ROUTE,
            editRoutePrefix: TEXTILE_INVOICE_EDIT_ROUTE_PREFIX
        };
    }

    return {
        registerRoute: BILLING_INVOICE_REGISTER_ROUTE,
        newRoute: BILLING_INVOICE_NEW_ROUTE,
        editRoutePrefix: BILLING_INVOICE_EDIT_ROUTE_PREFIX
    };
};
