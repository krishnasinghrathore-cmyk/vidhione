'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppInput from '@/components/AppInput';
import {
    getCrmPartyByLedgerId,
    listCrmParties,
    upsertCrmPartyProfile,
    type CrmParty
} from '@/lib/crm/api';

type LoyaltyFormState = {
    ledgerId: string;
    programName: string;
    startDate: string;
    endDate: string;
    pointsPerAmount: string;
    amountPerPoint: string;
    minimumRedeemPoints: string;
    remarks: string;
    isActive: boolean;
};

const emptyForm: LoyaltyFormState = {
    ledgerId: '',
    programName: 'Retail Loyalty',
    startDate: '',
    endDate: '',
    pointsPerAmount: '1.00',
    amountPerPoint: '0.00',
    minimumRedeemPoints: '0',
    remarks: '',
    isActive: true
};

const parsePartyProgram = (party: CrmParty | null) => {
    if (!party?.profileMetaJson) return null;
    try {
        const parsed = JSON.parse(party.profileMetaJson) as Record<string, unknown>;
        const program = parsed.partyLoyaltyProgram;
        if (!program || typeof program !== 'object' || Array.isArray(program)) return null;
        return program as Record<string, unknown>;
    } catch {
        return null;
    }
};

const toFormState = (party: CrmParty): LoyaltyFormState => {
    const program = parsePartyProgram(party);
    return {
        ledgerId: party.ledgerId,
        programName: typeof program?.programName === 'string' ? program.programName : 'Retail Loyalty',
        startDate: typeof program?.startDate === 'string' ? program.startDate : '',
        endDate: typeof program?.endDate === 'string' ? program.endDate : '',
        pointsPerAmount: typeof program?.pointsPerAmount === 'string' ? program.pointsPerAmount : '1.00',
        amountPerPoint: typeof program?.amountPerPoint === 'string' ? program.amountPerPoint : '0.00',
        minimumRedeemPoints: typeof program?.minimumRedeemPoints === 'string' ? program.minimumRedeemPoints : '0',
        remarks: typeof program?.remarks === 'string' ? program.remarks : '',
        isActive: typeof program?.isActive === 'boolean' ? program.isActive : true
    };
};

const hasPartyProgram = (party: CrmParty) => Boolean(parsePartyProgram(party));

export default function BillingPartyLoyaltyProgramPage() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [parties, setParties] = React.useState<CrmParty[]>([]);
    const [form, setForm] = React.useState<LoyaltyFormState>(emptyForm);

    const loadPage = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const nextParties = await listCrmParties();
            setParties(nextParties.filter(hasPartyProgram));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load loyalty programs.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        void loadPage();
    }, [loadPage]);

    const save = React.useCallback(async (nextForm: LoyaltyFormState, successMessage: string) => {
        if (!nextForm.ledgerId.trim()) {
            setError('Ledger ID is required.');
            return;
        }
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const current = await getCrmPartyByLedgerId(nextForm.ledgerId.trim());
            const currentMeta = current?.profileMetaJson ? JSON.parse(current.profileMetaJson) as Record<string, unknown> : {};
            const nextMeta = {
                ...currentMeta,
                partyLoyaltyProgram: {
                    programName: nextForm.programName,
                    startDate: nextForm.startDate || null,
                    endDate: nextForm.endDate || null,
                    pointsPerAmount: nextForm.pointsPerAmount,
                    amountPerPoint: nextForm.amountPerPoint,
                    minimumRedeemPoints: nextForm.minimumRedeemPoints,
                    remarks: nextForm.remarks || null,
                    isActive: nextForm.isActive,
                    source: 'billing-party-loyalty'
                }
            };

            await upsertCrmPartyProfile({
                ledgerId: nextForm.ledgerId.trim(),
                partyType: current?.partyType ?? 'customer',
                memberCode: current?.memberCode ?? null,
                membershipTier: current?.membershipTier ?? null,
                memberSinceDateText: current?.memberSinceDateText ?? null,
                birthDateText: current?.birthDateText ?? null,
                anniversaryDateText: current?.anniversaryDateText ?? null,
                gender: current?.gender ?? null,
                alternateMobile: current?.alternateMobile ?? null,
                whatsappNumber: current?.whatsappNumber ?? null,
                emailOverride: current?.email ?? null,
                communicationPreferencesJson: current?.communicationPreferencesJson ?? null,
                tagsJson: current?.tagsJson ?? null,
                notes: current?.notes ?? null,
                profileMetaJson: JSON.stringify(nextMeta)
            });

            await loadPage();
            setNotice(successMessage);
            setForm(emptyForm);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to save party loyalty program.');
        } finally {
            setSaving(false);
        }
    }, [loadPage]);

    return (
        <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">Party Loyalty Program</h2>
                        <p className="text-600 mb-0">
                            Tenant-backed party loyalty settings stored on shared CRM party profiles instead of browser-local rows.
                        </p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Reload" text onClick={() => void loadPage()} disabled={loading || saving} />
                        <Button label="New Party Program" onClick={() => setForm(emptyForm)} disabled={saving} />
                    </div>
                    <div className="flex flex-column gap-2">
                        {parties.length === 0 ? <Message severity="info" text="No party loyalty programs saved yet." /> : parties.map((party) => {
                            const program = parsePartyProgram(party);
                            return (
                                <button key={party.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => setForm(toFormState(party))}>
                                    <div className="surface-border border-1 border-round p-3">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                            <span className="font-medium">{party.ledgerName || `Ledger ${party.ledgerId}`}</span>
                                            <Tag value={program?.isActive === false ? 'Inactive' : 'Active'} severity={program?.isActive === false ? 'warning' : 'success'} />
                                        </div>
                                        <div className="text-600 text-sm">{typeof program?.programName === 'string' ? program.programName : 'Retail Loyalty'}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Party Program Settings</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Ledger ID</label>
                            <AppInput value={form.ledgerId} onChange={(event) => setForm((current) => ({ ...current, ledgerId: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-8">
                            <label className="block text-700 mb-2">Program name</label>
                            <AppInput value={form.programName} onChange={(event) => setForm((current) => ({ ...current, programName: event.target.value }))} />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Start date</label>
                            <AppInput value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} placeholder="DD/MM/YYYY" />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">End date</label>
                            <AppInput value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} placeholder="DD/MM/YYYY" />
                        </div>
                        <div className="col-12 md:col-4 flex align-items-end gap-3">
                            <InputSwitch checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: !!event.value }))} />
                            <span>Active</span>
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Points per amount</label>
                            <AppInput value={form.pointsPerAmount} onChange={(event) => setForm((current) => ({ ...current, pointsPerAmount: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Amount per point</label>
                            <AppInput value={form.amountPerPoint} onChange={(event) => setForm((current) => ({ ...current, amountPerPoint: event.target.value }))} />
                        </div>
                        <div className="col-12 md:col-4">
                            <label className="block text-700 mb-2">Minimum redeem points</label>
                            <AppInput value={form.minimumRedeemPoints} onChange={(event) => setForm((current) => ({ ...current, minimumRedeemPoints: event.target.value }))} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-700 mb-2">Remarks</label>
                        <AppInput value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Save Program" loading={saving} onClick={() => void save(form, `Party loyalty saved for ledger ${form.ledgerId.trim()}.`)} disabled={!form.ledgerId.trim()} />
                        <Button label="Deactivate" text onClick={() => void save({ ...form, isActive: false }, `Party loyalty deactivated for ledger ${form.ledgerId.trim()}.`)} disabled={!form.ledgerId.trim() || saving} />
                    </div>
                </div>
            </div>
        </div>
    );
}
