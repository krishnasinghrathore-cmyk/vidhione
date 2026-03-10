'use client';

import React, { useMemo, useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppDateInput from '@/components/AppDateInput';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { toYmdOrNull } from '@/lib/date';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_ACCOUNTS_QUERY,
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthDematAccount,
    type WealthInvestorProfile,
    formatAccountLabel,
    formatInvestorProfileLabel,
    fromYmdOrNull
} from '../shared';

type DematAccountForm = {
    id?: string;
    investorProfileId: string;
    name: string;
    code: string;
    brokerName: string;
    depository: string;
    dpId: string;
    clientId: string;
    dematNumber: string;
    holderName: string;
    pan: string;
    openedOn: Date | null;
    isPrimary: boolean;
    isActive: boolean;
    notes: string;
};

const UPSERT_ACCOUNT = gql`
    mutation UpsertAccount(
        $id: String
        $investorProfileId: String
        $name: String!
        $code: String
        $brokerName: String
        $depository: String
        $dpId: String
        $clientId: String
        $dematNumber: String
        $holderName: String
        $pan: String
        $openedOn: String
        $isPrimary: Boolean
        $isActive: Boolean
        $notes: String
    ) {
        upsertAccount(
            id: $id
            investorProfileId: $investorProfileId
            name: $name
            code: $code
            brokerName: $brokerName
            depository: $depository
            dpId: $dpId
            clientId: $clientId
            dematNumber: $dematNumber
            holderName: $holderName
            pan: $pan
            openedOn: $openedOn
            isPrimary: $isPrimary
            isActive: $isActive
            notes: $notes
        ) {
            id
        }
    }
`;

const DELETE_ACCOUNT = gql`
    mutation DeleteAccount($id: String!) {
        deleteAccount(id: $id)
    }
`;

const DEPOSITORY_OPTIONS = [
    { label: 'NSDL', value: 'NSDL' },
    { label: 'CDSL', value: 'CDSL' }
];

const EMPTY_FORM: DematAccountForm = {
    investorProfileId: '',
    name: '',
    code: '',
    brokerName: '',
    depository: '',
    dpId: '',
    clientId: '',
    dematNumber: '',
    holderName: '',
    pan: '',
    openedOn: null,
    isPrimary: false,
    isActive: true,
    notes: ''
};

export default function WealthDematAccountsPage() {
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<DematAccountForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const accountsQuery = useQuery(WEALTH_ACCOUNTS_QUERY, { client: wealthApolloClient });
    const profilesQuery = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, { client: wealthApolloClient });
    const [saveAccount] = useMutation(UPSERT_ACCOUNT, { client: wealthApolloClient });
    const [deleteAccount] = useMutation(DELETE_ACCOUNT, { client: wealthApolloClient });

    const accounts: WealthDematAccount[] = accountsQuery.data?.accounts ?? [];
    const profiles: WealthInvestorProfile[] = profilesQuery.data?.investorProfiles ?? [];

    const investorOptions = useMemo(
        () => profiles.map((profile) => ({ label: formatInvestorProfileLabel(profile), value: profile.id })),
        [profiles]
    );

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const resetForm = () => setForm(EMPTY_FORM);

    const handleEdit = (account: WealthDematAccount) => {
        setForm({
            id: account.id,
            investorProfileId: account.investorProfileId ?? '',
            name: account.name,
            code: account.code ?? '',
            brokerName: account.brokerName ?? '',
            depository: account.depository ?? '',
            dpId: account.dpId ?? '',
            clientId: account.clientId ?? '',
            dematNumber: account.dematNumber ?? '',
            holderName: account.holderName ?? '',
            pan: account.pan ?? '',
            openedOn: fromYmdOrNull(account.openedOn),
            isPrimary: account.isPrimary,
            isActive: account.isActive,
            notes: account.notes ?? ''
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            showToast('warn', 'Account name is required');
            return;
        }

        setSaving(true);
        try {
            await saveAccount({
                variables: {
                    id: form.id ?? null,
                    investorProfileId: form.investorProfileId || null,
                    name: form.name.trim(),
                    code: form.code.trim() || null,
                    brokerName: form.brokerName.trim() || null,
                    depository: form.depository || null,
                    dpId: form.dpId.trim() || null,
                    clientId: form.clientId.trim() || null,
                    dematNumber: form.dematNumber.trim() || null,
                    holderName: form.holderName.trim() || null,
                    pan: form.pan.trim() || null,
                    openedOn: toYmdOrNull(form.openedOn),
                    isPrimary: form.isPrimary,
                    isActive: form.isActive,
                    notes: form.notes.trim() || null
                }
            });
            await Promise.all([accountsQuery.refetch(), profilesQuery.refetch()]);
            showToast('success', form.id ? 'Demat account updated' : 'Demat account created');
            resetForm();
        } catch (mutationError: any) {
            showToast('error', 'Unable to save demat account', mutationError.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (account: WealthDematAccount) => {
        if (!window.confirm(`Delete demat account '${account.name}'?`)) return;

        setDeletingId(account.id);
        try {
            await deleteAccount({ variables: { id: account.id } });
            await accountsQuery.refetch();
            showToast('success', 'Demat account deleted');
            if (form.id === account.id) resetForm();
        } catch (mutationError: any) {
            showToast('error', 'Unable to delete demat account', mutationError.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="grid">
            <Toast ref={toastRef} />
            <div className="col-12">
                <div className="mb-3">
                    <h2 className="m-0">Demat Accounts</h2>
                    <p className="mt-2 mb-0 text-600">
                        Capture every demat or broker account under the household. Reports can then stay account-safe while still rolling up at investor level.
                    </p>
                </div>
            </div>

            <div className="col-12 lg:col-5">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h3 className="m-0 text-xl">{form.id ? 'Edit Demat Account' : 'New Demat Account'}</h3>
                        {form.id && <Button label="Reset" className="p-button-text app-action-compact" onClick={resetForm} />}
                    </div>

                    <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Investor Profile</label>
                            <AppDropdown
                                value={form.investorProfileId}
                                options={investorOptions}
                                onChange={(e) => setForm((prev) => ({ ...prev, investorProfileId: e.value || '' }))}
                                placeholder="Optional"
                                showClear
                            />
                            {!profiles.length && (
                                <small className="text-600">No investor profiles yet. You can still save an unassigned account.</small>
                            )}
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-7 flex flex-column gap-1">
                                <label className="font-medium">Account Name</label>
                                <AppInput value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-5 flex flex-column gap-1">
                                <label className="font-medium">Code</label>
                                <AppInput value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Broker</label>
                                <AppInput value={form.brokerName} onChange={(e) => setForm((prev) => ({ ...prev, brokerName: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Depository</label>
                                <AppDropdown
                                    value={form.depository}
                                    options={DEPOSITORY_OPTIONS}
                                    onChange={(e) => setForm((prev) => ({ ...prev, depository: e.value || '' }))}
                                    placeholder="Select depository"
                                    showClear
                                />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">DP ID</label>
                                <AppInput value={form.dpId} onChange={(e) => setForm((prev) => ({ ...prev, dpId: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Client / BO ID</label>
                                <AppInput value={form.clientId} onChange={(e) => setForm((prev) => ({ ...prev, clientId: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">Demat Number</label>
                                <AppInput value={form.dematNumber} onChange={(e) => setForm((prev) => ({ ...prev, dematNumber: e.target.value }))} />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-5 flex flex-column gap-1">
                                <label className="font-medium">Holder Name</label>
                                <AppInput value={form.holderName} onChange={(e) => setForm((prev) => ({ ...prev, holderName: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-4 flex flex-column gap-1">
                                <label className="font-medium">PAN</label>
                                <AppInput value={form.pan} onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))} />
                            </div>
                            <div className="col-12 md:col-3 flex flex-column gap-1">
                                <label className="font-medium">Opened On</label>
                                <AppDateInput value={form.openedOn} onChange={(value) => setForm((prev) => ({ ...prev, openedOn: value }))} />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="demat-primary"
                                    checked={form.isPrimary}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isPrimary: Boolean(e.checked) }))}
                                />
                                <label htmlFor="demat-primary">Primary account</label>
                            </div>
                            <div className="flex align-items-center gap-2">
                                <Checkbox
                                    inputId="demat-active"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: Boolean(e.checked) }))}
                                />
                                <label htmlFor="demat-active">Active account</label>
                            </div>
                        </div>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Notes</label>
                            <InputTextarea
                                autoResize
                                rows={4}
                                value={form.notes}
                                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" label={saving ? 'Saving...' : form.id ? 'Update Account' : 'Create Account'} disabled={saving} />
                            <Button type="button" label="Clear" className="p-button-text" onClick={resetForm} disabled={saving} />
                        </div>
                    </form>
                </div>
            </div>

            <div className="col-12 lg:col-7">
                <div className="card h-full">
                    {(accountsQuery.error || profilesQuery.error) && (
                        <p className="text-red-500 mt-0">
                            Error loading demat accounts: {accountsQuery.error?.message || profilesQuery.error?.message}
                        </p>
                    )}
                    <AppDataTable
                        value={accounts}
                        loading={accountsQuery.loading || profilesQuery.loading}
                        dataKey="id"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 20, 50]}
                        recordSummary={`Accounts: ${accounts.length}`}
                        emptyMessage="No demat accounts yet"
                        headerLeft={<span className="font-medium">Household Demat Accounts</span>}
                        headerRight={<Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => accountsQuery.refetch()} />}
                        stripedRows
                        size="small"
                    >
                        <Column field="name" header="Account" body={(row: WealthDematAccount) => formatAccountLabel(row)} />
                        <Column
                            field="investorProfileName"
                            header="Investor"
                            body={(row: WealthDematAccount) => row.investorProfileName || '-'}
                        />
                        <Column
                            field="brokerName"
                            header="Broker / Depository"
                            body={(row: WealthDematAccount) => {
                                const parts = [row.brokerName, row.depository].filter(Boolean);
                                return parts.length ? parts.join(' / ') : '-';
                            }}
                        />
                        <Column
                            field="dematNumber"
                            header="Identifiers"
                            body={(row: WealthDematAccount) => row.dematNumber || row.clientId || row.dpId || '-'}
                        />
                        <Column
                            header="Status"
                            body={(row: WealthDematAccount) => {
                                if (!row.isActive) return 'Inactive';
                                return row.isPrimary ? 'Primary' : 'Active';
                            }}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Actions"
                            body={(row: WealthDematAccount) => (
                                <div className="flex gap-2">
                                    <Button
                                        label="Edit"
                                        className="p-button-text app-action-compact"
                                        onClick={() => handleEdit(row)}
                                    />
                                    <Button
                                        label={deletingId === row.id ? 'Deleting...' : 'Delete'}
                                        className="p-button-text p-button-danger app-action-compact"
                                        onClick={() => handleDelete(row)}
                                        disabled={deletingId === row.id}
                                    />
                                </div>
                            )}
                            style={{ width: '12rem' }}
                        />
                    </AppDataTable>
                </div>
            </div>
        </div>
    );
}