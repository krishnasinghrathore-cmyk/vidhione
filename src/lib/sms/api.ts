import { apiUrl } from '@/lib/apiBaseUrl';
import { refreshAccessToken } from '@/lib/auth/api';
import { getAccessToken } from '@/lib/auth/storage';

export type SmsTemplateBinding = {
    id: string;
    bindingKey: string;
    templateKey: string | null;
    senderId: string | null;
    messageTextTemplate: string | null;
    sourceApp: string | null;
    sourceModule: string | null;
    sourceEvent: string | null;
    sourceEntityType: string | null;
    metadataJson: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type SmsTemplateBindingPreview = {
    bindingFound: boolean;
    bindingKey: string;
    templateKey: string | null;
    senderId: string | null;
    contextJson: string;
    renderedMessageText: string | null;
    renderedMetadataJson: string | null;
};

export type SmsMessageRecipientReference = {
    type: string;
    id: string;
};

export type SmsMessageRecipient = {
    phone: string;
    name: string | null;
    reference: SmsMessageRecipientReference | null;
};

export type SmsMessageContent = {
    type: string;
    templateKey: string | null;
    textPreview: string;
    bodyLength: number;
};

export type SmsMessageSource = {
    app: string | null;
    module: string | null;
    event: string | null;
    entityType: string | null;
    entityId: string | null;
};

export type SmsMessageRequestedBy = {
    userId: string | null;
    role: string | null;
};

export type SmsMessageSummary = {
    id: string;
    status: string;
    duplicate: boolean;
    idempotencyKey: string | null;
    providerMessageId: string | null;
    note: string | null;
    senderId: string | null;
    errorCode: string | null;
    errorDetail: string | null;
    correlationId: string | null;
    recipient: SmsMessageRecipient;
    message: SmsMessageContent;
    source: SmsMessageSource | null;
    requestedBy: SmsMessageRequestedBy | null;
    metadataJson: string | null;
    tags: string[];
    sentAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
    createdAt: string;
};

export type SmsMessageConnection = {
    items: SmsMessageSummary[];
    nextCursor: string | null;
};

export type ListSmsMessagesInput = {
    toPhone?: string | null;
    status?: string | null;
    recipientEntityType?: string | null;
    recipientEntityId?: string | null;
    sourceApp?: string | null;
    sourceModule?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
    sourceEntityId?: string | null;
    correlationId?: string | null;
    limit?: number | null;
    cursor?: string | null;
};

export type ListAllSmsMessagesInput = Omit<ListSmsMessagesInput, 'limit' | 'cursor'> & {
    maxRows?: number | null;
    pageSize?: number | null;
};

export type SmsMessageExportBatch = {
    items: SmsMessageSummary[];
    truncated: boolean;
    nextCursor: string | null;
};

export type SmsWebhookEventSummary = {
    id: string;
    providerMessageId: string | null;
    signature: string | null;
    receivedAt: string;
    rawStatus: string | null;
    deliveryStatus: string | null;
    errorCode: string | null;
    errorDetail: string | null;
    eventJson: string;
};

export type ListSmsWebhookEventsInput = {
    messageId?: string | null;
    providerMessageId?: string | null;
    limit?: number | null;
};

export type SmsStatusCount = {
    status: string;
    count: number;
};

export type SmsFailureCodeSummary = {
    errorCode: string;
    count: number;
};

export type SmsDailySummaryBucket = {
    date: string;
    totalCount: number;
    deliveredCount: number;
    failedCount: number;
};

export type SmsDeliverySummaryReport = {
    windowDays: number;
    totalCount: number;
    deliveredCount: number;
    failedCount: number;
    queuedCount: number;
    sentCount: number;
    sandboxCount: number;
    receivedCount: number;
    latestMessageAt: string | null;
    statusCounts: SmsStatusCount[];
    topFailureCodes: SmsFailureCodeSummary[];
    dailyBuckets: SmsDailySummaryBucket[];
};

export type GetSmsDeliverySummaryInput = {
    sourceApp?: string | null;
    sourceModule?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
    days?: number | null;
};

export type GetSmsOperationalSnapshotInput = {
    sourceApp?: string | null;
    sourceModule?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
};

export type SmsOperationalStatusBucket = {
    status: string;
    count: number;
    oldestMessageAt: string | null;
    latestMessageAt: string | null;
};

export type SmsOperationalSnapshot = {
    attentionCount: number;
    pendingCount: number;
    issueCount: number;
    oldestPendingAt: string | null;
    latestIssueAt: string | null;
    statusBuckets: SmsOperationalStatusBucket[];
    pendingItems: SmsMessageSummary[];
    issueItems: SmsMessageSummary[];
};

export type SmsTenantOperationalOverviewItem = {
    bindingKey: string | null;
    sourceApp: string | null;
    sourceModule: string | null;
    sourceEvent: string | null;
    sourceEntityType: string | null;
    isConfigured: boolean;
    isActive: boolean | null;
    attentionCount: number;
    pendingCount: number;
    issueCount: number;
    oldestPendingAt: string | null;
    latestIssueAt: string | null;
};

export type SmsTenantOperationalOverview = {
    configuredBindingCount: number;
    attentionBindingCount: number;
    unconfiguredSourceCount: number;
    totalAttentionCount: number;
    totalPendingCount: number;
    totalIssueCount: number;
    items: SmsTenantOperationalOverviewItem[];
};

export type SmsAlertThresholdSettings = {
    enabled: boolean;
    failedRatePercent: number;
    minimumMessagesForRateAlert: number;
    pendingCount: number;
    issueCount: number;
    unconfiguredSourceCount: number;
    oldestPendingHours: number;
    rateWindowDays: number;
    cooldownHours: number;
};

export type SmsAlertEvent = {
    id: string;
    scopeApp: string | null;
    rateWindowDays: number;
    cooldownHours: number;
    alertCount: number;
    triggeredKeys: string[];
    alertsJson: string;
    reviewStatus: 'open' | 'acknowledged';
    reviewedByUserId: string | null;
    reviewedByRole: string | null;
    reviewNote: string | null;
    reviewedAt: string | null;
    createdAt: string;
};

export type SmsAlertEmailDeliverySettings = {
    enabled: boolean;
    recipientEmails: string[];
    subjectPrefix: string;
};

export type SmsSettings = {
    id: string;
    alertThresholds: SmsAlertThresholdSettings;
    alertEmailDelivery: SmsAlertEmailDeliverySettings;
    createdAt: string;
    updatedAt: string;
};

export type UpsertSmsSettingsInput = {
    alertThresholds: SmsAlertThresholdSettings;
    alertEmailDelivery?: SmsAlertEmailDeliverySettings | null;
};

export type SmsRetryPolicyConfig = {
    enabled: boolean;
    maxAttempts: number;
    retryAfterMinutes: number;
    withinHours: number;
    maxMessagesPerRun: number;
    statuses: string[];
    skipErrorCodes: string[];
};

export type SmsRetrySweepDecision = {
    messageId: string;
    recipientPhone: string;
    currentStatus: string;
    retryAttempt: number;
    status: 'dry_run' | 'retried' | 'skipped' | 'failed';
    reason: string | null;
    retryMessageId: string | null;
    retryMessageStatus: string | null;
    error: string | null;
};

export type SmsRetrySweepResult = {
    bindingKey: string;
    dryRun: boolean;
    policy: SmsRetryPolicyConfig;
    scannedCount: number;
    eligibleCount: number;
    retriedCount: number;
    skippedCount: number;
    failureCount: number;
    decisions: SmsRetrySweepDecision[];
};

export type UpsertSmsTemplateBindingInput = {
    bindingId?: string | null;
    bindingKey: string;
    templateKey?: string | null;
    senderId?: string | null;
    messageTextTemplate?: string | null;
    sourceApp?: string | null;
    sourceModule?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
    metadataJson?: string | null;
    isActive?: boolean | null;
};

type GraphqlError = {
    message: string;
    extensions?: { code?: string };
};

type GraphqlResponse<T> = {
    data?: T;
    errors?: GraphqlError[];
};

const smsGraphqlUrl = apiUrl('/sms/graphql');
const SMS_EXPORT_PAGE_SIZE = 100;
const SMS_EXPORT_MAX_ROWS = 500;

const requestSmsGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
    retryOnAuth = true
): Promise<T> => {
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(smsGraphqlUrl, {
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
                return await requestSmsGraphql<T>(query, variables, false);
            }
        }
        throw new Error(errors[0]?.message || 'Request failed');
    }

    if (!res.ok || !json?.data) {
        throw new Error(`Request failed (${res.status})`);
    }

    return json.data;
};

export const getSmsSettings = async () => {
    const data = await requestSmsGraphql<{ smsSettings: SmsSettings }>(
        `query SmsSettings {
            smsSettings {
                id
                alertThresholds {
                    enabled
                    failedRatePercent
                    minimumMessagesForRateAlert
                    pendingCount
                    issueCount
                    unconfiguredSourceCount
                    oldestPendingHours
                    rateWindowDays
                    cooldownHours
                }
                alertEmailDelivery {
                    enabled
                    recipientEmails
                    subjectPrefix
                }
                createdAt
                updatedAt
            }
        }`
    );
    return data.smsSettings;
};

export const upsertSmsSettings = async (input: UpsertSmsSettingsInput) => {
    const data = await requestSmsGraphql<{ upsertSmsSettings: SmsSettings }>(
        `mutation UpsertSmsSettings($input: UpsertSmsSettingsInput!) {
            upsertSmsSettings(input: $input) {
                id
                alertThresholds {
                    enabled
                    failedRatePercent
                    minimumMessagesForRateAlert
                    pendingCount
                    issueCount
                    unconfiguredSourceCount
                    oldestPendingHours
                    rateWindowDays
                    cooldownHours
                }
                alertEmailDelivery {
                    enabled
                    recipientEmails
                    subjectPrefix
                }
                createdAt
                updatedAt
            }
        }`,
        { input }
    );
    return data.upsertSmsSettings;
};

export const listSmsAlertEvents = async (limit = 20) => {
    const data = await requestSmsGraphql<{ smsAlertEvents: SmsAlertEvent[] }>(
        `query SmsAlertEvents($limit: Int) {
            smsAlertEvents(limit: $limit) {
                id
                scopeApp
                rateWindowDays
                cooldownHours
                alertCount
                triggeredKeys
                alertsJson
                reviewStatus
                reviewedByUserId
                reviewedByRole
                reviewNote
                reviewedAt
                createdAt
            }
        }`,
        { limit }
    );
    return data.smsAlertEvents;
};

export const setSmsAlertEventReview = async (input: {
    eventId: string;
    status: 'open' | 'acknowledged';
    note?: string | null;
}) => {
    const data = await requestSmsGraphql<{ setSmsAlertEventReview: SmsAlertEvent }>(
        `mutation SetSmsAlertEventReview($input: SetSmsAlertEventReviewInput!) {
            setSmsAlertEventReview(input: $input) {
                id
                scopeApp
                rateWindowDays
                cooldownHours
                alertCount
                triggeredKeys
                alertsJson
                reviewStatus
                reviewedByUserId
                reviewedByRole
                reviewNote
                reviewedAt
                createdAt
            }
        }`,
        { input }
    );
    return data.setSmsAlertEventReview;
};

export const getSmsTemplateBinding = async (bindingKey: string) => {
    const data = await requestSmsGraphql<{ smsTemplateBinding: SmsTemplateBinding | null }>(
        `query SmsTemplateBinding($bindingKey: String!) {
            smsTemplateBinding(bindingKey: $bindingKey) {
                id
                bindingKey
                templateKey
                senderId
                messageTextTemplate
                sourceApp
                sourceModule
                sourceEvent
                sourceEntityType
                metadataJson
                isActive
                createdAt
                updatedAt
            }
        }`,
        { bindingKey }
    );
    return data.smsTemplateBinding;
};

export const upsertSmsTemplateBinding = async (input: UpsertSmsTemplateBindingInput) => {
    const data = await requestSmsGraphql<{ upsertSmsTemplateBinding: SmsTemplateBinding }>(
        `mutation UpsertSmsTemplateBinding($input: UpsertSmsTemplateBindingInput!) {
            upsertSmsTemplateBinding(input: $input) {
                id
                bindingKey
                templateKey
                senderId
                messageTextTemplate
                sourceApp
                sourceModule
                sourceEvent
                sourceEntityType
                metadataJson
                isActive
                createdAt
                updatedAt
            }
        }`,
        { input }
    );
    return data.upsertSmsTemplateBinding;
};

export const previewSmsTemplateBinding = async (input: {
    bindingKey: string;
    contextJson?: string | null;
    templateKey?: string | null;
    senderId?: string | null;
    messageTextTemplate?: string | null;
    metadataJson?: string | null;
}) => {
    const data = await requestSmsGraphql<{ smsTemplateBindingPreview: SmsTemplateBindingPreview }>(
        `query SmsTemplateBindingPreview(
            $bindingKey: String!
            $contextJson: String
            $templateKey: String
            $senderId: String
            $messageTextTemplate: String
            $metadataJson: String
        ) {
            smsTemplateBindingPreview(
                bindingKey: $bindingKey
                contextJson: $contextJson
                templateKey: $templateKey
                senderId: $senderId
                messageTextTemplate: $messageTextTemplate
                metadataJson: $metadataJson
            ) {
                bindingFound
                bindingKey
                templateKey
                senderId
                contextJson
                renderedMessageText
                renderedMetadataJson
            }
        }`,
        input
    );
    return data.smsTemplateBindingPreview;
};

export const listSmsMessages = async (input: ListSmsMessagesInput) => {
    const data = await requestSmsGraphql<{ smsMessages: SmsMessageConnection }>(
        `query SmsMessages(
            $toPhone: String
            $status: String
            $recipientEntityType: String
            $recipientEntityId: String
            $sourceApp: String
            $sourceModule: String
            $sourceEvent: String
            $sourceEntityType: String
            $sourceEntityId: String
            $correlationId: String
            $limit: Int
            $cursor: String
        ) {
            smsMessages(
                toPhone: $toPhone
                status: $status
                recipientEntityType: $recipientEntityType
                recipientEntityId: $recipientEntityId
                sourceApp: $sourceApp
                sourceModule: $sourceModule
                sourceEvent: $sourceEvent
                sourceEntityType: $sourceEntityType
                sourceEntityId: $sourceEntityId
                correlationId: $correlationId
                limit: $limit
                cursor: $cursor
            ) {
                items {
                    id
                    status
                    duplicate
                    idempotencyKey
                    providerMessageId
                    note
                    senderId
                    errorCode
                    errorDetail
                    correlationId
                    recipient {
                        phone
                        name
                        reference {
                            type
                            id
                        }
                    }
                    message {
                        type
                        templateKey
                        textPreview
                        bodyLength
                    }
                    source {
                        app
                        module
                        event
                        entityType
                        entityId
                    }
                    requestedBy {
                        userId
                        role
                    }
                    metadataJson
                    tags
                    sentAt
                    deliveredAt
                    failedAt
                    createdAt
                }
                nextCursor
            }
        }`,
        input
    );
    return data.smsMessages;
};

export const listAllSmsMessages = async (input: ListAllSmsMessagesInput): Promise<SmsMessageExportBatch> => {
    const { maxRows, pageSize, ...filters } = input;
    const normalizedMaxRows = Math.min(
        Math.max(Math.floor(maxRows ?? SMS_EXPORT_MAX_ROWS), 1),
        SMS_EXPORT_MAX_ROWS
    );
    const normalizedPageSize = Math.min(
        Math.max(Math.floor(pageSize ?? SMS_EXPORT_PAGE_SIZE), 1),
        SMS_EXPORT_PAGE_SIZE
    );

    const items: SmsMessageSummary[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | null = null;

    while (items.length < normalizedMaxRows) {
        if (cursor) {
            if (seenCursors.has(cursor)) break;
            seenCursors.add(cursor);
        }

        const remaining = normalizedMaxRows - items.length;
        const page = await listSmsMessages({
            ...filters,
            limit: Math.min(normalizedPageSize, remaining),
            cursor
        });

        if (!page.items.length) {
            cursor = null;
            break;
        }

        items.push(...page.items);

        if (!page.nextCursor) {
            cursor = null;
            break;
        }

        cursor = page.nextCursor;
    }

    return {
        items,
        truncated: Boolean(cursor),
        nextCursor: cursor
    };
};

export const getSmsDeliverySummary = async (input: GetSmsDeliverySummaryInput) => {
    const data = await requestSmsGraphql<{ smsDeliverySummary: SmsDeliverySummaryReport }>(
        `query SmsDeliverySummary(
            $sourceApp: String
            $sourceModule: String
            $sourceEvent: String
            $sourceEntityType: String
            $days: Int
        ) {
            smsDeliverySummary(
                sourceApp: $sourceApp
                sourceModule: $sourceModule
                sourceEvent: $sourceEvent
                sourceEntityType: $sourceEntityType
                days: $days
            ) {
                windowDays
                totalCount
                deliveredCount
                failedCount
                queuedCount
                sentCount
                sandboxCount
                receivedCount
                latestMessageAt
                statusCounts {
                    status
                    count
                }
                topFailureCodes {
                    errorCode
                    count
                }
                dailyBuckets {
                    date
                    totalCount
                    deliveredCount
                    failedCount
                }
            }
        }`,
        input
    );
    return data.smsDeliverySummary;
};

export const getSmsOperationalSnapshot = async (input: GetSmsOperationalSnapshotInput) => {
    const data = await requestSmsGraphql<{ smsOperationalSnapshot: SmsOperationalSnapshot }>(
        `query SmsOperationalSnapshot(
            $sourceApp: String
            $sourceModule: String
            $sourceEvent: String
            $sourceEntityType: String
        ) {
            smsOperationalSnapshot(
                sourceApp: $sourceApp
                sourceModule: $sourceModule
                sourceEvent: $sourceEvent
                sourceEntityType: $sourceEntityType
            ) {
                attentionCount
                pendingCount
                issueCount
                oldestPendingAt
                latestIssueAt
                statusBuckets {
                    status
                    count
                    oldestMessageAt
                    latestMessageAt
                }
                pendingItems {
                    id
                    status
                    duplicate
                    idempotencyKey
                    providerMessageId
                    note
                    senderId
                    errorCode
                    errorDetail
                    correlationId
                    recipient {
                        phone
                        name
                        reference {
                            type
                            id
                        }
                    }
                    message {
                        type
                        templateKey
                        textPreview
                        bodyLength
                    }
                    source {
                        app
                        module
                        event
                        entityType
                        entityId
                    }
                    requestedBy {
                        userId
                        role
                    }
                    metadataJson
                    tags
                    sentAt
                    deliveredAt
                    failedAt
                    createdAt
                }
                issueItems {
                    id
                    status
                    duplicate
                    idempotencyKey
                    providerMessageId
                    note
                    senderId
                    errorCode
                    errorDetail
                    correlationId
                    recipient {
                        phone
                        name
                        reference {
                            type
                            id
                        }
                    }
                    message {
                        type
                        templateKey
                        textPreview
                        bodyLength
                    }
                    source {
                        app
                        module
                        event
                        entityType
                        entityId
                    }
                    requestedBy {
                        userId
                        role
                    }
                    metadataJson
                    tags
                    sentAt
                    deliveredAt
                    failedAt
                    createdAt
                }
            }
        }`,
        input
    );
    return data.smsOperationalSnapshot;
};

export const getSmsTenantOperationalOverview = async () => {
    const data = await requestSmsGraphql<{ smsTenantOperationalOverview: SmsTenantOperationalOverview }>(
        `query SmsTenantOperationalOverview {
            smsTenantOperationalOverview {
                configuredBindingCount
                attentionBindingCount
                unconfiguredSourceCount
                totalAttentionCount
                totalPendingCount
                totalIssueCount
                items {
                    bindingKey
                    sourceApp
                    sourceModule
                    sourceEvent
                    sourceEntityType
                    isConfigured
                    isActive
                    attentionCount
                    pendingCount
                    issueCount
                    oldestPendingAt
                    latestIssueAt
                }
            }
        }`
    );
    return data.smsTenantOperationalOverview;
};

export const retrySmsMessage = async (messageId: string) => {
    const data = await requestSmsGraphql<{ retrySmsMessage: SmsMessageSummary }>(
        `mutation RetrySmsMessage($messageId: String!) {
            retrySmsMessage(messageId: $messageId) {
                id
                status
                duplicate
                idempotencyKey
                providerMessageId
                note
                senderId
                errorCode
                errorDetail
                correlationId
                recipient {
                    phone
                    name
                    reference {
                        type
                        id
                    }
                }
                message {
                    type
                    templateKey
                    textPreview
                    bodyLength
                }
                source {
                    app
                    module
                    event
                    entityType
                    entityId
                }
                requestedBy {
                    userId
                    role
                }
                metadataJson
                tags
                sentAt
                deliveredAt
                failedAt
                createdAt
            }
        }`,
        { messageId }
    );
    return data.retrySmsMessage;
};

export const runSmsRetrySweep = async (input: { bindingKey: string; dryRun?: boolean | null }) => {
    const data = await requestSmsGraphql<{ runSmsRetrySweep: SmsRetrySweepResult }>(
        `mutation RunSmsRetrySweep($bindingKey: String!, $dryRun: Boolean) {
            runSmsRetrySweep(bindingKey: $bindingKey, dryRun: $dryRun) {
                bindingKey
                dryRun
                policy {
                    enabled
                    maxAttempts
                    retryAfterMinutes
                    withinHours
                    maxMessagesPerRun
                    statuses
                    skipErrorCodes
                }
                scannedCount
                eligibleCount
                retriedCount
                skippedCount
                failureCount
                decisions {
                    messageId
                    recipientPhone
                    currentStatus
                    retryAttempt
                    status
                    reason
                    retryMessageId
                    retryMessageStatus
                    error
                }
            }
        }`,
        input
    );
    return data.runSmsRetrySweep;
};

export const listSmsWebhookEvents = async (input: ListSmsWebhookEventsInput) => {
    const data = await requestSmsGraphql<{ smsWebhookEvents: SmsWebhookEventSummary[] }>(
        `query SmsWebhookEvents($messageId: String, $providerMessageId: String, $limit: Int) {
            smsWebhookEvents(messageId: $messageId, providerMessageId: $providerMessageId, limit: $limit) {
                id
                providerMessageId
                signature
                receivedAt
                rawStatus
                deliveryStatus
                errorCode
                errorDetail
                eventJson
            }
        }`,
        input
    );
    return data.smsWebhookEvents;
};





