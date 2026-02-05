import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

export type BillingInterval = 'month' | 'year';

export type BillingCatalogItem = {
    productKey: string;
    name: string;
    category: string;
    isAddon: boolean;
    isEnabled: boolean;
    currency: string;
    monthlyPriceCents: number | null;
    yearlyPriceCents: number | null;
};

export type BillingCheckoutPayment =
    | { provider: 'dev' }
    | {
          provider: 'razorpay';
          razorpay: { keyId: string; orderId: string; amountCents: number; currency: string };
      }
    | null;

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const billingGraphqlUrl = apiUrl('/auth/graphql');

const requestBillingGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(billingGraphqlUrl, {
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
                return await requestBillingGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

export const catalog = async () => {
    const data = await requestBillingGraphql<{ billingCatalog: { tenantId: string; items: BillingCatalogItem[] } }>(
        `query BillingCatalog {
            billingCatalog {
                tenantId
                items {
                    productKey
                    name
                    category
                    isAddon
                    isEnabled
                    currency
                    monthlyPriceCents
                    yearlyPriceCents
                }
            }
        }`
    );
    return data.billingCatalog;
};

export const checkout = async (input: { productKey: string; interval: BillingInterval; couponCode?: string | null }) => {
    const data = await requestBillingGraphql<{
        billingCheckout: {
            invoice: {
                id: string;
                status: 'pending' | 'paid' | string;
                tenantId: string;
                productKey: string;
                interval: BillingInterval;
                currency: string;
                subtotalCents: number;
                discountCents: number;
                totalCents: number;
                appliedPromotion: { id: string; name: string; code: string | null } | null;
            };
            payment: BillingCheckoutPayment;
        };
    }>(
        `mutation BillingCheckout($input: BillingCheckoutInput!) {
            billingCheckout(input: $input) {
                invoice {
                    id
                    status
                    tenantId
                    productKey
                    interval
                    currency
                    subtotalCents
                    discountCents
                    totalCents
                    appliedPromotion { id name code }
                }
                payment {
                    provider
                    razorpay { keyId orderId amountCents currency }
                }
            }
        }`,
        { input }
    );
    return data.billingCheckout;
};

export const devPayInvoice = async (invoiceId: string) => {
    const data = await requestBillingGraphql<{ billingDevPayInvoice: { ok: boolean } }>(
        `mutation BillingDevPayInvoice($invoiceId: String!) {
            billingDevPayInvoice(invoiceId: $invoiceId) { ok }
        }`,
        { invoiceId }
    );
    return data.billingDevPayInvoice;
};

export const confirmRazorpayPayment = async (input: { invoiceId: string; orderId: string; paymentId: string; signature: string }) => {
    const data = await requestBillingGraphql<{ billingRazorpayConfirm: { ok: boolean } }>(
        `mutation BillingRazorpayConfirm($input: BillingRazorpayConfirmInput!) {
            billingRazorpayConfirm(input: $input) { ok }
        }`,
        { input }
    );
    return data.billingRazorpayConfirm;
};
