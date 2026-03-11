'use client';

import React from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import AppDropdown from '@/components/AppDropdown';
import AppInput from '@/components/AppInput';
import {
    exportReportCsv,
    exportReportExcel,
    exportReportPdf,
    type ReportExportOptions
} from '@/lib/reportExport';
import {
    getSmsDeliverySummary,
    getSmsOperationalSnapshot,
    getSmsSettings,
    getSmsTemplateBinding,
    getSmsTenantOperationalOverview,
    listSmsAlertEvents,
    listAllSmsMessages,
    listSmsMessages,
    listSmsWebhookEvents,
    previewSmsTemplateBinding,
    retrySmsMessage,
    runSmsRetrySweep,
    setSmsAlertEventReview,
    upsertSmsSettings,
    upsertSmsTemplateBinding,
    type SmsAlertEmailDeliverySettings,
    type SmsAlertThresholdSettings,
    type SmsAlertEvent,
    type SmsDeliverySummaryReport,
    type SmsMessageSummary,
    type SmsOperationalSnapshot,
    type SmsRetrySweepResult,
    type SmsSettings,
    type SmsTemplateBinding,
    type SmsTemplateBindingPreview,
    type SmsTenantOperationalOverview,
    type SmsTenantOperationalOverviewItem,
    type SmsWebhookEventSummary
} from '@/lib/sms/api';

type SmsBindingConfig = {
    bindingKey: string;
    label: string;
    description: string;
    enabledLabel: string;
    defaultTemplateKey: string;
    sourceApp: string;
    sourceModule: string;
    sourceEvent: string;
    sourceEntityType: string;
    sourceNote: string;
    saveNotice: string;
    messageTemplateHelp: string;
    placeholderLines: string[];
    metadataExample: string;
    previewContextExample: string;
};

const INVOICE_DUE_METADATA_EXAMPLE = `{
  "msg91": {
    "dltTemplateId": "1307167420000000011",
    "variables": {
      "customer_name": "{{recipientName}}",
      "invoice_no": "{{voucherNumber}}",
      "due_amount": "{{dueAmountText}}"
    }
  },
  "automation": {
    "enabled": true,
    "minInvoiceAgeDays": 7,
    "minDueAmount": 500,
    "maxInvoicesPerRun": 25,
    "skipIfSentWithinHours": 24
  }
}`;

const INVOICE_CREATED_METADATA_EXAMPLE = `{
  "msg91": {
    "dltTemplateId": "1307167420000000012",
    "variables": {
      "customer_name": "{{recipientName}}",
      "invoice_no": "{{voucherNumber}}",
      "invoice_amount": "{{totalNetAmountText}}",
      "due_amount": "{{dueAmountText}}"
    }
  }
}`;

const LEDGER_STATEMENT_METADATA_EXAMPLE = `{
  "msg91": {
    "dltTemplateId": "1307167420000000013",
    "variables": {
      "customer_name": "{{recipientName}}",
      "period": "{{periodText}}",
      "closing_balance": "{{closingBalanceText}}"
    }
  }
}`;

const CRM_FOLLOWUP_METADATA_EXAMPLE = `{
  "msg91": {
    "dltTemplateId": "1307167420000000014",
    "variables": {
      "customer_name": "{{recipientName}}",
      "member_code": "{{memberCode}}",
      "followup_date": "{{followupDateText}}"
    }
  }
}`;

const PRODUCT_OFFER_METADATA_EXAMPLE = `{
  "msg91": {
    "dltTemplateId": "1307167420000000015",
    "variables": {
      "customer_name": "{{recipientName}}",
      "product_name": "{{productName}}",
      "offer_price": "{{sellingRateText}}"
    }
  }
}`;

const INVOICE_DUE_PREVIEW_CONTEXT_EXAMPLE = `{
  "recipientName": "Asha Textiles",
  "recipientPhone": "9876543210",
  "voucherNumber": "INV-1001",
  "voucherDate": "08/03/2026",
  "billNumber": "B-101",
  "dueAmount": 1250.5,
  "dueAmountText": "1250.50",
  "paidAmount": 2000,
  "paidAmountText": "2000.00",
  "recipient": {
    "name": "Asha Textiles",
    "phone": "9876543210"
  },
  "invoice": {
    "voucherNumber": "INV-1001",
    "dueAmount": 1250.5,
    "dueAmountText": "1250.50"
  }
}`;

const INVOICE_CREATED_PREVIEW_CONTEXT_EXAMPLE = `{
  "recipientName": "Asha Textiles",
  "recipientPhone": "9876543210",
  "voucherNumber": "INV-1001",
  "voucherDate": "08/03/2026",
  "billNumber": "B-101",
  "totalNetAmount": 3250.5,
  "totalNetAmountText": "3250.50",
  "dueAmount": 1250.5,
  "dueAmountText": "1250.50",
  "recipient": {
    "name": "Asha Textiles",
    "phone": "9876543210"
  },
  "invoice": {
    "voucherNumber": "INV-1001",
    "totalNetAmount": 3250.5,
    "totalNetAmountText": "3250.50",
    "dueAmount": 1250.5,
    "dueAmountText": "1250.50"
  }
}`;

const LEDGER_STATEMENT_PREVIEW_CONTEXT_EXAMPLE = `{
  "recipientName": "Asha Textiles",
  "recipientPhone": "9876543210",
  "ledgerName": "Asha Textiles",
  "fromDateText": "01/03/2026",
  "toDateText": "31/03/2026",
  "periodText": "01/03/2026 to 31/03/2026",
  "totalCount": 42,
  "totalCountText": "42",
  "openingBalanceText": "500.00 Dr",
  "debitTotalText": "3500.00",
  "creditTotalText": "2250.00",
  "movementText": "1250.00 Dr",
  "closingBalanceText": "1750.00 Dr",
  "recipient": {
    "name": "Asha Textiles",
    "phone": "9876543210",
    "ledgerId": 101
  },
  "ledger": {
    "ledgerId": 101,
    "name": "Asha Textiles",
    "phone": "9876543210",
    "address": "Main Market, Jaipur",
    "gstNumber": "08ABCDE1234F1Z5"
  },
  "statement": {
    "reportType": "ledger_statement",
    "ledgerId": 101,
    "fromDateText": "01/03/2026",
    "toDateText": "31/03/2026",
    "periodText": "01/03/2026 to 31/03/2026",
    "totalCount": 42,
    "openingBalanceText": "500.00 Dr",
    "debitTotalText": "3500.00",
    "creditTotalText": "2250.00",
    "movementText": "1250.00 Dr",
    "closingBalanceText": "1750.00 Dr"
  }
}`;

const CRM_FOLLOWUP_PREVIEW_CONTEXT_EXAMPLE = `{
  "recipientName": "Asha Textiles",
  "recipientPhone": "9876543210",
  "ledgerId": "101",
  "ledgerName": "Asha Textiles",
  "memberCode": "MEM-101",
  "membershipTier": "gold",
  "partyType": "customer",
  "birthDateText": "08/03/1990",
  "anniversaryDateText": "12/02/2015",
  "followupDateText": "08/03/2026",
  "recipient": {
    "name": "Asha Textiles",
    "phone": "9876543210",
    "ledgerId": "101"
  },
  "party": {
    "partyId": "party-101",
    "ledgerId": "101",
    "ledgerName": "Asha Textiles",
    "mobileNumber": "9876543210",
    "whatsappNumber": "9876543210",
    "alternateMobile": "9123456789",
    "memberCode": "MEM-101",
    "membershipTier": "gold",
    "partyType": "customer",
    "birthDateText": "08/03/1990",
    "anniversaryDateText": "12/02/2015",
    "notes": "Prefers afternoon follow-up calls."
  }
}`;

const PRODUCT_OFFER_PREVIEW_CONTEXT_EXAMPLE = `{
  "recipientName": "Asha Textiles",
  "recipientPhone": "9876543210",
  "offerDateText": "08/03/2026",
  "productId": 501,
  "productIdText": "501",
  "productName": "Premium Cotton Shirting",
  "productCode": "PCS-501",
  "productBrandName": "Krishna Premium",
  "productGroupName": "Shirting",
  "hsnCode": "5208",
  "landingCostText": "480.00",
  "mrpText": "799.00",
  "sellingRateText": "699.00",
  "marginText": "18.00",
  "recipient": {
    "name": "Asha Textiles",
    "phone": "9876543210"
  },
  "product": {
    "productId": 501,
    "name": "Premium Cotton Shirting",
    "code": "PCS-501",
    "brandName": "Krishna Premium",
    "groupName": "Shirting",
    "hsnCode": "5208",
    "landingCostText": "480.00",
    "mrpText": "799.00",
    "sellingRateText": "699.00",
    "marginText": "18.00"
  }
}`;

const SMS_BINDINGS: SmsBindingConfig[] = [
    {
        bindingKey: 'billing.invoice_due',
        label: 'Invoice Due',
        description: 'Billing uses this binding for manual invoice due reminders and for the scheduled due-reminder sweep.',
        enabledLabel: 'Enable invoice due reminders',
        defaultTemplateKey: 'invoice_due',
        sourceApp: 'billing',
        sourceModule: 'invoice',
        sourceEvent: 'invoice_due',
        sourceEntityType: 'sale_invoice',
        sourceNote: 'Billing reads this binding for manual invoice-due reminders and the scheduled due-reminder sweep.',
        saveNotice: 'Invoice due SMS settings saved. Billing reminders will use this binding when present.',
        messageTemplateHelp: 'Leave blank to use the default billing reminder text.',
        placeholderLines: [
            'recipientName, recipientPhone, voucherNumber, voucherDate, billNumber',
            'dueAmount, dueAmountText, paidAmount, paidAmountText'
        ],
        metadataExample: INVOICE_DUE_METADATA_EXAMPLE,
        previewContextExample: INVOICE_DUE_PREVIEW_CONTEXT_EXAMPLE
    },
    {
        bindingKey: 'billing.invoice_created',
        label: 'Invoice Created',
        description: 'Billing can auto-send this message immediately after invoice save, but only when the binding exists and is active.',
        enabledLabel: 'Enable invoice created messages',
        defaultTemplateKey: 'invoice_created',
        sourceApp: 'billing',
        sourceModule: 'invoice',
        sourceEvent: 'invoice_created',
        sourceEntityType: 'sale_invoice',
        sourceNote: 'Billing reads this binding right after invoice creation. Auto-send is skipped unless this binding exists and is active.',
        saveNotice: 'Invoice created SMS settings saved. New invoices can now auto-send this binding when active.',
        messageTemplateHelp: 'Leave blank to use the default invoice created message text.',
        placeholderLines: [
            'recipientName, recipientPhone, voucherNumber, voucherDate, billNumber',
            'totalNetAmount, totalNetAmountText, dueAmount, dueAmountText'
        ],
        metadataExample: INVOICE_CREATED_METADATA_EXAMPLE,
        previewContextExample: INVOICE_CREATED_PREVIEW_CONTEXT_EXAMPLE
    },
    {
        bindingKey: 'accounts.ledger_statement_ready',
        label: 'Ledger Statement Ready',
        description: 'Accounts uses this binding for direct ledger statement SMS sends from the ledger report.',
        enabledLabel: 'Enable ledger statement SMS',
        defaultTemplateKey: 'ledger_statement_ready',
        sourceApp: 'accounts',
        sourceModule: 'ledger',
        sourceEvent: 'ledger_statement_ready',
        sourceEntityType: 'ledger',
        sourceNote: 'Accounts reads this binding from the ledger statement report action.',
        saveNotice: 'Ledger statement SMS settings saved. Accounts ledger sends will use this binding when active.',
        messageTemplateHelp: 'Leave blank to use the default ledger statement SMS text.',
        placeholderLines: [
            'recipientName, recipientPhone, ledgerName, fromDateText, toDateText, periodText',
            'totalCount, totalCountText, openingBalanceText, debitTotalText, creditTotalText, movementText, closingBalanceText'
        ],
        metadataExample: LEDGER_STATEMENT_METADATA_EXAMPLE,
        previewContextExample: LEDGER_STATEMENT_PREVIEW_CONTEXT_EXAMPLE
    },
    {
        bindingKey: 'crm.followup',
        label: 'CRM Follow-up',
        description: 'CRM uses this binding for direct follow-up SMS sends from the party profile screen.',
        enabledLabel: 'Enable CRM follow-up SMS',
        defaultTemplateKey: 'crm_followup',
        sourceApp: 'crm',
        sourceModule: 'party',
        sourceEvent: 'crm_followup',
        sourceEntityType: 'party_profile',
        sourceNote: 'CRM reads this binding when an operator sends a follow-up SMS from a party profile.',
        saveNotice: 'CRM follow-up SMS settings saved. CRM party follow-ups will use this binding when active.',
        messageTemplateHelp: 'Leave blank to use the default CRM follow-up SMS text.',
        placeholderLines: [
            'recipientName, recipientPhone, ledgerId, ledgerName, memberCode',
            'membershipTier, partyType, birthDateText, anniversaryDateText, followupDateText'
        ],
        metadataExample: CRM_FOLLOWUP_METADATA_EXAMPLE,
        previewContextExample: CRM_FOLLOWUP_PREVIEW_CONTEXT_EXAMPLE
    },
    {
        bindingKey: 'inventory.product_offer',
        label: 'Product Offer',
        description: 'Inventory uses this binding for direct product-offer SMS sends from the product master.',
        enabledLabel: 'Enable product offer SMS',
        defaultTemplateKey: 'product_offer',
        sourceApp: 'inventory',
        sourceModule: 'product',
        sourceEvent: 'product_offer',
        sourceEntityType: 'product',
        sourceNote: 'Inventory reads this binding when an operator sends a product-offer SMS from the product master.',
        saveNotice: 'Product offer SMS settings saved. Inventory product offers will use this binding when active.',
        messageTemplateHelp: 'Leave blank to use the default product offer SMS text.',
        placeholderLines: [
            'recipientName, recipientPhone, offerDateText, productId, productName, productCode',
            'productBrandName, productGroupName, hsnCode, landingCostText, mrpText, sellingRateText, marginText'
        ],
        metadataExample: PRODUCT_OFFER_METADATA_EXAMPLE,
        previewContextExample: PRODUCT_OFFER_PREVIEW_CONTEXT_EXAMPLE
    }
];

type FormState = {
    bindingId: string | null;
    bindingKey: string;
    isActive: boolean;
    templateKey: string;
    senderId: string;
    messageTextTemplate: string;
    metadataJson: string;
};

type SmsAlertSettingsForm = {
    enabled: boolean;
    failedRatePercent: string;
    minimumMessagesForRateAlert: string;
    pendingCount: string;
    issueCount: string;
    unconfiguredSourceCount: string;
    oldestPendingHours: string;
    rateWindowDays: string;
    cooldownHours: string;
};

type SmsAlertEmailDeliveryForm = {
    enabled: boolean;
    recipientEmails: string;
    subjectPrefix: string;
};

type SmsTenantAlertPreviewItem = {
    key: string;
    label: string;
    currentValue: string;
    thresholdValue: string;
    statusLabel: string;
    severity: 'success' | 'warning' | 'danger';
    detail: string;
    triggered: boolean;
};

const DEFAULT_SMS_ALERT_THRESHOLDS: SmsAlertThresholdSettings = {
    enabled: true,
    failedRatePercent: 10,
    minimumMessagesForRateAlert: 20,
    pendingCount: 25,
    issueCount: 10,
    unconfiguredSourceCount: 1,
    oldestPendingHours: 6,
    rateWindowDays: 30,
    cooldownHours: 6
};

const DEFAULT_SMS_ALERT_EMAIL_DELIVERY: SmsAlertEmailDeliverySettings = {
    enabled: false,
    recipientEmails: [],
    subjectPrefix: '[SMS Alerts]'
};

const findBindingConfig = (bindingKey: string) =>
    SMS_BINDINGS.find((item) => item.bindingKey === bindingKey) ?? SMS_BINDINGS[0];

const createFormState = (config: SmsBindingConfig, binding?: SmsTemplateBinding | null): FormState => ({
    bindingId: binding?.id ?? null,
    bindingKey: binding?.bindingKey ?? config.bindingKey,
    isActive: binding?.isActive ?? true,
    templateKey: binding?.templateKey ?? config.defaultTemplateKey,
    senderId: binding?.senderId ?? '',
    messageTextTemplate: binding?.messageTextTemplate ?? '',
    metadataJson: binding?.metadataJson ?? ''
});

const createAlertSettingsForm = (
    settings: SmsAlertThresholdSettings | null | undefined
): SmsAlertSettingsForm => {
    const next = settings ?? DEFAULT_SMS_ALERT_THRESHOLDS;
    return {
        enabled: next.enabled,
        failedRatePercent: String(next.failedRatePercent),
        minimumMessagesForRateAlert: String(next.minimumMessagesForRateAlert),
        pendingCount: String(next.pendingCount),
        issueCount: String(next.issueCount),
        unconfiguredSourceCount: String(next.unconfiguredSourceCount),
        oldestPendingHours: String(next.oldestPendingHours),
        rateWindowDays: String(next.rateWindowDays),
        cooldownHours: String(next.cooldownHours)
    };
};

const normalizeAlertThresholdNumber = (
    value: string,
    fallback: number,
    min: number,
    max: number
) => {
    const numeric = Number(value.trim());
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(Math.round(numeric), min), max);
};

const normalizeAlertSettingsForm = (form: SmsAlertSettingsForm): SmsAlertThresholdSettings => ({
    enabled: form.enabled,
    failedRatePercent: normalizeAlertThresholdNumber(
        form.failedRatePercent,
        DEFAULT_SMS_ALERT_THRESHOLDS.failedRatePercent,
        0,
        100
    ),
    minimumMessagesForRateAlert: normalizeAlertThresholdNumber(
        form.minimumMessagesForRateAlert,
        DEFAULT_SMS_ALERT_THRESHOLDS.minimumMessagesForRateAlert,
        0,
        1000000
    ),
    pendingCount: normalizeAlertThresholdNumber(
        form.pendingCount,
        DEFAULT_SMS_ALERT_THRESHOLDS.pendingCount,
        0,
        1000000
    ),
    issueCount: normalizeAlertThresholdNumber(
        form.issueCount,
        DEFAULT_SMS_ALERT_THRESHOLDS.issueCount,
        0,
        1000000
    ),
    unconfiguredSourceCount: normalizeAlertThresholdNumber(
        form.unconfiguredSourceCount,
        DEFAULT_SMS_ALERT_THRESHOLDS.unconfiguredSourceCount,
        0,
        1000000
    ),
    oldestPendingHours: normalizeAlertThresholdNumber(
        form.oldestPendingHours,
        DEFAULT_SMS_ALERT_THRESHOLDS.oldestPendingHours,
        0,
        24 * 365
    ),
    rateWindowDays: normalizeAlertThresholdNumber(
        form.rateWindowDays,
        DEFAULT_SMS_ALERT_THRESHOLDS.rateWindowDays,
        1,
        90
    ),
    cooldownHours: normalizeAlertThresholdNumber(
        form.cooldownHours,
        DEFAULT_SMS_ALERT_THRESHOLDS.cooldownHours,
        1,
        24 * 30
    )
});

const createAlertEmailDeliveryForm = (
    settings: SmsAlertEmailDeliverySettings | null | undefined
): SmsAlertEmailDeliveryForm => {
    const next = settings ?? DEFAULT_SMS_ALERT_EMAIL_DELIVERY;
    return {
        enabled: next.enabled,
        recipientEmails: next.recipientEmails.join('\n'),
        subjectPrefix: next.subjectPrefix
    };
};

const normalizeAlertEmailDeliveryForm = (
    form: SmsAlertEmailDeliveryForm
): SmsAlertEmailDeliverySettings => ({
    enabled: form.enabled,
    recipientEmails: Array.from(
        new Set(
            form.recipientEmails
                .split(/[\n,]/)
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean)
        )
    ),
    subjectPrefix: form.subjectPrefix.trim() || DEFAULT_SMS_ALERT_EMAIL_DELIVERY.subjectPrefix
});
const SMS_HISTORY_LIMIT = 15;
const SMS_WEBHOOK_EVENTS_LIMIT = 20;
const SMS_EXPORT_LIMIT = 500;
const SMS_STATUS_OPTIONS = [
    { label: 'All statuses', value: '' },
    { label: 'Queued', value: 'queued' },
    { label: 'Sent', value: 'sent' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Failed', value: 'failed' },
    { label: 'Sandbox', value: 'sandbox' },
    { label: 'Received', value: 'received' }
];
const SMS_SUMMARY_DAY_OPTIONS = [
    { label: 'Last 7 days', value: 7 },
    { label: 'Last 30 days', value: 30 },
    { label: 'Last 90 days', value: 90 }
];
const SMS_TENANT_OVERVIEW_APP_OPTIONS = [
    { label: 'All apps', value: '' },
    ...Array.from(new Set(SMS_BINDINGS.map((item) => item.sourceApp))).map((sourceApp) => ({
        label: sourceApp.charAt(0).toUpperCase() + sourceApp.slice(1),
        value: sourceApp
    }))
];
const SMS_TENANT_OVERVIEW_CONFIG_OPTIONS = [
    { label: 'All configs', value: '' },
    { label: 'Active only', value: 'active' },
    { label: 'Inactive only', value: 'inactive' },
    { label: 'Unconfigured only', value: 'unconfigured' }
];
const SMS_TENANT_OVERVIEW_ATTENTION_OPTIONS = [
    { label: 'All rows', value: '' },
    { label: 'Needs attention', value: 'attention' },
    { label: 'Healthy only', value: 'healthy' }
];

type SmsExportMode = 'csv' | 'excel' | 'pdf';

const formatSmsDateTime = (value: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString('en-IN');
};

const formatSmsCount = (value: number) => value.toLocaleString('en-IN');

const formatSmsPercent = (part: number, total: number) => {
    if (total <= 0) return '0%';
    return `${((part / total) * 100).toFixed(1)}%`;
};

const formatSmsAgeFromNow = (value: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    const diffMinutes = Math.max(Math.floor((Date.now() - parsed.getTime()) / 60000), 0);
    if (diffMinutes < 60) {
        return `${formatSmsCount(diffMinutes)}m`;
    }
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return `${formatSmsCount(diffHours)}h ${formatSmsCount(diffMinutes % 60)}m`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${formatSmsCount(diffDays)}d ${formatSmsCount(diffHours % 24)}h`;
};

const findTenantAlertOldestPendingAt = (items: SmsTenantOperationalOverviewItem[]) => {
    let oldestTime: number | null = null;
    let oldestValue: string | null = null;
    items.forEach((item) => {
        if (!item.oldestPendingAt) return;
        const parsed = new Date(item.oldestPendingAt);
        const time = parsed.getTime();
        if (Number.isNaN(time)) return;
        if (oldestTime == null || time < oldestTime) {
            oldestTime = time;
            oldestValue = item.oldestPendingAt;
        }
    });
    return oldestValue;
};

const getTenantAlertOldestPendingHours = (value: string | null) => {
    if (!value) return 0;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 0;
    return Math.max((Date.now() - parsed.getTime()) / (60 * 60 * 1000), 0);
};

const buildTenantAlertPreview = (
    thresholds: SmsAlertThresholdSettings,
    items: SmsTenantOperationalOverviewItem[],
    summaryReport: SmsDeliverySummaryReport | null
): SmsTenantAlertPreviewItem[] => {
    const pendingCount = items.reduce((total, item) => total + item.pendingCount, 0);
    const issueCount = items.reduce((total, item) => total + item.issueCount, 0);
    const unconfiguredSourceCount = items.filter((item) => !item.isConfigured && item.attentionCount > 0).length;
    const oldestPendingAt = findTenantAlertOldestPendingAt(items);
    const oldestPendingHours = getTenantAlertOldestPendingHours(oldestPendingAt);
    const totalMessages = summaryReport?.totalCount ?? 0;
    const failedMessages = summaryReport?.failedCount ?? 0;
    const failedRatePercent = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;
    const hasRateVolume = totalMessages >= thresholds.minimumMessagesForRateAlert;

    return [
        {
            key: 'pending',
            label: 'Pending backlog',
            currentValue: formatSmsCount(pendingCount),
            thresholdValue: formatSmsCount(thresholds.pendingCount),
            statusLabel: pendingCount >= thresholds.pendingCount ? 'ALERT' : 'OK',
            severity: pendingCount >= thresholds.pendingCount ? 'danger' : 'success',
            detail:
                pendingCount > 0
                    ? `${formatSmsCount(pendingCount)} queued or sent messages are still open in the current app scope.`
                    : 'No pending backlog in the current app scope.',
            triggered: pendingCount >= thresholds.pendingCount
        },
        {
            key: 'issues',
            label: 'Issue backlog',
            currentValue: formatSmsCount(issueCount),
            thresholdValue: formatSmsCount(thresholds.issueCount),
            statusLabel: issueCount >= thresholds.issueCount ? 'ALERT' : 'OK',
            severity: issueCount >= thresholds.issueCount ? 'danger' : 'success',
            detail:
                issueCount > 0
                    ? `${formatSmsCount(issueCount)} failed or sandbox messages need operator attention.`
                    : 'No issue backlog in the current app scope.',
            triggered: issueCount >= thresholds.issueCount
        },
        {
            key: 'unconfigured',
            label: 'Unconfigured sources',
            currentValue: formatSmsCount(unconfiguredSourceCount),
            thresholdValue: formatSmsCount(thresholds.unconfiguredSourceCount),
            statusLabel: unconfiguredSourceCount >= thresholds.unconfiguredSourceCount ? 'ALERT' : 'OK',
            severity: unconfiguredSourceCount >= thresholds.unconfiguredSourceCount ? 'warning' : 'success',
            detail:
                unconfiguredSourceCount > 0
                    ? `${formatSmsCount(unconfiguredSourceCount)} source mappings have active SMS traffic without a saved binding record.`
                    : 'No unconfigured traffic sources detected in scope.',
            triggered: unconfiguredSourceCount >= thresholds.unconfiguredSourceCount
        },
        {
            key: 'oldestPending',
            label: 'Oldest pending age',
            currentValue: oldestPendingAt ? `${oldestPendingHours.toFixed(1)}h` : '-',
            thresholdValue: `${formatSmsCount(thresholds.oldestPendingHours)}h`,
            statusLabel: oldestPendingAt && oldestPendingHours >= thresholds.oldestPendingHours ? 'ALERT' : 'OK',
            severity: oldestPendingAt && oldestPendingHours >= thresholds.oldestPendingHours ? 'warning' : 'success',
            detail: oldestPendingAt
                ? `Oldest pending message age is ${formatSmsAgeFromNow(oldestPendingAt)} (${formatSmsDateTime(oldestPendingAt)}).`
                : 'No pending messages currently in scope.',
            triggered: Boolean(oldestPendingAt && oldestPendingHours >= thresholds.oldestPendingHours)
        },
        {
            key: 'failedRate',
            label: 'Failed rate',
            currentValue: `${failedRatePercent.toFixed(1)}%`,
            thresholdValue: `${formatSmsCount(thresholds.failedRatePercent)}%`,
            statusLabel: !hasRateVolume
                ? 'WAITING'
                : failedRatePercent >= thresholds.failedRatePercent
                    ? 'ALERT'
                    : 'OK',
            severity: !hasRateVolume
                ? 'warning'
                : failedRatePercent >= thresholds.failedRatePercent
                    ? 'danger'
                    : 'success',
            detail: !hasRateVolume
                ? `Rate alert waits for at least ${formatSmsCount(thresholds.minimumMessagesForRateAlert)} messages in the current window; only ${formatSmsCount(totalMessages)} found.`
                : `${formatSmsCount(failedMessages)} failed messages out of ${formatSmsCount(totalMessages)} total messages in the current trend window.`,
            triggered: hasRateVolume && failedRatePercent >= thresholds.failedRatePercent
        }
    ];
};

const getSmsStatusSeverity = (status: string) => {
    switch (status) {
        case 'delivered':
            return 'success';
        case 'sent':
            return 'info';
        case 'queued':
        case 'sandbox':
        case 'received':
            return 'warning';
        case 'failed':
            return 'danger';
        default:
            return undefined;
    }
};

const getSmsAlertEventReviewPresentation = (status: SmsAlertEvent['reviewStatus']) => {
    switch (status) {
        case 'acknowledged':
            return { label: 'ACKNOWLEDGED', severity: 'success' as const };
        default:
            return { label: 'OPEN', severity: 'warning' as const };
    }
};

const formatSmsSourceLabel = (config: SmsBindingConfig) =>
    `${config.sourceApp} / ${config.sourceModule} / ${config.sourceEvent}`;

const formatSmsSourceSummary = (value: {
    sourceApp?: string | null;
    sourceModule?: string | null;
    sourceEvent?: string | null;
    sourceEntityType?: string | null;
}) =>
    [value.sourceApp, value.sourceModule, value.sourceEvent, value.sourceEntityType]
        .filter(Boolean)
        .join(' / ') || '-';

const getTenantOverviewBindingLabel = (item: SmsTenantOperationalOverviewItem) => {
    const config = item.bindingKey ? SMS_BINDINGS.find((entry) => entry.bindingKey === item.bindingKey) : null;
    if (config) return config.label;
    if (item.bindingKey) return item.bindingKey;
    return formatSmsSourceSummary(item);
};

const getTenantOverviewConfigPresentation = (item: SmsTenantOperationalOverviewItem) => {
    if (!item.isConfigured) {
        return { label: 'UNCONFIGURED', severity: 'warning' as const };
    }
    if (item.isActive) {
        return { label: 'ACTIVE', severity: 'success' as const };
    }
    return { label: 'INACTIVE', severity: 'warning' as const };
};

const getSmsStringFilterLabel = (
    options: ReadonlyArray<{ label: string; value: string }>,
    value: string,
    fallback: string
) => options.find((item) => item.value === value)?.label ?? fallback;

const filterTenantOverviewItems = (
    items: SmsTenantOperationalOverviewItem[],
    filters: {
        search: string;
        sourceApp: string;
        config: string;
        attention: string;
    }
) => {
    const search = filters.search.trim().toLowerCase();
    return items.filter((item) => {
        if (filters.sourceApp && item.sourceApp !== filters.sourceApp) {
            return false;
        }

        if (filters.config === 'active' && (!item.isConfigured || !item.isActive)) {
            return false;
        }
        if (filters.config === 'inactive' && (!item.isConfigured || item.isActive !== false)) {
            return false;
        }
        if (filters.config === 'unconfigured' && item.isConfigured) {
            return false;
        }

        const hasAttention = item.attentionCount > 0;
        if (filters.attention === 'attention' && !hasAttention) {
            return false;
        }
        if (filters.attention === 'healthy' && hasAttention) {
            return false;
        }

        if (!search) {
            return true;
        }

        const searchText = [
            getTenantOverviewBindingLabel(item),
            item.bindingKey,
            item.sourceApp,
            item.sourceModule,
            item.sourceEvent,
            item.sourceEntityType,
            getTenantOverviewConfigPresentation(item).label
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        return searchText.includes(search);
    });
};

const buildTenantOverviewExportOptions = (
    items: SmsTenantOperationalOverviewItem[],
    filters: {
        search: string;
        sourceApp: string;
        config: string;
        attention: string;
    }
) => ({
    fileName: 'tenant-sms-overview',
    title: 'Tenant SMS Overview',
    subtitle: [
        `Generated: ${formatSmsDateTime(new Date().toISOString())}`,
        `Search: ${filters.search.trim() || 'All'}`,
        `App filter: ${getSmsStringFilterLabel(SMS_TENANT_OVERVIEW_APP_OPTIONS, filters.sourceApp, 'All apps')}`,
        `Config filter: ${getSmsStringFilterLabel(SMS_TENANT_OVERVIEW_CONFIG_OPTIONS, filters.config, 'All configs')}`,
        `Attention filter: ${getSmsStringFilterLabel(SMS_TENANT_OVERVIEW_ATTENTION_OPTIONS, filters.attention, 'All rows')}`,
        `Exported rows: ${formatSmsCount(items.length)}`
    ].join('\n'),
    sheetName: 'Tenant Overview',
    footerLeft: 'Tenant SMS overview',
    rows: items,
    columns: [
        { header: 'Binding', value: (item: SmsTenantOperationalOverviewItem) => getTenantOverviewBindingLabel(item) },
        { header: 'Binding Key', value: (item: SmsTenantOperationalOverviewItem) => item.bindingKey || '-' },
        { header: 'Source', value: (item: SmsTenantOperationalOverviewItem) => formatSmsSourceSummary(item) },
        {
            header: 'Config',
            value: (item: SmsTenantOperationalOverviewItem) => getTenantOverviewConfigPresentation(item).label
        },
        { header: 'Attention', value: (item: SmsTenantOperationalOverviewItem) => item.attentionCount },
        { header: 'Pending', value: (item: SmsTenantOperationalOverviewItem) => item.pendingCount },
        { header: 'Issues', value: (item: SmsTenantOperationalOverviewItem) => item.issueCount },
        {
            header: 'Oldest Pending',
            value: (item: SmsTenantOperationalOverviewItem) => formatSmsDateTime(item.oldestPendingAt)
        },
        {
            header: 'Latest Issue',
            value: (item: SmsTenantOperationalOverviewItem) => formatSmsDateTime(item.latestIssueAt)
        }
    ]
});

const buildTenantDeliverySummaryExportOptions = (
    report: SmsDeliverySummaryReport,
    filters: { sourceApp: string; days: number }
) => ({
    fileName: `tenant-sms-delivery-summary-${filters.sourceApp || 'all-apps'}-${filters.days}-days`,
    title: 'Tenant SMS Delivery Summary',
    subtitle: [
        `Scope: ${getSmsStringFilterLabel(SMS_TENANT_OVERVIEW_APP_OPTIONS, filters.sourceApp, 'All apps')}`,
        `Window: Last ${report.windowDays} days`,
        `Generated: ${formatSmsDateTime(new Date().toISOString())}`,
        `Totals: ${formatSmsCount(report.totalCount)} total, ${formatSmsCount(report.deliveredCount)} delivered, ${formatSmsCount(report.failedCount)} failed`
    ].join('\n'),
    sheetName: 'Tenant Summary',
    footerLeft: 'Tenant SMS delivery summary',
    rows: report.dailyBuckets,
    columns: [
        { header: 'Date', value: (row: (typeof report.dailyBuckets)[number]) => row.date },
        { header: 'Total', value: (row: (typeof report.dailyBuckets)[number]) => row.totalCount },
        { header: 'Delivered', value: (row: (typeof report.dailyBuckets)[number]) => row.deliveredCount },
        { header: 'Failed', value: (row: (typeof report.dailyBuckets)[number]) => row.failedCount }
    ]
});

const toSmsReportFileToken = (value: string) => {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || 'sms-report';
};

const runSmsReportExport = async <T,>(mode: SmsExportMode, options: ReportExportOptions<T>) => {
    if (mode === 'csv') {
        exportReportCsv(options);
        return;
    }
    if (mode === 'excel') {
        await exportReportExcel(options);
        return;
    }
    exportReportPdf(options);
};

const buildSmsSummaryExportOptions = (config: SmsBindingConfig, report: SmsDeliverySummaryReport) => {
    const statusSummary = report.statusCounts
        .map((item) => `${item.status}:${formatSmsCount(item.count)}`)
        .join(', ');
    const failureSummary = report.topFailureCodes
        .map((item) => `${item.errorCode}:${formatSmsCount(item.count)}`)
        .join(', ');

    return {
        fileName: `${toSmsReportFileToken(config.bindingKey)}-delivery-summary-${report.windowDays}-days`,
        title: `${config.label} SMS Delivery Summary`,
        subtitle: [
            `Source: ${formatSmsSourceLabel(config)}`,
            `Window: Last ${report.windowDays} days`,
            `Generated: ${formatSmsDateTime(new Date().toISOString())}`,
            `Totals: ${formatSmsCount(report.totalCount)} total, ${formatSmsCount(report.deliveredCount)} delivered, ${formatSmsCount(report.failedCount)} failed`,
            `Statuses: ${statusSummary || '-'}`,
            `Top failure codes: ${failureSummary || '-'}`
        ].join('\n'),
        sheetName: 'Delivery Summary',
        footerLeft: `${config.label} SMS delivery summary`,
        rows: report.dailyBuckets,
        columns: [
            { header: 'Date', value: (row: (typeof report.dailyBuckets)[number]) => row.date },
            { header: 'Total', value: (row: (typeof report.dailyBuckets)[number]) => row.totalCount },
            { header: 'Delivered', value: (row: (typeof report.dailyBuckets)[number]) => row.deliveredCount },
            { header: 'Failed', value: (row: (typeof report.dailyBuckets)[number]) => row.failedCount }
        ]
    };
};

const buildSmsHistoryExportOptions = (
    config: SmsBindingConfig,
    items: SmsMessageSummary[],
    filters: { status: string; phone: string; truncated: boolean }
) => ({
    fileName: `${toSmsReportFileToken(config.bindingKey)}-history`,
    title: `${config.label} SMS History`,
    subtitle: [
        `Source: ${formatSmsSourceLabel(config)}`,
        `Status filter: ${filters.status || 'All statuses'}`,
        `Recipient phone filter: ${filters.phone.trim() || 'All recipients'}`,
        `Generated: ${formatSmsDateTime(new Date().toISOString())}`,
        `Exported rows: ${formatSmsCount(items.length)}`,
        filters.truncated
            ? `Export capped at ${formatSmsCount(SMS_EXPORT_LIMIT)} rows. Narrow the filters to export the remaining history.`
            : null
    ]
        .filter(Boolean)
        .join('\n'),
    sheetName: 'SMS History',
    footerLeft: `${config.label} SMS history`,
    rows: items,
    columns: [
        { header: 'Created', value: (item: SmsMessageSummary) => formatSmsDateTime(item.createdAt) },
        {
            header: 'Status',
            value: (item: SmsMessageSummary) =>
                item.duplicate ? `${item.status} (duplicate)` : item.status
        },
        { header: 'Recipient', value: (item: SmsMessageSummary) => item.recipient.name || '-' },
        { header: 'Phone', value: (item: SmsMessageSummary) => item.recipient.phone },
        {
            header: 'Template',
            value: (item: SmsMessageSummary) => item.message.templateKey || item.message.type
        },
        { header: 'Message', value: (item: SmsMessageSummary) => item.message.textPreview || '-' },
        {
            header: 'Source',
            value: (item: SmsMessageSummary) =>
                [
                    item.source?.app,
                    item.source?.module,
                    item.source?.event,
                    item.source?.entityType,
                    item.source?.entityId
                ]
                    .filter(Boolean)
                    .join(' / ') || '-'
        },
        { header: 'Provider ID', value: (item: SmsMessageSummary) => item.providerMessageId || '-' },
        { header: 'Sender ID', value: (item: SmsMessageSummary) => item.senderId || '-' },
        {
            header: 'Error',
            value: (item: SmsMessageSummary) =>
                [item.errorCode, item.errorDetail].filter(Boolean).join(': ') || '-'
        },
        { header: 'Sent At', value: (item: SmsMessageSummary) => formatSmsDateTime(item.sentAt) },
        {
            header: 'Final At',
            value: (item: SmsMessageSummary) => formatSmsDateTime(item.deliveredAt || item.failedAt)
        }
    ]
});

type SmsRetryPolicySummary = {
    enabled: boolean;
    maxAttempts: number;
    retryAfterMinutes: number;
    withinHours: number;
    maxMessagesPerRun: number;
    statuses: string[];
    skipErrorCodes: string[];
    parseError: string | null;
};

const normalizeRetryPolicyBoolean = (value: unknown, fallback = false) => {
    if (value == null) return fallback;
    return value === true || value === 'true' || value === 1 || value === '1';
};

const normalizeRetryPolicyInt = (value: unknown, fallback: number, min: number, max: number) => {
    const numeric = Number(value ?? fallback);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(Math.trunc(numeric), min), max);
};

const parseRetryPolicyStringArray = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value
                .map((entry) => {
                    if (typeof entry === 'string') return entry.trim().toLowerCase();
                    if (typeof entry === 'number') return String(entry).trim().toLowerCase();
                    return '';
                })
                .filter(Boolean)
        )
    );
};

const getSmsRetryPolicySummary = (metadataJson: string): SmsRetryPolicySummary => {
    const fallback: SmsRetryPolicySummary = {
        enabled: false,
        maxAttempts: 2,
        retryAfterMinutes: 30,
        withinHours: 72,
        maxMessagesPerRun: 25,
        statuses: ['failed'],
        skipErrorCodes: [],
        parseError: null
    };

    const normalized = metadataJson.trim();
    if (!normalized) return fallback;

    try {
        const parsed = JSON.parse(normalized);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ...fallback, parseError: 'Metadata must be a JSON object.' };
        }

        const retryPolicy = (parsed as Record<string, unknown>).retryPolicy;
        if (retryPolicy == null) return fallback;
        if (!retryPolicy || typeof retryPolicy !== 'object' || Array.isArray(retryPolicy)) {
            return { ...fallback, parseError: 'retryPolicy must be a JSON object.' };
        }

        const record = retryPolicy as Record<string, unknown>;
        const enabled =
            normalizeRetryPolicyBoolean(record.enabled, false) && normalizeRetryPolicyBoolean(record.isEnabled, true);
        const statuses = parseRetryPolicyStringArray(record.statuses ?? record.retryStatuses);

        return {
            enabled,
            maxAttempts: normalizeRetryPolicyInt(record.maxAttempts ?? record.retryLimit, 2, 1, 10),
            retryAfterMinutes: normalizeRetryPolicyInt(record.retryAfterMinutes ?? record.retryDelayMinutes, 30, 0, 10080),
            withinHours: normalizeRetryPolicyInt(record.withinHours ?? record.lookbackHours, 72, 1, 24 * 30),
            maxMessagesPerRun: normalizeRetryPolicyInt(record.maxMessagesPerRun ?? record.limit, 25, 1, 200),
            statuses: statuses.length > 0 ? statuses : ['failed'],
            skipErrorCodes: parseRetryPolicyStringArray(record.skipErrorCodes ?? record.excludeErrorCodes),
            parseError: null
        };
    } catch {
        return { ...fallback, parseError: 'Metadata JSON must be valid before retryPolicy can be parsed.' };
    }
};

const getRetrySweepSeverity = (status: string) => {
    switch (status) {
        case 'retried':
            return 'success';
        case 'dry_run':
            return 'info';
        case 'skipped':
            return 'warning';
        case 'failed':
            return 'danger';
        default:
            return undefined;
    }
};

const canRetrySmsMessage = (status: string) => status === 'failed' || status === 'sandbox';

export default function SmsAppPage() {
    const [selectedBindingKey, setSelectedBindingKey] = React.useState(SMS_BINDINGS[0].bindingKey);
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [previewing, setPreviewing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const [previewResult, setPreviewResult] = React.useState<SmsTemplateBindingPreview | null>(null);
    const [tenantOverviewLoading, setTenantOverviewLoading] = React.useState(false);
    const [tenantOverviewError, setTenantOverviewError] = React.useState<string | null>(null);
    const [tenantOverview, setTenantOverview] = React.useState<SmsTenantOperationalOverview | null>(null);
    const [tenantOverviewSearch, setTenantOverviewSearch] = React.useState('');
    const [tenantOverviewSourceApp, setTenantOverviewSourceApp] = React.useState('');
    const [tenantOverviewConfigFilter, setTenantOverviewConfigFilter] = React.useState('');
    const [tenantOverviewAttentionFilter, setTenantOverviewAttentionFilter] = React.useState('');
    const [tenantOverviewExportingMode, setTenantOverviewExportingMode] = React.useState<SmsExportMode | null>(null);
    const [tenantSummaryLoading, setTenantSummaryLoading] = React.useState(false);
    const [tenantSummaryError, setTenantSummaryError] = React.useState<string | null>(null);
    const [tenantSummaryDays, setTenantSummaryDays] = React.useState<number>(30);
    const [tenantSummaryReport, setTenantSummaryReport] = React.useState<SmsDeliverySummaryReport | null>(null);
    const [tenantSummaryExportingMode, setTenantSummaryExportingMode] = React.useState<SmsExportMode | null>(null);
    const [alertSummaryLoading, setAlertSummaryLoading] = React.useState(false);
    const [alertSummaryError, setAlertSummaryError] = React.useState<string | null>(null);
    const [alertSummaryReport, setAlertSummaryReport] = React.useState<SmsDeliverySummaryReport | null>(null);
    const [alertEventsLoading, setAlertEventsLoading] = React.useState(false);
    const [alertEventsError, setAlertEventsError] = React.useState<string | null>(null);
    const [alertEvents, setAlertEvents] = React.useState<SmsAlertEvent[]>([]);
    const [alertEventReviewDialogVisible, setAlertEventReviewDialogVisible] = React.useState(false);
    const [alertEventReviewSaving, setAlertEventReviewSaving] = React.useState(false);
    const [alertEventReviewError, setAlertEventReviewError] = React.useState<string | null>(null);
    const [alertEventReviewNotice, setAlertEventReviewNotice] = React.useState<string | null>(null);
    const [alertEventReviewTarget, setAlertEventReviewTarget] = React.useState<SmsAlertEvent | null>(null);
    const [alertEventReviewStatus, setAlertEventReviewStatus] = React.useState<'open' | 'acknowledged'>('acknowledged');
    const [alertEventReviewNote, setAlertEventReviewNote] = React.useState('');
    const [alertSettingsLoading, setAlertSettingsLoading] = React.useState(false);
    const [alertSettingsSaving, setAlertSettingsSaving] = React.useState(false);
    const [alertSettingsError, setAlertSettingsError] = React.useState<string | null>(null);
    const [alertSettingsNotice, setAlertSettingsNotice] = React.useState<string | null>(null);
    const [alertSettings, setAlertSettings] = React.useState<SmsSettings | null>(null);
    const [alertSettingsForm, setAlertSettingsForm] = React.useState<SmsAlertSettingsForm>(() =>
        createAlertSettingsForm(DEFAULT_SMS_ALERT_THRESHOLDS)
    );
    const [alertEmailDeliveryForm, setAlertEmailDeliveryForm] = React.useState<SmsAlertEmailDeliveryForm>(() =>
        createAlertEmailDeliveryForm(DEFAULT_SMS_ALERT_EMAIL_DELIVERY)
    );
    const [operationalLoading, setOperationalLoading] = React.useState(false);
    const [operationalError, setOperationalError] = React.useState<string | null>(null);
    const [operationalSnapshot, setOperationalSnapshot] = React.useState<SmsOperationalSnapshot | null>(null);
    const [summaryLoading, setSummaryLoading] = React.useState(false);
    const [summaryError, setSummaryError] = React.useState<string | null>(null);
    const [summaryDays, setSummaryDays] = React.useState<number>(30);
    const [summaryReport, setSummaryReport] = React.useState<SmsDeliverySummaryReport | null>(null);
    const [summaryExportingMode, setSummaryExportingMode] = React.useState<SmsExportMode | null>(null);
    const [retrySweepLoading, setRetrySweepLoading] = React.useState(false);
    const [retrySweepMode, setRetrySweepMode] = React.useState<'dry_run' | 'live' | null>(null);
    const [retrySweepError, setRetrySweepError] = React.useState<string | null>(null);
    const [retrySweepResult, setRetrySweepResult] = React.useState<SmsRetrySweepResult | null>(null);
    const [historyLoading, setHistoryLoading] = React.useState(false);
    const [historyLoadingMore, setHistoryLoadingMore] = React.useState(false);
    const [historyError, setHistoryError] = React.useState<string | null>(null);
    const [historyNotice, setHistoryNotice] = React.useState<string | null>(null);
    const [historyExportingMode, setHistoryExportingMode] = React.useState<SmsExportMode | null>(null);
    const [historyItems, setHistoryItems] = React.useState<SmsMessageSummary[]>([]);
    const [historyNextCursor, setHistoryNextCursor] = React.useState<string | null>(null);
    const [historyStatus, setHistoryStatus] = React.useState('');
    const [historyPhone, setHistoryPhone] = React.useState('');
    const [retryingMessageId, setRetryingMessageId] = React.useState<string | null>(null);
    const [webhookDialogVisible, setWebhookDialogVisible] = React.useState(false);
    const [webhookLoading, setWebhookLoading] = React.useState(false);
    const [webhookError, setWebhookError] = React.useState<string | null>(null);
    const [webhookEvents, setWebhookEvents] = React.useState<SmsWebhookEventSummary[]>([]);
    const [selectedWebhookMessage, setSelectedWebhookMessage] = React.useState<SmsMessageSummary | null>(null);
    const selectedBindingKeyRef = React.useRef(selectedBindingKey);
    const tenantOverviewRequestRef = React.useRef(0);
    const tenantSummaryRequestRef = React.useRef(0);
    const alertSettingsRequestRef = React.useRef(0);
    const alertSummaryRequestRef = React.useRef(0);
    const alertEventsRequestRef = React.useRef(0);
    const operationalRequestRef = React.useRef(0);
    const summaryRequestRef = React.useRef(0);
    const selectedConfig = findBindingConfig(selectedBindingKey);
    const tenantOverviewFilters = {
        search: tenantOverviewSearch,
        sourceApp: tenantOverviewSourceApp,
        config: tenantOverviewConfigFilter,
        attention: tenantOverviewAttentionFilter
    };
    const tenantOverviewItems = tenantOverview?.items ?? [];
    const tenantOverviewFilteredItems = filterTenantOverviewItems(tenantOverviewItems, tenantOverviewFilters);
    const hasTenantOverviewFilters = Boolean(
        tenantOverviewSearch.trim() ||
            tenantOverviewSourceApp ||
            tenantOverviewConfigFilter ||
            tenantOverviewAttentionFilter
    );
    const tenantSummaryScopeLabel = getSmsStringFilterLabel(
        SMS_TENANT_OVERVIEW_APP_OPTIONS,
        tenantOverviewSourceApp,
        'All apps'
    );
    const tenantAlertScopeItems = tenantOverviewItems.filter(
        (item) => !tenantOverviewSourceApp || item.sourceApp === tenantOverviewSourceApp
    );
    const normalizedAlertThresholds = normalizeAlertSettingsForm(alertSettingsForm);
    const normalizedAlertEmailDelivery = normalizeAlertEmailDeliveryForm(alertEmailDeliveryForm);
    const alertEmailRecipientCount = normalizedAlertEmailDelivery.recipientEmails.length;
    const tenantAlertPreviewItems = buildTenantAlertPreview(
        normalizedAlertThresholds,
        tenantAlertScopeItems,
        alertSummaryReport
    );
    const tenantTriggeredAlertCount = tenantAlertPreviewItems.filter((item) => item.triggered).length;
    const [form, setForm] = React.useState<FormState>(() => createFormState(selectedConfig));
    const [previewContextJson, setPreviewContextJson] = React.useState(selectedConfig.previewContextExample);
    const retryPolicySummary = getSmsRetryPolicySummary(form.metadataJson);

    React.useEffect(() => {
        selectedBindingKeyRef.current = selectedBindingKey;
    }, [selectedBindingKey]);

    const loadAlertSettings = async () => {
        const requestId = alertSettingsRequestRef.current + 1;
        alertSettingsRequestRef.current = requestId;
        setAlertSettingsLoading(true);
        setAlertSettingsError(null);
        try {
            const result = await getSmsSettings();
            if (alertSettingsRequestRef.current !== requestId) return;
            setAlertSettings(result);
            setAlertSettingsForm(createAlertSettingsForm(result.alertThresholds));
            setAlertEmailDeliveryForm(createAlertEmailDeliveryForm(result.alertEmailDelivery));
        } catch (nextError) {
            if (alertSettingsRequestRef.current !== requestId) return;
            setAlertSettingsError(nextError instanceof Error ? nextError.message : 'Failed to load tenant SMS alert settings');
        } finally {
            if (alertSettingsRequestRef.current === requestId) {
                setAlertSettingsLoading(false);
            }
        }
    };

    const saveAlertSettings = async () => {
        setAlertSettingsSaving(true);
        setAlertSettingsError(null);
        setAlertSettingsNotice(null);
        try {
            const saved = await upsertSmsSettings({
                alertThresholds: normalizeAlertSettingsForm(alertSettingsForm),
                alertEmailDelivery: normalizeAlertEmailDeliveryForm(alertEmailDeliveryForm)
            });
            setAlertSettings(saved);
            setAlertSettingsForm(createAlertSettingsForm(saved.alertThresholds));
            setAlertEmailDeliveryForm(createAlertEmailDeliveryForm(saved.alertEmailDelivery));
            setAlertSettingsNotice('Tenant SMS alert settings saved.');
            await loadAlertSummary(saved.alertThresholds.rateWindowDays, tenantOverviewSourceApp);
            await loadAlertEvents();
        } catch (nextError) {
            setAlertSettingsError(nextError instanceof Error ? nextError.message : 'Failed to save tenant SMS alert settings');
        } finally {
            setAlertSettingsSaving(false);
        }
    };

    const loadBinding = async (config: SmsBindingConfig) => {
        setLoading(true);
        setError(null);
        try {
            const binding = await getSmsTemplateBinding(config.bindingKey);
            if (selectedBindingKeyRef.current !== config.bindingKey) return;
            setForm(createFormState(config, binding));
        } catch (nextError) {
            if (selectedBindingKeyRef.current !== config.bindingKey) return;
            setError(nextError instanceof Error ? nextError.message : 'Failed to load SMS settings');
        } finally {
            if (selectedBindingKeyRef.current === config.bindingKey) {
                setLoading(false);
            }
        }
    };

    React.useEffect(() => {
        setForm(createFormState(selectedConfig));
        setPreviewContextJson(selectedConfig.previewContextExample);
        setPreviewResult(null);
        setError(null);
        setNotice(null);
        setTenantOverviewError(null);
        setTenantOverview(null);
        setTenantOverviewExportingMode(null);
        setOperationalError(null);
        setOperationalSnapshot(null);
        setSummaryError(null);
        setSummaryReport(null);
        setSummaryExportingMode(null);
        setRetrySweepError(null);
        setRetrySweepMode(null);
        setRetrySweepResult(null);
        setHistoryError(null);
        setHistoryNotice(null);
        setHistoryExportingMode(null);
        setWebhookDialogVisible(false);
        setWebhookError(null);
        setWebhookEvents([]);
        setSelectedWebhookMessage(null);
        void loadBinding(selectedConfig);
    }, [selectedConfig]);

    const saveBinding = async () => {
        setSaving(true);
        setError(null);
        setNotice(null);
        try {
            const saved = await upsertSmsTemplateBinding({
                bindingId: form.bindingId,
                bindingKey: selectedConfig.bindingKey,
                templateKey: form.templateKey || null,
                senderId: form.senderId || null,
                messageTextTemplate: form.messageTextTemplate || null,
                sourceApp: selectedConfig.sourceApp,
                sourceModule: selectedConfig.sourceModule,
                sourceEvent: selectedConfig.sourceEvent,
                sourceEntityType: selectedConfig.sourceEntityType,
                metadataJson: form.metadataJson || null,
                isActive: form.isActive
            });
            setForm(createFormState(selectedConfig, saved));
            setNotice(selectedConfig.saveNotice);
            await loadTenantOverview();
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to save SMS settings');
        } finally {
            setSaving(false);
        }
    };

    const runPreview = async () => {
        setPreviewing(true);
        setError(null);
        try {
            const result = await previewSmsTemplateBinding({
                bindingKey: selectedConfig.bindingKey,
                contextJson: previewContextJson || null,
                templateKey: form.templateKey || null,
                senderId: form.senderId || null,
                messageTextTemplate: form.messageTextTemplate || null,
                metadataJson: form.metadataJson || null
            });
            setPreviewResult(result);
        } catch (nextError) {
            setError(nextError instanceof Error ? nextError.message : 'Failed to preview SMS binding');
        } finally {
            setPreviewing(false);
        }
    };

    const loadTenantOverview = async () => {
        const requestId = tenantOverviewRequestRef.current + 1;
        tenantOverviewRequestRef.current = requestId;
        setTenantOverviewLoading(true);
        setTenantOverviewError(null);
        try {
            const result = await getSmsTenantOperationalOverview();
            if (tenantOverviewRequestRef.current !== requestId) return;
            setTenantOverview(result);
        } catch (nextError) {
            if (tenantOverviewRequestRef.current !== requestId) return;
            setTenantOverviewError(nextError instanceof Error ? nextError.message : 'Failed to load tenant SMS overview');
            setTenantOverview(null);
        } finally {
            if (tenantOverviewRequestRef.current === requestId) {
                setTenantOverviewLoading(false);
            }
        }
    };

    const resetTenantOverviewFilters = () => {
        setTenantOverviewSearch('');
        setTenantOverviewSourceApp('');
        setTenantOverviewConfigFilter('');
        setTenantOverviewAttentionFilter('');
    };

    const exportTenantOverview = async (mode: SmsExportMode) => {
        setTenantOverviewExportingMode(mode);
        setTenantOverviewError(null);
        try {
            if (!tenantOverview) {
                setTenantOverviewError('Load tenant SMS overview before exporting.');
                return;
            }
            if (tenantOverviewFilteredItems.length === 0) {
                setTenantOverviewError('No tenant SMS overview rows match the current filters to export.');
                return;
            }
            await runSmsReportExport(mode, buildTenantOverviewExportOptions(tenantOverviewFilteredItems, tenantOverviewFilters));
        } catch (nextError) {
            setTenantOverviewError(nextError instanceof Error ? nextError.message : 'Failed to export tenant SMS overview');
        } finally {
            setTenantOverviewExportingMode(null);
        }
    };

    const loadTenantSummary = async (days: number, sourceApp: string) => {
        const requestId = tenantSummaryRequestRef.current + 1;
        tenantSummaryRequestRef.current = requestId;
        setTenantSummaryLoading(true);
        setTenantSummaryError(null);
        try {
            const result = await getSmsDeliverySummary({
                sourceApp: sourceApp || null,
                days
            });
            if (tenantSummaryRequestRef.current !== requestId) return;
            setTenantSummaryReport(result);
        } catch (nextError) {
            if (tenantSummaryRequestRef.current !== requestId) return;
            setTenantSummaryError(nextError instanceof Error ? nextError.message : 'Failed to load tenant SMS delivery summary');
            setTenantSummaryReport(null);
        } finally {
            if (tenantSummaryRequestRef.current === requestId) {
                setTenantSummaryLoading(false);
            }
        }
    };

    const loadAlertSummary = async (days: number, sourceApp: string) => {
        const requestId = alertSummaryRequestRef.current + 1;
        alertSummaryRequestRef.current = requestId;
        setAlertSummaryLoading(true);
        setAlertSummaryError(null);
        try {
            const result = await getSmsDeliverySummary({
                sourceApp: sourceApp || null,
                days
            });
            if (alertSummaryRequestRef.current !== requestId) return;
            setAlertSummaryReport(result);
        } catch (nextError) {
            if (alertSummaryRequestRef.current !== requestId) return;
            setAlertSummaryError(nextError instanceof Error ? nextError.message : 'Failed to load tenant SMS alert summary');
            setAlertSummaryReport(null);
        } finally {
            if (alertSummaryRequestRef.current === requestId) {
                setAlertSummaryLoading(false);
            }
        }
    };

    const loadAlertEvents = async () => {
        const requestId = alertEventsRequestRef.current + 1;
        alertEventsRequestRef.current = requestId;
        setAlertEventsLoading(true);
        setAlertEventsError(null);
        try {
            const result = await listSmsAlertEvents(20);
            if (alertEventsRequestRef.current !== requestId) return;
            setAlertEvents(result);
        } catch (nextError) {
            if (alertEventsRequestRef.current !== requestId) return;
            setAlertEventsError(nextError instanceof Error ? nextError.message : 'Failed to load scheduled SMS alert events');
            setAlertEvents([]);
        } finally {
            if (alertEventsRequestRef.current === requestId) {
                setAlertEventsLoading(false);
            }
        }
    };

    const openAlertEventReviewDialog = (event: SmsAlertEvent, status: 'open' | 'acknowledged') => {
        setAlertEventReviewTarget(event);
        setAlertEventReviewStatus(status);
        setAlertEventReviewNote(event.reviewNote ?? '');
        setAlertEventReviewError(null);
        setAlertEventReviewNotice(null);
        setAlertEventReviewDialogVisible(true);
    };

    const closeAlertEventReviewDialog = () => {
        if (alertEventReviewSaving) return;
        setAlertEventReviewDialogVisible(false);
        setAlertEventReviewTarget(null);
        setAlertEventReviewStatus('acknowledged');
        setAlertEventReviewNote('');
        setAlertEventReviewError(null);
    };

    const submitAlertEventReview = async () => {
        if (!alertEventReviewTarget) return;
        setAlertEventReviewSaving(true);
        setAlertEventReviewError(null);
        setAlertEventReviewNotice(null);
        try {
            const updated = await setSmsAlertEventReview({
                eventId: alertEventReviewTarget.id,
                status: alertEventReviewStatus,
                note: alertEventReviewNote.trim() || null
            });
            setAlertEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            closeAlertEventReviewDialog();
            setAlertEventReviewNotice(
                updated.reviewStatus === 'acknowledged'
                    ? 'SMS alert event acknowledged.'
                    : 'SMS alert event reopened for follow-up.'
            );
        } catch (nextError) {
            setAlertEventReviewError(nextError instanceof Error ? nextError.message : 'Failed to update SMS alert event review');
        } finally {
            setAlertEventReviewSaving(false);
        }
    };

    const exportTenantSummary = async (mode: SmsExportMode) => {
        if (!tenantSummaryReport || tenantSummaryReport.totalCount <= 0) return;

        setTenantSummaryExportingMode(mode);
        setTenantSummaryError(null);
        try {
            await runSmsReportExport(
                mode,
                buildTenantDeliverySummaryExportOptions(tenantSummaryReport, {
                    sourceApp: tenantOverviewSourceApp,
                    days: tenantSummaryDays
                })
            );
        } catch (nextError) {
            setTenantSummaryError(nextError instanceof Error ? nextError.message : 'Failed to export tenant SMS delivery summary');
        } finally {
            setTenantSummaryExportingMode(null);
        }
    };

    const loadOperationalSnapshot = async (config: SmsBindingConfig) => {
        const requestId = operationalRequestRef.current + 1;
        operationalRequestRef.current = requestId;
        setOperationalLoading(true);
        setOperationalError(null);
        try {
            const result = await getSmsOperationalSnapshot({
                sourceApp: config.sourceApp,
                sourceModule: config.sourceModule,
                sourceEvent: config.sourceEvent,
                sourceEntityType: config.sourceEntityType
            });
            if (selectedBindingKeyRef.current !== config.bindingKey || operationalRequestRef.current !== requestId) return;
            setOperationalSnapshot(result);
        } catch (nextError) {
            if (selectedBindingKeyRef.current !== config.bindingKey || operationalRequestRef.current !== requestId) return;
            setOperationalError(nextError instanceof Error ? nextError.message : 'Failed to load SMS operational snapshot');
            setOperationalSnapshot(null);
        } finally {
            if (selectedBindingKeyRef.current === config.bindingKey && operationalRequestRef.current === requestId) {
                setOperationalLoading(false);
            }
        }
    };

    const loadSummary = async (config: SmsBindingConfig, days: number) => {
        const requestId = summaryRequestRef.current + 1;
        summaryRequestRef.current = requestId;
        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const result = await getSmsDeliverySummary({
                sourceApp: config.sourceApp,
                sourceModule: config.sourceModule,
                sourceEvent: config.sourceEvent,
                sourceEntityType: config.sourceEntityType,
                days
            });
            if (selectedBindingKeyRef.current !== config.bindingKey || summaryRequestRef.current !== requestId) return;
            setSummaryReport(result);
        } catch (nextError) {
            if (selectedBindingKeyRef.current !== config.bindingKey || summaryRequestRef.current !== requestId) return;
            setSummaryError(nextError instanceof Error ? nextError.message : 'Failed to load SMS delivery summary');
            setSummaryReport(null);
        } finally {
            if (selectedBindingKeyRef.current === config.bindingKey && summaryRequestRef.current === requestId) {
                setSummaryLoading(false);
            }
        }
    };

    const exportSummaryReport = async (mode: SmsExportMode) => {
        if (!summaryReport || summaryReport.totalCount <= 0) return;

        setSummaryExportingMode(mode);
        setSummaryError(null);
        try {
            await runSmsReportExport(mode, buildSmsSummaryExportOptions(selectedConfig, summaryReport));
        } catch (nextError) {
            setSummaryError(nextError instanceof Error ? nextError.message : 'Failed to export SMS delivery summary');
        } finally {
            setSummaryExportingMode(null);
        }
    };

    const runBindingRetrySweep = async (dryRun: boolean) => {
        setRetrySweepLoading(true);
        setRetrySweepMode(dryRun ? 'dry_run' : 'live');
        setRetrySweepError(null);
        try {
            const result = await runSmsRetrySweep({
                bindingKey: selectedConfig.bindingKey,
                dryRun
            });
            setRetrySweepResult(result);
            if (!dryRun) {
                await loadTenantOverview();
                await loadTenantSummary(tenantSummaryDays, tenantOverviewSourceApp);
                await loadOperationalSnapshot(selectedConfig);
                await loadSummary(selectedConfig, summaryDays);
                await loadHistory(false);
            }
        } catch (nextError) {
            setRetrySweepError(nextError instanceof Error ? nextError.message : 'Failed to run SMS retry sweep');
        } finally {
            setRetrySweepLoading(false);
            setRetrySweepMode(null);
        }
    };

    const loadHistory = async (append = false) => {
        if (append && !historyNextCursor) return;
        if (append) {
            setHistoryLoadingMore(true);
        } else {
            setHistoryLoading(true);
        }
        setHistoryError(null);
        try {
            const result = await listSmsMessages({
                sourceApp: selectedConfig.sourceApp,
                sourceModule: selectedConfig.sourceModule,
                sourceEvent: selectedConfig.sourceEvent,
                sourceEntityType: selectedConfig.sourceEntityType,
                status: historyStatus || null,
                toPhone: historyPhone.trim() || null,
                limit: SMS_HISTORY_LIMIT,
                cursor: append ? historyNextCursor : null
            });
            setHistoryItems((current) => (append ? [...current, ...result.items] : result.items));
            setHistoryNextCursor(result.nextCursor);
        } catch (nextError) {
            setHistoryError(nextError instanceof Error ? nextError.message : 'Failed to load SMS history');
            if (!append) {
                setHistoryItems([]);
                setHistoryNextCursor(null);
            }
        } finally {
            if (append) {
                setHistoryLoadingMore(false);
            } else {
                setHistoryLoading(false);
            }
        }
    };

    const exportHistoryReport = async (mode: SmsExportMode) => {
        setHistoryExportingMode(mode);
        setHistoryError(null);
        setHistoryNotice(null);
        try {
            const result = await listAllSmsMessages({
                sourceApp: selectedConfig.sourceApp,
                sourceModule: selectedConfig.sourceModule,
                sourceEvent: selectedConfig.sourceEvent,
                sourceEntityType: selectedConfig.sourceEntityType,
                status: historyStatus || null,
                toPhone: historyPhone.trim() || null,
                maxRows: SMS_EXPORT_LIMIT
            });
            if (result.items.length === 0) {
                setHistoryError('No SMS messages found for the current filters to export.');
                return;
            }
            await runSmsReportExport(
                mode,
                buildSmsHistoryExportOptions(selectedConfig, result.items, {
                    status: historyStatus,
                    phone: historyPhone,
                    truncated: result.truncated
                })
            );
            if (result.truncated) {
                setHistoryNotice(
                    `Export included the first ${formatSmsCount(result.items.length)} matching messages. Narrow the filters to export the remaining history.`
                );
            }
        } catch (nextError) {
            setHistoryError(nextError instanceof Error ? nextError.message : 'Failed to export SMS history');
        } finally {
            setHistoryExportingMode(null);
        }
    };

    React.useEffect(() => {
        void loadAlertSettings();
        void loadAlertEvents();
    }, []);

    React.useEffect(() => {
        void loadTenantOverview();
        void loadOperationalSnapshot(selectedConfig);
        void loadHistory(false);
    }, [selectedConfig.bindingKey]);

    React.useEffect(() => {
        void loadSummary(selectedConfig, summaryDays);
    }, [selectedConfig.bindingKey, summaryDays]);

    React.useEffect(() => {
        void loadTenantSummary(tenantSummaryDays, tenantOverviewSourceApp);
    }, [tenantOverviewSourceApp, tenantSummaryDays]);

    React.useEffect(() => {
        void loadAlertSummary(normalizedAlertThresholds.rateWindowDays, tenantOverviewSourceApp);
    }, [tenantOverviewSourceApp, normalizedAlertThresholds.rateWindowDays]);

    const retryHistoryMessage = async (messageId: string) => {
        setRetryingMessageId(messageId);
        setHistoryError(null);
        setHistoryNotice(null);
        try {
            const result = await retrySmsMessage(messageId);
            setHistoryNotice(result.note || `Retry created with status ${result.status} for ${result.recipient.phone}.`);
            await loadTenantOverview();
            await loadTenantSummary(tenantSummaryDays, tenantOverviewSourceApp);
            await loadOperationalSnapshot(selectedConfig);
            await loadSummary(selectedConfig, summaryDays);
            await loadHistory(false);
        } catch (nextError) {
            setHistoryError(nextError instanceof Error ? nextError.message : 'Failed to retry SMS message');
        } finally {
            setRetryingMessageId(null);
        }
    };

    const closeWebhookDialog = () => {
        setWebhookDialogVisible(false);
        setWebhookError(null);
        setWebhookEvents([]);
        setSelectedWebhookMessage(null);
    };

    const loadWebhookEvents = async (message: SmsMessageSummary) => {
        setSelectedWebhookMessage(message);
        setWebhookDialogVisible(true);
        setWebhookLoading(true);
        setWebhookError(null);
        try {
            const events = await listSmsWebhookEvents({
                messageId: message.id,
                providerMessageId: message.providerMessageId,
                limit: SMS_WEBHOOK_EVENTS_LIMIT
            });
            setWebhookEvents(events);
        } catch (nextError) {
            setWebhookError(nextError instanceof Error ? nextError.message : 'Failed to load webhook events');
            setWebhookEvents([]);
        } finally {
            setWebhookLoading(false);
        }
    };

    return (
        <div className="grid">
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h2 className="mb-2">Tenant SMS Overview</h2>
                            <p className="text-600 mb-0">
                                Cross-binding backlog and issue view for the entire tenant before drilling into an individual SMS event.
                            </p>
                        </div>
                        <div className="flex flex-column align-items-stretch md:align-items-end gap-2">
                            <div className="flex gap-2 flex-wrap justify-content-end">
                                <Button
                                    label="CSV"
                                    icon="pi pi-file"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantOverview('csv')}
                                    disabled={
                                        tenantOverviewLoading ||
                                        Boolean(tenantOverviewExportingMode) ||
                                        tenantOverviewFilteredItems.length === 0
                                    }
                                />
                                <Button
                                    label="Excel"
                                    icon="pi pi-file-excel"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantOverview('excel')}
                                    disabled={
                                        tenantOverviewLoading ||
                                        Boolean(tenantOverviewExportingMode) ||
                                        tenantOverviewFilteredItems.length === 0
                                    }
                                />
                                <Button
                                    label="PDF"
                                    icon="pi pi-file-pdf"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantOverview('pdf')}
                                    disabled={
                                        tenantOverviewLoading ||
                                        Boolean(tenantOverviewExportingMode) ||
                                        tenantOverviewFilteredItems.length === 0
                                    }
                                />
                                <Button
                                    label="Refresh Overview"
                                    text
                                    onClick={() => void loadTenantOverview()}
                                    loading={tenantOverviewLoading}
                                    disabled={loading || saving || previewing || Boolean(tenantOverviewExportingMode)}
                                />
                            </div>
                            {tenantOverviewExportingMode ? (
                                <div className="text-600 text-sm">
                                    Preparing {tenantOverviewExportingMode.toUpperCase()} tenant overview export...
                                </div>
                            ) : (
                                <div className="text-600 text-sm">
                                    Export downloads the currently filtered tenant-wide overview rows.
                                </div>
                            )}
                        </div>
                    </div>
                    {tenantOverviewError ? <Message severity="error" text={tenantOverviewError} /> : null}
                    {tenantOverview ? (
                        <>
                            <div className="grid">
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Configured</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantOverview.configuredBindingCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">With Attention</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantOverview.attentionBindingCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Attention Messages</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantOverview.totalAttentionCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Pending</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantOverview.totalPendingCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Issues</div>
                                        <div className="text-red-500 text-2xl font-semibold">{formatSmsCount(tenantOverview.totalIssueCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Unconfigured Sources</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantOverview.unconfiguredSourceCount)}</div>
                                    </div>
                                </div>
                            </div>
                            {tenantOverview.unconfiguredSourceCount > 0 ? (
                                <Message severity="warn" text="Some SMS traffic source mappings have attention messages without a saved SMS binding record." />
                            ) : null}
                            <div className="surface-50 border-1 border-200 border-round p-3">
                                <div className="grid">
                                    <div className="col-12 md:col-6 xl:col-3">
                                        <label htmlFor="tenant-overview-search" className="block text-700 mb-2">Search</label>
                                        <AppInput
                                            inputId="tenant-overview-search"
                                            value={tenantOverviewSearch}
                                            onChange={(event) => setTenantOverviewSearch(event.target.value)}
                                            placeholder="Binding, app, event, config..."
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 xl:col-3">
                                        <label htmlFor="tenant-overview-app" className="block text-700 mb-2">App</label>
                                        <AppDropdown
                                            inputId="tenant-overview-app"
                                            value={tenantOverviewSourceApp}
                                            options={SMS_TENANT_OVERVIEW_APP_OPTIONS}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setTenantOverviewSourceApp(String(event.value ?? ''))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 xl:col-3">
                                        <label htmlFor="tenant-overview-config" className="block text-700 mb-2">Config</label>
                                        <AppDropdown
                                            inputId="tenant-overview-config"
                                            value={tenantOverviewConfigFilter}
                                            options={SMS_TENANT_OVERVIEW_CONFIG_OPTIONS}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setTenantOverviewConfigFilter(String(event.value ?? ''))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="col-12 md:col-6 xl:col-3">
                                        <label htmlFor="tenant-overview-attention" className="block text-700 mb-2">Attention</label>
                                        <AppDropdown
                                            inputId="tenant-overview-attention"
                                            value={tenantOverviewAttentionFilter}
                                            options={SMS_TENANT_OVERVIEW_ATTENTION_OPTIONS}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={(event) => setTenantOverviewAttentionFilter(String(event.value ?? ''))}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mt-2">
                                    <div className="text-600 text-sm">
                                        Showing {formatSmsCount(tenantOverviewFilteredItems.length)} of {formatSmsCount(tenantOverviewItems.length)} bindings.
                                    </div>
                                    <Button
                                        label="Reset Filters"
                                        text
                                        className="app-action-compact align-self-start md:align-self-auto"
                                        onClick={resetTenantOverviewFilters}
                                        disabled={!hasTenantOverviewFilters}
                                    />
                                </div>
                            </div>
                            <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                <table className="w-full text-sm" style={{ minWidth: '980px', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr className="surface-100 text-700">
                                            <th className="text-left p-3">Binding</th>
                                            <th className="text-left p-3">Source</th>
                                            <th className="text-left p-3">Config</th>
                                            <th className="text-right p-3">Attention</th>
                                            <th className="text-right p-3">Pending</th>
                                            <th className="text-right p-3">Issues</th>
                                            <th className="text-left p-3">Timing</th>
                                            <th className="text-left p-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tenantOverview.items.length === 0 ? (
                                            <tr>
                                                <td className="p-3 text-600" colSpan={8}>No tenant-wide SMS activity or saved bindings found yet.</td>
                                            </tr>
                                        ) : tenantOverviewFilteredItems.length === 0 ? (
                                            <tr>
                                                <td className="p-3 text-600" colSpan={8}>No tenant-wide SMS overview rows match the current filters.</td>
                                            </tr>
                                        ) : (
                                            tenantOverviewFilteredItems.map((item) => {
                                                const isKnownBinding = Boolean(item.bindingKey && SMS_BINDINGS.some((entry) => entry.bindingKey === item.bindingKey));
                                                const isSelected = item.bindingKey != null && item.bindingKey === selectedBindingKey;
                                                return (
                                                    <tr key={`${item.bindingKey || 'unconfigured'}-${formatSmsSourceSummary(item)}`} className={`border-top-1 border-200 ${isSelected ? 'surface-50' : ''}`}>
                                                        <td className="p-3 align-top">
                                                            <div className="text-900 font-medium">{getTenantOverviewBindingLabel(item)}</div>
                                                            {item.bindingKey ? <div className="text-600 mt-1">{item.bindingKey}</div> : <div className="text-600 mt-1">No binding key</div>}
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            <div className="text-700 line-height-3">{formatSmsSourceSummary(item)}</div>
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            <div className="flex flex-column gap-2 align-items-start">
                                                                {!item.isConfigured ? (
                                                                    <Tag value="UNCONFIGURED" severity="warning" />
                                                                ) : item.isActive ? (
                                                                    <Tag value="ACTIVE" severity="success" />
                                                                ) : (
                                                                    <Tag value="INACTIVE" severity="warning" />
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 align-top text-right text-900 font-medium">{formatSmsCount(item.attentionCount)}</td>
                                                        <td className="p-3 align-top text-right text-900">{formatSmsCount(item.pendingCount)}</td>
                                                        <td className="p-3 align-top text-right text-red-500">{formatSmsCount(item.issueCount)}</td>
                                                        <td className="p-3 align-top">
                                                            <div className="text-700">Oldest pending: {formatSmsDateTime(item.oldestPendingAt)}</div>
                                                            <div className="text-600 mt-1">Latest issue: {formatSmsDateTime(item.latestIssueAt)}</div>
                                                        </td>
                                                        <td className="p-3 align-top">
                                                            {isKnownBinding && item.bindingKey ? (
                                                                <Button
                                                                    label={isSelected ? 'Selected' : 'Open Binding'}
                                                                    icon={isSelected ? 'pi pi-check' : 'pi pi-arrow-right'}
                                                                    text
                                                                    className="p-button-sm"
                                                                    onClick={() => setSelectedBindingKey(item.bindingKey || SMS_BINDINGS[0].bindingKey)}
                                                                    disabled={isSelected}
                                                                />
                                                            ) : (
                                                                <div className="text-600">-</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : tenantOverviewLoading ? (
                        <div className="text-600">Loading tenant SMS overview...</div>
                    ) : (
                        <div className="text-600">No tenant SMS overview data found yet.</div>
                    )}
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Tenant Delivery Trend</h3>
                            <p className="text-600 mb-0">
                                Windowed delivery activity across <strong>{tenantSummaryScopeLabel}</strong>. This follows the App filter from the tenant overview above.
                            </p>
                        </div>
                        <div className="flex flex-column align-items-stretch md:align-items-end gap-2">
                            <div className="flex gap-2 flex-wrap justify-content-end">
                                <Button
                                    label="CSV"
                                    icon="pi pi-file"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantSummary('csv')}
                                    disabled={tenantSummaryLoading || Boolean(tenantSummaryExportingMode) || !tenantSummaryReport || tenantSummaryReport.totalCount <= 0}
                                />
                                <Button
                                    label="Excel"
                                    icon="pi pi-file-excel"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantSummary('excel')}
                                    disabled={tenantSummaryLoading || Boolean(tenantSummaryExportingMode) || !tenantSummaryReport || tenantSummaryReport.totalCount <= 0}
                                />
                                <Button
                                    label="PDF"
                                    icon="pi pi-file-pdf"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportTenantSummary('pdf')}
                                    disabled={tenantSummaryLoading || Boolean(tenantSummaryExportingMode) || !tenantSummaryReport || tenantSummaryReport.totalCount <= 0}
                                />
                            </div>
                            {tenantSummaryExportingMode ? (
                                <div className="text-600 text-sm">
                                    Preparing {tenantSummaryExportingMode.toUpperCase()} tenant delivery export...
                                </div>
                            ) : (
                                <div className="text-600 text-sm">
                                    Export downloads the daily tenant delivery breakdown for the current app scope and window.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-end">
                        <div className="surface-50 border-1 border-200 border-round px-3 py-2 text-sm text-700">
                            App scope: <strong>{tenantSummaryScopeLabel}</strong>
                        </div>
                        <div style={{ minWidth: '12rem' }}>
                            <label htmlFor="tenant-summary-days" className="block text-700 mb-2">Window</label>
                            <AppDropdown
                                inputId="tenant-summary-days"
                                value={tenantSummaryDays}
                                options={SMS_SUMMARY_DAY_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => setTenantSummaryDays(Number(event.value ?? 30))}
                                className="w-full"
                                disabled={tenantSummaryLoading}
                            />
                        </div>
                        <Button
                            label="Refresh Trend"
                            text
                            onClick={() => void loadTenantSummary(tenantSummaryDays, tenantOverviewSourceApp)}
                            loading={tenantSummaryLoading}
                            disabled={Boolean(tenantSummaryExportingMode)}
                        />
                    </div>
                    {tenantSummaryError ? <Message severity="error" text={tenantSummaryError} /> : null}
                    {tenantSummaryReport ? (
                        <>
                            <div className="grid">
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Total</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.totalCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Delivered</div>
                                        <div className="text-green-600 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.deliveredCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Failed</div>
                                        <div className="text-red-500 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.failedCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Pending</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.queuedCount + tenantSummaryReport.sentCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Sandbox</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.sandboxCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Callbacks</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(tenantSummaryReport.receivedCount)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                                <div><strong>Latest message:</strong> {formatSmsDateTime(tenantSummaryReport.latestMessageAt)}</div>
                                <div><strong>Delivered rate:</strong> {formatSmsPercent(tenantSummaryReport.deliveredCount, tenantSummaryReport.totalCount)}</div>
                                <div><strong>Failed rate:</strong> {formatSmsPercent(tenantSummaryReport.failedCount, tenantSummaryReport.totalCount)}</div>
                                <div><strong>Window:</strong> Last {formatSmsCount(tenantSummaryReport.windowDays)} days</div>
                            </div>
                            <div className="grid">
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Status Breakdown</div>
                                        {tenantSummaryReport.statusCounts.length === 0 ? (
                                            <div className="text-600 text-sm">No status totals available for this scope.</div>
                                        ) : (
                                            <div className="flex flex-column gap-2">
                                                {tenantSummaryReport.statusCounts.map((item) => (
                                                    <div key={item.status} className="flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2">
                                                        <Tag value={item.status.toUpperCase()} severity={getSmsStatusSeverity(item.status)} />
                                                        <div className="text-900 font-medium">{formatSmsCount(item.count)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Top Failure Codes</div>
                                        {tenantSummaryReport.topFailureCodes.length === 0 ? (
                                            <div className="text-600 text-sm">No failure codes recorded in this window.</div>
                                        ) : (
                                            <div className="flex flex-column gap-2">
                                                {tenantSummaryReport.topFailureCodes.map((item) => (
                                                    <div key={item.errorCode} className="flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2">
                                                        <div className="text-700">{item.errorCode}</div>
                                                        <div className="text-900 font-medium">{formatSmsCount(item.count)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Daily Totals</div>
                                        {tenantSummaryReport.dailyBuckets.length === 0 ? (
                                            <div className="text-600 text-sm">No daily SMS activity found for this window.</div>
                                        ) : (
                                            <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                                <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '320px' }}>
                                                    <thead>
                                                        <tr className="surface-100 text-700">
                                                            <th className="text-left p-2">Date</th>
                                                            <th className="text-right p-2">Total</th>
                                                            <th className="text-right p-2">Delivered</th>
                                                            <th className="text-right p-2">Failed</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tenantSummaryReport.dailyBuckets.map((item) => (
                                                            <tr key={item.date} className="border-top-1 border-200">
                                                                <td className="p-2 text-700">{item.date}</td>
                                                                <td className="p-2 text-right text-900">{formatSmsCount(item.totalCount)}</td>
                                                                <td className="p-2 text-right text-green-600">{formatSmsCount(item.deliveredCount)}</td>
                                                                <td className="p-2 text-right text-red-500">{formatSmsCount(item.failedCount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : tenantSummaryLoading ? (
                        <div className="text-600">Loading tenant delivery trend...</div>
                    ) : (
                        <div className="text-600">No tenant SMS delivery activity found for the current scope and window.</div>
                    )}
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Tenant Alert Thresholds</h3>
                            <p className="text-600 mb-0">
                                Persist tenant-wide SMS alert rules, preview them against the current app scope, and review scheduled alert history.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-content-end">
                            <Button
                                label="Reload Alerts"
                                text
                                onClick={() => void loadAlertSettings()}
                                loading={alertSettingsLoading}
                                disabled={alertSettingsSaving}
                            />
                            <Button
                                label="Save Alerts"
                                icon="pi pi-bell"
                                onClick={() => void saveAlertSettings()}
                                loading={alertSettingsSaving}
                                disabled={alertSettingsLoading}
                            />
                        </div>
                    </div>
                    <Message severity="info" text="Alert evaluation follows the current App filter from Tenant SMS Overview. Search, config, and attention filters do not change alert scope." />
                    {alertSettingsError ? <Message severity="error" text={alertSettingsError} /> : null}
                    {alertSettingsNotice ? <Message severity="success" text={alertSettingsNotice} /> : null}
                    {alertSummaryError ? <Message severity="warn" text={alertSummaryError} /> : null}
                    {alertSummaryLoading ? <Message severity="info" text="Refreshing the current alert summary window..." /> : null}
                    {alertEventsError ? <Message severity="warn" text={alertEventsError} /> : null}
                    {!normalizedAlertThresholds.enabled ? (
                        <Message severity="warn" text="Tenant SMS alerts are currently disabled. Threshold preview below remains available." />
                    ) : tenantTriggeredAlertCount > 0 ? (
                        <Message severity="warn" text={`${formatSmsCount(tenantTriggeredAlertCount)} tenant SMS alert thresholds are currently firing for ${tenantSummaryScopeLabel}.`} />
                    ) : (
                        <Message severity="success" text={`No tenant SMS alert thresholds are currently firing for ${tenantSummaryScopeLabel}.`} />
                    )}
                    <div className="grid">
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="flex align-items-center gap-2 h-full surface-50 border-1 border-200 border-round p-3">
                                <InputSwitch
                                    inputId="tenant-alert-enabled"
                                    checked={alertSettingsForm.enabled}
                                    onChange={(event) =>
                                        setAlertSettingsForm((current) => ({ ...current, enabled: !!event.value }))
                                    }
                                    disabled={alertSettingsLoading || alertSettingsSaving}
                                />
                                <label htmlFor="tenant-alert-enabled">Enable tenant SMS alerts</label>
                            </div>
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-failed-rate" className="block text-700 mb-2">Failed rate %</label>
                            <AppInput
                                inputId="tenant-alert-failed-rate"
                                value={alertSettingsForm.failedRatePercent}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, failedRatePercent: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-min-volume" className="block text-700 mb-2">Min messages for rate alert</label>
                            <AppInput
                                inputId="tenant-alert-min-volume"
                                value={alertSettingsForm.minimumMessagesForRateAlert}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, minimumMessagesForRateAlert: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-pending" className="block text-700 mb-2">Pending backlog</label>
                            <AppInput
                                inputId="tenant-alert-pending"
                                value={alertSettingsForm.pendingCount}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, pendingCount: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-issues" className="block text-700 mb-2">Issue backlog</label>
                            <AppInput
                                inputId="tenant-alert-issues"
                                value={alertSettingsForm.issueCount}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, issueCount: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-unconfigured" className="block text-700 mb-2">Unconfigured sources</label>
                            <AppInput
                                inputId="tenant-alert-unconfigured"
                                value={alertSettingsForm.unconfiguredSourceCount}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, unconfiguredSourceCount: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-oldest-pending" className="block text-700 mb-2">Oldest pending age (hours)</label>
                            <AppInput
                                inputId="tenant-alert-oldest-pending"
                                value={alertSettingsForm.oldestPendingHours}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, oldestPendingHours: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-rate-window" className="block text-700 mb-2">Rate window (days)</label>
                            <AppInput
                                inputId="tenant-alert-rate-window"
                                value={alertSettingsForm.rateWindowDays}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, rateWindowDays: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-cooldown" className="block text-700 mb-2">Duplicate cooldown (hours)</label>
                            <AppInput
                                inputId="tenant-alert-cooldown"
                                value={alertSettingsForm.cooldownHours}
                                onChange={(event) =>
                                    setAlertSettingsForm((current) => ({ ...current, cooldownHours: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 md:col-6 lg:col-3 flex align-items-end">
                            <div className="surface-50 border-1 border-200 border-round px-3 py-2 text-sm text-700 w-full line-height-3">
                                <div><strong>Current app scope:</strong> {tenantSummaryScopeLabel}</div>
                                <div><strong>Rate window:</strong> Last {formatSmsCount(normalizedAlertThresholds.rateWindowDays)} days</div>
                                <div><strong>Duplicate cooldown:</strong> {formatSmsCount(normalizedAlertThresholds.cooldownHours)} hours</div>
                                <div><strong>Saved:</strong> {formatSmsDateTime(alertSettings?.updatedAt ?? null)}</div>
                            </div>
                        </div>
                    </div>
                    <div className="surface-0 border-1 border-200 border-round overflow-auto">
                        <table className="w-full text-sm" style={{ minWidth: '860px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr className="surface-100 text-700">
                                    <th className="text-left p-3">Rule</th>
                                    <th className="text-left p-3">Current</th>
                                    <th className="text-left p-3">Threshold</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenantAlertPreviewItems.map((item) => (
                                    <tr key={item.key} className="border-top-1 border-200">
                                        <td className="p-3 align-top text-900 font-medium">{item.label}</td>
                                        <td className="p-3 align-top text-900">{item.currentValue}</td>
                                        <td className="p-3 align-top text-900">{item.thresholdValue}</td>
                                        <td className="p-3 align-top">
                                            <Tag value={item.statusLabel} severity={item.severity} />
                                        </td>
                                        <td className="p-3 align-top text-600 line-height-3">{item.detail}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h3 className="mb-2">Alert Email Delivery</h3>
                        <p className="text-600 mb-0">
                            Send a summary email through the Email add-on whenever the scheduler creates a new tenant SMS alert event.
                        </p>
                    </div>
                    <Message severity="info" text="These fields are saved together with Tenant Alert Thresholds. The current Email add-on persists queued or sandbox messages; live provider delivery still depends on email-provider setup." />
                    {normalizedAlertEmailDelivery.enabled ? (
                        alertEmailRecipientCount > 0 ? (
                            <Message
                                severity="success"
                                text={`${formatSmsCount(alertEmailRecipientCount)} alert email recipient(s) configured. New alert events will fan out through the Email add-on.`}
                            />
                        ) : (
                            <Message
                                severity="warn"
                                text="Alert email delivery is enabled, but no recipient emails are configured yet."
                            />
                        )
                    ) : (
                        <Message
                            severity="info"
                            text="Alert email delivery is disabled. Scheduled alert events will remain visible in this SMS admin page only."
                        />
                    )}
                    <div className="grid">
                        <div className="col-12 md:col-6 lg:col-3">
                            <div className="flex align-items-center gap-2 h-full surface-50 border-1 border-200 border-round p-3">
                                <InputSwitch
                                    inputId="tenant-alert-email-enabled"
                                    checked={alertEmailDeliveryForm.enabled}
                                    onChange={(event) =>
                                        setAlertEmailDeliveryForm((current) => ({ ...current, enabled: !!event.value }))
                                    }
                                    disabled={alertSettingsLoading || alertSettingsSaving}
                                />
                                <label htmlFor="tenant-alert-email-enabled">Enable alert email delivery</label>
                            </div>
                        </div>
                        <div className="col-12 md:col-6 lg:col-3">
                            <label htmlFor="tenant-alert-email-subject-prefix" className="block text-700 mb-2">Subject prefix</label>
                            <AppInput
                                inputId="tenant-alert-email-subject-prefix"
                                value={alertEmailDeliveryForm.subjectPrefix}
                                onChange={(event) =>
                                    setAlertEmailDeliveryForm((current) => ({ ...current, subjectPrefix: event.target.value }))
                                }
                                disabled={alertSettingsLoading || alertSettingsSaving}
                            />
                        </div>
                        <div className="col-12 lg:col-6">
                            <label htmlFor="tenant-alert-email-recipients" className="block text-700 mb-2">Recipient emails</label>
                            <InputTextarea
                                id="tenant-alert-email-recipients"
                                value={alertEmailDeliveryForm.recipientEmails}
                                onChange={(event) =>
                                    setAlertEmailDeliveryForm((current) => ({ ...current, recipientEmails: event.target.value }))
                                }
                                rows={5}
                                autoResize
                                className="w-full"
                                disabled={alertSettingsLoading || alertSettingsSaving}
                                placeholder={'ops@example.com\nowner@example.com'}
                            />
                            <small className="text-600">Use one email per line or separate them with commas.</small>
                        </div>
                        <div className="col-12 md:col-6 lg:col-3 flex align-items-end">
                            <div className="surface-50 border-1 border-200 border-round px-3 py-2 text-sm text-700 w-full line-height-3">
                                <div><strong>Recipients:</strong> {formatSmsCount(alertEmailRecipientCount)}</div>
                                <div><strong>Subject prefix:</strong> {normalizedAlertEmailDelivery.subjectPrefix}</div>
                                <div><strong>Saved:</strong> {formatSmsDateTime(alertSettings?.updatedAt ?? null)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Recent Scheduled Alert Events</h3>
                            <p className="text-600 mb-0">
                                Cron evaluates tenant-wide SMS alert thresholds every hour using the saved rate window and duplicate cooldown.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-content-end">
                            <Button
                                label="Reload Events"
                                text
                                onClick={() => void loadAlertEvents()}
                                loading={alertEventsLoading}
                            />
                        </div>
                    </div>
                    <Message severity="info" text="Scheduled alert events are tenant-wide. The App filter above only changes the live preview, not the stored alert-event history." />
                    {alertEventReviewError ? <Message severity="error" text={alertEventReviewError} /> : null}
                    {alertEventReviewNotice ? <Message severity="success" text={alertEventReviewNotice} /> : null}
                    {alertEvents.length > 0 ? (
                        <div className="surface-0 border-1 border-200 border-round overflow-auto">
                            <table className="w-full text-sm" style={{ minWidth: '980px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr className="surface-100 text-700">
                                        <th className="text-left p-3">Created</th>
                                        <th className="text-left p-3">Scope</th>
                                        <th className="text-left p-3">Window</th>
                                        <th className="text-left p-3">Alerts</th>
                                        <th className="text-left p-3">Triggered Keys</th>
                                        <th className="text-left p-3">Review</th>
                                        <th className="text-left p-3">Details</th>
                                        <th className="text-left p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertEvents.map((event) => {
                                        const review = getSmsAlertEventReviewPresentation(event.reviewStatus);
                                        return (
                                            <tr key={event.id} className="border-top-1 border-200">
                                                <td className="p-3 align-top text-900">
                                                    <div>{formatSmsDateTime(event.createdAt)}</div>
                                                    <div className="text-600 mt-1">{event.id}</div>
                                                </td>
                                                <td className="p-3 align-top text-900">{event.scopeApp || 'All apps'}</td>
                                                <td className="p-3 align-top text-900 line-height-3">
                                                    <div>Last {formatSmsCount(event.rateWindowDays)} days</div>
                                                    <div className="text-600">Cooldown {formatSmsCount(event.cooldownHours)} hours</div>
                                                </td>
                                                <td className="p-3 align-top text-900">{formatSmsCount(event.alertCount)}</td>
                                                <td className="p-3 align-top text-900">{event.triggeredKeys.length > 0 ? event.triggeredKeys.join(', ') : '-'}</td>
                                                <td className="p-3 align-top text-900 line-height-3">
                                                    <Tag value={review.label} severity={review.severity} />
                                                    <div className="text-600 mt-2">
                                                        {event.reviewedAt
                                                            ? `Reviewed ${formatSmsDateTime(event.reviewedAt)}`
                                                            : 'Awaiting operator review.'}
                                                    </div>
                                                    {event.reviewedByUserId ? (
                                                        <div className="text-600">{event.reviewedByUserId}{event.reviewedByRole ? ` (${event.reviewedByRole})` : ''}</div>
                                                    ) : null}
                                                    {event.reviewNote ? <div className="text-600">{event.reviewNote}</div> : null}
                                                </td>
                                                <td className="p-3 align-top">
                                                    <pre className="m-0 text-xs white-space-pre-wrap line-height-3">{event.alertsJson}</pre>
                                                </td>
                                                <td className="p-3 align-top">
                                                    {event.reviewStatus === 'acknowledged' ? (
                                                        <Button
                                                            label="Reopen"
                                                            icon="pi pi-refresh"
                                                            text
                                                            className="app-action-compact p-button-sm"
                                                            onClick={() => openAlertEventReviewDialog(event, 'open')}
                                                        />
                                                    ) : (
                                                        <Button
                                                            label="Acknowledge"
                                                            icon="pi pi-check"
                                                            text
                                                            className="app-action-compact p-button-sm"
                                                            onClick={() => openAlertEventReviewDialog(event, 'acknowledged')}
                                                        />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : alertEventsLoading ? (
                        <div className="text-600">Loading scheduled SMS alert events...</div>
                    ) : (
                        <div className="text-600">No scheduled SMS alert events have been recorded yet.</div>
                    )}
                </div>
            </div>
            <div className="col-12 xl:col-8">
                <div className="card flex flex-column gap-3">
                    <div>
                        <h2 className="mb-2">SMS Bindings</h2>
                        <p className="text-600 mb-0">
                            Configure tenant-level SMS event bindings across Billing, Accounts, CRM, and Inventory without hardcoding provider payloads in each module.
                        </p>
                    </div>
                    {error ? <Message severity="error" text={error} /> : null}
                    {notice ? <Message severity="success" text={notice} /> : null}
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label htmlFor="sms-binding-event" className="block text-700 mb-2">SMS event</label>
                            <AppDropdown
                                inputId="sms-binding-event"
                                value={selectedBindingKey}
                                options={SMS_BINDINGS}
                                optionLabel="label"
                                optionValue="bindingKey"
                                onChange={(event) => setSelectedBindingKey(String(event.value ?? SMS_BINDINGS[0].bindingKey))}
                                disabled={loading || saving || previewing}
                                className="w-full"
                            />
                        </div>
                        <div className="col-12 md:col-6 flex align-items-end">
                            <div className="text-600 text-sm line-height-3">{selectedConfig.description}</div>
                        </div>
                    </div>
                    <div className="flex align-items-center gap-2">
                        <InputSwitch
                            inputId="sms-binding-enabled"
                            checked={form.isActive}
                            onChange={(event) => setForm((current) => ({ ...current, isActive: !!event.value }))}
                            disabled={loading || saving}
                        />
                        <label htmlFor="sms-binding-enabled">{selectedConfig.enabledLabel}</label>
                    </div>
                    <div>
                        <label htmlFor="sms-binding-key" className="block text-700 mb-2">Binding key</label>
                        <AppInput inputId="sms-binding-key" value={form.bindingKey} disabled />
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-6">
                            <label htmlFor="sms-template-key" className="block text-700 mb-2">Template key</label>
                            <AppInput
                                inputId="sms-template-key"
                                value={form.templateKey}
                                onChange={(event) => setForm((current) => ({ ...current, templateKey: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                        <div className="col-12 md:col-6">
                            <label htmlFor="sms-sender-id" className="block text-700 mb-2">Sender ID override</label>
                            <AppInput
                                inputId="sms-sender-id"
                                value={form.senderId}
                                onChange={(event) => setForm((current) => ({ ...current, senderId: event.target.value }))}
                                disabled={loading || saving}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="sms-message-template" className="block text-700 mb-2">Custom text template</label>
                        <InputTextarea
                            id="sms-message-template"
                            value={form.messageTextTemplate}
                            onChange={(event) => setForm((current) => ({ ...current, messageTextTemplate: event.target.value }))}
                            rows={5}
                            autoResize
                            className="w-full"
                            disabled={loading || saving}
                        />
                        <small className="text-600">{selectedConfig.messageTemplateHelp}</small>
                    </div>
                    <div>
                        <label htmlFor="sms-metadata-json" className="block text-700 mb-2">Provider metadata JSON</label>
                        <InputTextarea
                            id="sms-metadata-json"
                            value={form.metadataJson}
                            onChange={(event) => setForm((current) => ({ ...current, metadataJson: event.target.value }))}
                            rows={12}
                            className="w-full font-mono text-sm"
                            disabled={loading || saving}
                        />
                        <small className="text-600">
                            Supports placeholders like <code>{'{{recipientName}}'}</code>, <code>{'{{voucherNumber}}'}</code>,{' '}
                            <code>{'{{dueAmountText}}'}</code>, <code>{'{{totalNetAmountText}}'}</code>, <code>{'{{periodText}}'}</code>,{' '}
                            <code>{'{{closingBalanceText}}'}</code>, <code>{'{{memberCode}}'}</code>, <code>{'{{followupDateText}}'}</code>, <code>{'{{productName}}'}</code>, and <code>{'{{sellingRateText}}'}</code>{' '}
                            inside nested JSON.
                        </small>
                    </div>
                    <div>
                        <label htmlFor="sms-preview-context-json" className="block text-700 mb-2">Preview context JSON</label>
                        <InputTextarea
                            id="sms-preview-context-json"
                            value={previewContextJson}
                            onChange={(event) => setPreviewContextJson(event.target.value)}
                            rows={12}
                            className="w-full font-mono text-sm"
                            disabled={loading || saving || previewing}
                        />
                        <small className="text-600">
                            Preview uses the current unsaved form values plus this context payload. Save is not required first.
                        </small>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Button label="Reload" text onClick={() => void loadBinding(selectedConfig)} disabled={loading || saving || previewing} />
                        <Button label="Preview" text onClick={() => void runPreview()} loading={previewing} disabled={loading || saving} />
                        <Button label="Save Settings" onClick={() => void saveBinding()} loading={saving} disabled={loading || previewing} />
                    </div>
                    {previewResult ? (
                        <div className="surface-50 border-1 border-200 border-round p-3 flex flex-column gap-3">
                            <div className="text-700 font-medium">Preview Result</div>
                            <div className="text-600 text-sm">Binding found: {previewResult.bindingFound ? 'Yes' : 'No'}</div>
                            <div className="text-600 text-sm">Template key: {previewResult.templateKey || '-'}</div>
                            <div className="text-600 text-sm">Sender ID: {previewResult.senderId || '-'}</div>
                            <div>
                                <div className="text-700 font-medium mb-2">Rendered message</div>
                                <pre className="text-sm text-600 white-space-pre-wrap mt-0 mb-0">{previewResult.renderedMessageText || '-'}</pre>
                            </div>
                            <div>
                                <div className="text-700 font-medium mb-2">Rendered metadata</div>
                                <pre className="text-sm text-600 white-space-pre-wrap mt-0 mb-0">{previewResult.renderedMetadataJson || '-'}</pre>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="col-12 xl:col-4">
                <div className="card flex flex-column gap-3">
                    <h3 className="mb-0">Binding Notes</h3>
                    <Message severity="info" text={selectedConfig.sourceNote} />
                    <div>
                        <div className="text-700 font-medium mb-2">Current source mapping</div>
                        <div className="text-600 text-sm">app: {selectedConfig.sourceApp}</div>
                        <div className="text-600 text-sm">module: {selectedConfig.sourceModule}</div>
                        <div className="text-600 text-sm">event: {selectedConfig.sourceEvent}</div>
                        <div className="text-600 text-sm">entity type: {selectedConfig.sourceEntityType}</div>
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Recommended placeholders</div>
                        {selectedConfig.placeholderLines.map((line) => (
                            <div key={line} className="text-600 text-sm">{line}</div>
                        ))}
                    </div>
                    <div>
                        <div className="text-700 font-medium mb-2">Metadata example</div>
                        <pre className="text-sm text-600 white-space-pre-wrap mt-0 mb-0">{selectedConfig.metadataExample}</pre>
                    </div>
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Retry Policy</h3>
                            <p className="text-600 mb-0">
                                Configure and test automatic retry rules for failed messages on <strong>{selectedConfig.label}</strong> using <code>retryPolicy</code> inside the binding metadata JSON.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-content-end">
                            <Button
                                label="Preview Sweep"
                                text
                                onClick={() => void runBindingRetrySweep(true)}
                                loading={retrySweepLoading && retrySweepMode === 'dry_run'}
                                disabled={!retryPolicySummary.enabled || Boolean(retryPolicySummary.parseError) || loading || saving || previewing}
                            />
                            <Button
                                label="Run Retry Sweep"
                                icon="pi pi-refresh"
                                onClick={() => void runBindingRetrySweep(false)}
                                loading={retrySweepLoading && retrySweepMode === 'live'}
                                disabled={!retryPolicySummary.enabled || Boolean(retryPolicySummary.parseError) || loading || saving || previewing}
                            />
                        </div>
                    </div>
                    <Message severity="info" text="Retry sweeps use the saved binding record. Save settings first after changing retryPolicy metadata." />
                    {retryPolicySummary.parseError ? (
                        <Message severity="error" text={retryPolicySummary.parseError} />
                    ) : !retryPolicySummary.enabled ? (
                        <Message severity="warn" text="No enabled retryPolicy is present in the current metadata JSON." />
                    ) : (
                        <>
                            <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                                <div><strong>Max attempts:</strong> {formatSmsCount(retryPolicySummary.maxAttempts)}</div>
                                <div><strong>Retry after:</strong> {formatSmsCount(retryPolicySummary.retryAfterMinutes)} minutes</div>
                                <div><strong>Lookback window:</strong> {formatSmsCount(retryPolicySummary.withinHours)} hours</div>
                                <div><strong>Max messages per sweep:</strong> {formatSmsCount(retryPolicySummary.maxMessagesPerRun)}</div>
                                <div><strong>Statuses:</strong> {retryPolicySummary.statuses.join(', ') || '-'}</div>
                                <div><strong>Skipped error codes:</strong> {retryPolicySummary.skipErrorCodes.join(', ') || '-'}</div>
                            </div>
                            <div>
                                <div className="text-700 font-medium mb-2">Suggested metadata snippet</div>
                                <pre className="text-sm text-600 white-space-pre-wrap mt-0 mb-0">{`{
  "retryPolicy": {
    "enabled": true,
    "maxAttempts": 2,
    "retryAfterMinutes": 30,
    "withinHours": 72,
    "maxMessagesPerRun": 25,
    "statuses": ["failed"],
    "skipErrorCodes": []
  }
}`}</pre>
                            </div>
                        </>
                    )}
                    {retrySweepError ? <Message severity="error" text={retrySweepError} /> : null}
                    {retrySweepResult ? (
                        <div className="flex flex-column gap-3">
                            <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                                <div><strong>Last sweep:</strong> {retrySweepResult.dryRun ? 'Dry run' : 'Executed'}</div>
                                <div><strong>Scanned:</strong> {formatSmsCount(retrySweepResult.scannedCount)}</div>
                                <div><strong>Eligible:</strong> {formatSmsCount(retrySweepResult.eligibleCount)}</div>
                                <div><strong>Retried:</strong> {formatSmsCount(retrySweepResult.retriedCount)}</div>
                                <div><strong>Skipped:</strong> {formatSmsCount(retrySweepResult.skippedCount)}</div>
                                <div><strong>Failures:</strong> {formatSmsCount(retrySweepResult.failureCount)}</div>
                            </div>
                            <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                <table className="w-full text-sm" style={{ minWidth: '840px', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr className="surface-100 text-700">
                                            <th className="text-left p-2">Message</th>
                                            <th className="text-left p-2">Current</th>
                                            <th className="text-left p-2">Sweep Result</th>
                                            <th className="text-left p-2">Retry Message</th>
                                            <th className="text-left p-2">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retrySweepResult.decisions.length === 0 ? (
                                            <tr>
                                                <td className="p-3 text-600" colSpan={5}>No retry decisions were generated for this sweep.</td>
                                            </tr>
                                        ) : (
                                            retrySweepResult.decisions.map((decision) => (
                                                <tr key={`${decision.messageId}-${decision.status}-${decision.retryMessageId || 'none'}`} className="border-top-1 border-200">
                                                    <td className="p-2 align-top">
                                                        <div className="text-900">{decision.messageId}</div>
                                                        <div className="text-600 mt-1">{decision.recipientPhone}</div>
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        <div className="text-900">{decision.currentStatus}</div>
                                                        <div className="text-600 mt-1">Attempt: {formatSmsCount(decision.retryAttempt)}</div>
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        <Tag value={decision.status.toUpperCase()} severity={getRetrySweepSeverity(decision.status)} />
                                                        {decision.reason ? <div className="text-600 mt-2">{decision.reason}</div> : null}
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        <div className="text-900">{decision.retryMessageId || '-'}</div>
                                                        {decision.retryMessageStatus ? <div className="text-600 mt-1">Status: {decision.retryMessageStatus}</div> : null}
                                                    </td>
                                                    <td className="p-2 align-top">
                                                        <div className="text-600">{decision.error || '-'}</div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Operational Snapshot</h3>
                            <p className="text-600 mb-0">
                                Current pending and failure attention for <strong>{selectedConfig.label}</strong> using the active source mapping.
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-content-end">
                            <Button
                                label="Refresh Snapshot"
                                text
                                onClick={() => void loadOperationalSnapshot(selectedConfig)}
                                loading={operationalLoading}
                                disabled={loading || saving || previewing}
                            />
                        </div>
                    </div>
                    {operationalError ? <Message severity="error" text={operationalError} /> : null}
                    {operationalSnapshot ? (
                        <>
                            <div className="grid">
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Needs Attention</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(operationalSnapshot.attentionCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Pending</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(operationalSnapshot.pendingCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Issues</div>
                                        <div className="text-red-500 text-2xl font-semibold">{formatSmsCount(operationalSnapshot.issueCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-6 xl:col-3">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Oldest Pending</div>
                                        <div className="text-900 text-lg font-semibold">{formatSmsAgeFromNow(operationalSnapshot.oldestPendingAt)}</div>
                                        <div className="text-600 mt-2">{formatSmsDateTime(operationalSnapshot.oldestPendingAt)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-6 xl:col-3">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Latest Issue</div>
                                        <div className="text-900 text-lg font-semibold">{formatSmsDateTime(operationalSnapshot.latestIssueAt)}</div>
                                        <div className="text-600 mt-2">Age: {formatSmsAgeFromNow(operationalSnapshot.latestIssueAt)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid">
                                {operationalSnapshot.statusBuckets.map((bucket) => (
                                    <div key={bucket.status} className="col-12 md:col-6 xl:col-3">
                                        <div className="surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-2">
                                            <div className="flex align-items-center justify-content-between gap-2">
                                                <Tag value={bucket.status.toUpperCase()} severity={getSmsStatusSeverity(bucket.status)} />
                                                <div className="text-900 font-semibold">{formatSmsCount(bucket.count)}</div>
                                            </div>
                                            <div className="text-600 text-sm">Oldest: {formatSmsDateTime(bucket.oldestMessageAt)}</div>
                                            <div className="text-600 text-sm">Latest: {formatSmsDateTime(bucket.latestMessageAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid">
                                <div className="col-12 xl:col-6">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-3">
                                        <div>
                                            <div className="text-900 font-medium mb-2">Oldest Pending Messages</div>
                                            <div className="text-600 text-sm">Oldest queued and sent messages that are still waiting to complete.</div>
                                        </div>
                                        <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                            <table className="w-full text-sm" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr className="surface-100 text-700">
                                                        <th className="text-left p-2">Created</th>
                                                        <th className="text-left p-2">Status</th>
                                                        <th className="text-left p-2">Recipient</th>
                                                        <th className="text-left p-2">Message</th>
                                                        <th className="text-left p-2">Provider</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {operationalSnapshot.pendingItems.length === 0 ? (
                                                        <tr>
                                                            <td className="p-3 text-600" colSpan={5}>No queued or sent messages currently need attention.</td>
                                                        </tr>
                                                    ) : (
                                                        operationalSnapshot.pendingItems.map((item) => (
                                                            <tr key={`pending-${item.id}`} className="border-top-1 border-200">
                                                                <td className="p-2 align-top">
                                                                    <div className="text-900">{formatSmsDateTime(item.createdAt)}</div>
                                                                    <div className="text-600 mt-1">Age: {formatSmsAgeFromNow(item.createdAt)}</div>
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    <Tag value={item.status.toUpperCase()} severity={getSmsStatusSeverity(item.status)} />
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    <div className="text-900">{item.recipient.name || '-'}</div>
                                                                    <div className="text-600 mt-1">{item.recipient.phone}</div>
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    <div className="text-900">{item.message.templateKey || item.message.type}</div>
                                                                    <div className="text-600 mt-1 line-height-3">{item.message.textPreview || '-'}</div>
                                                                </td>
                                                                <td className="p-2 align-top">
                                                                    <div className="text-900">{item.providerMessageId || '-'}</div>
                                                                    {item.senderId ? <div className="text-600 mt-1">Sender: {item.senderId}</div> : null}
                                                                    {item.providerMessageId ? (
                                                                        <Button
                                                                            label="Events"
                                                                            icon="pi pi-list"
                                                                            text
                                                                            className="p-button-sm mt-2"
                                                                            onClick={() => void loadWebhookEvents(item)}
                                                                            disabled={webhookLoading && selectedWebhookMessage?.id === item.id}
                                                                        />
                                                                    ) : null}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 xl:col-6">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-3">
                                        <div>
                                            <div className="text-900 font-medium mb-2">Latest Issues</div>
                                            <div className="text-600 text-sm">Failed and sandbox messages that may need retry or provider callback review.</div>
                                        </div>
                                        <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                            <table className="w-full text-sm" style={{ minWidth: '760px', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr className="surface-100 text-700">
                                                        <th className="text-left p-2">Issue Time</th>
                                                        <th className="text-left p-2">Status</th>
                                                        <th className="text-left p-2">Recipient</th>
                                                        <th className="text-left p-2">Message</th>
                                                        <th className="text-left p-2">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {operationalSnapshot.issueItems.length === 0 ? (
                                                        <tr>
                                                            <td className="p-3 text-600" colSpan={5}>No failed or sandbox messages currently need action.</td>
                                                        </tr>
                                                    ) : (
                                                        operationalSnapshot.issueItems.map((item) => {
                                                            const issueTimestamp = item.failedAt || item.createdAt;
                                                            return (
                                                                <tr key={`issue-${item.id}`} className="border-top-1 border-200">
                                                                    <td className="p-2 align-top">
                                                                        <div className="text-900">{formatSmsDateTime(issueTimestamp)}</div>
                                                                        <div className="text-600 mt-1">Age: {formatSmsAgeFromNow(issueTimestamp)}</div>
                                                                    </td>
                                                                    <td className="p-2 align-top">
                                                                        <div className="flex flex-column gap-2 align-items-start">
                                                                            <Tag value={item.status.toUpperCase()} severity={getSmsStatusSeverity(item.status)} />
                                                                            {item.errorDetail ? <div className="text-red-500 line-height-3">{item.errorDetail}</div> : null}
                                                                            {item.errorCode ? <div className="text-600">Code: {item.errorCode}</div> : null}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-2 align-top">
                                                                        <div className="text-900">{item.recipient.name || '-'}</div>
                                                                        <div className="text-600 mt-1">{item.recipient.phone}</div>
                                                                    </td>
                                                                    <td className="p-2 align-top">
                                                                        <div className="text-900">{item.message.templateKey || item.message.type}</div>
                                                                        <div className="text-600 mt-1 line-height-3">{item.message.textPreview || '-'}</div>
                                                                    </td>
                                                                    <td className="p-2 align-top">
                                                                        <div className="text-900">{item.providerMessageId || '-'}</div>
                                                                        <div className="flex gap-2 flex-wrap mt-2">
                                                                            {item.providerMessageId ? (
                                                                                <Button
                                                                                    label="Events"
                                                                                    icon="pi pi-list"
                                                                                    text
                                                                                    className="p-button-sm"
                                                                                    onClick={() => void loadWebhookEvents(item)}
                                                                                    disabled={webhookLoading && selectedWebhookMessage?.id === item.id}
                                                                                />
                                                                            ) : null}
                                                                            {canRetrySmsMessage(item.status) ? (
                                                                                <Button
                                                                                    label="Retry"
                                                                                    icon="pi pi-refresh"
                                                                                    text
                                                                                    className="p-button-sm"
                                                                                    onClick={() => void retryHistoryMessage(item.id)}
                                                                                    loading={retryingMessageId === item.id}
                                                                                    disabled={Boolean(retryingMessageId && retryingMessageId !== item.id)}
                                                                                />
                                                                            ) : null}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : operationalLoading ? (
                        <div className="text-600">Loading SMS operational snapshot...</div>
                    ) : (
                        <div className="text-600">No SMS operational data found for the selected binding.</div>
                    )}
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Delivery Summary</h3>
                            <p className="text-600 mb-0">
                                Recent delivery totals for <strong>{selectedConfig.label}</strong> using the current source mapping.
                            </p>
                        </div>
                        <div className="flex flex-column align-items-stretch md:align-items-end gap-2">
                            <div className="flex gap-2 flex-wrap justify-content-end">
                                <Button
                                    label="CSV"
                                    icon="pi pi-file"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportSummaryReport('csv')}
                                    disabled={summaryLoading || Boolean(summaryExportingMode) || !summaryReport || summaryReport.totalCount <= 0}
                                />
                                <Button
                                    label="Excel"
                                    icon="pi pi-file-excel"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportSummaryReport('excel')}
                                    disabled={summaryLoading || Boolean(summaryExportingMode) || !summaryReport || summaryReport.totalCount <= 0}
                                />
                                <Button
                                    label="PDF"
                                    icon="pi pi-file-pdf"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportSummaryReport('pdf')}
                                    disabled={summaryLoading || Boolean(summaryExportingMode) || !summaryReport || summaryReport.totalCount <= 0}
                                />
                            </div>
                            {summaryExportingMode ? (
                                <div className="text-600 text-sm">
                                    Preparing {summaryExportingMode.toUpperCase()} delivery summary export...
                                </div>
                            ) : (
                                <div className="text-600 text-sm">
                                    Export downloads the daily delivery breakdown for the selected window.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end align-items-end">
                        <div style={{ minWidth: '12rem' }}>
                            <label htmlFor="sms-summary-days" className="block text-700 mb-2">Window</label>
                            <AppDropdown
                                inputId="sms-summary-days"
                                value={summaryDays}
                                options={SMS_SUMMARY_DAY_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => setSummaryDays(Number(event.value ?? 30))}
                                className="w-full"
                                disabled={summaryLoading}
                            />
                        </div>
                        <Button
                            label="Refresh Summary"
                            text
                            onClick={() => void loadSummary(selectedConfig, summaryDays)}
                            loading={summaryLoading}
                        />
                    </div>
                    {summaryError ? <Message severity="error" text={summaryError} /> : null}
                    {summaryReport ? (
                        <>
                            <div className="grid">
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Total</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(summaryReport.totalCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Delivered</div>
                                        <div className="text-green-600 text-2xl font-semibold">{formatSmsCount(summaryReport.deliveredCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Failed</div>
                                        <div className="text-red-500 text-2xl font-semibold">{formatSmsCount(summaryReport.failedCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Queued</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(summaryReport.queuedCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Sent</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(summaryReport.sentCount)}</div>
                                    </div>
                                </div>
                                <div className="col-6 md:col-4 xl:col-2">
                                    <div className="surface-50 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-600 text-sm mb-2">Sandbox</div>
                                        <div className="text-900 text-2xl font-semibold">{formatSmsCount(summaryReport.sandboxCount)}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                                <div><strong>Latest message:</strong> {formatSmsDateTime(summaryReport.latestMessageAt)}</div>
                                <div><strong>Delivered rate:</strong> {formatSmsPercent(summaryReport.deliveredCount, summaryReport.totalCount)}</div>
                                <div><strong>Failed rate:</strong> {formatSmsPercent(summaryReport.failedCount, summaryReport.totalCount)}</div>
                                <div><strong>Received callbacks:</strong> {formatSmsCount(summaryReport.receivedCount)}</div>
                            </div>
                            <div className="grid">
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Status Breakdown</div>
                                        {summaryReport.statusCounts.length === 0 ? (
                                            <div className="text-600 text-sm">No statuses recorded for this window.</div>
                                        ) : (
                                            <div className="flex flex-column gap-2">
                                                {summaryReport.statusCounts.map((item) => (
                                                    <div key={item.status} className="flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2">
                                                        <div className="flex align-items-center gap-2">
                                                            <Tag value={item.status.toUpperCase()} severity={getSmsStatusSeverity(item.status)} />
                                                        </div>
                                                        <div className="text-900 font-medium">{formatSmsCount(item.count)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Top Failure Codes</div>
                                        {summaryReport.topFailureCodes.length === 0 ? (
                                            <div className="text-600 text-sm">No failed messages recorded for this window.</div>
                                        ) : (
                                            <div className="flex flex-column gap-2">
                                                {summaryReport.topFailureCodes.map((item) => (
                                                    <div key={item.errorCode} className="flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2">
                                                        <div className="text-700">{item.errorCode}</div>
                                                        <div className="text-900 font-medium">{formatSmsCount(item.count)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 lg:col-4">
                                    <div className="surface-0 border-1 border-200 border-round p-3 h-full">
                                        <div className="text-900 font-medium mb-3">Recent Daily Totals</div>
                                        {summaryReport.dailyBuckets.length === 0 ? (
                                            <div className="text-600 text-sm">No daily SMS activity found for this window.</div>
                                        ) : (
                                            <div className="surface-0 border-1 border-200 border-round overflow-auto">
                                                <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '320px' }}>
                                                    <thead>
                                                        <tr className="surface-100 text-700">
                                                            <th className="text-left p-2">Date</th>
                                                            <th className="text-right p-2">Total</th>
                                                            <th className="text-right p-2">Delivered</th>
                                                            <th className="text-right p-2">Failed</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {summaryReport.dailyBuckets.map((item) => (
                                                            <tr key={item.date} className="border-top-1 border-200">
                                                                <td className="p-2 text-700">{item.date}</td>
                                                                <td className="p-2 text-right text-900">{formatSmsCount(item.totalCount)}</td>
                                                                <td className="p-2 text-right text-green-600">{formatSmsCount(item.deliveredCount)}</td>
                                                                <td className="p-2 text-right text-red-500">{formatSmsCount(item.failedCount)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : summaryLoading ? (
                        <div className="text-600">Loading delivery summary...</div>
                    ) : (
                        <div className="text-600">No SMS summary data found for the selected window.</div>
                    )}
                </div>
            </div>
            <div className="col-12">
                <div className="card flex flex-column gap-3">
                    <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                        <div>
                            <h3 className="mb-2">Recent SMS History</h3>
                            <p className="text-600 mb-0">
                                Showing recent messages for <strong>{selectedConfig.label}</strong> using the current binding source mapping.
                            </p>
                        </div>
                        <div className="flex flex-column align-items-stretch md:align-items-end gap-2">
                            <div className="flex gap-2 flex-wrap justify-content-end">
                                <Button
                                    label="CSV"
                                    icon="pi pi-file"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportHistoryReport('csv')}
                                    disabled={historyLoading || historyLoadingMore || Boolean(historyExportingMode)}
                                />
                                <Button
                                    label="Excel"
                                    icon="pi pi-file-excel"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportHistoryReport('excel')}
                                    disabled={historyLoading || historyLoadingMore || Boolean(historyExportingMode)}
                                />
                                <Button
                                    label="PDF"
                                    icon="pi pi-file-pdf"
                                    text
                                    className="app-action-compact"
                                    onClick={() => void exportHistoryReport('pdf')}
                                    disabled={historyLoading || historyLoadingMore || Boolean(historyExportingMode)}
                                />
                            </div>
                            {historyExportingMode ? (
                                <div className="text-600 text-sm">
                                    Preparing {historyExportingMode.toUpperCase()} SMS history export...
                                </div>
                            ) : (
                                <div className="text-600 text-sm">
                                    Export downloads up to {formatSmsCount(SMS_EXPORT_LIMIT)} matching messages for the current filters.
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-content-end">
                        <Button label="Refresh" text onClick={() => void loadHistory(false)} loading={historyLoading} disabled={historyLoadingMore || Boolean(historyExportingMode)} />
                        <Button label="Load More" onClick={() => void loadHistory(true)} loading={historyLoadingMore} disabled={!historyNextCursor || historyLoading || Boolean(historyExportingMode)} />
                    </div>
                    <div className="grid">
                        <div className="col-12 md:col-4">
                            <label htmlFor="sms-history-status" className="block text-700 mb-2">Status</label>
                            <AppDropdown
                                inputId="sms-history-status"
                                value={historyStatus}
                                options={SMS_STATUS_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(event) => setHistoryStatus(String(event.value ?? ''))}
                                className="w-full"
                                disabled={historyLoading || historyLoadingMore}
                            />
                        </div>
                        <div className="col-12 md:col-4">
                            <label htmlFor="sms-history-phone" className="block text-700 mb-2">Recipient phone</label>
                            <AppInput
                                inputId="sms-history-phone"
                                value={historyPhone}
                                onChange={(event) => setHistoryPhone(event.target.value)}
                                disabled={historyLoading || historyLoadingMore}
                            />
                        </div>
                        <div className="col-12 md:col-4 flex align-items-end">
                            <div className="text-600 text-sm line-height-3">
                                Source: {selectedConfig.sourceApp} / {selectedConfig.sourceModule} / {selectedConfig.sourceEvent}
                            </div>
                        </div>
                    </div>
                    {historyError ? <Message severity="error" text={historyError} /> : null}
                    {historyNotice ? <Message severity="success" text={historyNotice} /> : null}
                    <div className="surface-0 border-1 border-200 border-round overflow-auto">
                        <table className="w-full" style={{ minWidth: '900px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr className="surface-100 text-700 text-sm">
                                    <th className="text-left p-3">Created</th>
                                    <th className="text-left p-3">Status</th>
                                    <th className="text-left p-3">Recipient</th>
                                    <th className="text-left p-3">Message</th>
                                    <th className="text-left p-3">Provider</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historyLoading ? (
                                    <tr>
                                        <td className="p-3 text-600" colSpan={5}>Loading SMS history...</td>
                                    </tr>
                                ) : historyItems.length === 0 ? (
                                    <tr>
                                        <td className="p-3 text-600" colSpan={5}>No SMS messages found for the current binding filters.</td>
                                    </tr>
                                ) : (
                                    historyItems.map((item) => (
                                        <tr key={item.id} className="text-sm border-top-1 border-200">
                                            <td className="p-3 align-top">
                                                <div className="text-900">{formatSmsDateTime(item.createdAt)}</div>
                                                <div className="text-600 mt-1">Sent: {formatSmsDateTime(item.sentAt)}</div>
                                                <div className="text-600">Delivered: {formatSmsDateTime(item.deliveredAt)}</div>
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="flex flex-column gap-2 align-items-start">
                                                    <Tag value={item.status.toUpperCase()} severity={getSmsStatusSeverity(item.status)} />
                                                    {item.errorDetail ? <div className="text-red-500 line-height-3">{item.errorDetail}</div> : null}
                                                    {item.errorCode ? <div className="text-600">Code: {item.errorCode}</div> : null}
                                                </div>
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="text-900">{item.recipient.name || '-'}</div>
                                                <div className="text-600 mt-1">{item.recipient.phone}</div>
                                                {item.recipient.reference ? (
                                                    <div className="text-600 mt-1">{item.recipient.reference.type}: {item.recipient.reference.id}</div>
                                                ) : null}
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="text-900">{item.message.templateKey || item.message.type}</div>
                                                <div className="text-600 mt-1 line-height-3">{item.message.textPreview || '-'}</div>
                                                {item.source?.event ? <div className="text-600 mt-1">Event: {item.source.event}</div> : null}
                                            </td>
                                            <td className="p-3 align-top">
                                                <div className="text-900">{item.providerMessageId || '-'}</div>
                                                {item.senderId ? <div className="text-600 mt-1">Sender: {item.senderId}</div> : null}
                                                {item.correlationId ? <div className="text-600 mt-1">Correlation: {item.correlationId}</div> : null}
                                                {item.providerMessageId ? (
                                                    <Button
                                                        label="Events"
                                                        icon="pi pi-list"
                                                        text
                                                        className="p-button-sm mt-2 mr-2"
                                                        onClick={() => void loadWebhookEvents(item)}
                                                        disabled={webhookLoading && selectedWebhookMessage?.id === item.id}
                                                    />
                                                ) : null}
                                                {canRetrySmsMessage(item.status) ? (
                                                    <Button
                                                        label="Retry"
                                                        icon="pi pi-refresh"
                                                        text
                                                        className="p-button-sm mt-2"
                                                        onClick={() => void retryHistoryMessage(item.id)}
                                                        loading={retryingMessageId === item.id}
                                                        disabled={Boolean(retryingMessageId && retryingMessageId !== item.id)}
                                                    />
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <Dialog
                header={
                    alertEventReviewTarget
                        ? `${alertEventReviewStatus === 'acknowledged' ? 'Acknowledge' : 'Reopen'} Alert Event`
                        : 'Review Alert Event'
                }
                visible={alertEventReviewDialogVisible}
                style={{ width: 'min(720px, 96vw)' }}
                onHide={closeAlertEventReviewDialog}
            >
                <div className="flex flex-column gap-3">
                    {alertEventReviewTarget ? (
                        <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                            <div><strong>Created:</strong> {formatSmsDateTime(alertEventReviewTarget.createdAt)}</div>
                            <div><strong>Scope:</strong> {alertEventReviewTarget.scopeApp || 'All apps'}</div>
                            <div><strong>Triggered keys:</strong> {alertEventReviewTarget.triggeredKeys.length > 0 ? alertEventReviewTarget.triggeredKeys.join(', ') : '-'}</div>
                            <div><strong>Current status:</strong> {alertEventReviewTarget.reviewStatus}</div>
                        </div>
                    ) : null}
                    {alertEventReviewError ? <Message severity="error" text={alertEventReviewError} /> : null}
                    <div>
                        <label htmlFor="sms-alert-review-note" className="block text-700 mb-2">Review note</label>
                        <InputTextarea
                            id="sms-alert-review-note"
                            value={alertEventReviewNote}
                            onChange={(event) => setAlertEventReviewNote(event.target.value)}
                            rows={5}
                            className="w-full"
                            placeholder={
                                alertEventReviewStatus === 'acknowledged'
                                    ? 'Optional note about the action taken or owner.'
                                    : 'Optional reason for reopening this alert event.'
                            }
                            disabled={alertEventReviewSaving}
                        />
                    </div>
                    <div className="flex justify-content-end gap-2">
                        <Button
                            label="Cancel"
                            text
                            onClick={closeAlertEventReviewDialog}
                            disabled={alertEventReviewSaving}
                        />
                        <Button
                            label={alertEventReviewStatus === 'acknowledged' ? 'Acknowledge' : 'Reopen'}
                            icon={alertEventReviewStatus === 'acknowledged' ? 'pi pi-check' : 'pi pi-refresh'}
                            onClick={() => void submitAlertEventReview()}
                            loading={alertEventReviewSaving}
                            disabled={!alertEventReviewTarget}
                        />
                    </div>
                </div>
            </Dialog>
            <Dialog
                header={selectedWebhookMessage ? `Webhook Events - ${selectedWebhookMessage.recipient.phone}` : 'Webhook Events'}
                visible={webhookDialogVisible}
                style={{ width: 'min(960px, 96vw)' }}
                onHide={closeWebhookDialog}
            >
                <div className="flex flex-column gap-3">
                    {selectedWebhookMessage ? (
                        <div className="surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3">
                            <div><strong>Recipient:</strong> {selectedWebhookMessage.recipient.name || '-'} ({selectedWebhookMessage.recipient.phone})</div>
                            <div><strong>Provider message ID:</strong> {selectedWebhookMessage.providerMessageId || '-'}</div>
                            <div><strong>Current status:</strong> {selectedWebhookMessage.status}</div>
                        </div>
                    ) : null}
                    <div className="flex justify-content-end">
                        <Button
                            label="Refresh Events"
                            text
                            onClick={() => selectedWebhookMessage && void loadWebhookEvents(selectedWebhookMessage)}
                            loading={webhookLoading}
                            disabled={!selectedWebhookMessage}
                        />
                    </div>
                    {webhookError ? <Message severity="error" text={webhookError} /> : null}
                    {webhookLoading ? (
                        <div className="text-600">Loading webhook events...</div>
                    ) : webhookEvents.length === 0 ? (
                        <div className="text-600">No webhook events recorded for this provider message yet.</div>
                    ) : (
                        webhookEvents.map((event) => (
                            <div key={event.id} className="surface-50 border-1 border-200 border-round p-3 flex flex-column gap-3">
                                <div className="flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3">
                                    <div className="flex flex-column gap-2 align-items-start">
                                        <div className="text-900 font-medium">Received {formatSmsDateTime(event.receivedAt)}</div>
                                        {event.deliveryStatus ? <Tag value={event.deliveryStatus.toUpperCase()} severity={getSmsStatusSeverity(event.deliveryStatus)} /> : null}
                                        {event.rawStatus && event.rawStatus !== event.deliveryStatus ? <div className="text-600">Raw status: {event.rawStatus}</div> : null}
                                    </div>
                                    <div className="text-600 text-sm line-height-3">
                                        <div>Provider: {event.providerMessageId || '-'}</div>
                                        <div>Signature: {event.signature || '-'}</div>
                                        <div>Error code: {event.errorCode || '-'}</div>
                                    </div>
                                </div>
                                {event.errorDetail ? <Message severity="warn" text={event.errorDetail} /> : null}
                                <div>
                                    <div className="text-700 font-medium mb-2">Raw event JSON</div>
                                    <pre className="text-sm text-600 white-space-pre-wrap mt-0 mb-0">{event.eventJson}</pre>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Dialog>
        </div>
    );
}












