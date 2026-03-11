# SMS and Alert Email Production Completion Checklist

This checklist reflects the repo state on 2026-03-11.

## Current status summary

Implemented already:
- Generalized SMS data model, provider abstraction, webhook event storage, retries, reporting, and admin tooling.
- Business integrations for `billing.invoice_due`, `billing.invoice_created`, `accounts.ledger_statement_ready`, `crm.followup`, and `inventory.product_offer`.
- Scheduled SMS alert events, review workflow, and alert-email routing configuration in the SMS admin UI.

Not production-complete yet:
- Email delivery is still a durable queue or sandbox placeholder, not a real provider dispatch path.
- Email webhook delivery-status handling is still stubbed.
- Live end-to-end verification with real provider credentials has not been completed.

## 1. Database rollout

Status: pending

Required migrations for every tenant database:
- `backend/services/email/db/001_init.sql`
- `backend/services/sms/db/001_init.sql`
- `backend/services/sms/db/002_generalize_sms_messages.sql`
- `backend/services/sms/db/003_template_bindings.sql`
- `backend/services/sms/db/004_sms_settings.sql`
- `backend/services/sms/db/005_sms_alert_events.sql`
- `backend/services/sms/db/006_sms_alert_event_review.sql`
- `backend/services/sms/db/007_sms_alert_email_delivery.sql`

Repo status:
- The standard tenant migration scripts in `backend/package.json` now include Email and SMS migrations for new tenant setup.
- Existing provisioned tenants still need these migrations applied during rollout if they were created before this change.

Manual tenant migration sequence for already provisioned tenants or direct rollout verification:
```bash
psql "$TENANT_DB_URL" -f services/email/db/001_init.sql
psql "$TENANT_DB_URL" -f services/sms/db/001_init.sql
psql "$TENANT_DB_URL" -f services/sms/db/002_generalize_sms_messages.sql
psql "$TENANT_DB_URL" -f services/sms/db/003_template_bindings.sql
psql "$TENANT_DB_URL" -f services/sms/db/004_sms_settings.sql
psql "$TENANT_DB_URL" -f services/sms/db/005_sms_alert_events.sql
psql "$TENANT_DB_URL" -f services/sms/db/006_sms_alert_event_review.sql
psql "$TENANT_DB_URL" -f services/sms/db/007_sms_alert_email_delivery.sql
```

Database verification after migration:
- Confirm `email_messages` and `email_webhook_events` exist.
- Confirm `sms_messages`, `sms_webhook_events`, `sms_template_bindings`, `sms_settings`, and `sms_alert_events` exist.
- Confirm existing tenant data is preserved and bindings/settings rows can be inserted and updated.

## 2. SMS provider go-live configuration

Status: partially done

Current repo capability:
- SMS provider layer supports MSG91 and Twilio.
- Production recommendation for India is MSG91-first.

Required backend env setup from `backend/.env.example`:
- `SMS_PROVIDER=msg91`
- `SMS_SANDBOX=0`
- `SMS_WEBHOOK_PUBLIC_BASE_URL=<public backend base url>`
- `SMS_VALIDATE_WEBHOOK_SIGNATURE=1` when using signature validation for the chosen provider path
- `SMS_MSG91_AUTH_KEY=<real key>`
- `SMS_MSG91_SENDER_ID=<approved sender id>`
- `SMS_MSG91_ROUTE=<approved route>`
- `SMS_MSG91_COUNTRY=91`
- `SMS_MSG91_DLT_TEMPLATE_ID` and or `SMS_MSG91_FLOW_ID` where applicable
- `SMS_MSG91_WEBHOOK_AUTH_HEADER_NAME=<header name>`
- `SMS_MSG91_WEBHOOK_AUTH_HEADER_VALUE=<secret value>`

Tenant binding setup required in the SMS page:
- `billing.invoice_due`
- `billing.invoice_created`
- `accounts.ledger_statement_ready`
- `crm.followup`
- `inventory.product_offer`

Per binding, verify:
- binding is active
- template key is correct
- sender id is correct for the tenant
- MSG91 metadata contains the right DLT template or Flow mapping
- preview renders correctly with tenant sample data

Go-live verification:
- send one live SMS per binding
- confirm provider accepted message id
- confirm webhook callback updates final status
- confirm history, retry, and webhook event dialogs show the real provider data

## 3. Email channel completion

Status: not complete

Current repo behavior:
- Email messages are persisted durably.
- Sandbox mode records messages without sending.
- Without a provider implementation, non-sandbox email records are marked as queued placeholders.
- Email webhook receiver is still a stub.

Required backend env setup from `backend/.env.example`:
- `EMAIL_PROVIDER=<real provider>`
- `EMAIL_API_KEY=<real key>`
- `EMAIL_FROM_EMAIL=<from email>`
- `EMAIL_FROM_NAME=<from name>`
- `EMAIL_SANDBOX=0`

Required engineering completion before calling alert email production-ready:
- implement real provider dispatch inside the Email add-on
- implement webhook signature validation and delivery-status updates in `/email/webhook`
- verify alert-summary emails move beyond `queued` or `sandbox` into real provider statuses

Go-live verification:
- create one scheduled SMS alert event
- confirm email messages are actually delivered to configured recipients
- confirm email webhook updates delivery status back into tenant history

## 4. Scheduler and tenant operations setup

Status: partially done

Current scheduler behavior:
- SMS retry policy cron runs every 30 minutes
- SMS alert-event cron runs every 1 hour

Tenant admin setup required in SMS page:
- configure tenant alert thresholds
- configure tenant alert email delivery
- add real recipient email list
- verify subject prefix
- save and reload settings successfully

Operational checks before go-live:
- confirm the deployment environment allows Encore cron execution
- confirm internal cron endpoints are reachable in deployment
- confirm the tenant has at least one operator recipient for alert emails
- confirm duplicate cooldown is set to a sensible value for the tenant

## 5. End-to-end UAT checklist

Status: pending

Run this on one real tenant before wider rollout:
- send manual `billing.invoice_due` SMS
- send manual `billing.invoice_created` SMS
- send manual `accounts.ledger_statement_ready` SMS
- send manual `crm.followup` SMS
- send manual `inventory.product_offer` SMS
- run one batch product-offer SMS send
- force one SMS failure and verify retry from history
- verify scheduled retry-policy sweep on a failed message
- trigger one scheduled SMS alert event and verify alert email delivery
- acknowledge and reopen one alert event in the SMS admin page
- export SMS history and tenant overview reports

Evidence to capture:
- message id from provider
- webhook payload example
- final delivery status in app
- one alert email screenshot or received sample
- one retry success example

## 6. Production completion gate

Do not call this fully complete until all of the following are true:
- tenant Email and SMS migrations are applied in production
- the updated tenant migration scripts are the ones actually used in deployment and by any tenant bootstrap process
- MSG91 or chosen SMS provider is live with working callbacks
- Email provider is live with working callbacks
- SMS sandbox is off in production
- Email sandbox is off in production
- the five current business bindings are configured and tested on a real tenant
- cron-driven retries and alert events are verified in production-like conditions
- one tenant UAT cycle is signed off with captured evidence

## 7. Recommended next implementation after go-live

After the above is complete, the next sensible hardening items are:
- add email provider dispatch and webhook handling as a first-class channel, not only alert-email storage
- add operator notification routing beyond email if you want WhatsApp or in-app alert delivery later
- add a compact runbook for tenant onboarding so SMS and alert-email setup is repeatable