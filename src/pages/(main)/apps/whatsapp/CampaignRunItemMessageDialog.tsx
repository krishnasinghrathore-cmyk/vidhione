import React from 'react';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Message } from 'primereact/message';
import { Tag } from 'primereact/tag';
import type { WhatsAppCampaignRunItem, WhatsAppMessage } from '@/lib/whatsapp/api';

type CampaignRunItemMessageDialogProps = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  item: WhatsAppCampaignRunItem | null;
  message: WhatsAppMessage | null;
  onHide: () => void;
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const formatJsonBlock = (value?: string | null) => {
  if (!value) return '';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const messageStatusSeverity = (status: string) => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'failed') return 'danger';
  if (normalized === 'queued' || normalized === 'processing') return 'info';
  if (normalized === 'sandbox') return 'warning';
  return 'success';
};

export function CampaignRunItemMessageDialog({
  visible,
  loading,
  error,
  item,
  message,
  onHide,
}: CampaignRunItemMessageDialogProps) {
  return (
    <Dialog
      header="Campaign Message Detail"
      visible={visible}
      onHide={onHide}
      style={{ width: '72rem', maxWidth: '96vw' }}
      modal
    >
      <div className="flex flex-column gap-3">
        {item ? (
          <div className="surface-border border-1 border-round p-3">
            <div className="font-medium text-900 mb-1">{item.recipientName || item.sourceEntityId}</div>
            <div className="text-600 text-sm">{item.recipientPhone || 'No phone'} / {item.sourceEntityType} / {item.sourceEntityId}</div>
            <div className="text-500 text-xs mt-2">Run item status: {item.status}{item.skipReason ? ` | reason: ${item.skipReason}` : ''}</div>
          </div>
        ) : null}
        {loading ? <Message severity="info" text="Loading linked WhatsApp message..." /> : null}
        {!loading && error ? <Message severity="error" text={error} /> : null}
        {!loading && !error && !message ? <Message severity="info" text="No linked WhatsApp message is available for this run item." /> : null}
        {!loading && !error && message ? (
          <>
            <div className="surface-border border-1 border-round p-3 flex flex-column gap-2">
              <div className="flex align-items-center justify-content-between gap-2 flex-wrap">
                <div>
                  <div className="font-medium text-900">{message.templateName || message.templateKey || message.kind}</div>
                  <div className="text-600 text-sm">{message.recipientName || message.phone || message.phoneE164 || 'Recipient unavailable'}</div>
                </div>
                <Tag value={message.status} severity={messageStatusSeverity(message.status)} />
              </div>
              <div className="text-500 text-xs">
                direction {message.direction} | kind {message.kind} | created {formatTimestamp(message.createdAt)}
              </div>
              <div className="text-500 text-xs">
                sent {formatTimestamp(message.sentAt)} | delivered {formatTimestamp(message.deliveredAt)} | read {formatTimestamp(message.readAt)} | failed {formatTimestamp(message.failedAt)}
              </div>
              <div className="text-500 text-xs">
                Meta {message.waMessageId || '-'} | idempotency {message.idempotencyKey || '-'}
              </div>
              {message.errorDetail || message.errorCode ? (
                <div className="text-500 text-xs">error: {message.errorCode || '-'} {message.errorDetail ? `| ${message.errorDetail}` : ''}</div>
              ) : null}
              {message.bodyText ? <div className="text-700 text-sm">{message.bodyText}</div> : null}
            </div>
            <div className="grid">
              <div className="col-12 md:col-6">
                <label htmlFor="whatsapp-message-params" className="block text-700 mb-2">Parameter values</label>
                <InputTextarea id="whatsapp-message-params" value={formatJsonBlock(message.parameterValuesJson)} rows={10} className="w-full font-mono text-sm" readOnly />
              </div>
              <div className="col-12 md:col-6">
                <label htmlFor="whatsapp-message-payload" className="block text-700 mb-2">Stored payload</label>
                <InputTextarea id="whatsapp-message-payload" value={formatJsonBlock(message.payloadJson)} rows={10} className="w-full font-mono text-sm" readOnly />
              </div>
            </div>
            <div className="grid">
              <div className="col-12 md:col-6">
                <label htmlFor="whatsapp-message-request" className="block text-700 mb-2">Provider request</label>
                <InputTextarea id="whatsapp-message-request" value={formatJsonBlock(message.providerRequestJson)} rows={12} className="w-full font-mono text-sm" readOnly />
              </div>
              <div className="col-12 md:col-6">
                <label htmlFor="whatsapp-message-response" className="block text-700 mb-2">Provider response</label>
                <InputTextarea id="whatsapp-message-response" value={formatJsonBlock(message.providerResponseJson)} rows={12} className="w-full font-mono text-sm" readOnly />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
