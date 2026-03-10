# Messaging + Document Platform Plan

## Summary

Build one shared communication platform for the whole application.

- Keep business data inside domain modules such as `auth`, `crm`, `billing`, `accounts`, `inventory`.
- Add one shared `document` capability for formal artifacts such as invoices, ledger statements, GST reports, product sheets, CA exports, and accountant copies.
- Add one shared `messaging` core for delivery orchestration.
- Keep `email`, `sms`, and `whatsapp` as channel adapters, not as separate business systems.

Recommended runtime flow:

`domain module -> document generation if needed -> messaging core -> channel adapter -> provider webhook/event updates`

This keeps all modules reusable and prevents three incompatible implementations for Email, SMS, and WhatsApp.

## Non-Negotiables

- Do not let business modules call provider APIs directly.
- Do not let each module define its own recipient or delivery schema.
- Do not model government filing as ordinary messaging.
- Do not embed official document generation logic inside channel-specific services.
- Keep one shared audit trail and idempotency model across all channels.

## Target Service Shape

Recommended near-term shape for this repo:

- `backend/lib/messaging/*`
  - Shared request normalization
  - Shared recipient resolution
  - Shared template rendering contract
  - Shared outbox lifecycle
  - Shared event/status updates
- `backend/services/email/*`
  - Email adapter and email-specific webhook handling
- `backend/services/sms/*`
  - SMS adapter and SMS-specific webhook handling
- `backend/services/whatsapp/*`
  - WhatsApp adapter and WhatsApp-specific webhook handling
- `backend/services/documents/*` or `backend/lib/documents/*`
  - Artifact generation, storage metadata, versioning, attachment references

This keeps current parallel channel work viable while converging on one core contract.

## Platform Split

### Domain Modules

Domain modules own:

- Business rules
- Data source selection
- Eligibility and authorization
- Which document should be generated
- Why a message is being sent

Examples:

- `auth`: invite link, OTP, password reset
- `billing`: invoice mail, loading-sheet mail
- `accounts`: ledger statement, account copy, CA bundle
- `crm`: follow-up, quote, reminder, campaign
- `inventory`: product details, stock circular, product PDF

### Document Capability

Document capability owns:

- Rendered artifact metadata
- Versioning
- Storage reference
- Mime type and checksum
- Whether a document is official or informal
- Re-download and audit requirements

Examples:

- Invoice PDF
- Ledger statement PDF/Excel
- GST summary export
- Product sheet PDF
- CA working bundle

### Messaging Core

Messaging core owns:

- Recipient normalization
- Template selection
- Render context handoff
- Queueing and scheduling
- Channel selection
- Idempotency
- Retry policy
- Delivery tracking
- Unified audit trail

### Channel Adapters

Adapters own only channel policy and provider integration:

- `email`: subject, HTML/text, attachments, CC/BCC, reply-to
- `sms`: text-only, DLT/template rules, sender IDs
- `whatsapp`: approved templates, session-window rules, media/document sends

## Canonical Concepts

### 1. Recipient

Messaging should support both entity-based and raw recipients.

Recommended recipient reference model:

```ts
type RecipientRef =
  | { kind: "customer"; id: string; contactPointId?: string }
  | { kind: "ledger"; id: string; contactPointId?: string }
  | { kind: "user"; id: string; contactPointId?: string }
  | { kind: "contact"; id: string; contactPointId?: string }
  | { kind: "raw"; email?: string; phone?: string; name?: string };
```

Do not copy contact data into every business module. Resolve it centrally at send time, then snapshot the resolved destination into the message request.

### 2. Document

Documents are reusable artifacts, not channel payloads.

Recommended uses:

- Attachment to email
- Link in SMS
- Media/document in WhatsApp
- Audit copy in internal history

### 3. Message Request

One message request is the business intent to send something.

Examples:

- Send invoice `INV-2026-001` to customer
- Send ledger statement for period to CA
- Send OTP to invited user
- Send product sheet to prospect

### 4. Delivery

A delivery is a channel-specific attempt to deliver to one resolved destination.

Examples:

- Same request can produce:
  - one email delivery
  - one WhatsApp delivery
  - one SMS delivery
- One request can also fan out to multiple recipients for campaigns later

### 5. Event

Provider events update delivery state.

Examples:

- queued
- submitted
- sent
- delivered
- opened
- clicked
- read
- failed
- bounced
- rejected

## Proposed Tables

These tables should live in tenant scope unless the specific use case is explicitly control-plane only.

### `documents`

Purpose: reusable stored artifact metadata.

Suggested columns:

- `id`
- `tenant_id`
- `module`
- `product_key`
- `entity_type`
- `entity_id`
- `document_kind`
- `title`
- `file_name`
- `mime_type`
- `storage_provider`
- `storage_key`
- `checksum`
- `version_no`
- `is_official`
- `created_by_user_id`
- `created_at`

### `document_render_jobs`

Purpose: optional async rendering pipeline and troubleshooting.

Suggested columns:

- `id`
- `document_id`
- `status`
- `renderer_key`
- `input_payload`
- `error_code`
- `error_detail`
- `started_at`
- `finished_at`

### `message_templates`

Purpose: reusable cross-channel templates.

Suggested columns:

- `id`
- `tenant_id` nullable for global/system templates
- `channel`
- `module`
- `product_key`
- `template_key`
- `template_name`
- `status`
- `subject_template`
- `body_text_template`
- `body_html_template`
- `provider_template_key`
- `schema_json`
- `version_no`
- `is_system`
- `created_at`

### `message_requests`

Purpose: business intent plus queue/outbox state.

Suggested columns:

- `id`
- `tenant_id`
- `channel`
- `module`
- `product_key`
- `entity_type`
- `entity_id`
- `purpose`
- `source_app_key`
- `template_key`
- `document_mode`
- `render_context`
- `recipient_ref`
- `resolved_recipient`
- `status`
- `priority`
- `scheduled_at`
- `idempotency_key`
- `initiated_by_user_id`
- `failure_count`
- `last_error_code`
- `last_error_detail`
- `created_at`
- `updated_at`

Recommended request statuses:

- `queued`
- `processing`
- `submitted`
- `completed`
- `failed`
- `cancelled`

### `message_deliveries`

Purpose: actual channel-specific delivery record per recipient.

Suggested columns:

- `id`
- `request_id`
- `tenant_id`
- `channel`
- `destination`
- `destination_label`
- `provider`
- `provider_message_id`
- `provider_conversation_id`
- `status`
- `attempt_no`
- `sent_payload`
- `response_payload`
- `queued_at`
- `submitted_at`
- `sent_at`
- `delivered_at`
- `read_at`
- `failed_at`

Recommended delivery statuses:

- `queued`
- `submitted`
- `sent`
- `delivered`
- `read`
- `opened`
- `clicked`
- `failed`
- `bounced`
- `rejected`

### `message_events`

Purpose: immutable provider/webhook event log.

Suggested columns:

- `id`
- `tenant_id`
- `request_id`
- `delivery_id`
- `channel`
- `provider`
- `provider_event_id`
- `event_type`
- `event_at`
- `signature`
- `payload`
- `received_at`

### Phase 2 tables

Add only after base send pipeline is stable:

- `message_threads`
- `message_campaigns`
- `message_campaign_members`
- `message_inbound_messages`

## Shared Internal Contract

Business modules should call one internal contract.

```ts
type MessageChannel = "email" | "sms" | "whatsapp";

type MessagePurpose =
  | "auth_invite"
  | "auth_otp"
  | "password_reset"
  | "invoice_send"
  | "ledger_statement_send"
  | "crm_followup"
  | "product_share"
  | "accountant_copy"
  | "govt_copy"
  | "system_alert";

type DocumentRef = {
  documentId: string;
  disposition?: "attachment" | "link" | "media";
  label?: string;
};

type QueueMessageInput = {
  channel: MessageChannel;
  module: string;
  productKey?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  purpose: MessagePurpose;
  templateKey?: string | null;
  recipient: RecipientRef;
  context?: Record<string, unknown>;
  documents?: DocumentRef[];
  subjectOverride?: string | null;
  textOverride?: string | null;
  htmlOverride?: string | null;
  scheduleAt?: string | null;
  priority?: "low" | "normal" | "high";
  idempotencyKey: string;
  initiatedByUserId?: string | null;
};
```

Result:

```ts
type QueueMessageResult = {
  requestId: string;
  status: "queued" | "submitted";
};
```

## Channel Rules

### Email

Use for:

- Formal invoices
- Ledger statements
- CA copies
- Accountant documents
- Multi-page reports

Email-specific fields later:

- `from`
- `replyTo`
- `cc`
- `bcc`
- attachment mode

### SMS

Use for:

- OTP
- short reminders
- payment due alerts
- short links to documents

Restrictions:

- no heavy content
- no attachments
- content must stay short
- India-specific DLT/template compliance may be required

### WhatsApp

Use for:

- approved template messages
- reminders
- document share with customer
- conversational updates in supported windows

Restrictions:

- outside session window, use approved template flow
- free-form outbound text cannot be assumed
- document/media payload rules belong in adapter

## Module Integration Examples

### Auth

- `auth_invite`: email or WhatsApp template with invite link
- `auth_otp`: SMS or email

Auth should stop logging links and OTPs directly once the messaging core exists.

### Billing

- Generate invoice PDF in document layer
- Queue email with attachment
- Optionally queue WhatsApp document/link

### Accounts

- Generate ledger statement PDF/Excel
- Queue email to customer, accountant, or CA
- Queue SMS only as short notification with download link when appropriate

### CRM

- No formal document required for most follow-ups
- Use shared templates and recipient resolution
- Campaigns should build on the same request/delivery model, not a parallel CRM-only sender

### Inventory/Product

- Generate product sheet or catalog page link
- Send by email or WhatsApp

## Government / Compliance Boundary

Government-facing workflows should be split into two categories:

- `copy/notification`
  - Example: email a generated GST working to accountant
- `official submission`
  - Example: upload or file to a government API/portal

Official submission should be modeled as a separate compliance workflow. Messaging can send confirmation copies, but it should not be the primary government filing model.

## What Existing Channel Threads Should Do

The ongoing email, SMS, and WhatsApp work should align on these rules immediately:

- Reuse one status vocabulary
- Reuse one idempotency model
- Reuse one request-to-delivery split
- Reuse one domain reference set: `module`, `productKey`, `entityType`, `entityId`
- Reuse one recipient model
- Reuse one event log model

Channel-specific threads should only add:

- provider auth/config
- payload transformation
- webhook signature validation
- provider response mapping

## Rollout Plan

### Phase 1

Build the shared base:

- shared request contract
- `documents`
- `message_requests`
- `message_deliveries`
- `message_events`
- channel adapter interfaces

First consumers:

- `auth` invite and OTP
- simple email and SMS send

### Phase 2

Add formal business sends:

- billing invoice email
- accounts ledger statement email
- WhatsApp document/link send
- reusable template registry

### Phase 3

Add workflow features:

- campaign/broadcast
- inbound threads
- conversation timeline
- user inbox/communication center

## Decision

Build:

- one shared messaging core
- one shared document capability
- thin channel adapters for email, SMS, and WhatsApp

Do not build:

- one email model for email thread
- another SMS model for SMS thread
- another WhatsApp model for WhatsApp thread
- a business-facing document app before the platform contract exists

The contract should be frozen here first, then implemented in the channel threads against the same model.
