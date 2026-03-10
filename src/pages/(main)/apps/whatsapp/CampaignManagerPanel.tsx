'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import { CampaignAudienceFields } from './CampaignAudienceFields';
import { CampaignAutomationHistoryPanel } from './CampaignAutomationHistoryPanel';
import { CampaignRunItemMessageDialog } from './CampaignRunItemMessageDialog';
import { CampaignScheduleFields } from './CampaignScheduleFields';
import { createCampaignAudienceForm, serializeCampaignAudienceForm, type CampaignAudienceFormState } from './campaignAudience';
import { createCampaignScheduleForm, serializeCampaignScheduleForm, type CampaignScheduleFormState } from './campaignSchedule';
import {
    generateWhatsAppCampaignRun,
    getWhatsAppMessage,
    listWhatsAppAutomationExecutionItems,
    listWhatsAppAutomationExecutions,
    listWhatsAppCampaignRunItems,
    listWhatsAppCampaignRuns,
    listWhatsAppCampaigns,
    reprocessWhatsAppCampaignRunItem,
    upsertWhatsAppCampaign,
    type GenerateWhatsAppCampaignRunInput,
    type UpsertWhatsAppCampaignInput,
    type WhatsAppAutomationExecution,
    type WhatsAppAutomationExecutionItem,
    type WhatsAppCampaign,
    type WhatsAppCampaignRun,
    type WhatsAppCampaignRunItem,
    type WhatsAppMessage,
    type WhatsAppTemplateBinding
} from '@/lib/whatsapp/api';

type CampaignManagerPanelProps = {
    bindings: WhatsAppTemplateBinding[];
};

type CampaignFormState = {
    campaignId: string | null;
    campaignKey: string;
    name: string;
    triggerType: string;
    bindingKey: string;
    sourceModule: string;
    sourceEntityType: string;
    audience: CampaignAudienceFormState;
    schedule: CampaignScheduleFormState;
    defaultContextJson: string;
    requireOptIn: boolean;
    isActive: boolean;
};

type RunFormState = {
    runDate: string;
    scheduledAt: string;
    sendNow: boolean;
    contextJson: string;
};

type CampaignPreset = {
    key: string;
    label: string;
    description: string;
    triggerType: string;
    sourceModule: string;
    sourceEntityType: string;
    audience: Record<string, unknown>;
    schedule: Record<string, unknown>;
    defaultContext: Record<string, unknown>;
    requireOptIn: boolean;
};

const RUN_ITEMS_POLL_INTERVAL_MS = 15000;
const formatJson = (value: unknown) => JSON.stringify(value, null, 2);
const normalizeText = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const CAMPAIGN_PRESETS: CampaignPreset[] = [
    {
        key: 'crm_birthday',
        label: 'Birthday Wishes',
        description: 'CRM party birthday campaign with filtered audience support.',
        triggerType: 'birthday',
        sourceModule: 'crm',
        sourceEntityType: 'crm_party',
        audience: { partyTypes: ['customer'] },
        schedule: { timezone: 'Asia/Kolkata', runAt: '09:00' },
        defaultContext: { event: { greetingLabel: 'Birthday' } },
        requireOptIn: true
    },
    {
        key: 'crm_anniversary',
        label: 'Anniversary Wishes',
        description: 'CRM party anniversary campaign using the same binding model.',
        triggerType: 'anniversary',
        sourceModule: 'crm',
        sourceEntityType: 'crm_party',
        audience: { partyTypes: ['customer'] },
        schedule: { timezone: 'Asia/Kolkata', runAt: '09:00' },
        defaultContext: { event: { greetingLabel: 'Anniversary' } },
        requireOptIn: true
    },
    {
        key: 'crm_broadcast',
        label: 'CRM Broadcast',
        description: 'Broadcast to filtered CRM parties such as VIP or tagged audiences.',
        triggerType: 'broadcast',
        sourceModule: 'crm',
        sourceEntityType: 'crm_party',
        audience: { tagAny: ['vip'] },
        schedule: { timezone: 'Asia/Kolkata', runAt: '11:00' },
        defaultContext: { event: { campaignLabel: 'CRM Broadcast' } },
        requireOptIn: true
    }
];

const TRIGGER_OPTIONS = [
    { label: 'Birthday', value: 'birthday' },
    { label: 'Anniversary', value: 'anniversary' },
    { label: 'Broadcast', value: 'broadcast' }
];

const SOURCE_ENTITY_OPTIONS = [
    { label: 'CRM Party', value: 'crm_party' },
    { label: 'Ledger', value: 'ledger' }
];

const createBlankCampaignForm = (): CampaignFormState => ({
    campaignId: null,
    campaignKey: '',
    name: '',
    triggerType: 'birthday',
    bindingKey: '',
    sourceModule: 'crm',
    sourceEntityType: 'crm_party',
    audience: createCampaignAudienceForm(),
    schedule: createCampaignScheduleForm(),
    defaultContextJson: '',
    requireOptIn: true,
    isActive: true
});

const createRunForm = (): RunFormState => ({
    runDate: '',
    scheduledAt: '',
    sendNow: false,
    contextJson: ''
});

const createCampaignForm = (campaign: WhatsAppCampaign): CampaignFormState => ({
    campaignId: campaign.id,
    campaignKey: campaign.campaignKey,
    name: campaign.name,
    triggerType: campaign.triggerType,
    bindingKey: campaign.bindingKey,
    sourceModule: campaign.sourceModule ?? '',
    sourceEntityType: campaign.sourceEntityType,
    audience: createCampaignAudienceForm(campaign.audienceJson),
    schedule: createCampaignScheduleForm(campaign.scheduleJson),
    defaultContextJson: campaign.defaultContextJson ?? '',
    requireOptIn: campaign.requireOptIn,
    isActive: campaign.isActive
});

const createPresetForm = (preset: CampaignPreset, bindingKey: string | null): CampaignFormState => ({
    campaignId: null,
    campaignKey: preset.key,
    name: preset.label,
    triggerType: preset.triggerType,
    bindingKey: bindingKey ?? '',
    sourceModule: preset.sourceModule,
    sourceEntityType: preset.sourceEntityType,
    audience: createCampaignAudienceForm(formatJson(preset.audience)),
    schedule: createCampaignScheduleForm(formatJson(preset.schedule)),
    defaultContextJson: formatJson(preset.defaultContext),
    requireOptIn: preset.requireOptIn,
    isActive: true
});

const parseJsonObjectTextarea = (value: string, field: string) => {
    const normalized = normalizeText(value);
    if (!normalized) return null;
    const parsed = JSON.parse(normalized) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${field} must be a JSON object.`);
    }
    return formatJson(parsed);
};

const parseCampaignInput = (form: CampaignFormState): UpsertWhatsAppCampaignInput => {
    const campaignKey = normalizeText(form.campaignKey);
    const name = normalizeText(form.name);
    const bindingKey = normalizeText(form.bindingKey);
    const triggerType = normalizeText(form.triggerType);
    const sourceEntityType = normalizeText(form.sourceEntityType);

    if (!campaignKey) throw new Error('Campaign key is required.');
    if (!name) throw new Error('Campaign name is required.');
    if (!bindingKey) throw new Error('Binding key is required.');
    if (!triggerType) throw new Error('Trigger type is required.');
    if (!sourceEntityType) throw new Error('Source entity type is required.');

    return {
        campaignId: form.campaignId,
        campaignKey,
        name,
        triggerType,
        bindingKey,
        sourceModule: normalizeText(form.sourceModule),
        sourceEntityType,
        audienceJson: parseJsonObjectTextarea(serializeCampaignAudienceForm(form.audience), 'Audience JSON'),
        scheduleJson: serializeCampaignScheduleForm(form.schedule),
        defaultContextJson: parseJsonObjectTextarea(form.defaultContextJson, 'Default context JSON'),
        requireOptIn: form.requireOptIn,
        isActive: form.isActive
    };
};

const parseRunInput = (campaignKey: string, form: RunFormState): GenerateWhatsAppCampaignRunInput => {
    const normalizedCampaignKey = normalizeText(campaignKey);
    if (!normalizedCampaignKey) throw new Error('Save the campaign before generating a run.');

    return {
        campaignKey: normalizedCampaignKey,
        runDate: normalizeText(form.runDate),
        scheduledAt: normalizeText(form.scheduledAt),
        sendNow: form.sendNow,
        contextJson: parseJsonObjectTextarea(form.contextJson, 'Run context JSON')
    };
};

const toErrorMessage = (value: unknown, fallback: string) => (value instanceof Error ? value.message : fallback);

const runStatusSeverity = (run: WhatsAppCampaignRun) => {
    const normalized = run.status.trim().toLowerCase();
    if (normalized === 'failed') return 'danger';
    if (normalized === 'processing') return 'warning';
    if (run.failureCount > 0) return 'warning';
    if (run.readCount > 0 || run.deliveredCount > 0 || run.sentCount > 0) return 'success';
    if (run.sandboxCount > 0) return 'info';
    return normalized === 'completed' ? 'success' : 'info';
};

const formatRunDeliverySummary = (run: WhatsAppCampaignRun) =>
    `recipients ${run.recipientCount} | queued ${run.queuedCount} | sent ${run.sentCount} | delivered ${run.deliveredCount} | read ${run.readCount}`;

const formatRunOutcomeSummary = (run: WhatsAppCampaignRun) =>
    `skipped ${run.skippedCount} | sandbox ${run.sandboxCount} | failed ${run.failureCount}`;

const itemStatusSeverity = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'failed') return 'danger';
    if (normalized === 'skipped') return 'warning';
    if (normalized === 'sandbox') return 'warning';
    if (normalized === 'queued') return 'info';
    return 'success';
};

const canReprocessRunItem = (item: WhatsAppCampaignRunItem) => {
    const normalized = item.status.trim().toLowerCase();
    return Boolean(item.messageId) && (normalized === 'queued' || normalized === 'failed' || normalized === 'sandbox');
};

const getReprocessRunItemLabel = (item: WhatsAppCampaignRunItem) => (
    item.status.trim().toLowerCase() === 'queued' ? 'Dispatch' : 'Retry'
);

const findSuggestedBindingKey = (bindings: WhatsAppTemplateBinding[], presetKey: string) => {
    const direct = bindings.find((binding) => binding.bindingKey === presetKey);
    if (direct) return direct.bindingKey;
    return bindings.find((binding) => binding.bindingKey.toLowerCase().includes(presetKey.toLowerCase()))?.bindingKey ?? null;
};

export function CampaignManagerPanel({ bindings }: CampaignManagerPanelProps) {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [running, setRunning] = React.useState(false);
    const [runItemsLoading, setRunItemsLoading] = React.useState(false);
    const [automationItemsLoading, setAutomationItemsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [campaigns, setCampaigns] = React.useState<WhatsAppCampaign[]>([]);
    const [runs, setRuns] = React.useState<WhatsAppCampaignRun[]>([]);
    const [runItems, setRunItems] = React.useState<WhatsAppCampaignRunItem[]>([]);
    const [selectedRunItemMessage, setSelectedRunItemMessage] = React.useState<WhatsAppMessage | null>(null);
    const [selectedRunItemForMessage, setSelectedRunItemForMessage] = React.useState<WhatsAppCampaignRunItem | null>(null);
    const [automationExecutions, setAutomationExecutions] = React.useState<WhatsAppAutomationExecution[]>([]);
    const [automationItems, setAutomationItems] = React.useState<WhatsAppAutomationExecutionItem[]>([]);
    const [messageDetailLoading, setMessageDetailLoading] = React.useState(false);
    const [messageDetailError, setMessageDetailError] = React.useState<string | null>(null);
    const [reprocessingRunItemId, setReprocessingRunItemId] = React.useState<string | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = React.useState<string | null>(null);
    const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
    const [selectedAutomationExecutionId, setSelectedAutomationExecutionId] = React.useState<string | null>(null);
    const [form, setForm] = React.useState<CampaignFormState>(() => createBlankCampaignForm());
    const [runForm, setRunForm] = React.useState<RunFormState>(() => createRunForm());

    const bindingOptions = React.useMemo(
        () =>
            bindings.map((binding) => ({
                label: `${binding.bindingKey} | ${binding.templateName || binding.templateKey || 'template?'}`,
                value: binding.bindingKey
            })),
        [bindings]
    );

    const loadAutomationExecutionItems = React.useCallback(async (executionId: string) => {
        setAutomationItemsLoading(true);
        try {
            setAutomationItems(await listWhatsAppAutomationExecutionItems(executionId));
        } catch (nextError) {
            setError(toErrorMessage(nextError, 'Failed to load automation execution details'));
        } finally {
            setAutomationItemsLoading(false);
        }
    }, []);

    const loadRuns = React.useCallback(async (options?: { silent?: boolean }) => {
        try {
            setRuns(await listWhatsAppCampaignRuns({ limit: 100 }));
        } catch (nextError) {
            if (!options?.silent) {
                setError(toErrorMessage(nextError, 'Failed to load campaign runs'));
            }
        }
    }, []);

    const loadCampaignData = React.useCallback(async (preferredCampaignKey?: string | null) => {
        setLoading(true);
        setError(null);
        try {
            const [nextCampaigns, nextRuns, nextAutomationExecutions] = await Promise.all([
                listWhatsAppCampaigns(),
                listWhatsAppCampaignRuns({ limit: 100 }),
                listWhatsAppAutomationExecutions({ limit: 20 })
            ]);
            setCampaigns(nextCampaigns);
            setRuns(nextRuns);
            setAutomationExecutions(nextAutomationExecutions);

            const preferred =
                (preferredCampaignKey ? nextCampaigns.find((campaign) => campaign.campaignKey === preferredCampaignKey) : null) ??
                nextCampaigns[0] ??
                null;

            if (preferred) {
                setSelectedCampaignId(preferred.id);
                setForm(createCampaignForm(preferred));
            } else {
                setSelectedCampaignId(null);
                setForm(createBlankCampaignForm());
                setSelectedRunId(null);
                setRunItems([]);
            }

            const latestAutomationExecution = nextAutomationExecutions[0] ?? null;
            if (latestAutomationExecution) {
                setSelectedAutomationExecutionId(latestAutomationExecution.id);
                await loadAutomationExecutionItems(latestAutomationExecution.id);
            } else {
                setSelectedAutomationExecutionId(null);
                setAutomationItems([]);
            }
        } catch (nextError) {
            setError(toErrorMessage(nextError, 'Failed to load WhatsApp campaigns'));
        } finally {
            setLoading(false);
        }
    }, [loadAutomationExecutionItems]);

    React.useEffect(() => {
        void loadCampaignData();
    }, [loadCampaignData]);


    const selectedCampaign = React.useMemo(
        () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
        [campaigns, selectedCampaignId]
    );

    const visibleRuns = React.useMemo(
        () => (selectedCampaign ? runs.filter((run) => run.campaignKey === selectedCampaign.campaignKey) : runs).slice(0, 10),
        [runs, selectedCampaign]
    );

    const hasUnsupportedSourceTriggerCombination =
        form.sourceEntityType === 'ledger' && (form.triggerType === 'birthday' || form.triggerType === 'anniversary');

    const openCampaign = (campaign: WhatsAppCampaign) => {
        setSelectedCampaignId(campaign.id);
        setForm(createCampaignForm(campaign));
        setSelectedRunId(null);
        setRunItems([]);
        setRunForm(createRunForm());
        setNotice(null);
        setError(null);
    };

    const applyPreset = (preset: CampaignPreset) => {
        const existing = campaigns.find((campaign) => campaign.campaignKey === preset.key) ?? null;
        if (existing) {
            openCampaign(existing);
            return;
        }

        setSelectedCampaignId(null);
        setForm(createPresetForm(preset, findSuggestedBindingKey(bindings, preset.key)));
        setSelectedRunId(null);
        setRunItems([]);
        setRunForm(createRunForm());
        setNotice(`Loaded the default ${preset.key} seed. Pick an active binding before saving if none was preselected.`);
        setError(null);
    };

    const loadRunItems = React.useCallback(async (runId: string, options?: { silent?: boolean }) => {
        if (!options?.silent) setRunItemsLoading(true);
        try {
            const nextItems = await listWhatsAppCampaignRunItems(runId);
            setRunItems(nextItems);
            if (selectedRunItemForMessage) {
                const refreshedSelectedItem = nextItems.find((item) => item.id === selectedRunItemForMessage.id) ?? null;
                setSelectedRunItemForMessage(refreshedSelectedItem);
            }
            await loadRuns({ silent: true });
        } catch (nextError) {
            if (!options?.silent) {
                setError(toErrorMessage(nextError, 'Failed to load campaign run items'));
            }
        } finally {
            if (!options?.silent) setRunItemsLoading(false);
        }
    }, [loadRuns, selectedRunItemForMessage]);
    React.useEffect(() => {
        if (!selectedRunId) return;

        const timer = window.setInterval(() => {
            void loadRunItems(selectedRunId, { silent: true });
        }, RUN_ITEMS_POLL_INTERVAL_MS);

        return () => {
            window.clearInterval(timer);
        };
    }, [loadRunItems, selectedRunId]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const saved = await upsertWhatsAppCampaign(parseCampaignInput(form));
            await loadCampaignData(saved.campaignKey);
            setNotice(`Saved WhatsApp campaign ${saved.campaignKey}.`);
        } catch (nextError) {
            setError(toErrorMessage(nextError, 'Failed to save WhatsApp campaign'));
        } finally {
            setSaving(false);
        }
    };

    const handleOpenRun = async (runId: string) => {
        setSelectedRunId(runId);
        await loadRunItems(runId);
    };

    const handleOpenAutomationExecution = async (executionId: string) => {
        setSelectedAutomationExecutionId(executionId);
        await loadAutomationExecutionItems(executionId);
    };

    const handleOpenRunItemMessage = async (item: WhatsAppCampaignRunItem) => {
        setSelectedRunItemForMessage(item);
        setSelectedRunItemMessage(null);
        setMessageDetailError(null);

        if (!item.messageId) {
            setMessageDetailError('No linked WhatsApp message is recorded for this run item.');
            return;
        }

        setMessageDetailLoading(true);
        try {
            setSelectedRunItemMessage(await getWhatsAppMessage(item.messageId));
        } catch (nextError) {
            setMessageDetailError(toErrorMessage(nextError, 'Failed to load linked WhatsApp message'));
        } finally {
            setMessageDetailLoading(false);
        }
    };

    const handleHideRunItemMessage = () => {
        setSelectedRunItemForMessage(null);
        setSelectedRunItemMessage(null);
        setMessageDetailError(null);
        setMessageDetailLoading(false);
    };

    const handleReprocessRunItem = async (item: WhatsAppCampaignRunItem) => {
        const actionLabel = getReprocessRunItemLabel(item);
        setReprocessingRunItemId(item.id);
        setError(null);
        setNotice(null);
        try {
            const updatedItem = await reprocessWhatsAppCampaignRunItem(item.id);
            setRunItems((current) => current.map((entry) => (entry.id === updatedItem.id ? updatedItem : entry)));
            await loadRunItems(updatedItem.runId, { silent: true });
            setNotice(`${actionLabel} processed for ${updatedItem.recipientName || updatedItem.sourceEntityId}. Current status: ${updatedItem.status}.`);
            if (selectedRunItemForMessage?.id === updatedItem.id) {
                await handleOpenRunItemMessage(updatedItem);
            }
        } catch (nextError) {
            setError(toErrorMessage(nextError, `Failed to ${actionLabel.toLowerCase()} campaign run item`));
        } finally {
            setReprocessingRunItemId(null);
        }
    };

    const handleGenerateRun = async () => {
        setRunning(true);
        setError(null);
        setNotice(null);
        try {
            const run = await generateWhatsAppCampaignRun(parseRunInput(form.campaignKey, runForm));
            await loadCampaignData(form.campaignKey);
            await handleOpenRun(run.id);
            setNotice(`Generated run ${run.runKey}. queued: ${run.queuedCount}, sent: ${run.sentCount}, skipped: ${run.skippedCount}, failed: ${run.failureCount}.`);
        } catch (nextError) {
            setError(toErrorMessage(nextError, 'Failed to generate WhatsApp campaign run'));
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="card flex flex-column gap-3">
            <div>
                <h3 className="mb-1">Campaigns</h3>
                <div className="text-600 text-sm">
                    Manage reusable birthday, anniversary, and broadcast campaign definitions on top of the same WhatsApp binding platform.
                </div>
            </div>
            {error ? <Message severity="error" text={error} /> : null}
            {notice ? <Message severity="success" text={notice} /> : null}
            <Message
                severity="info"
                text="Use the structured audience and schedule controls below for normal automation. Advanced JSON is still available for extra keys, and manual runs remain available for operator-triggered sends."
            />
            {hasUnsupportedSourceTriggerCombination ? (
                <Message
                    severity="warn"
                    text="Birthday and anniversary campaigns currently require CRM Party as the source entity type. Switch back to CRM Party or use Broadcast for ledger-based campaigns."
                />
            ) : null}
            <div className="grid">
                <div className="col-12 xl:col-4">
                    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
                        <div className="flex gap-2 flex-wrap">
                            <Button label="Reload" text onClick={() => void loadCampaignData(form.campaignKey || null)} disabled={loading || saving || running} />
                            <Button
                                label="New Campaign"
                                onClick={() => {
                                    setSelectedCampaignId(null);
                                    setSelectedRunId(null);
                                    setRunItems([]);
                                    setRunForm(createRunForm());
                                    setForm(createBlankCampaignForm());
                                    setNotice('Started a new campaign draft.');
                                    setError(null);
                                }}
                                disabled={loading || saving || running}
                            />
                        </div>
                        <div className="flex flex-column gap-2">
                            <div className="text-700 font-medium">Quick defaults</div>
                            {CAMPAIGN_PRESETS.map((preset) => (
                                <button
                                    key={preset.key}
                                    type="button"
                                    className="p-0 border-none bg-transparent text-left cursor-pointer"
                                    onClick={() => applyPreset(preset)}
                                    disabled={loading || saving || running}
                                >
                                    <div className="surface-border border-1 border-round p-3">
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                            <span className="font-medium text-900">{preset.label}</span>
                                            <Tag value={preset.triggerType} severity="info" />
                                        </div>
                                        <div className="text-600 text-sm">{preset.description}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-column gap-2">
                            <div className="text-700 font-medium">Saved campaigns</div>
                            {campaigns.length === 0 ? (
                                <Message severity="info" text="No WhatsApp campaigns are saved yet for this tenant." />
                            ) : (
                                campaigns.map((campaign) => (
                                    <button
                                        key={campaign.id}
                                        type="button"
                                        className="p-0 border-none bg-transparent text-left cursor-pointer"
                                        onClick={() => openCampaign(campaign)}
                                        disabled={loading || saving || running}
                                    >
                                        <div className={`surface-border border-1 border-round p-3 ${selectedCampaignId === campaign.id ? 'border-primary' : ''}`}>
                                            <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                                <span className="font-medium text-900">{campaign.name}</span>
                                                <Tag value={campaign.isActive ? 'Active' : 'Inactive'} severity={campaign.isActive ? 'success' : 'warning'} />
                                            </div>
                                            <div className="text-600 text-sm mb-1">{campaign.campaignKey}</div>
                                            <div className="text-500 text-xs">{campaign.triggerType} / {campaign.sourceEntityType}</div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
                <div className="col-12 xl:col-8">
                    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
                        <div className="flex align-items-center gap-2">
                            <InputSwitch
                                inputId="whatsapp-campaign-active"
                                checked={form.isActive}
                                onChange={(event) => setForm((current) => ({ ...current, isActive: !!event.value }))}
                                disabled={loading || saving || running}
                            />
                            <label htmlFor="whatsapp-campaign-active">Campaign active</label>
                        </div>
                        <div className="flex align-items-center gap-2">
                            <InputSwitch
                                inputId="whatsapp-campaign-opt-in"
                                checked={form.requireOptIn}
                                onChange={(event) => setForm((current) => ({ ...current, requireOptIn: !!event.value }))}
                                disabled={loading || saving || running}
                            />
                            <label htmlFor="whatsapp-campaign-opt-in">Require opt-in</label>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <label htmlFor="whatsapp-campaign-key" className="block text-700 mb-2">Campaign key</label>
                                <AppInput inputId="whatsapp-campaign-key" value={form.campaignKey} onChange={(event) => setForm((current) => ({ ...current, campaignKey: event.target.value }))} disabled={loading || saving || running} />
                            </div>
                            <div className="col-12 md:col-6">
                                <label htmlFor="whatsapp-campaign-name" className="block text-700 mb-2">Campaign name</label>
                                <AppInput inputId="whatsapp-campaign-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={loading || saving || running} />
                            </div>
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-4">
                                <label htmlFor="whatsapp-campaign-trigger" className="block text-700 mb-2">Trigger type</label>
                                <AppDropdown inputId="whatsapp-campaign-trigger" value={form.triggerType} options={TRIGGER_OPTIONS} onChange={(event) => setForm((current) => ({ ...current, triggerType: String(event.value ?? 'birthday') }))} className="w-full" disabled={loading || saving || running} />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="whatsapp-campaign-module" className="block text-700 mb-2">Source module</label>
                                <AppInput inputId="whatsapp-campaign-module" value={form.sourceModule} onChange={(event) => setForm((current) => ({ ...current, sourceModule: event.target.value }))} disabled={loading || saving || running} />
                            </div>
                            <div className="col-12 md:col-4">
                                <label htmlFor="whatsapp-campaign-entity" className="block text-700 mb-2">Source entity type</label>
                                <AppDropdown inputId="whatsapp-campaign-entity" value={form.sourceEntityType} options={SOURCE_ENTITY_OPTIONS} onChange={(event) => setForm((current) => ({ ...current, sourceEntityType: String(event.value ?? 'crm_party') }))} className="w-full" disabled={loading || saving || running} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="whatsapp-campaign-binding" className="block text-700 mb-2">Active binding</label>
                            <AppDropdown inputId="whatsapp-campaign-binding" value={form.bindingKey || null} options={bindingOptions} onChange={(event) => setForm((current) => ({ ...current, bindingKey: String(event.value ?? '') }))} placeholder={bindingOptions.length ? 'Select an active binding' : 'Create a binding first'} showClear filter className="w-full" disabled={loading || saving || running || bindingOptions.length === 0} />
                        </div>
                        <div className="grid">
                            <div className="col-12 md:col-6">
                                <CampaignAudienceFields
                                    value={form.audience}
                                    triggerType={form.triggerType}
                                    sourceEntityType={form.sourceEntityType}
                                    onChange={(audience) => setForm((current) => ({ ...current, audience }))}
                                    disabled={loading || saving || running}
                                />
                            </div>
                            <div className="col-12 md:col-6">
                                <CampaignScheduleFields
                                    value={form.schedule}
                                    onChange={(schedule) => setForm((current) => ({ ...current, schedule }))}
                                    disabled={loading || saving || running}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="whatsapp-campaign-context" className="block text-700 mb-2">Default context JSON</label>
                            <InputTextarea id="whatsapp-campaign-context" value={form.defaultContextJson} onChange={(event) => setForm((current) => ({ ...current, defaultContextJson: event.target.value }))} rows={10} className="w-full font-mono text-sm" disabled={loading || saving || running} />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button label="Save Campaign" onClick={() => void handleSave()} loading={saving} disabled={loading || running} />
                            <Button label="Generate Run" severity="secondary" onClick={() => void handleGenerateRun()} loading={running} disabled={loading || saving || !selectedCampaignId} />
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="whatsapp-run-date" className="block text-700 mb-2">Run date</label>
                <AppInput inputId="whatsapp-run-date" value={runForm.runDate} onChange={(event) => setRunForm((current) => ({ ...current, runDate: event.target.value }))} placeholder="2026-03-08" disabled={loading || saving || running} />
            </div>
            <div>
                <label htmlFor="whatsapp-run-scheduled-at" className="block text-700 mb-2">Scheduled at</label>
                <AppInput inputId="whatsapp-run-scheduled-at" value={runForm.scheduledAt} onChange={(event) => setRunForm((current) => ({ ...current, scheduledAt: event.target.value }))} placeholder="2026-03-08T09:00:00+05:30" disabled={loading || saving || running} />
            </div>
            <div className="flex align-items-center gap-2">
                <InputSwitch inputId="whatsapp-run-send-now" checked={runForm.sendNow} onChange={(event) => setRunForm((current) => ({ ...current, sendNow: !!event.value }))} disabled={loading || saving || running} />
                <label htmlFor="whatsapp-run-send-now">Send immediately</label>
            </div>
            <div>
                <label htmlFor="whatsapp-run-context-json" className="block text-700 mb-2">Run context JSON</label>
                <InputTextarea id="whatsapp-run-context-json" value={runForm.contextJson} onChange={(event) => setRunForm((current) => ({ ...current, contextJson: event.target.value }))} rows={5} className="w-full font-mono text-sm" disabled={loading || saving || running} />
            </div>
            <div className="grid">
                <div className="col-12 xl:col-5">
                    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
                        <div className="text-900 font-medium">Recent Runs</div>
                        {visibleRuns.length === 0 ? (
                            <Message severity="info" text="No campaign runs have been generated yet for the selected scope." />
                        ) : (
                            visibleRuns.map((run) => (
                                <button key={run.id} type="button" className="p-0 border-none bg-transparent text-left cursor-pointer" onClick={() => void handleOpenRun(run.id)} disabled={runItemsLoading}>
                                    <div className={`surface-border border-1 border-round p-3 ${selectedRunId === run.id ? 'border-primary' : ''}`}>
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                            <span className="font-medium text-900">{run.runKey}</span>
                                            <Tag value={run.status} severity={runStatusSeverity(run)} />
                                        </div>
                                        <div className="text-600 text-sm mb-1">{run.campaignKey} / {run.triggerType}</div>
                                                                                <div className="text-500 text-xs">{formatRunDeliverySummary(run)}</div>
                                        <div className="text-500 text-xs">{formatRunOutcomeSummary(run)}</div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                <div className="col-12 xl:col-7">
                    <div className="surface-border border-1 border-round p-3 flex flex-column gap-3 h-full">
                        <div className="text-900 font-medium">Run Items</div>
                        {runItemsLoading ? <Message severity="info" text="Loading run items..." /> : null}
                        {!runItemsLoading && runItems.length === 0 ? <Message severity="info" text="Select a run to inspect recipient-level status and skip reasons." /> : null}
                        {!runItemsLoading && runItems.length > 0 ? (
                            runItems.map((item) => (
                                <div key={item.id} className="surface-border border-1 border-round p-3 flex flex-column gap-2">
                                    <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                                        <div>
                                            <div className="font-medium text-900">{item.recipientName || item.sourceEntityId}</div>
                                            <div className="text-600 text-sm">{item.recipientPhone || 'No phone'} / {item.sourceEntityType} / {item.sourceEntityId}</div>
                                        </div>
                                        <div className="flex align-items-center gap-2 flex-wrap justify-content-end">
                                            <Tag value={item.status} severity={itemStatusSeverity(item.status)} />
                                            {canReprocessRunItem(item) ? (
                                                <Button
                                                    type="button"
                                                    label={getReprocessRunItemLabel(item)}
                                                    text
                                                    className="app-action-compact"
                                                    onClick={() => void handleReprocessRunItem(item)}
                                                    loading={reprocessingRunItemId === item.id}
                                                    disabled={reprocessingRunItemId != null && reprocessingRunItemId !== item.id}
                                                />
                                            ) : null}
                                            {item.messageId ? (
                                                <Button
                                                    type="button"
                                                    label="Message"
                                                    text
                                                    className="app-action-compact"
                                                    onClick={() => void handleOpenRunItemMessage(item)}
                                                    loading={messageDetailLoading && selectedRunItemForMessage?.id === item.id}
                                                    disabled={
                                                        (messageDetailLoading && selectedRunItemForMessage?.id !== item.id) ||
                                                        (reprocessingRunItemId != null && reprocessingRunItemId !== item.id)
                                                    }
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="text-500 text-xs">
                                        {item.skipReason ? `reason: ${item.skipReason}` : 'reason: -'}
                                        {item.waMessageId ? ` | Meta: ${item.waMessageId}` : ''}
                                    </div>
                                </div>
                            ))
                        ) : null}
                    </div>
                </div>
            </div>
            <CampaignAutomationHistoryPanel
                executions={automationExecutions}
                items={automationItems}
                loading={loading}
                itemLoading={automationItemsLoading}
                selectedExecutionId={selectedAutomationExecutionId}
                selectedCampaignKey={selectedCampaign?.campaignKey ?? null}
                onOpenExecution={(executionId) => void handleOpenAutomationExecution(executionId)}
            />
            <CampaignRunItemMessageDialog
                visible={selectedRunItemForMessage != null}
                loading={messageDetailLoading}
                error={messageDetailError}
                item={selectedRunItemForMessage}
                message={selectedRunItemMessage}
                onHide={handleHideRunItemMessage}
            />
        </div>
    );
}






