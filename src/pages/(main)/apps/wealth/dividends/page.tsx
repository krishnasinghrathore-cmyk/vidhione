'use client';
import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import { z } from 'zod';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import { toYmdOrEmpty } from '@/lib/date';

type Account = { id: string; name: string; code?: string | null };
type Security = { id: string; isin?: string | null; symbol?: string | null; name: string };

const ACCOUNTS_QUERY = gql`
    query Accounts {
        accounts {
            id
            name
            code
        }
    }
`;

const SECURITIES_QUERY = gql`
    query Securities {
        securities {
            id
            isin
            symbol
            name
        }
    }
`;

const DIVIDENDS_PAGE = gql`
    query DividendsPage($limit: Int, $offset: Int, $ttype: String) {
        transactionsPage(limit: $limit, offset: $offset, ttype: $ttype) {
            items {
                id
                tdate
                qty
                price
                fees
                accountId
                securityId
                isin
                symbol
                name
                sourceDoc
            }
            meta {
                total
                limit
                offset
                hasMore
                nextOffset
            }
        }
    }
`;

const UPSERT_TRANSACTION = gql`
    mutation UpsertTransaction(
        $accountId: String!
        $securityId: String!
        $tdate: String!
        $ttype: String!
        $qty: String!
        $price: String!
        $fees: String
        $notes: String
        $sourceDoc: String
    ) {
        upsertTransaction(
            accountId: $accountId
            securityId: $securityId
            tdate: $tdate
            ttype: $ttype
            qty: $qty
            price: $price
            fees: $fees
            notes: $notes
            sourceDoc: $sourceDoc
        ) {
            id
        }
    }
`;

const dividendSchema = z.object({
    accountId: z.string().min(1, 'Account is required'),
    securityId: z.string().min(1, 'Security is required'),
    tdate: z.date(),
    qty: z.number().positive('Shares must be > 0'),
    price: z.number().nonnegative('Rate must be >= 0'),
    fees: z.number().nonnegative('TDS must be >= 0').optional(),
    sourceDoc: z.string().optional(),
    notes: z.string().optional()
});

const isoDate = (value: Date | null) => toYmdOrEmpty(value);
const formatAmount = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) return '-';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

export default function WealthDividendsPage() {
    const toastRef = useRef<Toast>(null);
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);

    const [form, setForm] = useState<{
        accountId: string;
        securityId: string;
        tdate: Date | null;
        qty: number | null;
        price: number | null;
        fees: number | null;
        sourceDoc: string;
        notes: string;
    }>({
        accountId: '',
        securityId: '',
        tdate: new Date(),
        qty: null,
        price: null,
        fees: 0,
        sourceDoc: '',
        notes: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    const { data: accountsData } = useQuery(ACCOUNTS_QUERY, { client: wealthApolloClient });
    const { data: securitiesData } = useQuery(SECURITIES_QUERY, { client: wealthApolloClient });

    const accountOptions = useMemo(
        () => (accountsData?.accounts ?? []).map((a: Account) => ({ label: a.code ? `${a.name} (${a.code})` : a.name, value: a.id })),
        [accountsData]
    );
    const securityOptions = useMemo(
        () => (securitiesData?.securities ?? []).map((s: Security) => ({ label: s.symbol || s.name, value: s.id })),
        [securitiesData]
    );

    const { data, loading, error, refetch } = useQuery(DIVIDENDS_PAGE, {
        client: wealthApolloClient,
        variables: { limit, offset, ttype: 'DIVIDEND' }
    });

    const page = data?.transactionsPage;
    const rows = page?.items ?? [];

    const [saveDividend, { loading: saving }] = useMutation(UPSERT_TRANSACTION, { client: wealthApolloClient });

    const grossAmount = form.qty != null && form.price != null ? form.qty * form.price : null;
    const tdsAmount = form.fees ?? 0;
    const netAmount = grossAmount == null ? null : grossAmount - tdsAmount;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const parsed = dividendSchema.safeParse({
            accountId: form.accountId,
            securityId: form.securityId,
            tdate: form.tdate,
            qty: form.qty ?? NaN,
            price: form.price ?? NaN,
            fees: form.fees ?? 0,
            sourceDoc: form.sourceDoc,
            notes: form.notes
        });

        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? 'Fix validation errors');
            toastRef.current?.show({ severity: 'warn', summary: 'Fix validation errors' });
            return;
        }

        setFormError(null);

        try {
            await saveDividend({
                variables: {
                    accountId: parsed.data.accountId,
                    securityId: parsed.data.securityId,
                    tdate: isoDate(parsed.data.tdate),
                    ttype: 'DIVIDEND',
                    qty: parsed.data.qty.toString(),
                    price: parsed.data.price.toString(),
                    fees: (parsed.data.fees ?? 0).toString(),
                    notes: parsed.data.notes?.trim() || null,
                    sourceDoc: parsed.data.sourceDoc?.trim() || null
                }
            });

            setForm((prev) => ({ ...prev, qty: null, price: null, fees: 0, sourceDoc: '', notes: '' }));
            setOffset(0);
            await refetch({ limit, offset: 0, ttype: 'DIVIDEND' });
            toastRef.current?.show({ severity: 'success', summary: 'Dividend saved' });
        } catch (err: any) {
            toastRef.current?.show({ severity: 'error', summary: 'Error', detail: err.message });
        }
    };

    const canPrev = page?.meta ? page.meta.offset > 0 : false;
    const canNext = page?.meta ? page.meta.hasMore : false;

    return (
        <div className="card">
            <Toast ref={toastRef} />

            <div className="mb-3">
                <h2 className="m-0">Dividend Register</h2>
                <p className="mt-2 mb-0 text-600">Track dividends received, TDS, and net amounts (mapped to DIVIDEND transactions).</p>
            </div>

            <form className="grid mb-4" onSubmit={handleSave}>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Account</label>
                    <AppDropdown
                        value={form.accountId}
                        options={accountOptions}
                        onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.value }))}
                        placeholder="Select account"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Security</label>
                    <AppDropdown
                        value={form.securityId}
                        options={securityOptions}
                        onChange={(e) => setForm((prev) => ({ ...prev, securityId: e.value }))}
                        placeholder="Select security"
                        filter
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-4 flex flex-column gap-1">
                    <label className="font-medium">Date</label>
                    <AppDateInput value={form.tdate} onChange={(value) => setForm((prev) => ({ ...prev, tdate: value }))} disabled={saving} />
                </div>

                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">No. of Shares</label>
                    <InputNumber
                        value={form.qty ?? undefined}
                        onValueChange={(e) => setForm((prev) => ({ ...prev, qty: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={6}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">Rate / Share</label>
                    <InputNumber
                        value={form.price ?? undefined}
                        onValueChange={(e) => setForm((prev) => ({ ...prev, price: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={2}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">TDS</label>
                    <InputNumber
                        value={form.fees ?? undefined}
                        onValueChange={(e) => setForm((prev) => ({ ...prev, fees: e.value ?? null }))}
                        mode="decimal"
                        minFractionDigits={2}
                        inputClassName="w-full"
                        className="w-full"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-3 flex flex-column gap-1">
                    <label className="font-medium">Net Amount</label>
                    <InputText value={formatAmount(netAmount)} disabled />
                </div>

                <div className="col-12 md:col-6 flex flex-column gap-1">
                    <label className="font-medium">Source Doc (optional)</label>
                    <InputText
                        value={form.sourceDoc}
                        onChange={(e) => setForm((prev) => ({ ...prev, sourceDoc: e.target.value }))}
                        placeholder="Bank/contract reference"
                        disabled={saving}
                    />
                </div>
                <div className="col-12 md:col-6 flex flex-column gap-1">
                    <label className="font-medium">Notes (optional)</label>
                    <InputText
                        value={form.notes}
                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Optional remarks"
                        disabled={saving}
                    />
                </div>

                <div className="col-12 flex align-items-center gap-2 flex-wrap">
                    <Button type="submit" label={saving ? 'Saving…' : 'Save Dividend'} icon="pi pi-check" disabled={saving} />
                    <span className="text-600 text-sm">
                        Gross: {formatAmount(grossAmount)} | TDS: {formatAmount(tdsAmount)} | Net: {formatAmount(netAmount)}
                    </span>
                </div>
                {formError && (
                    <div className="col-12">
                        <small className="p-error">{formError}</small>
                    </div>
                )}
            </form>

            <div className="flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                <h3 className="m-0">Entries</h3>
                <div className="flex gap-2">
                    <Button size="small" label="Refresh" onClick={() => refetch()} outlined />
                    <Button size="small" label="Prev" outlined disabled={!canPrev || loading} onClick={() => setOffset(Math.max(0, offset - limit))} />
                    <Button size="small" label="Next" outlined disabled={!canNext || loading} onClick={() => setOffset(page?.meta?.nextOffset ?? offset)} />
                </div>
            </div>

            {error && <p className="text-red-500 mb-2">Error loading dividends: {error.message}</p>}

            <div className="overflow-auto">
                <table className="w-full small-table">
                    <thead>
                        <tr>
                            <th className="text-left">Date</th>
                            <th className="text-left">Company</th>
                            <th className="text-left">ISIN</th>
                            <th className="text-right">Shares</th>
                            <th className="text-right">Rate</th>
                            <th className="text-right">Gross</th>
                            <th className="text-right">TDS</th>
                            <th className="text-right">Net</th>
                            <th className="text-left">Source</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: any) => {
                            const qty = Number(r.qty ?? 0);
                            const rate = Number(r.price ?? 0);
                            const tds = Number(r.fees ?? 0);
                            const gross = qty * rate;
                            const net = gross - tds;
                            return (
                                <tr key={r.id}>
                                    <td>{r.tdate}</td>
                                    <td>{r.symbol || r.name || r.securityId}</td>
                                    <td>{r.isin || '-'}</td>
                                    <td className="text-right">{r.qty}</td>
                                    <td className="text-right">{r.price}</td>
                                    <td className="text-right">{formatAmount(gross)}</td>
                                    <td className="text-right">{formatAmount(tds)}</td>
                                    <td className="text-right">{formatAmount(net)}</td>
                                    <td>{r.sourceDoc || '-'}</td>
                                </tr>
                            );
                        })}
                        {!rows.length && (
                            <tr>
                                <td colSpan={9} className="text-center text-600">
                                    {loading ? 'Loading…' : 'No dividend entries yet'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
