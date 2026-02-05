'use client';
import React, { useRef } from 'react';
import { Toast } from 'primereact/toast';
import { OptionsForm } from './OptionsForm';
import { useAgencyOptionsForm } from './useAgencyOptionsForm';

export default function OptionsPage() {
    const toastRef = useRef<Toast>(null);
    const {
        form,
        setForm,
        loading,
        saving,
        error,
        loadOptions,
        saveOptions,
        resetForm,
        ledgerSelectOptions,
        ledgerLoading,
        ledgerError
    } = useAgencyOptionsForm();

    const handleSave = async () => {
        try {
            await saveOptions();
            toastRef.current?.show({ severity: 'success', summary: 'Options saved' });
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save options';
            toastRef.current?.show({ severity: 'error', summary: message });
        }
    };

    return (
        <div className="card p-fluid">
            <Toast ref={toastRef} />
            <OptionsForm
                form={form}
                ledgerSelectOptions={ledgerSelectOptions}
                ledgerLoading={ledgerLoading}
                ledgerError={ledgerError ?? null}
                loading={loading}
                saving={saving}
                error={error}
                onReload={loadOptions}
                onReset={resetForm}
                onSave={handleSave}
                onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
            />
        </div>
    );
}
