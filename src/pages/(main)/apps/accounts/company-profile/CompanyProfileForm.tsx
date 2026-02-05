import React from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Link } from 'react-router-dom';
import type { CompanyProfileFormState } from './useCompanyProfileForm';

type Props = {
    form: CompanyProfileFormState;
    loading: boolean;
    saving: boolean;
    error: string | null;
    onReload: () => void;
    onReset: () => void;
    onSave: () => void;
    onChange: (patch: Partial<CompanyProfileFormState>) => void;
};

export const CompanyProfileForm = ({ form, loading, saving, error, onReload, onReset, onSave, onChange }: Props) => {
    return (
        <>
            <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3 mb-3">
                <div>
                    <h2 className="m-0">Company Profile</h2>
                    <p className="mt-2 mb-0 text-600">Update company identity and fiscal year details used across the app.</p>
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

            {error && <p className="text-red-500 mt-0 mb-3">{error}</p>}

            <div className="formgrid grid">
                <div className="field col-12 md:col-4">
                    <label htmlFor="companyFiscalYearId">Company Fiscal Year ID</label>
                    <InputText
                        id="companyFiscalYearId"
                        value={form.companyFiscalYearId ? String(form.companyFiscalYearId) : ''}
                        disabled
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="companyName">Company Name</label>
                    <InputText
                        id="companyName"
                        value={form.companyName}
                        onChange={(e) => onChange({ companyName: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="companyAlias">Company Alias</label>
                    <InputText
                        id="companyAlias"
                        value={form.companyAlias}
                        onChange={(e) => onChange({ companyAlias: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fiscalYearStart">Fiscal Year Start</label>
                    <InputText
                        id="fiscalYearStart"
                        value={form.fiscalYearStart}
                        placeholder="YYYYMMDD or DD/MM/YYYY"
                        onChange={(e) => onChange({ fiscalYearStart: e.target.value })}
                    />
                </div>
                <div className="field col-12 md:col-6">
                    <label htmlFor="fiscalYearEnd">Fiscal Year End</label>
                    <InputText
                        id="fiscalYearEnd"
                        value={form.fiscalYearEnd}
                        placeholder="YYYYMMDD or DD/MM/YYYY"
                        onChange={(e) => onChange({ fiscalYearEnd: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex justify-content-end gap-2 mt-3">
                <Button label="Reset" outlined onClick={onReset} disabled={saving} />
                <Button label={saving ? 'Saving...' : 'Save'} onClick={onSave} disabled={saving} />
            </div>
        </>
    );
};
