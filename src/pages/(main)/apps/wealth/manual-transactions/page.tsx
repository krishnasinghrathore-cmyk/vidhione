'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { toYmdOrEmpty, toYmdOrNull } from '@/lib/date';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { extractWealthSegment, stripWealthMetaTags } from '@/lib/wealthNotes';
import { WEALTH_ACCOUNTS_QUERY, formatAccountLabel, type WealthDematAccount } from '../shared';
import {
    WEALTH_SECURITIES_QUERY,
    WEALTH_TRANSACTIONS_PAGE_QUERY,
    WEALTH_TX_SEGMENTS,
    WEALTH_TX_TYPES,
    WEALTH_UPSERT_TRANSACTION_MUTATION,
    formatWealthAmount,
    getWealthTxFeesLabel,
    getWealthTxNetLabel,
    type WealthMaintenanceTransaction,
    type WealthSecurity
} from '../maintenanceShared';

type TransactionForm = {
    accountId: string;
    securityId: string;
    tdate: Date | null;
    segment: string;
    ttype: string;
    invoiceDate: Date | null;
    qty: number | null;
    price: number | null;
    fees: number | null;
    notes: string;
    sourceDoc: string;
};

const INITIAL_FORM: TransactionForm = {
    accountId: '',
    securityId: '',
    tdate: new Date(),
    segment: 'CASH',
    ttype: 'BUY',
    invoiceDate: null,
    qty: null,
    price: null,
    fees: 0,
    notes: '',
    sourceDoc: ''
};

const getSeverity = (ttype: string): 'success' | 'warning' | 'info' | 'danger' | undefined => {
    if (ttype === 'BUY') return 'success';
    if (ttype === 'SELL') return 'warning';
    if (ttype === 'DIVIDEND') return 'info';
    return undefined;
};

const formatQuantity = (value: number | string | null | undefined) => {
    const quantity = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(quantity)) return '-';
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4
    }).format(quantity);
};

export default function WealthManualTransactionsPage() {
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<TransactionForm>(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);
    const limit = 10;

    const accountsQuery = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const securitiesQuery = useQuery(WEALTH_SECURITIES_QUERY, { client: wealthApolloClient });
    const transactionsQuery = useQuery(WEALTH_TRANSACTIONS_PAGE_QUERY, {
        client: wealthApolloClient,
        variables: { limit, offset },
        notifyOnNetworkStatusChange: true,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });
    const [saveTransaction] = useMutation(WEALTH_UPSERT_TRANSACTION_MUTATION, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsQuery.data?.accounts ?? [];
    const securities: WealthSecurity[] = securitiesQuery.data?.securities ?? [];
    const txPage = transactionsQuery.data?.transactionsPage;
    const txRows: WealthMaintenanceTransaction[] = txPage?.items ?? [];

    const accountOptions = useMemo(
        () => accounts.map((account) => ({ label: formatAccountLabel(account), value: account.id })),
        [accounts]
    );
    const securityOptions = useMemo(
        () => securities.map((security) => ({ label: security.symbol || security.name, value: security.id })),
        [securities]
    );
    const accountById = useMemo(() => {
        const map: Record<string, string> = {};
        accounts.forEach((account) => {
            map[account.id] = formatAccountLabel(account);
        });
        return map;
    }, [accounts]);
    const securityById = useMemo(() => {
        const map: Record<string, WealthSecurity> = {};
        securities.forEach((security) => {
            map[security.id] = security;
        });
        return map;
    }, [securities]);

    useEffect(() => {
        if (!form.accountId && accountOptions.length) {
            setForm((current) => ({ ...current, accountId: accountOptions[0].value }));
        }
        if (!form.securityId && securityOptions.length) {
            setForm((current) => ({ ...current, securityId: securityOptions[0].value }));
        }
    }, [accountOptions, form.accountId, form.securityId, securityOptions]);

    const txGrossAmount = form.qty != null && form.price != null ? form.qty * form.price : null;
    const txFeesAmount = form.fees ?? 0;
    const txNetAmount = txGrossAmount == null ? null : txGrossAmount + (form.ttype === 'SELL' || form.ttype === 'DIVIDEND' ? -txFeesAmount : txFeesAmount);

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.accountId || !form.securityId || !form.tdate || !form.ttype || form.qty == null || form.price == null) {
            setFormError('Account, security, date, type, qty, and price are required');
            showToast('warn', 'Account, security, date, type, qty, and price are required');
            return;
        }
        if (form.qty <= 0) {
            setFormError('Quantity must be greater than zero');
            showToast('warn', 'Quantity must be greater than zero');
            return;
        }
        if (form.price < 0) {
            setFormError('Price cannot be negative');
            showToast('warn', 'Price cannot be negative');
            return;
        }

        setFormError(null);
        setSaving(true);
        try {
            await saveTransaction({
                variables: {
                    accountId: form.accountId,
                    securityId: form.securityId,
                    tdate: toYmdOrEmpty(form.tdate),
                    ttype: form.ttype,
                    segment: form.segment,
                    invoiceDate: toYmdOrNull(form.invoiceDate),
                    qty: form.qty.toString(),
                    price: form.price.toString(),
                    fees: form.fees != null ? form.fees.toString() : '0',
                    notes: stripWealthMetaTags(form.notes.trim()) || null,
                    sourceDoc: form.sourceDoc.trim() || null
                }
            });
            setForm((current) => ({
                ...current,
                invoiceDate: null,
                qty: null,
                price: null,
                fees: 0,
                notes: '',
                sourceDoc: ''
            }));
            setOffset(0);
            await transactionsQuery.refetch({ limit, offset: 0 });
            showToast('success', 'Transaction saved');
        } catch (error: any) {
            showToast('error', 'Unable to save transaction', error.message);
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
                            <h2 className="m-0">Manual Transaction Entry</h2>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Post direct buy, sell, dividend, split, bonus, rights, or expense rows without waiting for a file import.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Import CSV" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/import?mode=transactions')} />
                            <Button label="Securities" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/securities')} />
                        </div>
                    </div>

                    {accountsQuery.error && <p className="text-red-500 mt-3 mb-0">Accounts error: {accountsQuery.error.message}</p>}
                    {securitiesQuery.error && <p className="text-red-500 mt-2 mb-0">Securities error: {securitiesQuery.error.message}</p>}
                    {transactionsQuery.error && <p className="text-red-500 mt-2 mb-0">Transactions error: {transactionsQuery.error.message}</p>}
                </div>
            </div>

            <div className="col-12 xl:col-6">
                <Card title="Manual Transaction" subTitle="Direct entry without CSV import">
                    <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Account</label>
                                <AppDropdown
                                    value={form.accountId}
                                    options={accountOptions}
                                    onChange={(e) => setForm((current) => ({ ...current, accountId: e.value || '' }))}
                                    placeholder={accountsQuery.loading ? 'Loading...' : 'Select account'}
                                    disabled={saving || !accountOptions.length}
                                />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Security</label>
                                <AppDropdown
                                    value={form.securityId}
                                    options={securityOptions}
                                    onChange={(e) => setForm((current) => ({ ...current, securityId: e.value || '' }))}
                                    placeholder={securitiesQuery.loading ? 'Loading...' : 'Select security'}
                                    filter
                                    disabled={saving || !securityOptions.length}
                                />
                            </div>
                        </div>
                        {(!accountOptions.length || !securityOptions.length) && (
                            <small className="text-600">
                                Demat accounts should be created in the wealth setup screens, and missing securities should be added from the Securities page.
                            </small>
                        )}
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Date</label>
                                <AppDateInput value={form.tdate} onChange={(value) => setForm((current) => ({ ...current, tdate: value }))} disabled={saving} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Type</label>
                                <AppDropdown
                                    value={form.ttype}
                                    options={[...WEALTH_TX_TYPES]}
                                    onChange={(e) => setForm((current) => ({ ...current, ttype: e.value || '' }))}
                                    placeholder="Select type"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Segment</label>
                            <AppDropdown
                                value={form.segment}
                                options={[...WEALTH_TX_SEGMENTS]}
                                onChange={(e) => setForm((current) => ({ ...current, segment: e.value || 'CASH' }))}
                                placeholder="Select segment"
                                disabled={saving}
                            />
                            <small className="text-600">Stored in `transactions.segment`; older notes-based `[SEG:...]` tags are still supported during reads.</small>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Qty</label>
                                <InputNumber
                                    value={form.qty ?? undefined}
                                    onValueChange={(e) => setForm((current) => ({ ...current, qty: e.value ?? null }))}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    inputClassName="w-full"
                                    className="w-full"
                                    disabled={saving}
                                />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Price</label>
                                <InputNumber
                                    value={form.price ?? undefined}
                                    onValueChange={(e) => setForm((current) => ({ ...current, price: e.value ?? null }))}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    inputClassName="w-full"
                                    className="w-full"
                                    disabled={saving}
                                />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">{getWealthTxFeesLabel(form.ttype)}</label>
                                <InputNumber
                                    value={form.fees ?? undefined}
                                    onValueChange={(e) => setForm((current) => ({ ...current, fees: e.value ?? null }))}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    inputClassName="w-full"
                                    className="w-full"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Notes</label>
                            <AppInput value={form.notes} onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))} placeholder="Broker reference, batch, or remarks" />
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">GST Invoice / Contract Note No</label>
                                <AppInput
                                    value={form.sourceDoc}
                                    onChange={(e) => setForm((current) => ({ ...current, sourceDoc: e.target.value }))}
                                    placeholder="e.g. INV-123 / CN-2024-001"
                                />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Invoice Date</label>
                                <AppDateInput value={form.invoiceDate} onChange={(value) => setForm((current) => ({ ...current, invoiceDate: value }))} disabled={saving} />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Summary</label>
                                <div className="surface-ground border-round-lg p-3 text-sm text-700">
                                    <div className="flex justify-content-between">
                                        <span>Gross Amount</span>
                                        <span>{formatWealthAmount(txGrossAmount)}</span>
                                    </div>
                                    <div className="flex justify-content-between mt-2">
                                        <span>{getWealthTxFeesLabel(form.ttype)}</span>
                                        <span>{formatWealthAmount(txFeesAmount)}</span>
                                    </div>
                                    <div className="flex justify-content-between mt-2 font-medium">
                                        <span>{getWealthTxNetLabel(form.ttype)}</span>
                                        <span>{formatWealthAmount(txNetAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {formError && <small className="p-error">{formError}</small>}
                        <div className="flex gap-2">
                            <Button type="submit" label={saving ? 'Saving...' : 'Save transaction'} icon="pi pi-check" disabled={saving || !accountOptions.length || !securityOptions.length} />
                            <Button type="button" label="Refresh list" className="p-button-text app-action-compact" onClick={() => transactionsQuery.refetch({ limit, offset })} />
                        </div>
                    </form>
                </Card>
            </div>

            <div className="col-12 xl:col-6">
                <Card
                    title="Recent Transactions"
                    subTitle="Latest manual or imported rows"
                    footer={
                        txPage?.meta ? (
                            <div className="flex align-items-center justify-content-between gap-3 flex-wrap">
                                <span className="text-600 text-sm">Offset {txPage.meta.offset} / {txPage.meta.total}</span>
                                <div className="flex gap-2">
                                    <Button
                                        size="small"
                                        label="Prev"
                                        outlined
                                        disabled={txPage.meta.offset <= 0 || transactionsQuery.loading}
                                        onClick={() => {
                                            const nextOffset = Math.max(0, (txPage.meta.offset || 0) - (txPage.meta.limit || limit));
                                            setOffset(nextOffset);
                                            transactionsQuery.refetch({ limit, offset: nextOffset });
                                        }}
                                    />
                                    <Button
                                        size="small"
                                        label="Next"
                                        outlined
                                        disabled={!txPage.meta.hasMore || transactionsQuery.loading}
                                        onClick={() => {
                                            const nextOffset = txPage.meta.nextOffset ?? txPage.meta.offset;
                                            setOffset(nextOffset);
                                            transactionsQuery.refetch({ limit, offset: nextOffset });
                                        }}
                                    />
                                    <Button size="small" label="Import" onClick={() => navigate('/apps/wealth/import?mode=transactions')} />
                                </div>
                            </div>
                        ) : null
                    }
                >
                    {transactionsQuery.loading && !txRows.length ? (
                        <p className="m-0 text-600">Loading...</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="w-full small-table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Date</th>
                                        <th className="text-left">Type</th>
                                        <th className="text-left">Security</th>
                                        <th className="text-left">Account</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-right">Fees</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txRows.map((row) => {
                                        const security = row.securityId ? securityById[row.securityId] : null;
                                        const segment = row.segment || extractWealthSegment(row.notes) || 'CASH';
                                        return (
                                            <tr key={row.id}>
                                                <td>{row.tdate}</td>
                                                <td>
                                                    <div className="flex flex-wrap gap-2 align-items-center">
                                                        <Tag value={row.ttype} severity={getSeverity(row.ttype)} />
                                                        <small className="text-600">{segment}</small>
                                                    </div>
                                                </td>
                                                <td>{row.symbol || security?.symbol || row.name || security?.name || row.securityId || '-'}</td>
                                                <td>{row.accountId ? accountById[row.accountId] || row.accountId : '-'}</td>
                                                <td className="text-right">{formatQuantity(row.qty)}</td>
                                                <td className="text-right">{formatWealthAmount(row.price)}</td>
                                                <td className="text-right">{formatWealthAmount(row.fees || '0')}</td>
                                            </tr>
                                        );
                                    })}
                                    {!txRows.length && (
                                        <tr>
                                            <td colSpan={7} className="text-center text-600">
                                                No transactions yet
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