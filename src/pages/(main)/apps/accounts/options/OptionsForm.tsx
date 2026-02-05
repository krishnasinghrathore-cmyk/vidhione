import React from 'react';
import { Button } from 'primereact/button';
import { Link } from 'react-router-dom';
import type { AgencyOptionsFormState } from './useAgencyOptionsForm';
import { LedgerDefaultsSection } from './LedgerDefaultsSection';
import { ImportDefaultsSection } from './ImportDefaultsSection';
import { ReportingSection } from './ReportingSection';
import { EInvoiceSection } from './EInvoiceSection';
import { AgencyControlsSection } from './AgencyControlsSection';

type LedgerOption = { label: string; value: number | null };

type Props = {
    form: AgencyOptionsFormState;
    ledgerSelectOptions: LedgerOption[];
    ledgerLoading: boolean;
    ledgerError: Error | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    onReload: () => void;
    onReset: () => void;
    onSave: () => void;
    onChange: (patch: Partial<AgencyOptionsFormState>) => void;
};

export const OptionsForm = ({
    form,
    ledgerSelectOptions,
    ledgerLoading,
    ledgerError,
    loading,
    saving,
    error,
    onReload,
    onReset,
    onSave,
    onChange
}: Props) => {
    return (
        <>
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="m-0">Options</h2>
                    <p className="mt-2 mb-0 text-600">Configure agency defaults, ledgers, and import settings.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        label={loading ? 'Loading...' : 'Reload'}
                        icon="pi pi-refresh"
                        outlined
                        onClick={onReload}
                        disabled={loading || saving}
                    />
                    <Link to="/apps/accounts">
                        <Button label="Back" icon="pi pi-arrow-left" outlined />
                    </Link>
                </div>
            </div>

            {ledgerError && <p className="text-red-500 mt-0 mb-2">Ledger lookup error: {ledgerError.message}</p>}
            {error && <p className="text-red-500 mt-0 mb-3">{error}</p>}

            <LedgerDefaultsSection
                form={form}
                ledgerSelectOptions={ledgerSelectOptions}
                ledgerLoading={ledgerLoading}
                onChange={onChange}
            />
            <ImportDefaultsSection form={form} onChange={onChange} />
            <ReportingSection form={form} onChange={onChange} />
            <EInvoiceSection form={form} onChange={onChange} />
            <AgencyControlsSection form={form} onChange={onChange} />

            <div className="flex justify-content-end gap-2 mt-3">
                <Button label="Reset" outlined onClick={onReset} disabled={saving} />
                <Button label={saving ? 'Saving...' : 'Save'} onClick={onSave} disabled={saving} />
            </div>
        </>
    );
};
