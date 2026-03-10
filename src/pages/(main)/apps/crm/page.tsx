'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    createPrintJob,
    getCrmSettings,
    listBenefitPrograms,
    listBenefitWallet,
    listCampaignRules,
    listCampaignRuns,
    listCampaignTemplates,
    listCrmMessageLogs,
    listCrmParties,
    listIdentifierCodes,
    postBenefitAdjustment,
    runCampaignNow,
    sendCrmFollowupSms,
    upsertBenefitProgram,
    upsertCampaignRule,
    upsertCampaignTemplate,
    updateCrmSettings,
    upsertCrmPartyProfile,
    assignIdentifierCode,
    type BenefitProgram,
    type BenefitWalletEntry,
    type CampaignRule,
    type CampaignRun,
    type CampaignTemplate,
    type CrmMessageLog,
    type CrmParty,
    type CrmSettings,
    type IdentifierCode
} from '@/lib/crm/api';

const emptySettings = { defaultPoints: '', amountPerPoint: '', pointAdjustmentDays: 0, mobileDigitCount: 10, minimumInvoiceAmount: '', autoSendSms: false, autoSendInvoiceSms: false, enableQr: true, giftCouponPostingLedgerId: '', memberCodePrefix: 'MEM', memberBarcodePrefix: 'MBR', extraSettingsJson: '{\n  "industryFallbacks": ["retail", "agency", "textile"]\n}' };
const emptyParty = { ledgerId: '', partyType: 'customer', memberCode: '', membershipTier: 'standard', memberSinceDateText: '', birthDateText: '', anniversaryDateText: '', gender: '', alternateMobile: '', whatsappNumber: '', emailOverride: '', communicationPreferencesJson: '{\n  "sms": true,\n  "whatsapp": true\n}', tagsJson: '{\n  "segment": "retail"\n}', notes: '', profileMetaJson: '{\n  "source": "crm-app"\n}' };
const emptyBenefit = { programId: '', programKey: 'retail-loyalty', name: 'Retail Loyalty', programType: 'LOYALTY', earnRate: '1.0000', redemptionRate: '1.0000', minimumInvoiceAmount: '0.00', pointsExpiryDays: 365, isActive: true, settingsJson: '{\n  "audiences": ["retail", "agency", "textile"]\n}' };
const emptyWallet = { ledgerId: '', programId: '', entryType: 'ADJUST', points: '0.00', amountValue: '', referenceNote: '' };
const emptyIdentifier = { identifierId: '', entityType: 'PARTY_MEMBER', entityId: '', codeValue: '', codeType: 'BARCODE', templateKey: 'member-card', isPrimary: true, status: 'active', metadataJson: '{\n  "source": "crm-member"\n}' };
const emptyCampaignTemplate = { campaignTemplateId: '', templateKey: 'birthday-sms', name: 'Birthday SMS', channel: 'sms', subjectTemplate: '', bodyTemplate: 'Happy birthday {{ledgerName}}. Your member code is {{memberCode}}.', whatsappTemplateKey: '', whatsappTemplateName: '', metadataJson: '{\n  "language": "en"\n}', isActive: true };
const emptyCampaignRule = { campaignRuleId: '', ruleKey: 'birthday-rule', name: 'Birthday Rule', triggerType: 'birthday', channel: 'sms', templateId: '', sourceModule: 'crm', scheduleJson: '{\n  "mode": "manual"\n}', filterJson: '{\n  "segment": "all-members"\n}', isActive: true };

export default function CrmAppPage() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [settings, setSettings] = React.useState<CrmSettings | null>(null);
    const [settingsForm, setSettingsForm] = React.useState(emptySettings);
    const [parties, setParties] = React.useState<CrmParty[]>([]);
    const [partyForm, setPartyForm] = React.useState(emptyParty);
    const [benefits, setBenefits] = React.useState<BenefitProgram[]>([]);
    const [benefitForm, setBenefitForm] = React.useState(emptyBenefit);
    const [walletEntries, setWalletEntries] = React.useState<BenefitWalletEntry[]>([]);
    const [walletForm, setWalletForm] = React.useState(emptyWallet);
    const [identifiers, setIdentifiers] = React.useState<IdentifierCode[]>([]);
    const [identifierForm, setIdentifierForm] = React.useState(emptyIdentifier);
    const [campaignTemplates, setCampaignTemplates] = React.useState<CampaignTemplate[]>([]);
    const [campaignTemplateForm, setCampaignTemplateForm] = React.useState(emptyCampaignTemplate);
    const [campaignRules, setCampaignRules] = React.useState<CampaignRule[]>([]);
    const [campaignRuleForm, setCampaignRuleForm] = React.useState(emptyCampaignRule);
    const [campaignRuns, setCampaignRuns] = React.useState<CampaignRun[]>([]);
    const [messageLogs, setMessageLogs] = React.useState<CrmMessageLog[]>([]);
    const [sendingFollowupSms, setSendingFollowupSms] = React.useState(false);
    const [followupSmsText, setFollowupSmsText] = React.useState('');

    const loadPage = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [nextSettings, nextParties, nextBenefits, nextTemplates, nextRules, nextRuns, nextLogs] = await Promise.all([
                getCrmSettings(),
                listCrmParties(),
                listBenefitPrograms(),
                listCampaignTemplates(),
                listCampaignRules(),
                listCampaignRuns(),
                listCrmMessageLogs()
            ]);
            setSettings(nextSettings);
            setSettingsForm({ ...emptySettings, ...nextSettings, pointAdjustmentDays: nextSettings.pointAdjustmentDays ?? 0, mobileDigitCount: nextSettings.mobileDigitCount ?? 10 });
            setParties(nextParties);
            setBenefits(nextBenefits);
            setCampaignTemplates(nextTemplates);
            setCampaignRules(nextRules);
            setCampaignRuns(nextRuns);
            setMessageLogs(nextLogs);
            if (nextBenefits[0]) setWalletForm((current) => ({ ...current, programId: nextBenefits[0].id }));
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load CRM app');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { void loadPage(); }, [loadPage]);

    const loadPartyContext = React.useCallback(async (party: CrmParty) => {
        setPartyForm({ ...emptyParty, ...party, ledgerId: party.ledgerId, communicationPreferencesJson: party.communicationPreferencesJson || emptyParty.communicationPreferencesJson, tagsJson: party.tagsJson || emptyParty.tagsJson, profileMetaJson: party.profileMetaJson || emptyParty.profileMetaJson });
        setFollowupSmsText('');
        const [nextWallet, nextIdentifiers] = await Promise.all([listBenefitWallet(party.ledgerId), listIdentifierCodes('PARTY_MEMBER', party.ledgerId)]);
        setWalletEntries(nextWallet);
        setIdentifiers(nextIdentifiers);
        setWalletForm((current) => ({ ...current, ledgerId: party.ledgerId }));
        setIdentifierForm((current) => ({ ...current, entityId: party.ledgerId, codeValue: party.memberCode ? `${party.memberCode}-BAR` : current.codeValue }));
    }, []);

    const save = React.useCallback(async (work: () => Promise<void>, success: string) => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            await work();
            await loadPage();
            setNotice(success);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    }, [loadPage]);

    const sendPartyFollowupSms = React.useCallback(async () => {
        setSendingFollowupSms(true);
        setError(null);
        setNotice(null);
        try {
            if (!partyForm.ledgerId) throw new Error('Save or select a CRM party first.');
            const result = await sendCrmFollowupSms({
                ledgerId: partyForm.ledgerId,
                messageText: followupSmsText.trim() || null
            });
            setMessageLogs(await listCrmMessageLogs());
            setNotice(
                result.note ??
                    (result.duplicate
                        ? `CRM follow-up SMS already exists for ${result.recipientPhone}.`
                        : `CRM follow-up SMS ${result.status} for ${result.recipientName || result.ledgerId}.`)
            );
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to send CRM follow-up SMS');
        } finally {
            setSendingFollowupSms(false);
        }
    }, [followupSmsText, partyForm.ledgerId]);

    const benefitOptions = benefits.map((item) => ({ label: item.name, value: item.id }));
    const templateOptions = campaignTemplates.map((item) => ({ label: item.name, value: item.id }));

    return (
        <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">CRM</h2>
                        <p className="text-600 mb-0">Shared party, loyalty, campaign, and identifier admin for Retail, Agency, and Textile tenants.</p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Reload" text onClick={() => void loadPage()} disabled={loading || saving || sendingFollowupSms} />
                        <Button label="New Party" onClick={() => { setPartyForm(emptyParty); setFollowupSmsText(''); }} disabled={loading || saving || sendingFollowupSms} />
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Party Profiles</div>
                        <div className="flex flex-column gap-2">
                            {parties.length === 0 ? <Message severity="info" text="No CRM party profiles saved yet." /> : parties.map((party) => (
                                <button key={party.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => void loadPartyContext(party)} disabled={saving || sendingFollowupSms}>
                                    <div className="surface-border border-1 border-round p-3">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1"><span className="font-medium">{party.ledgerName || party.ledgerId}</span><Tag value={party.memberCode || 'No code'} severity="info" /></div>
                                        <div className="text-600 text-sm">{party.mobileNumber || party.whatsappNumber || 'No contact'}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Recent Campaign Runs</div>
                        <div className="flex flex-column gap-2">{campaignRuns.slice(0, 5).map((run) => <div key={run.id} className="surface-border border-1 border-round p-3"><div className="font-medium">{run.runKey}</div><div className="text-600 text-sm">{run.channel} | recipients {run.recipientCount}</div></div>)}</div>
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8 flex flex-column gap-3">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">CRM Settings</h3>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Default points</label><AppInput value={settingsForm.defaultPoints} onChange={(e) => setSettingsForm((s) => ({ ...s, defaultPoints: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Amount per point</label><AppInput value={settingsForm.amountPerPoint} onChange={(e) => setSettingsForm((s) => ({ ...s, amountPerPoint: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Gift posting ledger</label><AppInput value={settingsForm.giftCouponPostingLedgerId} onChange={(e) => setSettingsForm((s) => ({ ...s, giftCouponPostingLedgerId: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Member code prefix</label><AppInput value={settingsForm.memberCodePrefix} onChange={(e) => setSettingsForm((s) => ({ ...s, memberCodePrefix: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Member barcode prefix</label><AppInput value={settingsForm.memberBarcodePrefix} onChange={(e) => setSettingsForm((s) => ({ ...s, memberBarcodePrefix: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4 flex align-items-center gap-3 pt-5"><InputSwitch checked={settingsForm.autoSendSms} onChange={(e) => setSettingsForm((s) => ({ ...s, autoSendSms: !!e.value }))} /><span>Auto SMS</span><InputSwitch checked={settingsForm.enableQr} onChange={(e) => setSettingsForm((s) => ({ ...s, enableQr: !!e.value }))} /><span>QR</span></div>
                    </div>
                    <div><label className="block text-700 mb-2">Extra settings JSON</label><InputTextarea rows={6} className="w-full font-mono text-sm" value={settingsForm.extraSettingsJson} onChange={(e) => setSettingsForm((s) => ({ ...s, extraSettingsJson: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    <div className="flex gap-2"><Button label="Save Settings" loading={saving} onClick={() => void save(async () => { const updated = await updateCrmSettings(settingsForm); setSettings(updated); setSettingsForm({ ...emptySettings, ...updated, pointAdjustmentDays: updated.pointAdjustmentDays ?? 0, mobileDigitCount: updated.mobileDigitCount ?? 10 }); }, 'CRM settings saved.')} disabled={sendingFollowupSms} /></div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Party Profile</h3>
                    <div className="grid">
                        <div className="col-12 md:col-3"><label className="block text-700 mb-2">Ledger ID</label><AppInput value={partyForm.ledgerId} onChange={(e) => setPartyForm((s) => ({ ...s, ledgerId: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-3"><label className="block text-700 mb-2">Member code</label><AppInput value={partyForm.memberCode} onChange={(e) => setPartyForm((s) => ({ ...s, memberCode: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-3"><label className="block text-700 mb-2">Party type</label><AppInput value={partyForm.partyType} onChange={(e) => setPartyForm((s) => ({ ...s, partyType: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-3"><label className="block text-700 mb-2">Tier</label><AppInput value={partyForm.membershipTier} onChange={(e) => setPartyForm((s) => ({ ...s, membershipTier: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Birth date</label><AppInput value={partyForm.birthDateText} onChange={(e) => setPartyForm((s) => ({ ...s, birthDateText: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Anniversary</label><AppInput value={partyForm.anniversaryDateText} onChange={(e) => setPartyForm((s) => ({ ...s, anniversaryDateText: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">WhatsApp</label><AppInput value={partyForm.whatsappNumber} onChange={(e) => setPartyForm((s) => ({ ...s, whatsappNumber: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    </div>
                    <div className="grid"><div className="col-12 md:col-6"><label className="block text-700 mb-2">Preferences JSON</label><InputTextarea rows={5} className="w-full font-mono text-sm" value={partyForm.communicationPreferencesJson} onChange={(e) => setPartyForm((s) => ({ ...s, communicationPreferencesJson: e.target.value }))} disabled={saving || sendingFollowupSms} /></div><div className="col-12 md:col-6"><label className="block text-700 mb-2">Tags JSON</label><InputTextarea rows={5} className="w-full font-mono text-sm" value={partyForm.tagsJson} onChange={(e) => setPartyForm((s) => ({ ...s, tagsJson: e.target.value }))} disabled={saving || sendingFollowupSms} /></div></div>
                    <div><label className="block text-700 mb-2">Notes</label><InputTextarea rows={4} className="w-full" value={partyForm.notes} onChange={(e) => setPartyForm((s) => ({ ...s, notes: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    <div>
                        <label className="block text-700 mb-2">Follow-up SMS override</label>
                        <InputTextarea rows={4} className="w-full" value={followupSmsText} onChange={(e) => setFollowupSmsText(e.target.value)} disabled={saving || sendingFollowupSms} />
                        <small className="text-600">Leave blank to use the CRM SMS binding text or the default CRM follow-up message.</small>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Save Party" loading={saving} onClick={() => void save(async () => { const saved = await upsertCrmPartyProfile(partyForm); if (saved) await loadPartyContext(saved); }, `Saved CRM profile for ledger ${partyForm.ledgerId}.`)} disabled={sendingFollowupSms} />
                        <Button label="Send Follow-up SMS" onClick={() => void sendPartyFollowupSms()} loading={sendingFollowupSms} disabled={saving || !partyForm.ledgerId} />
                        <Button label="New Profile" text onClick={() => { setPartyForm(emptyParty); setFollowupSmsText(''); }} disabled={saving || sendingFollowupSms} />
                    </div>
                </div>

                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Loyalty, Identifier, and Campaign Ops</h3>
                    <div className="grid">
                        <div className="col-12 md:col-6"><label className="block text-700 mb-2">Benefit program</label><AppInput value={benefitForm.name} onChange={(e) => setBenefitForm((s) => ({ ...s, name: e.target.value }))} disabled={saving || sendingFollowupSms} /><small className="text-600">Key: {benefitForm.programKey}</small></div>
                        <div className="col-12 md:col-6 flex align-items-end"><Button label="Save Program" onClick={() => void save(async () => { const saved = await upsertBenefitProgram(benefitForm); setBenefitForm({ ...benefitForm, programId: saved?.id || '' }); }, 'Benefit program saved.')} loading={saving} disabled={sendingFollowupSms} /></div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Wallet ledger</label><AppInput value={walletForm.ledgerId} onChange={(e) => setWalletForm((s) => ({ ...s, ledgerId: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Program</label><AppDropdown value={walletForm.programId} options={benefitOptions} onChange={(e) => setWalletForm((s) => ({ ...s, programId: e.value ?? '' }))} className="w-full" disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-4"><label className="block text-700 mb-2">Points</label><AppInput value={walletForm.points} onChange={(e) => setWalletForm((s) => ({ ...s, points: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                    </div>
                    <div className="flex gap-2 flex-wrap"><Button label="Post Adjustment" onClick={() => void save(async () => { await postBenefitAdjustment(walletForm); if (walletForm.ledgerId) setWalletEntries(await listBenefitWallet(walletForm.ledgerId)); }, 'Wallet adjustment posted.')} loading={saving} disabled={sendingFollowupSms} /><Button label="Assign Member Barcode" onClick={() => void save(async () => { await assignIdentifierCode({ ...identifierForm, entityId: identifierForm.entityId || partyForm.ledgerId }); setIdentifiers(await listIdentifierCodes('PARTY_MEMBER', identifierForm.entityId || partyForm.ledgerId)); }, 'Identifier saved.')} loading={saving} disabled={sendingFollowupSms} /><Button label="Create Member Card Job" onClick={() => void save(async () => { await createPrintJob({ entityType: 'PARTY_MEMBER', entityId: partyForm.ledgerId, title: `Member Card ${partyForm.memberCode || partyForm.ledgerId}` }); }, 'Print job created.')} loading={saving} disabled={sendingFollowupSms || !partyForm.ledgerId} /></div>
                    <div className="text-600 text-sm">Wallet entries: {walletEntries.length} | Identifiers: {identifiers.length}</div>
                    <div className="grid">
                        <div className="col-12 md:col-6"><label className="block text-700 mb-2">Campaign template</label><AppInput value={campaignTemplateForm.name} onChange={(e) => setCampaignTemplateForm((s) => ({ ...s, name: e.target.value }))} disabled={saving || sendingFollowupSms} /><InputTextarea rows={4} className="w-full mt-2" value={campaignTemplateForm.bodyTemplate} onChange={(e) => setCampaignTemplateForm((s) => ({ ...s, bodyTemplate: e.target.value }))} disabled={saving || sendingFollowupSms} /></div>
                        <div className="col-12 md:col-6"><label className="block text-700 mb-2">Campaign rule</label><AppInput value={campaignRuleForm.name} onChange={(e) => setCampaignRuleForm((s) => ({ ...s, name: e.target.value }))} disabled={saving || sendingFollowupSms} /><div className="mt-2"><AppDropdown value={campaignRuleForm.templateId} options={templateOptions} onChange={(e) => setCampaignRuleForm((s) => ({ ...s, templateId: e.value ?? '' }))} className="w-full" disabled={saving || sendingFollowupSms} /></div></div>
                    </div>
                    <div className="flex gap-2 flex-wrap"><Button label="Save Template" onClick={() => void save(async () => { const saved = await upsertCampaignTemplate(campaignTemplateForm); setCampaignTemplateForm({ ...campaignTemplateForm, campaignTemplateId: saved?.id || '' }); }, 'Campaign template saved.')} loading={saving} disabled={sendingFollowupSms} /><Button label="Save Rule" onClick={() => void save(async () => { const saved = await upsertCampaignRule(campaignRuleForm); setCampaignRuleForm({ ...campaignRuleForm, campaignRuleId: saved?.id || '' }); }, 'Campaign rule saved.')} loading={saving} disabled={sendingFollowupSms} /><Button label="Run Rule" onClick={() => void save(async () => { if (!campaignRuleForm.campaignRuleId) throw new Error('Save the campaign rule first.'); await runCampaignNow({ campaignRuleId: campaignRuleForm.campaignRuleId, requestedByUserId: 'crm-ui' }); }, 'Campaign run queued and logged.')} loading={saving} disabled={sendingFollowupSms} /></div>
                    <div className="text-600 text-sm">Recent CRM message logs: {messageLogs.length}</div>
                </div>
            </div>
        </div>
    );
}
