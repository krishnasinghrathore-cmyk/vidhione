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
import AppInput from '@/components/AppInput';
import { toYmdOrEmpty } from '@/lib/date';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_ACTION_OPTIONS,
    WEALTH_CORPORATE_ACTIONS_QUERY,
    WEALTH_SECURITIES_QUERY,
    WEALTH_UPSERT_CORPORATE_ACTION_MUTATION,
    getWealthActionPriceLabel,
    getWealthActionRatioLabel,
    type WealthCorporateActionRow,
    type WealthSecurity
} from '../maintenanceShared';

type CorporateActionForm = {
    securityId: string;
    actionType: string;
    actionDate: Date | null;
    ratio: number | null;
    price: number | null;
    notes: string;
};

const INITIAL_FORM: CorporateActionForm = {
    securityId: '',
    actionType: '',
    actionDate: new Date(),
    ratio: null,
    price: null,
    notes: ''
};

export default function WealthCorporateActionsPage() {
    const navigate = useNavigate();
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<CorporateActionForm>(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const securitiesQuery = useQuery(WEALTH_SECURITIES_QUERY, { client: wealthApolloClient });
    const actionsQuery = useQuery(WEALTH_CORPORATE_ACTIONS_QUERY, {
        client: wealthApolloClient,
        variables: { limit: 20 },
        fetchPolicy: 'cache-and-network',
        nextFetchPolicy: 'cache-first'
    });
    const [saveAction] = useMutation(WEALTH_UPSERT_CORPORATE_ACTION_MUTATION, { client: wealthApolloClient });

    const securities: WealthSecurity[] = securitiesQuery.data?.securities ?? [];
    const actions: WealthCorporateActionRow[] = actionsQuery.data?.corporateActionsList ?? [];

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
    }, [form.securityId, securityOptions]);

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.securityId || !form.actionType || !form.actionDate) {
            setFormError('Security, action type, and action date are required');
            showToast('warn', 'Security, action type, and action date are required');
            return;
        }
        if (['SPLIT', 'BONUS', 'RIGHTS', 'CAPITAL_REDUCTION'].includes(form.actionType) && (!form.ratio || form.ratio === 0)) {
            setFormError('Ratio is required for split, bonus, rights, and capital reduction actions');
            showToast('warn', 'Ratio is required for this action type');
            return;
        }

        setFormError(null);
        setSaving(true);
        try {
            await saveAction({
                variables: {
                    securityId: form.securityId,
                    actionDate: toYmdOrEmpty(form.actionDate),
                    actionType: form.actionType,
                    ratio: form.ratio != null ? form.ratio.toString() : null,
                    price: form.price != null ? form.price.toString() : null,
                    notes: form.notes.trim() || null
                }
            });
            await actionsQuery.refetch();
            setForm((current) => ({
                ...current,
                actionType: '',
                ratio: null,
                price: null,
                notes: ''
            }));
            showToast('success', 'Corporate action saved');
        } catch (error: any) {
            showToast('error', 'Unable to save corporate action', error.message);
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
                            <h2 className="m-0">Corporate Actions</h2>
                            <p className="mt-2 mb-0 text-600 line-height-3">
                                Post splits, bonus shares, rights, dividends, and capital reduction events from one dedicated maintenance screen.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button label="Prices & FMV" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/prices')} />
                            <Button label="Securities" className="p-button-text app-action-compact" onClick={() => navigate('/apps/wealth/securities')} />
                        </div>
                    </div>

                    {securitiesQuery.error && <p className="text-red-500 mt-3 mb-0">Securities error: {securitiesQuery.error.message}</p>}
                    {actionsQuery.error && <p className="text-red-500 mt-2 mb-0">Corporate actions error: {actionsQuery.error.message}</p>}
                </div>
            </div>

            <div className="col-12 xl:col-5">
                <Card title="New Corporate Action" subTitle="Split / bonus / dividend / rights">
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
                            {!securityOptions.length && <small className="text-600">Create the security first from the Securities page.</small>}
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Action type</label>
                                <AppDropdown
                                    value={form.actionType}
                                    options={[...WEALTH_ACTION_OPTIONS]}
                                    onChange={(e) => setForm((current) => ({ ...current, actionType: e.value || '' }))}
                                    placeholder="Choose type"
                                    disabled={saving}
                                />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Action date</label>
                                <AppDateInput value={form.actionDate} onChange={(value) => setForm((current) => ({ ...current, actionDate: value }))} disabled={saving} />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">{getWealthActionRatioLabel(form.actionType)}</label>
                                <InputNumber
                                    value={form.ratio ?? undefined}
                                    onValueChange={(e) => setForm((current) => ({ ...current, ratio: e.value ?? null }))}
                                    mode="decimal"
                                    minFractionDigits={2}
                                    inputClassName="w-full"
                                    className="w-full"
                                    disabled={saving}
                                />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">{getWealthActionPriceLabel(form.actionType)}</label>
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
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Notes</label>
                            <AppInput
                                value={form.notes}
                                onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
                                placeholder="Reference, broker note, or source"
                            />
                        </div>
                        {formError && <small className="p-error">{formError}</small>}
                        <div className="flex gap-2">
                            <Button type="submit" label={saving ? 'Saving...' : 'Save action'} icon="pi pi-check" disabled={saving || !securityOptions.length} />
                            <Button type="button" label="Refresh" className="p-button-text app-action-compact" onClick={() => actionsQuery.refetch()} />
                        </div>
                    </form>
                </Card>
            </div>

            <div className="col-12 xl:col-7">
                <Card title="Recent Corporate Actions" subTitle="Latest split, bonus, rights, and dividend records">
                    {actionsQuery.loading && !actions.length ? (
                        <p className="m-0 text-600">Loading...</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="w-full small-table">
                                <thead>
                                    <tr>
                                        <th className="text-left">Security</th>
                                        <th className="text-left">Type</th>
                                        <th className="text-left">Date</th>
                                        <th className="text-right">Ratio</th>
                                        <th className="text-right">Price</th>
                                        <th className="text-left">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {actions.map((action) => {
                                        const security = securityById[action.securityId];
                                        return (
                                            <tr key={action.id}>
                                                <td>{security?.symbol || security?.name || action.securityId}</td>
                                                <td>{action.actionType}</td>
                                                <td>{action.actionDate}</td>
                                                <td className="text-right">{action.ratio ?? '-'}</td>
                                                <td className="text-right">{action.price ?? '-'}</td>
                                                <td>{action.notes || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    {!actions.length && (
                                        <tr>
                                            <td colSpan={6} className="text-center text-600">
                                                No corporate actions yet
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