'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    listBenefitPrograms,
    upsertBenefitProgram,
    type BenefitProgram
} from '@/lib/crm/api';

type SchemeFormState = {
    programId: string;
    programKey: string;
    name: string;
    discountType: 'PERCENT' | 'AMOUNT' | 'QTY';
    discountValue: string;
    minBillAmount: string;
    startDate: string;
    endDate: string;
    remarks: string;
    isActive: boolean;
};

const emptyForm: SchemeFormState = {
    programId: '',
    programKey: 'retail-scheme',
    name: '',
    discountType: 'PERCENT',
    discountValue: '0.00',
    minBillAmount: '0.00',
    startDate: '',
    endDate: '',
    remarks: '',
    isActive: true
};

const parseSchemeSettings = (program: BenefitProgram) => {
    try {
        const parsed = program.settingsJson ? JSON.parse(program.settingsJson) as Record<string, unknown> : {};
        return {
            discountType: (typeof parsed.discountType === 'string' ? parsed.discountType : 'PERCENT') as SchemeFormState['discountType'],
            discountValue: typeof parsed.discountValue === 'string' ? parsed.discountValue : '0.00',
            startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
            endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
            remarks: typeof parsed.remarks === 'string' ? parsed.remarks : ''
        };
    } catch {
        return {
            discountType: 'PERCENT' as const,
            discountValue: '0.00',
            startDate: '',
            endDate: '',
            remarks: ''
        };
    }
};

const toSchemeForm = (program: BenefitProgram): SchemeFormState => {
    const settings = parseSchemeSettings(program);
    return {
        programId: program.id,
        programKey: program.programKey,
        name: program.name,
        discountType: settings.discountType,
        discountValue: settings.discountValue,
        minBillAmount: program.minimumInvoiceAmount ?? '0.00',
        startDate: settings.startDate,
        endDate: settings.endDate,
        remarks: settings.remarks,
        isActive: program.isActive
    };
};

export default function BillingSchemesPage() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [rows, setRows] = React.useState<BenefitProgram[]>([]);
    const [form, setForm] = React.useState<SchemeFormState>(emptyForm);

    const loadPage = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const allPrograms = await listBenefitPrograms();
            const schemes = allPrograms.filter((program) => program.programType === 'SCHEME');
            setRows(schemes);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load schemes.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadPage();
    }, [loadPage]);

    const save = React.useCallback(async (nextForm: SchemeFormState, successMessage: string) => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await upsertBenefitProgram({
                programId: nextForm.programId || null,
                programKey: nextForm.programKey || nextForm.name,
                name: nextForm.name,
                programType: 'SCHEME',
                minimumInvoiceAmount: nextForm.minBillAmount || null,
                isActive: nextForm.isActive,
                settingsJson: JSON.stringify({
                    discountType: nextForm.discountType,
                    discountValue: nextForm.discountValue,
                    startDate: nextForm.startDate || null,
                    endDate: nextForm.endDate || null,
                    remarks: nextForm.remarks || null,
                    source: 'billing-schemes'
                })
            });
            await loadPage();
            setNotice(successMessage);
            setForm(emptyForm);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to save scheme.');
        } finally {
            setSaving(false);
        }
    }, [loadPage]);

    return (
        <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">Schemes</h2>
                        <p className="text-600 mb-0">
                            Tenant-backed billing schemes stored as shared CRM benefit programs instead of browser-local rows.
                        </p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Reload" text onClick={() => void loadPage()} disabled={loading || saving} />
                        <Button label="New Scheme" onClick={() => setForm(emptyForm)} disabled={saving} />
                    </div>
                    <div className="flex flex-column gap-2">
                        {rows.length === 0 ? <Message severity="info" text="No shared schemes saved yet." /> : rows.map((row) => {
                            const settings = parseSchemeSettings(row);
                            return (
                                <button key={row.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => setForm(toSchemeForm(row))}>
                                    <div className="surface-border border-1 border-round p-3">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                            <span className="font-medium">{row.name}</span>
                                            <Tag value={settings.discountType} severity="info" />
                                        </div>
                                        <div className="text-600 text-sm">Min bill {row.minimumInvoiceAmount || '0.00'} | {row.isActive ? 'Active' : 'Inactive'}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Scheme Definition</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Name</label>
                            <AppInput value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Key</label>
                            <AppInput value={form.programKey} onChange={(event) => setForm((current) => ({ ...current, programKey: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Discount type</label>
                            <AppDropdown value={form.discountType} options={[{ label: 'Percent', value: 'PERCENT' }, { label: 'Amount', value: 'AMOUNT' }, { label: 'Quantity', value: 'QTY' }]} onChange={(event) => setForm((current) => ({ ...current, discountType: ((event.value as SchemeFormState['discountType']) || 'PERCENT') }))} className="w-full" />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-3">
                            <label className="block text-700 mb-2">Discount value</label>
                            <AppInput value={form.discountValue} onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-3">
                            <label className="block text-700 mb-2">Min bill amount</label>
                            <AppInput value={form.minBillAmount} onChange={(event) => setForm((current) => ({ ...current, minBillAmount: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-3">
                            <label className="block text-700 mb-2">Start date</label>
                            <AppInput value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} placeholder="DD/MM/YYYY" />
                        </div>
                        <div className="col-12 md:col-3">
                            <label className="block text-700 mb-2">End date</label>
                            <AppInput value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} placeholder="DD/MM/YYYY" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-700 mb-2">Remarks</label>
                        <AppInput value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
                    </div>
                    <div className="flex align-items-center gap-3">
                        <InputSwitch checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: !!event.value }))} />
                        <span>Active</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Save Scheme" loading={saving} onClick={() => void save(form, 'Scheme saved to shared CRM benefits.')} disabled={!form.name.trim()} />
                        <Button label="Deactivate" text onClick={() => void save({ ...form, isActive: false }, 'Scheme deactivated.')} disabled={!form.programId || saving} />
                    </div>
                </div>
            </div>
        </div>
    );
}
