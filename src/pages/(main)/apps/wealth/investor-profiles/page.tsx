'use client';

import React, { useRef, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { Column } from 'primereact/column';
import { InputTextarea } from 'primereact/inputtextarea';
import { Toast } from 'primereact/toast';
import AppDataTable from '@/components/AppDataTable';
import AppInput from '@/components/AppInput';
import { wealthApolloClient } from '@/lib/wealthApolloClient';
import {
    WEALTH_INVESTOR_PROFILES_QUERY,
    type WealthInvestorProfile,
    formatInvestorProfileLabel
} from '../shared';

type InvestorProfileForm = {
    id?: string;
    name: string;
    pan: string;
    relationship: string;
    email: string;
    phone: string;
    isActive: boolean;
    notes: string;
};

const UPSERT_INVESTOR_PROFILE = gql`
    mutation UpsertInvestorProfile(
        $id: String
        $name: String!
        $pan: String
        $relationship: String
        $email: String
        $phone: String
        $isActive: Boolean
        $notes: String
    ) {
        upsertInvestorProfile(
            id: $id
            name: $name
            pan: $pan
            relationship: $relationship
            email: $email
            phone: $phone
            isActive: $isActive
            notes: $notes
        ) {
            id
        }
    }
`;

const DELETE_INVESTOR_PROFILE = gql`
    mutation DeleteInvestorProfile($id: String!) {
        deleteInvestorProfile(id: $id)
    }
`;

const EMPTY_FORM: InvestorProfileForm = {
    name: '',
    pan: '',
    relationship: '',
    email: '',
    phone: '',
    isActive: true,
    notes: ''
};

export default function WealthInvestorProfilesPage() {
    const toastRef = useRef<Toast>(null);
    const [form, setForm] = useState<InvestorProfileForm>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { data, loading, error, refetch } = useQuery(WEALTH_INVESTOR_PROFILES_QUERY, {
        client: wealthApolloClient
    });
    const [saveProfile] = useMutation(UPSERT_INVESTOR_PROFILE, { client: wealthApolloClient });
    const [deleteProfile] = useMutation(DELETE_INVESTOR_PROFILE, { client: wealthApolloClient });

    const profiles: WealthInvestorProfile[] = data?.investorProfiles ?? [];

    const showToast = (severity: 'success' | 'error' | 'warn', summary: string, detail?: string) => {
        toastRef.current?.show({ severity, summary, detail, life: 3000 });
    };

    const resetForm = () => setForm(EMPTY_FORM);

    const handleEdit = (profile: WealthInvestorProfile) => {
        setForm({
            id: profile.id,
            name: profile.name,
            pan: profile.pan ?? '',
            relationship: profile.relationship ?? '',
            email: profile.email ?? '',
            phone: profile.phone ?? '',
            isActive: profile.isActive,
            notes: profile.notes ?? ''
        });
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.name.trim()) {
            showToast('warn', 'Profile name is required');
            return;
        }

        setSaving(true);
        try {
            await saveProfile({
                variables: {
                    id: form.id ?? null,
                    name: form.name.trim(),
                    pan: form.pan.trim() || null,
                    relationship: form.relationship.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                    isActive: form.isActive,
                    notes: form.notes.trim() || null
                }
            });
            await refetch();
            showToast('success', form.id ? 'Investor profile updated' : 'Investor profile created');
            resetForm();
        } catch (mutationError: any) {
            showToast('error', 'Unable to save investor profile', mutationError.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (profile: WealthInvestorProfile) => {
        if (!window.confirm(`Delete investor profile '${profile.name}'?`)) return;

        setDeletingId(profile.id);
        try {
            await deleteProfile({ variables: { id: profile.id } });
            await refetch();
            showToast('success', 'Investor profile deleted');
            if (form.id === profile.id) resetForm();
        } catch (mutationError: any) {
            showToast('error', 'Unable to delete investor profile', mutationError.message);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="grid">
            <Toast ref={toastRef} />
            <div className="col-12">
                <div className="mb-3">
                    <h2 className="m-0">Investor Profiles</h2>
                    <p className="mt-2 mb-0 text-600">
                        Create household members or entities first, then attach one or more demat accounts to each profile.
                    </p>
                </div>
            </div>

            <div className="col-12 lg:col-4">
                <div className="card h-full">
                    <div className="flex align-items-center justify-content-between mb-3">
                        <h3 className="m-0 text-xl">{form.id ? 'Edit Profile' : 'New Profile'}</h3>
                        {form.id && (
                            <Button label="Reset" className="p-button-text app-action-compact" onClick={resetForm} />
                        )}
                    </div>

                    <form className="flex flex-column gap-3" onSubmit={handleSubmit}>
                        <div className="flex flex-column gap-1">
                            <label className="font-medium">Name</label>
                            <AppInput value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Relationship</label>
                                <AppInput value={form.relationship} onChange={(e) => setForm((prev) => ({ ...prev, relationship: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">PAN</label>
                                <AppInput value={form.pan} onChange={(e) => setForm((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))} />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Email</label>
                                <AppInput value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                            </div>
                            <div className="col-12 md:col-6 flex flex-column gap-1">
                                <label className="font-medium">Phone</label>
                                <AppInput value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <Checkbox
                                inputId="investor-profile-active"
                                checked={form.isActive}
                                onChange={(e) => setForm((prev) => ({ ...prev, isActive: Boolean(e.checked) }))}
                            />
                            <label htmlFor="investor-profile-active">Active investor profile</label>
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
                            <Button type="submit" label={saving ? 'Saving...' : form.id ? 'Update Profile' : 'Create Profile'} disabled={saving} />
                            <Button type="button" label="Clear" className="p-button-text" onClick={resetForm} disabled={saving} />
                        </div>
                    </form>
                </div>
            </div>

            <div className="col-12 lg:col-8">
                <div className="card h-full">
                    {error && <p className="text-red-500 mt-0">Error loading investor profiles: {error.message}</p>}
                    <AppDataTable
                        value={profiles}
                        loading={loading}
                        dataKey="id"
                        paginator
                        rows={10}
                        rowsPerPageOptions={[10, 20, 50]}
                        recordSummary={`Profiles: ${profiles.length}`}
                        emptyMessage="No investor profiles yet"
                        headerLeft={<span className="font-medium">Household Investors</span>}
                        headerRight={<Button label="Refresh" icon="pi pi-refresh" className="p-button-text" onClick={() => refetch()} />}
                        stripedRows
                        size="small"
                    >
                        <Column field="name" header="Profile" body={(row: WealthInvestorProfile) => formatInvestorProfileLabel(row)} />
                        <Column field="pan" header="PAN" body={(row: WealthInvestorProfile) => row.pan || '-'} />
                        <Column field="email" header="Contact" body={(row: WealthInvestorProfile) => row.email || row.phone || '-'} />
                        <Column
                            header="Status"
                            body={(row: WealthInvestorProfile) => (row.isActive ? 'Active' : 'Inactive')}
                            style={{ width: '7rem' }}
                        />
                        <Column
                            header="Actions"
                            body={(row: WealthInvestorProfile) => (
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