'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { toYmdOrEmpty, toYmdOrNull } from '@/lib/date';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_PRICE_AT_QUERY,
    WEALTH_PRICES_QUERY,
    WEALTH_SECURITIES_QUERY,
    WEALTH_UPSERT_PRICE_MUTATION,
    formatWealthAmount,
    type WealthPriceRow,
    type WealthSecurity
} from '../maintenanceShared';

type PriceForm = {
    securityId: string;
    pdate: Date | null;
    closePrice: number | null;
};

export default function WealthPricesPage() {
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<PriceForm>({ securityId: '', pdate: new Date(), closePrice: null });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [fmvSecurityId, setFmvSecurityId] = useState('');
    const [fmvDate, setFmvDate] = useState<Date | null>(new Date());
    const [fmvQty, setFmvQty] = useState<number | null>(1);

    const securitiesQuery = useQuery(WEALTH_SECURITIES_QUERY, { client: wealthApolloClient });
    const pricesQuery = useQuery(WEALTH_PRICES_QUERY, {
        client: wealthApolloClient,
        variables: { limit: 12 },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });
    const [savePrice] = useMutation(WEALTH_UPSERT_PRICE_MUTATION, { client: wealthApolloClient });

    const securities: WealthSecurity[] = securitiesQuery.data?.securities ?? [];
    const recentPrices: WealthPriceRow[] = pricesQuery.data?.pricesList ?? [];

    const securityOptions = useMemo(
        () => securities.map((security) => ({ label: security.symbol || security.name, value: security.id })),
        [securities]
    );
    const securityById = useMemo(() => {
        const map: Record<string, WealthSecurity> = {};
        securities.forEach((security) => {
            map[security.id] = security;
        });
        return map;
    }, [securities]);

    useEffect(() => {
        if (!form.securityId && securityOptions.length) {
            setForm((current) => ({ ...current, securityId: securityOptions[0].value }));
        }
        if (!fmvSecurityId && securityOptions.length) {
            setFmvSecurityId(securityOptions[0].value);
        }
    }, [fmvSecurityId, form.securityId, securityOptions]);

    const fmvAsOfDate = toYmdOrNull(fmvDate);
    const { data: fmvPriceData, loading: fmvLoading, error: fmvError } = useQuery(WEALTH_PRICE_AT_QUERY, {
        client: wealthApolloClient,
        skip: !fmvSecurityId || !fmvAsOfDate,
        variables: { securityId: fmvSecurityId, asOfDate: fmvAsOfDate ?? '' }
    });

    const fmvRow = fmvPriceData?.pricesList?.[0] ?? null;
    const fmvClose = fmvRow?.closePrice != null ? Number(fmvRow.closePrice) : NaN;
    const fmvClosePrice = Number.isFinite(fmvClose) ? fmvClose : null;
    const fmvValue = fmvClosePrice != null && fmvQty != null ? fmvClosePrice * fmvQty : null;

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.securityId || !form.pdate || form.closePrice == null) {
            setFormError('Security, date, and closing price are required');
            showToast('warn', 'Security, date, and closing price are required');
            return;
        }
        if (form.closePrice < 0) {
            setFormError('Closing price cannot be negative');
            showToast('warn', 'Closing price cannot be negative');
            return;
        }

        setFormError(null);
        setSaving(true);
        try {
            await savePrice({
                variables: {
                    securityId: form.securityId,
                    pdate: toYmdOrEmpty(form.pdate),
                    closePrice: form.closePrice.toString()
                }
            });
            await pricesQuery.refetch();
            setForm((current) => ({ ...current, closePrice: null }));
            showToast('success', 'Closing price saved');
        } catch (error: any) {
            showToast('error', 'Unable to save closing price', error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="grid">
            <Toast ref={toastRef} />

            <div className="col-12">
                <div className="card">
                    <div className="flex flex-column xl:flex-row xl:align-items-center xl:justify-content-between gap-3">
                        <div>
                            <h2 className="m-0">Prices & FMV</h2>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Maintain the latest closing prices for securities and calculate fair market value snapshots when a client needs valuation support.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Holdings" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/holdings')} />
                            <Button label="Securities" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/securities')} />
                        </div>
                    </div>

                    {securitiesQuery.error && <p className="text-red-500 mt-3 mb-0">Securities error: {securitiesQuery.error.message}</p>}
                    {pricesQuery.error && <p className="text-red-500 mt-2 mb-0">Prices error: {pricesQuery.error.message}</p>}
                </div>
            </div>

            <div className="col-12 xl:col-5">
                <Card title="Closing Price" subTitle="Daily close for a security">
                    <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Security</label>
                            <AppDropdown
                                value={form.securityId}
                                options={securityOptions}
                                onChange={(e) => setForm((current) => ({ ...current, securityId: e.value || '' }))}
                                placeholder={securitiesQuery.loading ? 'Loading...' : 'Select security'}
                                filter
                                disabled={saving || !securityOptions.length}
                            />
                            {!securityOptions.length && (
                                <small className="text-600">Create the security first from the Securities page.</small>
                            )}
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Price date</label>
                                <AppDateInput value={form.pdate} onChange={(value) => setForm((current) => ({ ...current, pdate: value }))} disabled={saving} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Close price</label>
                                <InputNumber
                                    value={form.closePrice ?? undefined}
                                    onValueChange={(e) => setForm((current) => ({ ...current, closePrice: e.value ?? null }))}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    inputClassName="w-full"
                                    className="w-full"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                        {formError && <small className="p-error">{formError}</small>}
                        <div className="flex gap-2">
                            <Button type="submit" label={saving ? 'Saving...' : 'Save price'} icon="pi pi-check" disabled={saving || !securityOptions.length} />
                            <Button
                                type="button"
                                label="Refresh"
                                className="p-button-text app-action-compact"
                                onClick={() => pricesQuery.refetch()}
                                disabled={pricesQuery.loading}
                            />
                        </div>
                    </form>
                </Card>
            </div>

            <div className="col-12 xl:col-4">
                <Card title="Fair Market Value" subTitle="Calculated from latest available close">
                    <div className="flex flex-column gap-3">
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Security</label>
                            <AppDropdown
                                value={fmvSecurityId}
                                options={securityOptions}
                                onChange={(e) => setFmvSecurityId(e.value || '')}
                                placeholder={securitiesQuery.loading ? 'Loading...' : 'Select security'}
                                filter
                                disabled={!securityOptions.length}
                            />
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">FMV date</label>
                                <AppDateInput value={fmvDate} onChange={setFmvDate} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Qty</label>
                                <InputNumber
                                    value={fmvQty ?? undefined}
                                    onValueChange={(e) => setFmvQty(e.value ?? null)}
                                    mode="decimal"
                                    minFractionDigits={0}
                                    maxFractionDigits={6}
                                    inputClassName="w-full"
                                    className="w-full"
                                />
                            </div>
                        </div>

                        {fmvError && <small className="p-error">{fmvError.message}</small>}
                        {fmvLoading && <small className="text-600">Loading price...</small>}

                        <div className="surface-ground border-round-lg p-3 text-sm text-700">
                            <div className="flex justify-content-between">
                                <span>Price date</span>
                                <span>{fmvRow?.pdate ?? '-'}</span>
                            </div>
                            <div className="flex justify-content-between mt-2">
                                <span>Close price</span>
                                <span>{formatWealthAmount(fmvClosePrice)}</span>
                            </div>
                            <div className="flex justify-content-between mt-2 font-medium">
                                <span>FMV</span>
                                <span>{formatWealthAmount(fmvValue)}</span>
                            </div>
                        </div>

                        {!fmvLoading && fmvSecurityId && fmvAsOfDate && !fmvRow && (
                            <small className="text-600">No closing price found on or before {fmvAsOfDate}. Add it in the price form first.</small>
                        )}
                    </div>
                </Card>
            </div>

            <div className="col-12 xl:col-3">
                <Card title="Need a security master?" subTitle="Create or review the security before loading prices.">
                    <p className="mt-0 mb-3 text-600 line-height-3">
                        Use the dedicated Securities page when a new ISIN or symbol must be added before pricing.
                    </p>
                    <Button label="Open securities page" className="app-action-compact" onClick={() => navigate('/apps/wealth/securities')} />
                </Card>
            </div>

            <div className="col-12">
                <Card title="Recent Prices" subTitle="Latest close price by security">
                    {pricesQuery.loading && !recentPrices.length ? (
                        <p className="m-0 text-600">Loading...</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="w-full small-table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Security</th>
                                        <th className="text-left">Date</th>
                                        <th className="text-right">Close</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentPrices.map((row) => {
                                        const security = securityById[row.securityId];
                                        return (
                                            <tr key={`${row.securityId}-${row.pdate}`}>
                                                <td>{security?.symbol || security?.name || row.securityId}</td>
                                                <td>{row.pdate}</td>
                                                <td className="text-right">{row.closePrice}</td>
                                            </tr>
                                        );
                                    })}
                                    {!recentPrices.length && (
                                        <tr>
                                            <td colSpan={3} className="text-center text-600">
                                                No prices yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}