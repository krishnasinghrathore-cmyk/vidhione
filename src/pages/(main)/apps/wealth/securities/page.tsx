'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_SECURITIES_QUERY,
    WEALTH_UPSERT_SECURITY_MUTATION,
    type WealthSecurity
} from '../maintenanceShared';

type SecurityForm = {
    isin: string;
    symbol: string;
    name: string;
};

const EMPTY_FORM: SecurityForm = {
    isin: '',
    symbol: '',
    name: ''
};

export default function WealthSecuritiesPage() {
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<SecurityForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const securitiesQuery = useQuery(WEALTH_SECURITIES_QUERY, {
        client: wealthApolloClient,
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });
    const [saveSecurity] = useMutation(WEALTH_UPSERT_SECURITY_MUTATION, { client: wealthApolloClient });

    const securities: WealthSecurity[] = securitiesQuery.data?.securities ?? [];
    const sortedSecurities = useMemo(() => {
        const items = [...securities];
        items.sort((left, right) => (left.symbol || left.name).localeCompare(right.symbol || right.name));
        return items;
    }, [securities]);

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            setFormError('Security name is required');
            showToast('warn', 'Security name is required');
            return;
        }

        setFormError(null);
        setSaving(true);
        try {
            await saveSecurity({
                variables: {
                    isin: form.isin.trim() || null,
                    symbol: form.symbol.trim() || null,
                    name: form.name.trim()
                }
            });
            await securitiesQuery.refetch();
            setForm(EMPTY_FORM);
            showToast('success', 'Security saved');
        } catch (error: any) {
            showToast('error', 'Unable to save security', error.message);
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
                            <h2 className="m-0">Securities Master</h2>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Create and maintain the ISIN, symbol, and security name records that prices, corporate actions, imports, and transactions rely on.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Prices & FMV" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/prices')} />
                            <Button label="Corporate Actions" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/corporate-actions')} />
                            <Button label="Manual Entry" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/manual-transactions')} />
                        </div>
                    </div>

                    {securitiesQuery.error && <p className="text-red-500 mt-3 mb-0">Securities error: {securitiesQuery.error.message}</p>}
                </div>
            </div>

            <div className="col-12 lg:col-4">
                <Card title="New Security" subTitle="ISIN / symbol master">
                    <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">ISIN</label>
                                <AppInput
                                    value={form.isin}
                                    onChange={(e) => setForm((current) => ({ ...current, isin: e.target.value.toUpperCase() }))}
                                    placeholder="INE002A01018"
                                />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Symbol</label>
                                <AppInput
                                    value={form.symbol}
                                    onChange={(e) => setForm((current) => ({ ...current, symbol: e.target.value.toUpperCase() }))}
                                    placeholder="RELIANCE"
                                />
                            </div>
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Name</label>
                            <AppInput
                                value={form.name}
                                onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                                placeholder="Security name"
                            />
                        </div>
                        {formError && <small className="p-error">{formError}</small>}
                        <div className="flex gap-2">
                            <Button type="submit" label={saving ? 'Saving...' : 'Save security'} icon="pi pi-check" disabled={saving} />
                            <Button
                                type="button"
                                label="Clear"
                                className="p-button-text app-action-compact"
                                onClick={() => {
                                    setForm(EMPTY_FORM);
                                    setFormError(null);
                                }}
                                disabled={saving}
                            />
                        </div>
                    </form>
                </Card>
            </div>

            <div className="col-12 lg:col-8">
                <Card title="Security List" subTitle="Use these records across pricing, imports, and transactions">
                    <AppDataTable
                        value={sortedSecurities}
                        loading={securitiesQuery.loading}
                        dataKey="id"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 20, 50]}
                        recordSummary={`Securities: ${sortedSecurities.length}`}
                        emptyMessage="No securities yet"
                        headerLeft={<span className="font-medium">Available securities</span>}
                        headerRight={<Button label="Refresh" icon="pi pi-refresh" className="p-button-text app-action-compact" onClick={() => securitiesQuery.refetch()} />}
                        stripedRows
                        size="small"
                    >
                        <Column field="symbol" header="Symbol" body={(row: WealthSecurity) => row.symbol || '-'} />
                        <Column field="isin" header="ISIN" body={(row: WealthSecurity) => row.isin || '-'} />
                        <Column field="name" header="Name" body={(row: WealthSecurity) => row.name} />
                    </AppDataTable>
                </Card>
            </div>
        </div>
    );
}

