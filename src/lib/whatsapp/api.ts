import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

export type WhatsAppAccount = {
    id: string;
    displayName: string | null;
    businessId: string;
    phoneId: string;
    phoneNumber: string | null;
    defaultLocale: string | null;
    isDefault: boolean;
    isActive: boolean;
    sandboxMode: boolean;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppTemplate = {
    id: string;
    accountId: string | null;
    templateKey: string | null;
    templateName: string | null;
    waTemplateId: string | null;
    waTemplateName: string;
    category: string | null;
    language: string | null;
    status: string | null;
    headerFormat: string | null;
    bodyText: string | null;
    footerText: string | null;
    buttonsJson: string | null;
    parameterSchemaJson: string | null;
    componentsJson: string | null;
    rawPayloadJson: string | null;
    qualityScore: string | null;
    rejectionReason: string | null;
    isActive: boolean;
    lastSyncedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppTemplateBindingParameter = {
    componentType: string;
    parameterType: string;
    position?: number | null;
    buttonIndex?: number | null;
    buttonSubType?: string | null;
    valuePath?: string | null;
    staticValue?: string | null;
    fallbackPath?: string | null;
    staticFallbackValue?: string | null;
    fileNamePath?: string | null;
    staticFileName?: string | null;
    codePath?: string | null;
    staticCode?: string | null;
};

export type WhatsAppTemplateBinding = {
    id: string;
    accountId: string | null;
    bindingKey: string;
    templateKey: string | null;
    templateName: string | null;
    templateLanguage: string | null;
    sourceModule: string | null;
    sourceEntityType: string | null;
    parameterMapJson: string | null;
    metadataJson: string | null;
    parameterMap: WhatsAppTemplateBindingParameter[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppTemplateParameterValue = {
    componentType: string;
    parameterType: string;
    position?: number | null;
    buttonIndex?: number | null;
    buttonSubType?: string | null;
    textValue?: string | null;
    mediaLink?: string | null;
    mediaFileName?: string | null;
    currencyCode?: string | null;
    amount1000?: string | null;
    fallbackValue?: string | null;
    payloadValue?: string | null;
};

export type WhatsAppTemplateBindingPreview = {
    binding: WhatsAppTemplateBinding;
    sourceModule: string;
    sourceEntityType: string;
    sourceEntityId: string;
    recipientName: string | null;
    recipientPhone: string;
    contextJson: string;
    parameterValuesJson: string | null;
};

export type WhatsAppMessage = {
    id: string;
    accountId: string | null;
    contactId: string;
    direction: string;
    kind: string;
    sourceModule: string | null;
    sourceEntityType: string | null;
    sourceEntityId: string | null;
    campaignKey: string | null;
    recipientName: string | null;
    phone: string | null;
    phoneE164: string | null;
    conversationId: string | null;
    waMessageId: string | null;
    templateKey: string | null;
    templateName: string | null;
    templateLanguage: string | null;
    bodyText: string | null;
    mediaType: string | null;
    mediaLink: string | null;
    mediaMimeType: string | null;
    mediaFileName: string | null;
    status: string;
    errorCode: string | null;
    errorDetail: string | null;
    parameterValuesJson: string | null;
    payloadJson: string | null;
    providerRequestJson: string | null;
    providerResponseJson: string | null;
    idempotencyKey: string | null;
    scheduledAt: string | null;
    receivedAt: string | null;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    lastStatusAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type UpsertWhatsAppTemplateBindingInput = {
    bindingId?: string | null;
    accountId?: string | null;
    bindingKey: string;
    templateKey?: string | null;
    templateName?: string | null;
    templateLanguage?: string | null;
    sourceModule?: string | null;
    sourceEntityType?: string | null;
    parameterMap?: WhatsAppTemplateBindingParameter[] | null;
    metadataJson?: string | null;
    isActive?: boolean | null;
};

export type PreviewDraftWhatsAppTemplateBindingInput = {
    binding: UpsertWhatsAppTemplateBindingInput;
    sourceEntityType: string;
    sourceEntityId: string;
    contextOverridesJson?: string | null;
};

export type SendDraftBoundWhatsAppMessageInput = {
    binding: UpsertWhatsAppTemplateBindingInput;
    sourceEntityType: string;
    sourceEntityId: string;
    recipientPhone?: string | null;
    recipientName?: string | null;
    contextOverridesJson?: string | null;
    parameterOverrides?: WhatsAppTemplateParameterValue[] | null;
    campaignKey?: string | null;
    idempotencyKey?: string | null;
    scheduledAt?: string | null;
    sendNow?: boolean | null;
};

export type ListWhatsAppTemplatesInput = {
    accountId?: string | null;
    status?: string | null;
    category?: string | null;
    language?: string | null;
    search?: string | null;
    limit?: number | null;
};

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const whatsAppGraphqlUrl = apiUrl('/whatsapp/graphql');

const requestWhatsAppGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(whatsAppGraphqlUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ query, variables })
    });

    const text = await res.text();
    const json = text ? (JSON.parse(text) as GraphqlResponse<T>) : null;
    const errors = json?.errors ?? [];

    if (errors.length) {
        const code = errors[0]?.extensions?.code;
        if (retryOnAuth && code === 'UNAUTHENTICATED') {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
                return await requestWhatsAppGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

const bindingFields = `
    id
    accountId
    bindingKey
    templateKey
    templateName
    templateLanguage
    sourceModule
    sourceEntityType
    parameterMapJson
    metadataJson
    parameterMap {
        componentType
        parameterType
        position
        buttonIndex
        buttonSubType
        valuePath
        staticValue
        fallbackPath
        staticFallbackValue
        fileNamePath
        staticFileName
        codePath
        staticCode
    }
    isActive
    createdAt
    updatedAt
`;

const templateFields = `
    id
    accountId
    templateKey
    templateName
    waTemplateId
    waTemplateName
    category
    language
    status
    headerFormat
    bodyText
    footerText
    buttonsJson
    parameterSchemaJson
    componentsJson
    rawPayloadJson
    qualityScore
    rejectionReason
    isActive
    lastSyncedAt
    createdAt
    updatedAt
`;

const bindingPreviewFields = `
    binding {
        ${bindingFields}
    }
    sourceModule
    sourceEntityType
    sourceEntityId
    recipientName
    recipientPhone
    contextJson
    parameterValuesJson
`;

const messageFields = `
    id
    accountId
    contactId
    direction
    kind
    sourceModule
    sourceEntityType
    sourceEntityId
    campaignKey
    recipientName
    phone
    phoneE164
    conversationId
    waMessageId
    templateKey
    templateName
    templateLanguage
    bodyText
    mediaType
    mediaLink
    mediaMimeType
    mediaFileName
    status
    errorCode
    errorDetail
    parameterValuesJson
    payloadJson
    providerRequestJson
    providerResponseJson
    idempotencyKey
    scheduledAt
    receivedAt
    sentAt
    deliveredAt
    readAt
    failedAt
    lastStatusAt
    createdAt
    updatedAt
`;

export const listWhatsAppAccounts = async () => {
    const data = await requestWhatsAppGraphql<{ whatsappAccounts: WhatsAppAccount[] }>(
        `query WhatsAppAccounts {
            whatsappAccounts {
                id
                displayName
                businessId
                phoneId
                phoneNumber
                defaultLocale
                isDefault
                isActive
                sandboxMode
                createdAt
                updatedAt
            }
        }`
    );
    return data.whatsappAccounts;
};

export const listWhatsAppTemplates = async (filter?: ListWhatsAppTemplatesInput | null) => {
    const data = await requestWhatsAppGraphql<{ whatsappTemplates: WhatsAppTemplate[] }>(
        `query WhatsAppTemplates($filter: WhatsAppTemplateFilterInput) {
            whatsappTemplates(filter: $filter) {
                ${templateFields}
            }
        }`,
        filter ? { filter } : undefined
    );
    return data.whatsappTemplates;
};

export const syncWhatsAppTemplates = async (accountId?: string | null) => {
    const data = await requestWhatsAppGraphql<{ syncWhatsAppTemplates: WhatsAppTemplate[] }>(
        `mutation SyncWhatsAppTemplates($accountId: String) {
            syncWhatsAppTemplates(accountId: $accountId) {
                ${templateFields}
            }
        }`,
        { accountId: accountId ?? null }
    );
    return data.syncWhatsAppTemplates;
};

export const listWhatsAppTemplateBindings = async () => {
    const data = await requestWhatsAppGraphql<{ whatsappTemplateBindings: WhatsAppTemplateBinding[] }>(
        `query WhatsAppTemplateBindings {
            whatsappTemplateBindings {
                ${bindingFields}
            }
        }`
    );
    return data.whatsappTemplateBindings;
};

export const upsertWhatsAppTemplateBinding = async (input: UpsertWhatsAppTemplateBindingInput) => {
    const data = await requestWhatsAppGraphql<{ upsertWhatsAppTemplateBinding: WhatsAppTemplateBinding }>(
        `mutation UpsertWhatsAppTemplateBinding($input: UpsertWhatsAppTemplateBindingInput!) {
            upsertWhatsAppTemplateBinding(input: $input) {
                ${bindingFields}
            }
        }`,
        { input }
    );
    return data.upsertWhatsAppTemplateBinding;
};

export const previewDraftWhatsAppTemplateBinding = async (input: PreviewDraftWhatsAppTemplateBindingInput) => {
    const data = await requestWhatsAppGraphql<{ whatsappTemplateBindingDraftPreview: WhatsAppTemplateBindingPreview }>(
        `query PreviewDraftWhatsAppTemplateBinding($input: PreviewDraftWhatsAppTemplateBindingInput!) {
            whatsappTemplateBindingDraftPreview(input: $input) {
                ${bindingPreviewFields}
            }
        }`,
        { input }
    );
    return data.whatsappTemplateBindingDraftPreview;
};

export const sendDraftBoundWhatsAppMessage = async (input: SendDraftBoundWhatsAppMessageInput) => {
    const data = await requestWhatsAppGraphql<{ sendDraftBoundWhatsAppMessage: WhatsAppMessage }>(
        `mutation SendDraftBoundWhatsAppMessage($input: SendDraftBoundWhatsAppMessageInput!) {
            sendDraftBoundWhatsAppMessage(input: $input) {
                ${messageFields}
            }
        }`,
        { input }
    );
    return data.sendDraftBoundWhatsAppMessage;
};

export const getWhatsAppMessage = async (messageId: string) => {
    const data = await requestWhatsAppGraphql<{ whatsappMessage: WhatsAppMessage | null }>(
        `query WhatsAppMessage($messageId: String!) {
            whatsappMessage(messageId: $messageId) {
                ${messageFields}
            }
        }`,
        { messageId }
    );

    if (!data.whatsappMessage) {
        throw new Error(`WhatsApp message "${messageId}" was not found`);
    }

    return data.whatsappMessage;
};

export type WhatsAppCampaign = {
    id: string;
    campaignKey: string;
    name: string;
    triggerType: string;
    bindingKey: string;
    sourceModule: string | null;
    sourceEntityType: string;
    audienceJson: string | null;
    scheduleJson: string | null;
    defaultContextJson: string | null;
    requireOptIn: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppCampaignRun = {
    id: string;
    campaignId: string;
    campaignKey: string;
    runKey: string;
    triggerType: string;
    status: string;
    runDate: string;
    sendNow: boolean;
    scheduledAt: string | null;
    recipientCount: number;
    queuedCount: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    sandboxCount: number;
    skippedCount: number;
    failureCount: number;
    contextJson: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppCampaignRunItem = {
    id: string;
    runId: string;
    campaignId: string;
    campaignKey: string;
    sourceEntityType: string;
    sourceEntityId: string;
    recipientName: string | null;
    recipientPhone: string | null;
    phoneE164: string | null;
    status: string;
    skipReason: string | null;
    messageId: string | null;
    waMessageId: string | null;
    contextJson: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppAutomationExecution = {
    id: string;
    status: string;
    dryRun: boolean;
    campaignScannedCount: number;
    dueCampaignCount: number;
    generatedRunCount: number;
    campaignSkippedCount: number;
    campaignFailureCount: number;
    dispatchProcessedCount: number;
    dispatchSentCount: number;
    dispatchSandboxCount: number;
    dispatchFailedCount: number;
    dispatchSkippedCount: number;
    error: string | null;
    startedAt: string;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type WhatsAppAutomationExecutionItem = {
    id: string;
    executionId: string;
    campaignId: string | null;
    campaignKey: string | null;
    timezone: string | null;
    runDate: string | null;
    scheduledAt: string | null;
    sendNow: boolean;
    status: string;
    reason: string | null;
    runId: string | null;
    createdAt: string;
};

export type UpsertWhatsAppCampaignInput = {
    campaignId?: string | null;
    campaignKey: string;
    name: string;
    triggerType: string;
    bindingKey: string;
    sourceModule?: string | null;
    sourceEntityType: string;
    audienceJson?: string | null;
    scheduleJson?: string | null;
    defaultContextJson?: string | null;
    requireOptIn?: boolean | null;
    isActive?: boolean | null;
};

export type GenerateWhatsAppCampaignRunInput = {
    campaignKey: string;
    runDate?: string | null;
    scheduledAt?: string | null;
    sendNow?: boolean | null;
    contextJson?: string | null;
};

const campaignFields = `
    id
    campaignKey
    name
    triggerType
    bindingKey
    sourceModule
    sourceEntityType
    audienceJson
    scheduleJson
    defaultContextJson
    requireOptIn
    isActive
    createdAt
    updatedAt
`;

const campaignRunFields = `
    id
    campaignId
    campaignKey
    runKey
    triggerType
    status
    runDate
    sendNow
    scheduledAt
    recipientCount
    queuedCount
    sentCount
    deliveredCount
    readCount
    sandboxCount
    skippedCount
    failureCount
    contextJson
    createdAt
    updatedAt
`;

const campaignRunItemFields = `
    id
    runId
    campaignId
    campaignKey
    sourceEntityType
    sourceEntityId
    recipientName
    recipientPhone
    phoneE164
    status
    skipReason
    messageId
    waMessageId
    contextJson
    createdAt
    updatedAt
`;

const automationExecutionFields = `
    id
    status
    dryRun
    campaignScannedCount
    dueCampaignCount
    generatedRunCount
    campaignSkippedCount
    campaignFailureCount
    dispatchProcessedCount
    dispatchSentCount
    dispatchSandboxCount
    dispatchFailedCount
    dispatchSkippedCount
    error
    startedAt
    completedAt
    createdAt
    updatedAt
`;

const automationExecutionItemFields = `
    id
    executionId
    campaignId
    campaignKey
    timezone
    runDate
    scheduledAt
    sendNow
    status
    reason
    runId
    createdAt
`;

export const listWhatsAppCampaigns = async () => {
    const data = await requestWhatsAppGraphql<{ whatsappCampaigns: WhatsAppCampaign[] }>(
        `query WhatsAppCampaigns {
            whatsappCampaigns {
                ${campaignFields}
            }
        }`
    );
    return data.whatsappCampaigns;
};

export const upsertWhatsAppCampaign = async (input: UpsertWhatsAppCampaignInput) => {
    const data = await requestWhatsAppGraphql<{ upsertWhatsAppCampaign: WhatsAppCampaign }>(
        `mutation UpsertWhatsAppCampaign($input: UpsertWhatsAppCampaignInput!) {
            upsertWhatsAppCampaign(input: $input) {
                ${campaignFields}
            }
        }`,
        { input }
    );
    return data.upsertWhatsAppCampaign;
};

export const listWhatsAppCampaignRuns = async (args?: { campaignKey?: string | null; limit?: number | null }) => {
    const data = await requestWhatsAppGraphql<{ whatsappCampaignRuns: WhatsAppCampaignRun[] }>(
        `query WhatsAppCampaignRuns($campaignKey: String, $limit: Int) {
            whatsappCampaignRuns(campaignKey: $campaignKey, limit: $limit) {
                ${campaignRunFields}
            }
        }`,
        { campaignKey: args?.campaignKey ?? null, limit: args?.limit ?? null }
    );
    return data.whatsappCampaignRuns;
};

export const listWhatsAppCampaignRunItems = async (runId: string) => {
    const data = await requestWhatsAppGraphql<{ whatsappCampaignRunItems: WhatsAppCampaignRunItem[] }>(
        `query WhatsAppCampaignRunItems($runId: String!) {
            whatsappCampaignRunItems(runId: $runId) {
                ${campaignRunItemFields}
            }
        }`,
        { runId }
    );
    return data.whatsappCampaignRunItems;
};

export const reprocessWhatsAppCampaignRunItem = async (runItemId: string) => {
    const data = await requestWhatsAppGraphql<{ reprocessWhatsAppCampaignRunItem: WhatsAppCampaignRunItem }>(
        `mutation ReprocessWhatsAppCampaignRunItem($runItemId: String!) {
            reprocessWhatsAppCampaignRunItem(runItemId: $runItemId) {
                ${campaignRunItemFields}
            }
        }`,
        { runItemId }
    );
    return data.reprocessWhatsAppCampaignRunItem;
};
export const generateWhatsAppCampaignRun = async (input: GenerateWhatsAppCampaignRunInput) => {
    const data = await requestWhatsAppGraphql<{ generateWhatsAppCampaignRun: WhatsAppCampaignRun }>(
        `mutation GenerateWhatsAppCampaignRun($input: GenerateWhatsAppCampaignRunInput!) {
            generateWhatsAppCampaignRun(input: $input) {
                ${campaignRunFields}
            }
        }`,
        { input }
    );
    return data.generateWhatsAppCampaignRun;
};

export const listWhatsAppAutomationExecutions = async (args?: { limit?: number | null }) => {
    const data = await requestWhatsAppGraphql<{ whatsappAutomationExecutions: WhatsAppAutomationExecution[] }>(
        `query WhatsAppAutomationExecutions($limit: Int) {
            whatsappAutomationExecutions(limit: $limit) {
                ${automationExecutionFields}
            }
        }`,
        { limit: args?.limit ?? null }
    );
    return data.whatsappAutomationExecutions;
};

export const listWhatsAppAutomationExecutionItems = async (executionId: string) => {
    const data = await requestWhatsAppGraphql<{ whatsappAutomationExecutionItems: WhatsAppAutomationExecutionItem[] }>(
        `query WhatsAppAutomationExecutionItems($executionId: String!) {
            whatsappAutomationExecutionItems(executionId: $executionId) {
                ${automationExecutionItemFields}
            }
        }`,
        { executionId }
    );
    return data.whatsappAutomationExecutionItems;
};

