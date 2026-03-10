'use client';

import React from 'react';
import { z } from 'zod';
import { Button } from 'primereact/button';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    listWhatsAppAccounts,
    listWhatsAppTemplateBindings,
    listWhatsAppTemplates,
    previewDraftWhatsAppTemplateBinding,
    sendDraftBoundWhatsAppMessage,
    syncWhatsAppTemplates,
    upsertWhatsAppTemplateBinding,
    type UpsertWhatsAppTemplateBindingInput,
    type WhatsAppAccount,
    type WhatsAppMessage,
    type WhatsAppTemplate,
    type WhatsAppTemplateBinding,
    type WhatsAppTemplateBindingParameter,
    type WhatsAppTemplateBindingPreview
} from '@/lib/whatsapp/api';
import { CampaignManagerPanel } from './CampaignManagerPanel';

const jsonObjectSchema = z.record(z.string(), z.unknown());
const parameterMapSchema = z.array(
    z.object({
        componentType: z.string().trim().min(1),
        parameterType: z.string().trim().min(1)
    }).passthrough()
);
const bindingFormSchema = z
    .object({
        bindingKey: z.string().trim().min(1, 'Binding key is required.'),
        sourceModule: z.string().trim().min(1, 'Source module is required.'),
        sourceEntityType: z.string().trim().min(1, 'Source entity type is required.'),
        templateKey: z.string().trim().optional(),
        templateName: z.string().trim().optional(),
        templateLanguage: z.string().trim().optional()
    })
    .superRefine((value, context) => {
        if (!value.templateKey && !value.templateName) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['templateKey'],
                message: 'Template key or template name is required.'
            });
        }
    });

type FormState = {
    bindingId: string | null;
    bindingKey: string;
    accountId: string | null;
    templateKey: string;
    templateName: string;
    templateLanguage: string;
    sourceModule: string;
    sourceEntityType: string;
    parameterMapJson: string;
    metadataJson: string;
    isActive: boolean;
    selectedTemplateId: string | null;
};

type PreviewFormState = {
    sourceEntityId: string;
    contextOverridesJson: string;
    testRecipientPhone: string;
    testRecipientName: string;
};

type BindingPreset = {
    key: string;
    label: string;
    description: string;
    sourceModule: string;
    sourceEntityType: string;
    parameterMap: WhatsAppTemplateBindingParameter[];
};

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);

const BINDING_PRESETS: BindingPreset[] = [
    {
        key: 'invoice_send',
        label: 'Invoice Send',
        description: 'Billing sale invoice template with customer and invoice summary placeholders.',
        sourceModule: 'billing',
        sourceEntityType: 'sale_invoice',
        parameterMap: [
            { componentType: 'body', parameterType: 'text', position: 1, valuePath: 'recipient.name' },
            { componentType: 'body', parameterType: 'text', position: 2, valuePath: 'saleInvoice.voucherNumber' },
            { componentType: 'body', parameterType: 'text', position: 3, valuePath: 'saleInvoice.voucherDateText' },
            { componentType: 'body', parameterType: 'text', position: 4, valuePath: 'billing.totalNetAmount' },
            { componentType: 'body', parameterType: 'text', position: 5, valuePath: 'billing.dueAmount' }
        ]
    },
    {
        key: 'ledger_statement',
        label: 'Ledger Statement',
        description: 'Accounts ledger statement template with period and closing-balance placeholders.',
        sourceModule: 'accounts',
        sourceEntityType: 'ledger',
        parameterMap: [
            { componentType: 'body', parameterType: 'text', position: 1, valuePath: 'ledger.name' },
            { componentType: 'body', parameterType: 'text', position: 2, valuePath: 'statement.fromDateText' },
            { componentType: 'body', parameterType: 'text', position: 3, valuePath: 'statement.toDateText' },
            { componentType: 'body', parameterType: 'text', position: 4, valuePath: 'statement.closingBalanceAmount' },
            { componentType: 'body', parameterType: 'text', position: 5, valuePath: 'statement.closingBalanceDrCr' }
        ]
    }
];

const createBlankForm = (): FormState => ({
    bindingId: null,
    bindingKey: '',
    accountId: null,
    templateKey: '',
    templateName: '',
    templateLanguage: 'en',
    sourceModule: '',
    sourceEntityType: '',
    parameterMapJson: '',
    metadataJson: '',
    isActive: true,
    selectedTemplateId: null
});

const createPreviewForm = (): PreviewFormState => ({
    sourceEntityId: '',
    contextOverridesJson: '',
    testRecipientPhone: '',
    testRecipientName: ''
});

const normalizeEntityType = (value: string) => value.trim().toLowerCase();

const createSampleContextOverrides = (sourceEntityType: string): Record<string, unknown> | null => {
    const normalized = normalizeEntityType(sourceEntityType);

    if (['sale_invoice', 'saleinvoice', 'invoice'].includes(normalized)) {
        return {
            billing: {
                totalNetAmount: '1250.00',
                dueAmount: '250.00',
                dueDateText: '31 Mar 2026'
            },
            document: {
                url: 'https://example.com/documents/invoice-1001.pdf',
                fileName: 'invoice-1001.pdf'
            }
        };
    }

    if (['ledger', 'ledger_statement'].includes(normalized)) {
        return {
            statement: {
                fromDateText: '01 Mar 2026',
                toDateText: '31 Mar 2026',
                closingBalanceAmount: '8750.00',
                closingBalanceDrCr: 'Dr'
            },
            document: {
                url: 'https://example.com/documents/ledger-statement.pdf',
                fileName: 'ledger-statement.pdf'
            }
        };
    }

    if (['crm_party', 'crm_party_profile', 'party', 'customer'].includes(normalized)) {
        return {
            event: {
                triggerType: 'birthday',
                runDateText: '08 Mar 2026',
                campaignKey: 'crm_birthday'
            },
            birthday: {
                dateText: '08 Mar 1990',
                month: 3,
                day: 8
            }
        };
    }

    return null;
};

const parseContextOverridesJson = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return null;
    return formatJson(jsonObjectSchema.parse(JSON.parse(normalized)));
};

const findMatchingTemplateId = (binding: WhatsAppTemplateBinding, templates: WhatsAppTemplate[]) => {
    const match = templates.find((template) => {
        const sameAccount = !binding.accountId || template.accountId === binding.accountId;
        const sameTemplateKey = binding.templateKey && template.templateKey === binding.templateKey;
        const sameTemplateName = binding.templateName && template.waTemplateName === binding.templateName;
        return sameAccount && (sameTemplateKey || sameTemplateName);
    });
    return match?.id ?? null;
};

const createFormState = (binding: WhatsAppTemplateBinding | null, templates: WhatsAppTemplate[]): FormState => {
    if (!binding) return createBlankForm();
    return {
        bindingId: binding.id,
        bindingKey: binding.bindingKey,
        accountId: binding.accountId ?? null,
        templateKey: binding.templateKey ?? '',
        templateName: binding.templateName ?? '',
        templateLanguage: binding.templateLanguage ?? 'en',
        sourceModule: binding.sourceModule ?? '',
        sourceEntityType: binding.sourceEntityType ?? '',
        parameterMapJson: binding.parameterMapJson ?? formatJson(binding.parameterMap ?? []),
        metadataJson: binding.metadataJson ?? '',
        isActive: binding.isActive,
        selectedTemplateId: findMatchingTemplateId(binding, templates)
    };
};

const createPresetForm = (preset: BindingPreset): FormState => ({
    bindingId: null,
    bindingKey: preset.key,
    accountId: null,
    templateKey: preset.key,
    templateName: '',
    templateLanguage: 'en',
    sourceModule: preset.sourceModule,
    sourceEntityType: preset.sourceEntityType,
    parameterMapJson: formatJson(preset.parameterMap),
    metadataJson: '',
    isActive: true,
    selectedTemplateId: null
});

const normalizeText = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const getPresetByKey = (bindingKey: string) => BINDING_PRESETS.find((preset) => preset.key === bindingKey) ?? null;

const parseFormInput = (form: FormState): UpsertWhatsAppTemplateBindingInput => {
    const validated = bindingFormSchema.parse({
        bindingKey: form.bindingKey,
        sourceModule: form.sourceModule,
        sourceEntityType: form.sourceEntityType,
        templateKey: normalizeText(form.templateKey) ?? undefined,
        templateName: normalizeText(form.templateName) ?? undefined,
        templateLanguage: normalizeText(form.templateLanguage) ?? undefined
    });

    const parameterMap = form.parameterMapJson.trim().length
        ? parameterMapSchema.parse(JSON.parse(form.parameterMapJson))
        : [];
    const metadataJson = form.metadataJson.trim().length
        ? formatJson(jsonObjectSchema.parse(JSON.parse(form.metadataJson)))
        : null;

    return {
        bindingId: form.bindingId,
        accountId: form.accountId,
        bindingKey: validated.bindingKey,
        templateKey: normalizeText(validated.templateKey ?? ''),
        templateName: normalizeText(validated.templateName ?? ''),
        templateLanguage: normalizeText(validated.templateLanguage ?? ''),
        sourceModule: validated.sourceModule,
        sourceEntityType: validated.sourceEntityType,
        parameterMap,
        metadataJson,
        isActive: form.isActive
    };
};

const describeTemplate = (template: WhatsAppTemplate) => {
    const parts = [template.waTemplateName];
    if (template.language) parts.push(template.language);
    if (template.status) parts.push(template.status);
    return parts.join(' | ');
};

const toErrorMessage = (value: unknown, fallback: string) => {
    if (value instanceof z.ZodError) {
        return value.issues[0]?.message ?? fallback;
    }
    if (value instanceof Error) {
        return value.message;
    }
    return fallback;
};

const previewStatusSeverity = (status: string) => {
    const normalized = status.trim().toLowerCase();
    if (normalized === 'failed') return 'danger';
    if (normalized === 'sandbox') return 'warning';
    if (normalized === 'queued') return 'info';
    return 'success';
};

export default function WhatsappAppPage() {
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [syncing, setSyncing] = React.useState(false);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [testSending, setTestSending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [previewError, setPreviewError] = React.useState<string | null>(null);
    const [accounts, setAccounts] = React.useState<WhatsAppAccount[]>([]);
    const [templates, setTemplates] = React.useState<WhatsAppTemplate[]>([]);
    const [bindings, setBindings] = React.useState<WhatsAppTemplateBinding[]>([]);
    const [selectedToken, setSelectedToken] = React.useState<string>('new');
    const [form, setForm] = React.useState<FormState>(() => createBlankForm());
    const [previewForm, setPreviewForm] = React.useState<PreviewFormState>(() => createPreviewForm());
    const [previewResult, setPreviewResult] = React.useState<WhatsAppTemplateBindingPreview | null>(null);
    const [testMessage, setTestMessage] = React.useState<WhatsAppMessage | null>(null);

    const resetPreviewState = React.useCallback(() => {
        setPreviewForm(createPreviewForm());
        setPreviewResult(null);
        setTestMessage(null);
        setPreviewError(null);
    }, []);

    const loadPage = React.useCallback(async (preferredBindingKey?: string | null) => {
        setLoading(true);
        setError(null);
        try {
            const [nextAccounts, nextTemplates, nextBindings] = await Promise.all([
                listWhatsAppAccounts(),
                listWhatsAppTemplates({ limit: 200 }),
                listWhatsAppTemplateBindings()
            ]);
            setAccounts(nextAccounts);
            setTemplates(nextTemplates);
            setBindings(nextBindings);

            const preferredBinding =
                (preferredBindingKey
                    ? nextBindings.find((binding) => binding.bindingKey === preferredBindingKey)
                    : null) ??
                nextBindings.find((binding) => binding.bindingKey === 'invoice_send') ??
                nextBindings.find((binding) => binding.bindingKey === 'ledger_statement') ??
                nextBindings[0] ??
                null;

            if (preferredBinding) {
                setSelectedToken(`binding:${preferredBinding.id}`);
                setForm(createFormState(preferredBinding, nextTemplates));
                resetPreviewState();
                return;
            }

            setSelectedToken('new');
            setForm(createBlankForm());
            resetPreviewState();
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to load WhatsApp settings');
        } finally {
            setLoading(false);
        }
    }, [resetPreviewState]);

    React.useEffect(() => {
        void loadPage();
    }, [loadPage]);

    const accountOptions = React.useMemo(
        () =>
            accounts.map((account) => ({
                label: `${account.displayName || account.phoneNumber || account.id}${account.sandboxMode ? ' (sandbox)' : ''}`,
                value: account.id
            })),
        [accounts]
    );

    const filteredTemplates = React.useMemo(() => {
        if (!form.accountId) return templates;
        return templates.filter((template) => template.accountId === form.accountId);
    }, [form.accountId, templates]);

    const templateOptions = React.useMemo(
        () =>
            filteredTemplates.map((template) => ({
                label: describeTemplate(template),
                value: template.id
            })),
        [filteredTemplates]
    );

    const activePreset = React.useMemo(() => getPresetByKey(form.bindingKey), [form.bindingKey]);
    const previewHint = React.useMemo(() => {
        if (createSampleContextOverrides(form.sourceEntityType)) {
            return 'Use a real source entity id, then load sample context to add billing.*, statement.*, or document.* values that the business module normally injects.';
        }
        return 'Use a real source entity id and optional JSON overrides for any extra context blocks needed by this binding.';
    }, [form.sourceEntityType]);

    const openBinding = React.useCallback(
        (binding: WhatsAppTemplateBinding) => {
            setSelectedToken(`binding:${binding.id}`);
            setNotice(null);
            setError(null);
            setForm(createFormState(binding, templates));
            resetPreviewState();
        },
        [resetPreviewState, templates]
    );

    const applyPreset = React.useCallback(
        (preset: BindingPreset) => {
            const existing = bindings.find((binding) => binding.bindingKey === preset.key) ?? null;
            if (existing) {
                openBinding(existing);
                return;
            }
            setSelectedToken(`preset:${preset.key}`);
            setNotice(`Loaded the default ${preset.key} seed. Save to persist it for this tenant.`);
            setError(null);
            setForm(createPresetForm(preset));
            resetPreviewState();
        },
        [bindings, openBinding, resetPreviewState]
    );

    const startNewBinding = React.useCallback(() => {
        setSelectedToken('new');
        setNotice('Started a new custom binding draft.');
        setError(null);
        setForm(createBlankForm());
        resetPreviewState();
    }, []);

    const handleTemplateChange = React.useCallback(
        (templateId: string | null) => {
            if (!templateId) {
                setForm((current) => ({ ...current, selectedTemplateId: null }));
                return;
            }
            const selectedTemplate = templates.find((template) => template.id === templateId) ?? null;
            if (!selectedTemplate) return;
            setForm((current) => ({
                ...current,
                selectedTemplateId: templateId,
                accountId: selectedTemplate.accountId ?? current.accountId,
                templateKey: selectedTemplate.templateKey ?? current.templateKey,
                templateName: selectedTemplate.waTemplateName,
                templateLanguage: selectedTemplate.language ?? current.templateLanguage
            }));
        },
        [templates]
    );

    const handleSyncTemplates = React.useCallback(async () => {
        setSyncing(true);
        setError(null);
        setNotice(null);
        try {
            const syncedTemplates = await syncWhatsAppTemplates(form.accountId);
            setTemplates(syncedTemplates);
            setNotice(`Synced ${syncedTemplates.length} WhatsApp templates${form.accountId ? ' for the selected account' : ''}.`);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to sync WhatsApp templates');
        } finally {
            setSyncing(false);
        }
    }, [form.accountId]);

    const handleSave = React.useCallback(async () => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const saved = await upsertWhatsAppTemplateBinding(parseFormInput(form));
            await loadPage(saved.bindingKey);
            setNotice(`Saved WhatsApp binding ${saved.bindingKey}. Billing and Accounts can now reuse it through the generalized binding contract.`);
        } catch (nextError) {
            if (nextError instanceof z.ZodError) {
                setError(nextError.issues[0]?.message ?? 'Please fix the binding form values.');
            } else {
                setError(nextError instanceof Error ? nextError.message : 'Failed to save WhatsApp binding');
            }
        } finally {
            setSaving(false);
        }
    }, [form, loadPage]);

    const handleLoadSampleContext = React.useCallback(() => {
        const sample = createSampleContextOverrides(form.sourceEntityType);
        if (!sample) {
            setPreviewForm((current) => ({ ...current, contextOverridesJson: '' }));
            setPreviewResult(null);
            setTestMessage(null);
            setPreviewError(null);
            setNotice('No sample context block is defined yet for this source entity type.');
            return;
        }

        setPreviewForm((current) => ({ ...current, contextOverridesJson: formatJson(sample) }));
        setPreviewResult(null);
        setTestMessage(null);
        setPreviewError(null);
        setNotice('Loaded sample context overrides. Replace placeholder URLs and values before using them outside preview/test.');
    }, [form.sourceEntityType]);

    const handlePreview = React.useCallback(async () => {
        setPreviewLoading(true);
        setPreviewError(null);
        setError(null);
        setNotice(null);
        try {
            const binding = parseFormInput(form);
            const sourceEntityId = normalizeText(previewForm.sourceEntityId);
            if (!sourceEntityId) {
                throw new Error('Source entity id is required for preview.');
            }

            const preview = await previewDraftWhatsAppTemplateBinding({
                binding,
                sourceEntityType: binding.sourceEntityType ?? form.sourceEntityType.trim(),
                sourceEntityId,
                contextOverridesJson: parseContextOverridesJson(previewForm.contextOverridesJson)
            });
            setPreviewResult(preview);
            setTestMessage(null);
        } catch (nextError) {
            setPreviewError(toErrorMessage(nextError, 'Failed to render the draft preview.'));
        } finally {
            setPreviewLoading(false);
        }
    }, [form, previewForm.contextOverridesJson, previewForm.sourceEntityId]);

    const handleTestSend = React.useCallback(async () => {
        setTestSending(true);
        setPreviewError(null);
        setError(null);
        setNotice(null);
        try {
            const binding = parseFormInput(form);
            const sourceEntityId = normalizeText(previewForm.sourceEntityId);
            const recipientPhone = normalizeText(previewForm.testRecipientPhone);
            if (!sourceEntityId) {
                throw new Error('Source entity id is required for test send.');
            }
            if (!recipientPhone) {
                throw new Error('Test recipient phone is required.');
            }

            const message = await sendDraftBoundWhatsAppMessage({
                binding,
                sourceEntityType: binding.sourceEntityType ?? form.sourceEntityType.trim(),
                sourceEntityId,
                recipientPhone,
                recipientName: normalizeText(previewForm.testRecipientName),
                contextOverridesJson: parseContextOverridesJson(previewForm.contextOverridesJson),
                sendNow: true
            });
            setTestMessage(message);
            setNotice(`Test message ${message.status.toLowerCase()} for ${message.phone || recipientPhone}.`);
        } catch (nextError) {
            setPreviewError(toErrorMessage(nextError, 'Failed to send the test message.'));
        } finally {
            setTestSending(false);
        }
    }, [form, previewForm]);

    return (
        <div className="flex flex-column gap-3">
            <div className="grid">
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">WhatsApp</h2>
                        <p className="text-600 mb-0">
                            Manage tenant bindings that connect Billing, Accounts, CRM, and future custom app events to Meta templates.
                        </p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <div className="flex flex-wrap gap-2">
                        <Button label="Reload" text onClick={() => void loadPage(form.bindingKey || null)} disabled={loading || saving || syncing} />
                        <Button label="Sync Templates" text onClick={() => void handleSyncTemplates()} loading={syncing} disabled={loading || saving} />
                        <Button label="New Binding" onClick={startNewBinding} disabled={loading || saving || syncing} />
                    </div>
                    <div className="flex flex-column gap-2">
                        <div className="text-700 font-medium">Quick defaults</div>
                        {BINDING_PRESETS.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className="p-0 border-none bg-transparent text-left cursor-pointer"
                                onClick={() => applyPreset(preset)}
                                disabled={loading || saving || syncing}
                            >
                                <div className={`surface-border border-1 border-round p-3 ${selectedToken === `preset:${preset.key}` ? 'border-primary' : ''}`}>
                                    <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                        <span className="font-medium text-900">{preset.label}</span>
                                        <Tag value={preset.key} severity="info" />
                                    </div>
                                    <div className="text-600 text-sm">{preset.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-column gap-2">
                        <div className="text-700 font-medium">Saved bindings</div>
                        {bindings.length === 0 ? (
                            <Message severity="info" text="No WhatsApp bindings are saved yet for this tenant." />
                        ) : (
                            bindings.map((binding) => (
                                <button
                                    key={binding.id}
                                    type="button"
                                    className="p-0 border-none bg-transparent text-left cursor-pointer"
                                    onClick={() => openBinding(binding)}
                                    disabled={loading || saving || syncing}
                                >
                                    <div className={`surface-border border-1 border-round p-3 ${selectedToken === `binding:${binding.id}` ? 'border-primary' : ''}`}>
                                        <div className="flex align-items-center justify-content-between gap-2 mb-1">
                                            <span className="font-medium text-900">{binding.bindingKey}</span>
                                            <Tag value={binding.isActive ? 'Active' : 'Inactive'} severity={binding.isActive ? 'success' : 'warning'} />
                                        </div>
                                        <div className="text-600 text-sm mb-1">{binding.templateName || binding.templateKey || 'Template not selected'}</div>
                                        <div className="text-500 text-xs">
                                            {binding.sourceModule || 'module?'} / {binding.sourceEntityType || 'entity?'}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
            <div className="col-12 xl:col-8">
                <div className="card flex flex-column gap-3">
                    <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                        <div>
                            <h3 className="mb-1">Binding Editor</h3>
                            <div className="text-600 text-sm">
                                Configure reusable template bindings instead of hard-coding invoice, ledger, or CRM send payloads.
                            </div>
                        </div>
                        {activePreset ? <Tag value={`Preset: ${activePreset.label}`} severity="info" /> : null}
                    </div>
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            inputId="whatsapp-binding-active"
                            checked={form.isActive}
                            onChange={(event) => setForm((current) => ({ ...current, isActive: !!event.value }))}
                            disabled={loading || saving}
                        />
                        <label htmlFor="whatsapp-binding-active">Binding active</label>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label htmlFor="whatsapp-binding-key" className="block text-700 mb-2">Binding key</label>
                            <AppInput
                                inputId="whatsapp-binding-key"
                                value={form.bindingKey}
                                onChange={(event) => setForm((current) => ({ ...current, bindingKey: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="whatsapp-account-id" className="block text-700 mb-2">WhatsApp account</label>
                            <AppDropdown
                                inputId="whatsapp-account-id"
                                value={form.accountId}
                                options={accountOptions}
                                onChange={(event) => setForm((current) => ({ ...current, accountId: event.value ?? null }))}
                                placeholder="Default tenant account"
                                showClear
                                filter
                                className="w-full"
                                disabled={loading || saving}
                            />
                        </div>
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-source-module" className="block text-700 mb-2">Source module</label>
                            <AppInput
                                inputId="whatsapp-source-module"
                                value={form.sourceModule}
                                onChange={(event) => setForm((current) => ({ ...current, sourceModule: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-source-entity" className="block text-700 mb-2">Source entity type</label>
                            <AppInput
                                inputId="whatsapp-source-entity"
                                value={form.sourceEntityType}
                                onChange={(event) => setForm((current) => ({ ...current, sourceEntityType: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-template-language" className="block text-700 mb-2">Template language</label>
                            <AppInput
                                inputId="whatsapp-template-language"
                                value={form.templateLanguage}
                                onChange={(event) => setForm((current) => ({ ...current, templateLanguage: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="whatsapp-template-picker" className="block text-700 mb-2">Synced Meta template</label>
                        <AppDropdown
                            inputId="whatsapp-template-picker"
                            value={form.selectedTemplateId}
                            options={templateOptions}
                            onChange={(event) => handleTemplateChange((event.value as string | null) ?? null)}
                            placeholder={templates.length ? 'Select a synced template' : 'Sync templates first'}
                            showClear
                            filter
                            className="w-full"
                            disabled={loading || saving || syncing || templates.length === 0}
                        />
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label htmlFor="whatsapp-template-key" className="block text-700 mb-2">Template key</label>
                            <AppInput
                                inputId="whatsapp-template-key"
                                value={form.templateKey}
                                onChange={(event) => setForm((current) => ({ ...current, templateKey: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="whatsapp-template-name" className="block text-700 mb-2">Template name</label>
                            <AppInput
                                inputId="whatsapp-template-name"
                                value={form.templateName}
                                onChange={(event) => setForm((current) => ({ ...current, templateName: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="whatsapp-parameter-map-json" className="block text-700 mb-2">Parameter map JSON</label>
                        <InputTextarea
                            id="whatsapp-parameter-map-json"
                            value={form.parameterMapJson}
                            onChange={(event) => setForm((current) => ({ ...current, parameterMapJson: event.target.value }))}
                            rows={14}
                            className="w-full font-mono text-sm"
                            disabled={loading || saving}
                        />
                        <small className="text-600">
                            Use source paths like <code>{'recipient.name'}</code>, <code>{'saleInvoice.voucherNumber'}</code>,
                            <code>{'billing.dueAmount'}</code>, <code>{'ledger.name'}</code>, <code>{'statement.toDateText'}</code>,
                            <code>{'document.url'}</code>, and <code>{'document.fileName'}</code>.
                        </small>
                    </div>
                    <div>
                        <label htmlFor="whatsapp-metadata-json" className="block text-700 mb-2">Metadata JSON</label>
                        <InputTextarea
                            id="whatsapp-metadata-json"
                            value={form.metadataJson}
                            onChange={(event) => setForm((current) => ({ ...current, metadataJson: event.target.value }))}
                            rows={8}
                            className="w-full font-mono text-sm"
                            disabled={loading || saving}
                        />
                        <small className="text-600">Optional object metadata for tenant-specific notes or routing hints.</small>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Save Binding" onClick={() => void handleSave()} loading={saving} disabled={loading || syncing} />
                        <Button label="Reload Data" text onClick={() => void loadPage(form.bindingKey || null)} disabled={loading || saving || syncing} />
                    </div>
                </div>
                <div className="card flex flex-column gap-3 mt-3">
                    <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                        <div>
                            <h3 className="mb-1">Preview & Test</h3>
                            <div className="text-600 text-sm">
                                Render the current draft binding before you save it, then send a controlled test message to an explicit phone number.
                            </div>
                        </div>
                        {previewResult ? <Tag value="Draft Ready" severity="info" /> : null}
                    </div>
                    <Message severity="info" text={previewHint} />
                    <Message
                        severity="warn"
                        text="This screen does not auto-inject Billing or Accounts business-flow values. Use context overrides for billing.*, statement.*, and document.* when your template depends on them."
                    />
                    <Message
                        severity="warn"
                        text="Test send always uses the phone number entered below. Keep it as an operator-controlled number, not the customer number resolved from the source record."
                    />
                    {previewError ? <Message severity="error" text={previewError} /> : null}
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-preview-source-entity-id" className="block text-700 mb-2">Source entity id</label>
                            <AppInput
                                inputId="whatsapp-preview-source-entity-id"
                                value={previewForm.sourceEntityId}
                                onChange={(event) => {
                                    setPreviewForm((current) => ({ ...current, sourceEntityId: event.target.value }));
                                    setPreviewResult(null);
                                    setTestMessage(null);
                                    setPreviewError(null);
                                }}
                                disabled={loading || saving || syncing || previewLoading || testSending}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-preview-test-phone" className="block text-700 mb-2">Test recipient phone</label>
                            <AppInput
                                inputId="whatsapp-preview-test-phone"
                                value={previewForm.testRecipientPhone}
                                onChange={(event) => {
                                    setPreviewForm((current) => ({ ...current, testRecipientPhone: event.target.value }));
                                    setTestMessage(null);
                                    setPreviewError(null);
                                }}
                                disabled={loading || saving || syncing || previewLoading || testSending}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label htmlFor="whatsapp-preview-test-name" className="block text-700 mb-2">Test recipient name</label>
                            <AppInput
                                inputId="whatsapp-preview-test-name"
                                value={previewForm.testRecipientName}
                                onChange={(event) => {
                                    setPreviewForm((current) => ({ ...current, testRecipientName: event.target.value }));
                                    setTestMessage(null);
                                    setPreviewError(null);
                                }}
                                disabled={loading || saving || syncing || previewLoading || testSending}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="whatsapp-preview-context-json" className="block text-700 mb-2">Context overrides JSON</label>
                        <InputTextarea
                            id="whatsapp-preview-context-json"
                            value={previewForm.contextOverridesJson}
                            onChange={(event) => {
                                setPreviewForm((current) => ({ ...current, contextOverridesJson: event.target.value }));
                                setPreviewResult(null);
                                setTestMessage(null);
                                setPreviewError(null);
                            }}
                            rows={10}
                            className="w-full font-mono text-sm"
                            disabled={loading || saving || syncing || previewLoading || testSending}
                        />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            label="Load Sample Context"
                            text
                            onClick={handleLoadSampleContext}
                            disabled={loading || saving || syncing || previewLoading || testSending}
                        />
                        <Button
                            label="Render Preview"
                            onClick={() => void handlePreview()}
                            loading={previewLoading}
                            disabled={loading || saving || syncing || testSending}
                        />
                        <Button
                            label="Send Test"
                            severity="secondary"
                            onClick={() => void handleTestSend()}
                            loading={testSending}
                            disabled={loading || saving || syncing || previewLoading}
                        />
                        <Button
                            label="Clear Output"
                            text
                            onClick={resetPreviewState}
                            disabled={loading || saving || syncing || previewLoading || testSending}
                        />
                    </div>
                    {previewResult ? (
                        <div className="surface-border border-1 border-round p-3 flex flex-column gap-2">
                            <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                                <div className="text-700 font-medium">Rendered preview</div>
                                <Tag value={previewResult.binding.bindingKey} severity="info" />
                            </div>
                            <div className="text-600 text-sm">
                                Resolved source: {previewResult.sourceModule} / {previewResult.sourceEntityType} / {previewResult.sourceEntityId}
                            </div>
                            <div className="text-600 text-sm">
                                Resolved recipient: {previewResult.recipientName || 'Unnamed'} / {previewResult.recipientPhone}
                            </div>
                            {testMessage ? (
                                <div className="flex align-items-center gap-2 flex-wrap">
                                    <Tag value={testMessage.status} severity={previewStatusSeverity(testMessage.status)} />
                                    <span className="text-600 text-sm">
                                        Last test send: {testMessage.id}
                                        {testMessage.waMessageId ? ` / Meta ${testMessage.waMessageId}` : ''}
                                    </span>
                                </div>
                            ) : null}
                            <div>
                                <label htmlFor="whatsapp-preview-context-output" className="block text-700 mb-2">Rendered context</label>
                                <InputTextarea
                                    id="whatsapp-preview-context-output"
                                    value={previewResult.contextJson}
                                    rows={10}
                                    className="w-full font-mono text-sm"
                                    readOnly
                                />
                            </div>
                            <div>
                                <label htmlFor="whatsapp-preview-parameters-output" className="block text-700 mb-2">Rendered parameter values</label>
                                <InputTextarea
                                    id="whatsapp-preview-parameters-output"
                                    value={previewResult.parameterValuesJson || '[]'}
                                    rows={10}
                                    className="w-full font-mono text-sm"
                                    readOnly
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className="card flex flex-column gap-3 mt-3">
                    <h3 className="mb-0">Binding Notes</h3>
                    <Message
                        severity="info"
                        text="This UI manages the generalized binding model used by invoice send, ledger statement, and future CRM or custom-template flows. The app feature decides the source entity; the binding decides how it maps into a Meta template."
                    />
                    <div>
                        <div className="text-700 font-medium mb-2">Available source blocks today</div>
                        <div className="text-600 text-sm">Invoice: recipient.*, saleInvoice.*, billing.*, document.*</div>
                        <div className="text-600 text-sm">Ledger statement: recipient.*, ledger.*, statement.*, document.*</div>
                        <div className="text-600 text-sm">CRM party: recipient.*, ledger.*, crmParty.*, plus campaign-supplied event.*, birthday.*, anniversary.*</div>
                        <div className="text-600 text-sm">Use a Meta document header template and map the header parameter to <code>{'document.url'}</code>.</div>
                        <div className="text-600 text-sm">Optional file naming is available through <code>{'document.fileName'}</code>.</div>
                        <div className="text-600 text-sm">Document links require backend config: <code>WHATSAPP_PUBLIC_BASE_URL</code> and <code>WHATSAPP_DOCUMENT_SIGNING_SECRET</code>.</div>
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Recommended seed flow</div>
                        <div className="text-600 text-sm">1. Sync templates from Meta.</div>
                        <div className="text-600 text-sm">2. Open Invoice Send or Ledger Statement quick default.</div>
                        <div className="text-600 text-sm">3. Pick the synced template, adjust parameter map positions, render a preview, then save.</div>
                        <div className="text-600 text-sm">4. Use Send Test with an operator-controlled phone number before live module sends.</div>
                        <div className="text-600 text-sm">5. Create birthday, anniversary, or broadcast campaigns below after the binding is active.</div>
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Current inventory</div>
                        <div className="text-600 text-sm">Accounts: {accounts.length}</div>
                        <div className="text-600 text-sm">Templates: {templates.length}</div>
                        <div className="text-600 text-sm">Bindings: {bindings.length}</div>
                    </div>
                </div>
            </div>
            </div>
            <CampaignManagerPanel bindings={bindings} />
        </div>
    );
}










