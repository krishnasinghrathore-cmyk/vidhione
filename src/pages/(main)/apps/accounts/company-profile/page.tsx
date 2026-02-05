'use client';
import React, { useRef } from 'react';
import { Toast } from 'primereact/toast';
import { CompanyProfileForm } from './CompanyProfileForm';
import { useCompanyProfileForm } from './useCompanyProfileForm';

export default function CompanyProfilePage() {
    const toastRef = useRef<Toast>(null);
    const { form, setForm, loading, saving, error, loadCompany, saveCompany, resetForm } = useCompanyProfileForm();

    const handleSave = async () => {
        try {
            await saveCompany();
            toastRef.current?.show({ severity: 'success', summary: 'Company profile saved' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save company profile';
            toastRef.current?.show({ severity: 'error', summary: message });
        }
    };

    return (
        <div className="card p-fluid">
            <Toast ref={toastRef} />
            <CompanyProfileForm
                form={form}
                loading={loading}
                saving={saving}
                error={error}
                onReload={loadCompany}
                onReset={resetForm}
                onSave={handleSave}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            />
        </div>
    );
}
