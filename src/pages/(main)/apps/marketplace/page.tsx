'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { SelectButton } from 'primereact/selectbutton';
import { Tag } from 'primereact/tag';
import { classNames } from 'primereact/utils';
import { APPS } from '@/config/appsConfig';
import { useAuth } from '@/lib/auth/context';
import type { BillingCatalogItem, BillingCheckoutPayment, BillingInterval } from '@/lib/billing/api';
import * as billingApi from '@/lib/billing/api';

const loadRazorpayScript = async () => {
    if (typeof window === 'undefined') return;
    if ((window as any).Razorpay) return;

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Razorpay Checkout script'));
        document.body.appendChild(script);
    });
};

export default function MarketplaceAppPage() {
    const navigate = useNavigate();
    const { refresh, enabledApps, tenantId } = useAuth();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<BillingCatalogItem[]>([]);

    const [unlockOpen, setUnlockOpen] = useState(false);
    const [unlockKey, setUnlockKey] = useState<string | null>(null);
    const [interval, setInterval] = useState<BillingInterval>('month');
    const [couponCode, setCouponCode] = useState('');
    const [invoice, setInvoice] = useState<null | (Awaited<ReturnType<typeof billingApi.checkout>>['invoice'])>(null);
    const [payment, setPayment] = useState<BillingCheckoutPayment>(null);
    const [paying, setPaying] = useState(false);

    const appMap = useMemo(() => new Map(APPS.map((a) => [a.id, a])), []);
    const industryEnabled = useMemo(
        () => (enabledApps ?? []).some((id) => APPS.some((app) => app.id === id && app.category === 'industry')),
        [enabledApps]
    );
    const allowedAppKeys = useMemo(() => {
        if (!tenantId || !industryEnabled) return null;
        return new Set(APPS.filter((app) => app.category === 'addon').map((app) => app.id));
    }, [tenantId, industryEnabled]);
    const visibleItems = useMemo(() => {
        if (!allowedAppKeys) return items;
        return items.filter((item) => allowedAppKeys.has(item.productKey));
    }, [items, allowedAppKeys]);

    const money = useCallback((cents: number | null, currency: string) => {
        if (cents == null) return '—';
        const amount = cents / 100;
        try {
            return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
        } catch {
            return `${amount.toFixed(2)} ${currency}`;
        }
    }, []);

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await billingApi.catalog();
            setItems(res.items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load billing catalog');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const openUnlock = useCallback(
        (productKey: string) => {
            setUnlockKey(productKey);
            setInterval('month');
            setCouponCode('');
            setInvoice(null);
            setPayment(null);
            setUnlockOpen(true);
        },
        [setUnlockKey]
    );

    useEffect(() => {
        const unlock = searchParams.get('unlock');
        if (!unlock) return;
        if (!items.length) return;
        const match = items.find((i) => i.productKey === unlock);
        if (!match || match.isEnabled) return;
        if (allowedAppKeys && !allowedAppKeys.has(match.productKey)) return;
        openUnlock(match.productKey);
    }, [items, openUnlock, searchParams, allowedAppKeys]);

    const selected = useMemo(
        () => (unlockKey ? items.find((i) => i.productKey === unlockKey) ?? null : null),
        [unlockKey, items]
    );
    const returnTo = searchParams.get('returnTo');

    const canCheckout = Boolean(
        selected &&
            ((interval === 'month' && selected.monthlyPriceCents != null) || (interval === 'year' && selected.yearlyPriceCents != null))
    );

    const finishUnlock = useCallback(
        async (productKey: string) => {
            await refresh();
            await loadCatalog();
            setUnlockOpen(false);
            setInvoice(null);
            setPayment(null);

            if (returnTo) {
                navigate(returnTo);
                return;
            }

            const nextApp = appMap.get(productKey);
            if (nextApp) navigate(nextApp.path);
        },
        [appMap, loadCatalog, navigate, refresh, returnTo]
    );

    return (
        <div className="card">
            <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-3">
                <div>
                    <h2 className="mb-2">App Marketplace</h2>
                    <p className="text-600 m-0">Unlock apps for your tenant (monthly/yearly) and manage add-ons.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-content-end">
                    <Button icon="pi pi-refresh" label="Refresh" outlined onClick={loadCatalog} />
                </div>
            </div>

            {!!error && <Message severity="error" text={error} className="w-full mt-3" />}

            <div className="grid mt-4">
                {visibleItems.map((item) => {
                    const app = appMap.get(item.productKey);
                    if (!app) return null;

                    const monthPrice = money(item.monthlyPriceCents, item.currency);
                    const yearPrice = money(item.yearlyPriceCents, item.currency);
                    const status = item.isEnabled ? { value: 'ENABLED', severity: 'success' } : { value: 'LOCKED', severity: 'warning' };
                    const cardClassName = classNames(
                        'p-3 surface-card border-1 surface-border border-round h-full flex flex-column justify-content-between marketplace-card',
                        item.isEnabled ? 'marketplace-card--enabled' : 'marketplace-card--locked'
                    );

                    return (
                        <div key={item.productKey} className="col-12 md:col-6 lg:col-3">
                            <div className={cardClassName}>
                                <div>
                                    <div className="flex align-items-center justify-content-between gap-2">
                                        <div className="flex align-items-center gap-2">
                                            <i className={app.icon}></i>
                                            <h4 className="m-0 text-lg">{item.name}</h4>
                                        </div>
                                        <Tag value={status.value} severity={status.severity as any} className="text-xs" />
                                    </div>

                                    <div className="mt-2 text-600 text-sm">
                                        <div className="flex justify-content-between">
                                            <span>Monthly</span>
                                            <span className="font-medium">{monthPrice}</span>
                                        </div>
                                        <div className="flex justify-content-between mt-1">
                                            <span>Yearly</span>
                                            <span className="font-medium">{yearPrice}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-content-end mt-3">
                                    {item.isEnabled ? (
                                        <Button
                                            icon="pi pi-arrow-right"
                                            label="Open"
                                            size="small"
                                            onClick={() => navigate(app.path)}
                                        />
                                    ) : (
                                        <Button
                                            icon="pi pi-lock"
                                            label="Unlock"
                                            size="small"
                                            disabled={loading}
                                            onClick={() => openUnlock(item.productKey)}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog
                header={selected ? `Unlock • ${selected.name}` : 'Unlock App'}
                visible={unlockOpen}
                style={{ width: '34rem' }}
                modal
                onHide={() => setUnlockOpen(false)}
                footer={
                    <div className="flex justify-content-end gap-2">
                        <Button label="Close" outlined onClick={() => setUnlockOpen(false)} />
                        {!invoice ? (
                            <Button
                                label="Create Invoice"
                                icon="pi pi-check"
                                disabled={!canCheckout || paying}
                                onClick={async () => {
                                    if (!selected) return;
                                    setPaying(true);
                                    setError(null);
                                    try {
                                        const result = await billingApi.checkout({
                                            productKey: selected.productKey,
                                            interval,
                                            couponCode: couponCode.trim() || null
                                        });
                                        setInvoice(result.invoice);
                                        setPayment(result.payment ?? null);
                                    } catch (err) {
                                        setError(err instanceof Error ? err.message : 'Checkout failed');
                                    } finally {
                                        setPaying(false);
                                    }
                                }}
                            />
                        ) : (
                            <>
                                {payment?.provider === 'razorpay' ? (
                                    <Button
                                        label="Pay with Razorpay"
                                        icon="pi pi-credit-card"
                                        disabled={paying}
                                        onClick={async () => {
                                            if (!invoice || !selected || payment?.provider !== 'razorpay') return;
                                            setPaying(true);
                                            setError(null);
                                            try {
                                                await loadRazorpayScript();
                                                const Razorpay = (window as any).Razorpay as any;
                                                if (!Razorpay) throw new Error('Razorpay Checkout is not available');

                                                const response = await new Promise<any>((resolve, reject) => {
                                                    const instance = new Razorpay({
                                                        key: payment.razorpay.keyId,
                                                        amount: payment.razorpay.amountCents,
                                                        currency: payment.razorpay.currency,
                                                        name: 'Vidhione',
                                                        description: `Unlock ${selected.name}`,
                                                        order_id: payment.razorpay.orderId,
                                                        handler: (resp: any) => resolve(resp),
                                                        modal: {
                                                            ondismiss: () => reject(new Error('Payment cancelled'))
                                                        }
                                                    });
                                                    instance.on('payment.failed', (evt: any) => {
                                                        const msg =
                                                            evt?.error?.description ||
                                                            evt?.error?.reason ||
                                                            evt?.error?.code ||
                                                            'Payment failed';
                                                        reject(new Error(msg));
                                                    });
                                                    instance.open();
                                                });

                                                await billingApi.confirmRazorpayPayment({
                                                    invoiceId: invoice.id,
                                                    orderId: response.razorpay_order_id,
                                                    paymentId: response.razorpay_payment_id,
                                                    signature: response.razorpay_signature
                                                });

                                                await finishUnlock(invoice.productKey);
                                            } catch (err) {
                                                setError(err instanceof Error ? err.message : 'Payment failed');
                                            } finally {
                                                setPaying(false);
                                            }
                                        }}
                                    />
                                ) : payment?.provider === 'dev' ? (
                                    <Button
                                        label="Pay (Dev)"
                                        icon="pi pi-credit-card"
                                        disabled={paying}
                                        onClick={async () => {
                                            if (!invoice) return;
                                            setPaying(true);
                                            setError(null);
                                            try {
                                                await billingApi.devPayInvoice(invoice.id);
                                                await finishUnlock(invoice.productKey);
                                            } catch (err) {
                                                setError(err instanceof Error ? err.message : 'Payment failed');
                                            } finally {
                                                setPaying(false);
                                            }
                                        }}
                                    />
                                ) : (
                                    <Button label="Payment Not Available" disabled />
                                )}
                            </>
                        )}
                    </div>
                }
            >
                {!selected ? (
                    <div className="text-600">Select an app to unlock.</div>
                ) : (
                    <div className="flex flex-column gap-3">
                        <div className="flex flex-column gap-2">
                            <small className="text-500">Plan</small>
                            <SelectButton
                                value={interval}
                                options={[
                                    { label: 'Monthly', value: 'month' },
                                    { label: 'Yearly', value: 'year' }
                                ]}
                                allowEmpty={false}
                                onChange={(e) => {
                                    if (e.value === 'month' || e.value === 'year') setInterval(e.value);
                                }}
                            />
                        </div>

                        <div className="flex flex-column gap-2">
                            <small className="text-500">Coupon code (optional)</small>
                            <InputText value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="DIWALI10" />
                        </div>

                        <div className="surface-100 border-round p-3">
                            <div className="flex justify-content-between">
                                <span className="text-600">Price</span>
                                <span className="font-medium">
                                    {interval === 'month' ? money(selected.monthlyPriceCents, selected.currency) : money(selected.yearlyPriceCents, selected.currency)}
                                </span>
                            </div>
                            {invoice && (
                                <>
                                    <div className="flex justify-content-between mt-2">
                                        <span className="text-600">Subtotal</span>
                                        <span className="font-medium">{money(invoice.subtotalCents, invoice.currency)}</span>
                                    </div>
                                    <div className="flex justify-content-between mt-1">
                                        <span className="text-600">Discount</span>
                                        <span className="font-medium">-{money(invoice.discountCents, invoice.currency)}</span>
                                    </div>
                                    <div className="flex justify-content-between mt-2">
                                        <span className="text-600">Total</span>
                                        <span className="font-bold">{money(invoice.totalCents, invoice.currency)}</span>
                                    </div>
                                    {invoice.appliedPromotion && (
                                        <div className="mt-2 text-500">
                                            Applied promotion: {invoice.appliedPromotion.code || invoice.appliedPromotion.name}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {!canCheckout && (
                            <Message severity="warn" text="Pricing is not configured for this app yet." />
                        )}
                        {!invoice && (
                            <Message
                                severity="info"
                                text="Local testing: set BILLING_PROVIDER=dev and BILLING_DEV_MODE=1 to enable simulated payments."
                            />
                        )}
                    </div>
                )}
            </Dialog>
        </div>
    );
}
