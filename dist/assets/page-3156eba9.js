import{au as Ms,av as Is,aw as Ps,R as o,j as e,B as m,e as ss}from"./index-a2e62377.js";import{D as Rs}from"./dialog.esm-6e6fddb6.js";import{I as nt}from"./inputtextarea.esm-acbf5119.js";import{M as b}from"./message.esm-fdb57c99.js";import{T as P}from"./tag.esm-045cf529.js";import{A as Q}from"./AppDropdown-800ebb2b.js";import{A as k}from"./AppInput-10952e09.js";import{e as $s,a as ks,b as Ds}from"./reportExport-834d722d.js";import"./index.esm-716d0587.js";import"./index.esm-81904cc2.js";import"./index.esm-10fa0e2b.js";import"./dropdown.esm-7710effc.js";import"./index.esm-287dfa04.js";import"./overlayservice.esm-bf9b13ee.js";import"./virtualscroller.esm-c60a9a04.js";import"./inputnumber.esm-991f482d.js";import"./index.esm-1ebbc8e4.js";const Os=Ms("/sms/graphql"),as=100,rs=500,M=async(s,a,i=!0)=>{var S,w,R;const n=new Headers;n.set("Content-Type","application/json");const d=Is();d&&n.set("Authorization",`Bearer ${d}`);const u=await fetch(Os,{method:"POST",headers:n,credentials:"include",body:JSON.stringify({query:s,variables:a})}),x=await u.text(),f=x?JSON.parse(x):null,v=(f==null?void 0:f.errors)??[];if(v.length){const C=(w=(S=v[0])==null?void 0:S.extensions)==null?void 0:w.code;if(i&&C==="UNAUTHENTICATED"&&await Ps())return await M(s,a,!1);throw new Error(((R=v[0])==null?void 0:R.message)||"Request failed")}if(!u.ok||!(f!=null&&f.data))throw new Error(`Request failed (${u.status})`);return f.data},Ls=async()=>(await M(`query SmsSettings {
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
                createdAt
                updatedAt
            }
        }`)).smsSettings,Fs=async s=>(await M(`mutation UpsertSmsSettings($input: UpsertSmsSettingsInput!) {
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
                createdAt
                updatedAt
            }
        }`,{input:s})).upsertSmsSettings,Ks=async s=>(await M(`query SmsTemplateBinding($bindingKey: String!) {
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
        }`,{bindingKey:s})).smsTemplateBinding,_s=async s=>(await M(`mutation UpsertSmsTemplateBinding($input: UpsertSmsTemplateBindingInput!) {
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
        }`,{input:s})).upsertSmsTemplateBinding,Bs=async s=>(await M(`query SmsTemplateBindingPreview(
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
        }`,s)).smsTemplateBindingPreview,us=async s=>(await M(`query SmsMessages(
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
        }`,s)).smsMessages,Hs=async s=>{const{maxRows:a,pageSize:i,...n}=s,d=Math.min(Math.max(Math.floor(a??rs),1),rs),u=Math.min(Math.max(Math.floor(i??as),1),as),x=[],f=new Set;let v=null;for(;x.length<d;){if(v){if(f.has(v))break;f.add(v)}const S=d-x.length,w=await us({...n,limit:Math.min(u,S),cursor:v});if(!w.items.length){v=null;break}if(x.push(...w.items),!w.nextCursor){v=null;break}v=w.nextCursor}return{items:x,truncated:!!v,nextCursor:v}},ns=async s=>(await M(`query SmsDeliverySummary(
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
        }`,s)).smsDeliverySummary,Vs=async s=>(await M(`query SmsOperationalSnapshot(
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
        }`,s)).smsOperationalSnapshot,Js=async()=>(await M(`query SmsTenantOperationalOverview {
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
        }`)).smsTenantOperationalOverview,Ws=async s=>(await M(`mutation RetrySmsMessage($messageId: String!) {
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
        }`,{messageId:s})).retrySmsMessage,Us=async s=>(await M(`mutation RunSmsRetrySweep($bindingKey: String!, $dryRun: Boolean) {
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
        }`,s)).runSmsRetrySweep,qs=async s=>(await M(`query SmsWebhookEvents($messageId: String, $providerMessageId: String, $limit: Int) {
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
        }`,s)).smsWebhookEvents,Xs=`{
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
}`,Gs=`{
  "msg91": {
    "dltTemplateId": "1307167420000000012",
    "variables": {
      "customer_name": "{{recipientName}}",
      "invoice_no": "{{voucherNumber}}",
      "invoice_amount": "{{totalNetAmountText}}",
      "due_amount": "{{dueAmountText}}"
    }
  }
}`,zs=`{
  "msg91": {
    "dltTemplateId": "1307167420000000013",
    "variables": {
      "customer_name": "{{recipientName}}",
      "period": "{{periodText}}",
      "closing_balance": "{{closingBalanceText}}"
    }
  }
}`,Ys=`{
  "msg91": {
    "dltTemplateId": "1307167420000000014",
    "variables": {
      "customer_name": "{{recipientName}}",
      "member_code": "{{memberCode}}",
      "followup_date": "{{followupDateText}}"
    }
  }
}`,Qs=`{
  "msg91": {
    "dltTemplateId": "1307167420000000015",
    "variables": {
      "customer_name": "{{recipientName}}",
      "product_name": "{{productName}}",
      "offer_price": "{{sellingRateText}}"
    }
  }
}`,Zs=`{
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
}`,ea=`{
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
}`,ta=`{
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
}`,sa=`{
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
}`,aa=`{
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
}`,B=[{bindingKey:"billing.invoice_due",label:"Invoice Due",description:"Billing uses this binding for manual invoice due reminders and for the scheduled due-reminder sweep.",enabledLabel:"Enable invoice due reminders",defaultTemplateKey:"invoice_due",sourceApp:"billing",sourceModule:"invoice",sourceEvent:"invoice_due",sourceEntityType:"sale_invoice",sourceNote:"Billing reads this binding for manual invoice-due reminders and the scheduled due-reminder sweep.",saveNotice:"Invoice due SMS settings saved. Billing reminders will use this binding when present.",messageTemplateHelp:"Leave blank to use the default billing reminder text.",placeholderLines:["recipientName, recipientPhone, voucherNumber, voucherDate, billNumber","dueAmount, dueAmountText, paidAmount, paidAmountText"],metadataExample:Xs,previewContextExample:Zs},{bindingKey:"billing.invoice_created",label:"Invoice Created",description:"Billing can auto-send this message immediately after invoice save, but only when the binding exists and is active.",enabledLabel:"Enable invoice created messages",defaultTemplateKey:"invoice_created",sourceApp:"billing",sourceModule:"invoice",sourceEvent:"invoice_created",sourceEntityType:"sale_invoice",sourceNote:"Billing reads this binding right after invoice creation. Auto-send is skipped unless this binding exists and is active.",saveNotice:"Invoice created SMS settings saved. New invoices can now auto-send this binding when active.",messageTemplateHelp:"Leave blank to use the default invoice created message text.",placeholderLines:["recipientName, recipientPhone, voucherNumber, voucherDate, billNumber","totalNetAmount, totalNetAmountText, dueAmount, dueAmountText"],metadataExample:Gs,previewContextExample:ea},{bindingKey:"accounts.ledger_statement_ready",label:"Ledger Statement Ready",description:"Accounts uses this binding for direct ledger statement SMS sends from the ledger report.",enabledLabel:"Enable ledger statement SMS",defaultTemplateKey:"ledger_statement_ready",sourceApp:"accounts",sourceModule:"ledger",sourceEvent:"ledger_statement_ready",sourceEntityType:"ledger",sourceNote:"Accounts reads this binding from the ledger statement report action.",saveNotice:"Ledger statement SMS settings saved. Accounts ledger sends will use this binding when active.",messageTemplateHelp:"Leave blank to use the default ledger statement SMS text.",placeholderLines:["recipientName, recipientPhone, ledgerName, fromDateText, toDateText, periodText","totalCount, totalCountText, openingBalanceText, debitTotalText, creditTotalText, movementText, closingBalanceText"],metadataExample:zs,previewContextExample:ta},{bindingKey:"crm.followup",label:"CRM Follow-up",description:"CRM uses this binding for direct follow-up SMS sends from the party profile screen.",enabledLabel:"Enable CRM follow-up SMS",defaultTemplateKey:"crm_followup",sourceApp:"crm",sourceModule:"party",sourceEvent:"crm_followup",sourceEntityType:"party_profile",sourceNote:"CRM reads this binding when an operator sends a follow-up SMS from a party profile.",saveNotice:"CRM follow-up SMS settings saved. CRM party follow-ups will use this binding when active.",messageTemplateHelp:"Leave blank to use the default CRM follow-up SMS text.",placeholderLines:["recipientName, recipientPhone, ledgerId, ledgerName, memberCode","membershipTier, partyType, birthDateText, anniversaryDateText, followupDateText"],metadataExample:Ys,previewContextExample:sa},{bindingKey:"inventory.product_offer",label:"Product Offer",description:"Inventory uses this binding for direct product-offer SMS sends from the product master.",enabledLabel:"Enable product offer SMS",defaultTemplateKey:"product_offer",sourceApp:"inventory",sourceModule:"product",sourceEvent:"product_offer",sourceEntityType:"product",sourceNote:"Inventory reads this binding when an operator sends a product-offer SMS from the product master.",saveNotice:"Product offer SMS settings saved. Inventory product offers will use this binding when active.",messageTemplateHelp:"Leave blank to use the default product offer SMS text.",placeholderLines:["recipientName, recipientPhone, offerDateText, productId, productName, productCode","productBrandName, productGroupName, hsnCode, landingCostText, mrpText, sellingRateText, marginText"],metadataExample:Qs,previewContextExample:aa}],U={enabled:!0,failedRatePercent:10,minimumMessagesForRateAlert:20,pendingCount:25,issueCount:10,unconfiguredSourceCount:1,oldestPendingHours:6},ra=s=>B.find(a=>a.bindingKey===s)??B[0],Re=(s,a)=>({bindingId:(a==null?void 0:a.id)??null,bindingKey:(a==null?void 0:a.bindingKey)??s.bindingKey,isActive:(a==null?void 0:a.isActive)??!0,templateKey:(a==null?void 0:a.templateKey)??s.defaultTemplateKey,senderId:(a==null?void 0:a.senderId)??"",messageTextTemplate:(a==null?void 0:a.messageTextTemplate)??"",metadataJson:(a==null?void 0:a.metadataJson)??""}),lt=s=>{const a=s??U;return{enabled:a.enabled,failedRatePercent:String(a.failedRatePercent),minimumMessagesForRateAlert:String(a.minimumMessagesForRateAlert),pendingCount:String(a.pendingCount),issueCount:String(a.issueCount),unconfiguredSourceCount:String(a.unconfiguredSourceCount),oldestPendingHours:String(a.oldestPendingHours)}},le=(s,a,i,n)=>{const d=Number(s.trim());return Number.isFinite(d)?Math.min(Math.max(Math.round(d),i),n):a},ls=s=>({enabled:s.enabled,failedRatePercent:le(s.failedRatePercent,U.failedRatePercent,0,100),minimumMessagesForRateAlert:le(s.minimumMessagesForRateAlert,U.minimumMessagesForRateAlert,0,1e6),pendingCount:le(s.pendingCount,U.pendingCount,0,1e6),issueCount:le(s.issueCount,U.issueCount,0,1e6),unconfiguredSourceCount:le(s.unconfiguredSourceCount,U.unconfiguredSourceCount,0,1e6),oldestPendingHours:le(s.oldestPendingHours,U.oldestPendingHours,0,24*365)}),na=15,la=20,it=500,ia=[{label:"All statuses",value:""},{label:"Queued",value:"queued"},{label:"Sent",value:"sent"},{label:"Delivered",value:"delivered"},{label:"Failed",value:"failed"},{label:"Sandbox",value:"sandbox"},{label:"Received",value:"received"}],is=[{label:"Last 7 days",value:7},{label:"Last 30 days",value:30},{label:"Last 90 days",value:90}],Oe=[{label:"All apps",value:""},...Array.from(new Set(B.map(s=>s.sourceApp))).map(s=>({label:s.charAt(0).toUpperCase()+s.slice(1),value:s}))],ms=[{label:"All configs",value:""},{label:"Active only",value:"active"},{label:"Inactive only",value:"inactive"},{label:"Unconfigured only",value:"unconfigured"}],xs=[{label:"All rows",value:""},{label:"Needs attention",value:"attention"},{label:"Healthy only",value:"healthy"}],g=s=>{if(!s)return"-";const a=new Date(s);return Number.isNaN(a.getTime())?s:a.toLocaleString("en-IN")},l=s=>s.toLocaleString("en-IN"),$e=(s,a)=>a<=0?"0%":`${(s/a*100).toFixed(1)}%`,je=s=>{if(!s)return"-";const a=new Date(s);if(Number.isNaN(a.getTime()))return"-";const i=Math.max(Math.floor((Date.now()-a.getTime())/6e4),0);if(i<60)return`${l(i)}m`;const n=Math.floor(i/60);if(n<24)return`${l(n)}h ${l(i%60)}m`;const d=Math.floor(n/24);return`${l(d)}d ${l(n%24)}h`},oa=s=>{let a=null,i=null;return s.forEach(n=>{if(!n.oldestPendingAt)return;const u=new Date(n.oldestPendingAt).getTime();Number.isNaN(u)||(a==null||u<a)&&(a=u,i=n.oldestPendingAt)}),i},da=s=>{if(!s)return 0;const a=new Date(s);return Number.isNaN(a.getTime())?0:Math.max((Date.now()-a.getTime())/(60*60*1e3),0)},ca=(s,a,i)=>{const n=a.reduce((C,q)=>C+q.pendingCount,0),d=a.reduce((C,q)=>C+q.issueCount,0),u=a.filter(C=>!C.isConfigured&&C.attentionCount>0).length,x=oa(a),f=da(x),v=(i==null?void 0:i.totalCount)??0,S=(i==null?void 0:i.failedCount)??0,w=v>0?S/v*100:0,R=v>=s.minimumMessagesForRateAlert;return[{key:"pending",label:"Pending backlog",currentValue:l(n),thresholdValue:l(s.pendingCount),statusLabel:n>=s.pendingCount?"ALERT":"OK",severity:n>=s.pendingCount?"danger":"success",detail:n>0?`${l(n)} queued or sent messages are still open in the current app scope.`:"No pending backlog in the current app scope.",triggered:n>=s.pendingCount},{key:"issues",label:"Issue backlog",currentValue:l(d),thresholdValue:l(s.issueCount),statusLabel:d>=s.issueCount?"ALERT":"OK",severity:d>=s.issueCount?"danger":"success",detail:d>0?`${l(d)} failed or sandbox messages need operator attention.`:"No issue backlog in the current app scope.",triggered:d>=s.issueCount},{key:"unconfigured",label:"Unconfigured sources",currentValue:l(u),thresholdValue:l(s.unconfiguredSourceCount),statusLabel:u>=s.unconfiguredSourceCount?"ALERT":"OK",severity:u>=s.unconfiguredSourceCount?"warning":"success",detail:u>0?`${l(u)} source mappings have active SMS traffic without a saved binding record.`:"No unconfigured traffic sources detected in scope.",triggered:u>=s.unconfiguredSourceCount},{key:"oldestPending",label:"Oldest pending age",currentValue:x?`${f.toFixed(1)}h`:"-",thresholdValue:`${l(s.oldestPendingHours)}h`,statusLabel:x&&f>=s.oldestPendingHours?"ALERT":"OK",severity:x&&f>=s.oldestPendingHours?"warning":"success",detail:x?`Oldest pending message age is ${je(x)} (${g(x)}).`:"No pending messages currently in scope.",triggered:!!(x&&f>=s.oldestPendingHours)},{key:"failedRate",label:"Failed rate",currentValue:`${w.toFixed(1)}%`,thresholdValue:`${l(s.failedRatePercent)}%`,statusLabel:R?w>=s.failedRatePercent?"ALERT":"OK":"WAITING",severity:R?w>=s.failedRatePercent?"danger":"success":"warning",detail:R?`${l(S)} failed messages out of ${l(v)} total messages in the current trend window.`:`Rate alert waits for at least ${l(s.minimumMessagesForRateAlert)} messages in the current window; only ${l(v)} found.`,triggered:R&&w>=s.failedRatePercent}]},Z=s=>{switch(s){case"delivered":return"success";case"sent":return"info";case"queued":case"sandbox":case"received":return"warning";case"failed":return"danger";default:return}},ps=s=>`${s.sourceApp} / ${s.sourceModule} / ${s.sourceEvent}`,Le=s=>[s.sourceApp,s.sourceModule,s.sourceEvent,s.sourceEntityType].filter(Boolean).join(" / ")||"-",ot=s=>{const a=s.bindingKey?B.find(i=>i.bindingKey===s.bindingKey):null;return a?a.label:s.bindingKey?s.bindingKey:Le(s)},hs=s=>s.isConfigured?s.isActive?{label:"ACTIVE",severity:"success"}:{label:"INACTIVE",severity:"warning"}:{label:"UNCONFIGURED",severity:"warning"},ye=(s,a,i)=>{var n;return((n=s.find(d=>d.value===a))==null?void 0:n.label)??i},ua=(s,a)=>{const i=a.search.trim().toLowerCase();return s.filter(n=>{if(a.sourceApp&&n.sourceApp!==a.sourceApp||a.config==="active"&&(!n.isConfigured||!n.isActive)||a.config==="inactive"&&(!n.isConfigured||n.isActive!==!1)||a.config==="unconfigured"&&n.isConfigured)return!1;const d=n.attentionCount>0;return a.attention==="attention"&&!d||a.attention==="healthy"&&d?!1:i?[ot(n),n.bindingKey,n.sourceApp,n.sourceModule,n.sourceEvent,n.sourceEntityType,hs(n).label].filter(Boolean).join(" ").toLowerCase().includes(i):!0})},ma=(s,a)=>({fileName:"tenant-sms-overview",title:"Tenant SMS Overview",subtitle:[`Generated: ${g(new Date().toISOString())}`,`Search: ${a.search.trim()||"All"}`,`App filter: ${ye(Oe,a.sourceApp,"All apps")}`,`Config filter: ${ye(ms,a.config,"All configs")}`,`Attention filter: ${ye(xs,a.attention,"All rows")}`,`Exported rows: ${l(s.length)}`].join(`
`),sheetName:"Tenant Overview",footerLeft:"Tenant SMS overview",rows:s,columns:[{header:"Binding",value:i=>ot(i)},{header:"Binding Key",value:i=>i.bindingKey||"-"},{header:"Source",value:i=>Le(i)},{header:"Config",value:i=>hs(i).label},{header:"Attention",value:i=>i.attentionCount},{header:"Pending",value:i=>i.pendingCount},{header:"Issues",value:i=>i.issueCount},{header:"Oldest Pending",value:i=>g(i.oldestPendingAt)},{header:"Latest Issue",value:i=>g(i.latestIssueAt)}]}),xa=(s,a)=>({fileName:`tenant-sms-delivery-summary-${a.sourceApp||"all-apps"}-${a.days}-days`,title:"Tenant SMS Delivery Summary",subtitle:[`Scope: ${ye(Oe,a.sourceApp,"All apps")}`,`Window: Last ${s.windowDays} days`,`Generated: ${g(new Date().toISOString())}`,`Totals: ${l(s.totalCount)} total, ${l(s.deliveredCount)} delivered, ${l(s.failedCount)} failed`].join(`
`),sheetName:"Tenant Summary",footerLeft:"Tenant SMS delivery summary",rows:s.dailyBuckets,columns:[{header:"Date",value:i=>i.date},{header:"Total",value:i=>i.totalCount},{header:"Delivered",value:i=>i.deliveredCount},{header:"Failed",value:i=>i.failedCount}]}),vs=s=>s.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"sms-report",ke=async(s,a)=>{if(s==="csv"){$s(a);return}if(s==="excel"){await ks(a);return}Ds(a)},pa=(s,a)=>{const i=a.statusCounts.map(d=>`${d.status}:${l(d.count)}`).join(", "),n=a.topFailureCodes.map(d=>`${d.errorCode}:${l(d.count)}`).join(", ");return{fileName:`${vs(s.bindingKey)}-delivery-summary-${a.windowDays}-days`,title:`${s.label} SMS Delivery Summary`,subtitle:[`Source: ${ps(s)}`,`Window: Last ${a.windowDays} days`,`Generated: ${g(new Date().toISOString())}`,`Totals: ${l(a.totalCount)} total, ${l(a.deliveredCount)} delivered, ${l(a.failedCount)} failed`,`Statuses: ${i||"-"}`,`Top failure codes: ${n||"-"}`].join(`
`),sheetName:"Delivery Summary",footerLeft:`${s.label} SMS delivery summary`,rows:a.dailyBuckets,columns:[{header:"Date",value:d=>d.date},{header:"Total",value:d=>d.totalCount},{header:"Delivered",value:d=>d.deliveredCount},{header:"Failed",value:d=>d.failedCount}]}},ha=(s,a,i)=>({fileName:`${vs(s.bindingKey)}-history`,title:`${s.label} SMS History`,subtitle:[`Source: ${ps(s)}`,`Status filter: ${i.status||"All statuses"}`,`Recipient phone filter: ${i.phone.trim()||"All recipients"}`,`Generated: ${g(new Date().toISOString())}`,`Exported rows: ${l(a.length)}`,i.truncated?`Export capped at ${l(it)} rows. Narrow the filters to export the remaining history.`:null].filter(Boolean).join(`
`),sheetName:"SMS History",footerLeft:`${s.label} SMS history`,rows:a,columns:[{header:"Created",value:n=>g(n.createdAt)},{header:"Status",value:n=>n.duplicate?`${n.status} (duplicate)`:n.status},{header:"Recipient",value:n=>n.recipient.name||"-"},{header:"Phone",value:n=>n.recipient.phone},{header:"Template",value:n=>n.message.templateKey||n.message.type},{header:"Message",value:n=>n.message.textPreview||"-"},{header:"Source",value:n=>{var d,u,x,f,v;return[(d=n.source)==null?void 0:d.app,(u=n.source)==null?void 0:u.module,(x=n.source)==null?void 0:x.event,(f=n.source)==null?void 0:f.entityType,(v=n.source)==null?void 0:v.entityId].filter(Boolean).join(" / ")||"-"}},{header:"Provider ID",value:n=>n.providerMessageId||"-"},{header:"Sender ID",value:n=>n.senderId||"-"},{header:"Error",value:n=>[n.errorCode,n.errorDetail].filter(Boolean).join(": ")||"-"},{header:"Sent At",value:n=>g(n.sentAt)},{header:"Final At",value:n=>g(n.deliveredAt||n.failedAt)}]}),os=(s,a=!1)=>s==null?a:s===!0||s==="true"||s===1||s==="1",De=(s,a,i,n)=>{const d=Number(s??a);return Number.isFinite(d)?Math.min(Math.max(Math.trunc(d),i),n):a},ds=s=>Array.isArray(s)?Array.from(new Set(s.map(a=>typeof a=="string"?a.trim().toLowerCase():typeof a=="number"?String(a).trim().toLowerCase():"").filter(Boolean))):[],va=s=>{const a={enabled:!1,maxAttempts:2,retryAfterMinutes:30,withinHours:72,maxMessagesPerRun:25,statuses:["failed"],skipErrorCodes:[],parseError:null},i=s.trim();if(!i)return a;try{const n=JSON.parse(i);if(!n||typeof n!="object"||Array.isArray(n))return{...a,parseError:"Metadata must be a JSON object."};const d=n.retryPolicy;if(d==null)return a;if(!d||typeof d!="object"||Array.isArray(d))return{...a,parseError:"retryPolicy must be a JSON object."};const u=d,x=os(u.enabled,!1)&&os(u.isEnabled,!0),f=ds(u.statuses??u.retryStatuses);return{enabled:x,maxAttempts:De(u.maxAttempts??u.retryLimit,2,1,10),retryAfterMinutes:De(u.retryAfterMinutes??u.retryDelayMinutes,30,0,10080),withinHours:De(u.withinHours??u.lookbackHours,72,1,24*30),maxMessagesPerRun:De(u.maxMessagesPerRun??u.limit,25,1,200),statuses:f.length>0?f:["failed"],skipErrorCodes:ds(u.skipErrorCodes??u.excludeErrorCodes),parseError:null}}catch{return{...a,parseError:"Metadata JSON must be valid before retryPolicy can be parsed."}}},ga=s=>{switch(s){case"retried":return"success";case"dry_run":return"info";case"skipped":return"warning";case"failed":return"danger";default:return}},cs=s=>s==="failed"||s==="sandbox";function Da(){const[s,a]=o.useState(B[0].bindingKey),[i,n]=o.useState(!0),[d,u]=o.useState(!1),[x,f]=o.useState(!1),[v,S]=o.useState(null),[w,R]=o.useState(null),[C,q]=o.useState(null),[ie,dt]=o.useState(!1),[ct,X]=o.useState(null),[T,Fe]=o.useState(null),[Ke,ut]=o.useState(""),[I,mt]=o.useState(""),[_e,xt]=o.useState(""),[Be,pt]=o.useState(""),[ee,He]=o.useState(null),[te,ht]=o.useState(!1),[vt,Ne]=o.useState(null),[G,gs]=o.useState(30),[p,gt]=o.useState(null),[se,ft]=o.useState(null),[O,bt]=o.useState(!1),[L,jt]=o.useState(!1),[yt,Se]=o.useState(null),[Nt,St]=o.useState(null),[Ve,wt]=o.useState(null),[F,K]=o.useState(()=>lt(U)),[Ct,Tt]=o.useState(!1),[At,Je]=o.useState(null),[A,We]=o.useState(null),[ae,Et]=o.useState(!1),[Mt,oe]=o.useState(null),[re,fs]=o.useState(30),[h,Ue]=o.useState(null),[de,qe]=o.useState(null),[It,Pt]=o.useState(!1),[Rt,Xe]=o.useState(null),[$t,Ge]=o.useState(null),[_,kt]=o.useState(null),[H,Dt]=o.useState(!1),[z,Ot]=o.useState(!1),[Lt,V]=o.useState(null),[Ft,ce]=o.useState(null),[Y,ze]=o.useState(null),[Kt,_t]=o.useState([]),[Ye,Bt]=o.useState(null),[we,bs]=o.useState(""),[Ce,js]=o.useState(""),[ne,Ht]=o.useState(null),[ys,Qe]=o.useState(!1),[ue,Vt]=o.useState(!1),[Jt,Te]=o.useState(null),[Wt,Ae]=o.useState([]),[y,Ze]=o.useState(null),D=o.useRef(s),me=o.useRef(0),xe=o.useRef(0),pe=o.useRef(0),he=o.useRef(0),ve=o.useRef(0),c=ra(s),Ut={search:Ke,sourceApp:I,config:_e,attention:Be},et=(T==null?void 0:T.items)??[],J=ua(et,Ut),Ns=!!(Ke.trim()||I||_e||Be),ge=ye(Oe,I,"All apps"),Ss=et.filter(t=>!I||t.sourceApp===I),qt=ls(F),Xt=ca(qt,Ss,p),Gt=Xt.filter(t=>t.triggered).length,[N,W]=o.useState(()=>Re(c)),[zt,Yt]=o.useState(c.previewContextExample),E=va(N.metadataJson);o.useEffect(()=>{D.current=s},[s]);const Qt=async()=>{const t=pe.current+1;pe.current=t,bt(!0),Se(null);try{const r=await Ls();if(pe.current!==t)return;wt(r),K(lt(r.alertThresholds))}catch(r){if(pe.current!==t)return;Se(r instanceof Error?r.message:"Failed to load tenant SMS alert settings")}finally{pe.current===t&&bt(!1)}},ws=async()=>{jt(!0),Se(null),St(null);try{const t=await Fs({alertThresholds:ls(F)});wt(t),K(lt(t.alertThresholds)),St("Tenant SMS alert thresholds saved.")}catch(t){Se(t instanceof Error?t.message:"Failed to save tenant SMS alert settings")}finally{jt(!1)}},Zt=async t=>{n(!0),S(null);try{const r=await Ks(t.bindingKey);if(D.current!==t.bindingKey)return;W(Re(t,r))}catch(r){if(D.current!==t.bindingKey)return;S(r instanceof Error?r.message:"Failed to load SMS settings")}finally{D.current===t.bindingKey&&n(!1)}};o.useEffect(()=>{W(Re(c)),Yt(c.previewContextExample),q(null),S(null),R(null),X(null),Fe(null),He(null),Je(null),We(null),oe(null),Ue(null),qe(null),Ge(null),Xe(null),kt(null),V(null),ce(null),ze(null),Qe(!1),Te(null),Ae([]),Ze(null),Zt(c)},[c]);const Cs=async()=>{u(!0),S(null),R(null);try{const t=await _s({bindingId:N.bindingId,bindingKey:c.bindingKey,templateKey:N.templateKey||null,senderId:N.senderId||null,messageTextTemplate:N.messageTextTemplate||null,sourceApp:c.sourceApp,sourceModule:c.sourceModule,sourceEvent:c.sourceEvent,sourceEntityType:c.sourceEntityType,metadataJson:N.metadataJson||null,isActive:N.isActive});W(Re(c,t)),R(c.saveNotice),await fe()}catch(t){S(t instanceof Error?t.message:"Failed to save SMS settings")}finally{u(!1)}},Ts=async()=>{f(!0),S(null);try{const t=await Bs({bindingKey:c.bindingKey,contextJson:zt||null,templateKey:N.templateKey||null,senderId:N.senderId||null,messageTextTemplate:N.messageTextTemplate||null,metadataJson:N.metadataJson||null});q(t)}catch(t){S(t instanceof Error?t.message:"Failed to preview SMS binding")}finally{f(!1)}},fe=async()=>{const t=me.current+1;me.current=t,dt(!0),X(null);try{const r=await Js();if(me.current!==t)return;Fe(r)}catch(r){if(me.current!==t)return;X(r instanceof Error?r.message:"Failed to load tenant SMS overview"),Fe(null)}finally{me.current===t&&dt(!1)}},As=()=>{ut(""),mt(""),xt(""),pt("")},tt=async t=>{He(t),X(null);try{if(!T){X("Load tenant SMS overview before exporting.");return}if(J.length===0){X("No tenant SMS overview rows match the current filters to export.");return}await ke(t,ma(J,Ut))}catch(r){X(r instanceof Error?r.message:"Failed to export tenant SMS overview")}finally{He(null)}},Ee=async(t,r)=>{const j=xe.current+1;xe.current=j,ht(!0),Ne(null);try{const $=await ns({sourceApp:r||null,days:t});if(xe.current!==j)return;gt($)}catch($){if(xe.current!==j)return;Ne($ instanceof Error?$.message:"Failed to load tenant SMS delivery summary"),gt(null)}finally{xe.current===j&&ht(!1)}},st=async t=>{if(!(!p||p.totalCount<=0)){ft(t),Ne(null);try{await ke(t,xa(p,{sourceApp:I,days:G}))}catch(r){Ne(r instanceof Error?r.message:"Failed to export tenant SMS delivery summary")}finally{ft(null)}}},Me=async t=>{const r=he.current+1;he.current=r,Tt(!0),Je(null);try{const j=await Vs({sourceApp:t.sourceApp,sourceModule:t.sourceModule,sourceEvent:t.sourceEvent,sourceEntityType:t.sourceEntityType});if(D.current!==t.bindingKey||he.current!==r)return;We(j)}catch(j){if(D.current!==t.bindingKey||he.current!==r)return;Je(j instanceof Error?j.message:"Failed to load SMS operational snapshot"),We(null)}finally{D.current===t.bindingKey&&he.current===r&&Tt(!1)}},Ie=async(t,r)=>{const j=ve.current+1;ve.current=j,Et(!0),oe(null);try{const $=await ns({sourceApp:t.sourceApp,sourceModule:t.sourceModule,sourceEvent:t.sourceEvent,sourceEntityType:t.sourceEntityType,days:r});if(D.current!==t.bindingKey||ve.current!==j)return;Ue($)}catch($){if(D.current!==t.bindingKey||ve.current!==j)return;oe($ instanceof Error?$.message:"Failed to load SMS delivery summary"),Ue(null)}finally{D.current===t.bindingKey&&ve.current===j&&Et(!1)}},at=async t=>{if(!(!h||h.totalCount<=0)){qe(t),oe(null);try{await ke(t,pa(c,h))}catch(r){oe(r instanceof Error?r.message:"Failed to export SMS delivery summary")}finally{qe(null)}}},es=async t=>{Pt(!0),Xe(t?"dry_run":"live"),Ge(null);try{const r=await Us({bindingKey:c.bindingKey,dryRun:t});kt(r),t||(await fe(),await Ee(G,I),await Me(c),await Ie(c,re),await be(!1))}catch(r){Ge(r instanceof Error?r.message:"Failed to run SMS retry sweep")}finally{Pt(!1),Xe(null)}},be=async(t=!1)=>{if(!(t&&!Ye)){t?Ot(!0):Dt(!0),V(null);try{const r=await us({sourceApp:c.sourceApp,sourceModule:c.sourceModule,sourceEvent:c.sourceEvent,sourceEntityType:c.sourceEntityType,status:we||null,toPhone:Ce.trim()||null,limit:na,cursor:t?Ye:null});_t(j=>t?[...j,...r.items]:r.items),Bt(r.nextCursor)}catch(r){V(r instanceof Error?r.message:"Failed to load SMS history"),t||(_t([]),Bt(null))}finally{t?Ot(!1):Dt(!1)}}},rt=async t=>{ze(t),V(null),ce(null);try{const r=await Hs({sourceApp:c.sourceApp,sourceModule:c.sourceModule,sourceEvent:c.sourceEvent,sourceEntityType:c.sourceEntityType,status:we||null,toPhone:Ce.trim()||null,maxRows:it});if(r.items.length===0){V("No SMS messages found for the current filters to export.");return}await ke(t,ha(c,r.items,{status:we,phone:Ce,truncated:r.truncated})),r.truncated&&ce(`Export included the first ${l(r.items.length)} matching messages. Narrow the filters to export the remaining history.`)}catch(r){V(r instanceof Error?r.message:"Failed to export SMS history")}finally{ze(null)}};o.useEffect(()=>{Qt()},[]),o.useEffect(()=>{fe(),Me(c),be(!1)},[c.bindingKey]),o.useEffect(()=>{Ie(c,re)},[c.bindingKey,re]),o.useEffect(()=>{Ee(G,I)},[I,G]);const ts=async t=>{Ht(t),V(null),ce(null);try{const r=await Ws(t);ce(r.note||`Retry created with status ${r.status} for ${r.recipient.phone}.`),await fe(),await Ee(G,I),await Me(c),await Ie(c,re),await be(!1)}catch(r){V(r instanceof Error?r.message:"Failed to retry SMS message")}finally{Ht(null)}},Es=()=>{Qe(!1),Te(null),Ae([]),Ze(null)},Pe=async t=>{Ze(t),Qe(!0),Vt(!0),Te(null);try{const r=await qs({messageId:t.id,providerMessageId:t.providerMessageId,limit:la});Ae(r)}catch(r){Te(r instanceof Error?r.message:"Failed to load webhook events"),Ae([])}finally{Vt(!1)}};return e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"mb-2",children:"Tenant SMS Overview"}),e.jsx("p",{className:"text-600 mb-0",children:"Cross-binding backlog and issue view for the entire tenant before drilling into an individual SMS event."})]}),e.jsxs("div",{className:"flex flex-column align-items-stretch md:align-items-end gap-2",children:[e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"CSV",icon:"pi pi-file",text:!0,className:"app-action-compact",onClick:()=>void tt("csv"),disabled:ie||!!ee||J.length===0}),e.jsx(m,{label:"Excel",icon:"pi pi-file-excel",text:!0,className:"app-action-compact",onClick:()=>void tt("excel"),disabled:ie||!!ee||J.length===0}),e.jsx(m,{label:"PDF",icon:"pi pi-file-pdf",text:!0,className:"app-action-compact",onClick:()=>void tt("pdf"),disabled:ie||!!ee||J.length===0}),e.jsx(m,{label:"Refresh Overview",text:!0,onClick:()=>void fe(),loading:ie,disabled:i||d||x||!!ee})]}),ee?e.jsxs("div",{className:"text-600 text-sm",children:["Preparing ",ee.toUpperCase()," tenant overview export..."]}):e.jsx("div",{className:"text-600 text-sm",children:"Export downloads the currently filtered tenant-wide overview rows."})]})]}),ct?e.jsx(b,{severity:"error",text:ct}):null,T?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Configured"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(T.configuredBindingCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"With Attention"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(T.attentionBindingCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Attention Messages"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(T.totalAttentionCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Pending"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(T.totalPendingCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Issues"}),e.jsx("div",{className:"text-red-500 text-2xl font-semibold",children:l(T.totalIssueCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Unconfigured Sources"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(T.unconfiguredSourceCount)})]})})]}),T.unconfiguredSourceCount>0?e.jsx(b,{severity:"warn",text:"Some SMS traffic source mappings have attention messages without a saved SMS binding record."}):null,e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3",children:[e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-6 xl:col-3",children:[e.jsx("label",{htmlFor:"tenant-overview-search",className:"block text-700 mb-2",children:"Search"}),e.jsx(k,{inputId:"tenant-overview-search",value:Ke,onChange:t=>ut(t.target.value),placeholder:"Binding, app, event, config..."})]}),e.jsxs("div",{className:"col-12 md:col-6 xl:col-3",children:[e.jsx("label",{htmlFor:"tenant-overview-app",className:"block text-700 mb-2",children:"App"}),e.jsx(Q,{inputId:"tenant-overview-app",value:I,options:Oe,optionLabel:"label",optionValue:"value",onChange:t=>mt(String(t.value??"")),className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-6 xl:col-3",children:[e.jsx("label",{htmlFor:"tenant-overview-config",className:"block text-700 mb-2",children:"Config"}),e.jsx(Q,{inputId:"tenant-overview-config",value:_e,options:ms,optionLabel:"label",optionValue:"value",onChange:t=>xt(String(t.value??"")),className:"w-full"})]}),e.jsxs("div",{className:"col-12 md:col-6 xl:col-3",children:[e.jsx("label",{htmlFor:"tenant-overview-attention",className:"block text-700 mb-2",children:"Attention"}),e.jsx(Q,{inputId:"tenant-overview-attention",value:Be,options:xs,optionLabel:"label",optionValue:"value",onChange:t=>pt(String(t.value??"")),className:"w-full"})]})]}),e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-center md:justify-content-between gap-2 mt-2",children:[e.jsxs("div",{className:"text-600 text-sm",children:["Showing ",l(J.length)," of ",l(et.length)," bindings."]}),e.jsx(m,{label:"Reset Filters",text:!0,className:"app-action-compact align-self-start md:align-self-auto",onClick:As,disabled:!Ns})]})]}),e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{minWidth:"980px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-3",children:"Binding"}),e.jsx("th",{className:"text-left p-3",children:"Source"}),e.jsx("th",{className:"text-left p-3",children:"Config"}),e.jsx("th",{className:"text-right p-3",children:"Attention"}),e.jsx("th",{className:"text-right p-3",children:"Pending"}),e.jsx("th",{className:"text-right p-3",children:"Issues"}),e.jsx("th",{className:"text-left p-3",children:"Timing"}),e.jsx("th",{className:"text-left p-3",children:"Action"})]})}),e.jsx("tbody",{children:T.items.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:8,children:"No tenant-wide SMS activity or saved bindings found yet."})}):J.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:8,children:"No tenant-wide SMS overview rows match the current filters."})}):J.map(t=>{const r=!!(t.bindingKey&&B.some($=>$.bindingKey===t.bindingKey)),j=t.bindingKey!=null&&t.bindingKey===s;return e.jsxs("tr",{className:`border-top-1 border-200 ${j?"surface-50":""}`,children:[e.jsxs("td",{className:"p-3 align-top",children:[e.jsx("div",{className:"text-900 font-medium",children:ot(t)}),t.bindingKey?e.jsx("div",{className:"text-600 mt-1",children:t.bindingKey}):e.jsx("div",{className:"text-600 mt-1",children:"No binding key"})]}),e.jsx("td",{className:"p-3 align-top",children:e.jsx("div",{className:"text-700 line-height-3",children:Le(t)})}),e.jsx("td",{className:"p-3 align-top",children:e.jsx("div",{className:"flex flex-column gap-2 align-items-start",children:t.isConfigured?t.isActive?e.jsx(P,{value:"ACTIVE",severity:"success"}):e.jsx(P,{value:"INACTIVE",severity:"warning"}):e.jsx(P,{value:"UNCONFIGURED",severity:"warning"})})}),e.jsx("td",{className:"p-3 align-top text-right text-900 font-medium",children:l(t.attentionCount)}),e.jsx("td",{className:"p-3 align-top text-right text-900",children:l(t.pendingCount)}),e.jsx("td",{className:"p-3 align-top text-right text-red-500",children:l(t.issueCount)}),e.jsxs("td",{className:"p-3 align-top",children:[e.jsxs("div",{className:"text-700",children:["Oldest pending: ",g(t.oldestPendingAt)]}),e.jsxs("div",{className:"text-600 mt-1",children:["Latest issue: ",g(t.latestIssueAt)]})]}),e.jsx("td",{className:"p-3 align-top",children:r&&t.bindingKey?e.jsx(m,{label:j?"Selected":"Open Binding",icon:j?"pi pi-check":"pi pi-arrow-right",text:!0,className:"p-button-sm",onClick:()=>a(t.bindingKey||B[0].bindingKey),disabled:j}):e.jsx("div",{className:"text-600",children:"-"})})]},`${t.bindingKey||"unconfigured"}-${Le(t)}`)})})]})})]}):ie?e.jsx("div",{className:"text-600",children:"Loading tenant SMS overview..."}):e.jsx("div",{className:"text-600",children:"No tenant SMS overview data found yet."})]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Tenant Delivery Trend"}),e.jsxs("p",{className:"text-600 mb-0",children:["Windowed delivery activity across ",e.jsx("strong",{children:ge}),". This follows the App filter from the tenant overview above."]})]}),e.jsxs("div",{className:"flex flex-column align-items-stretch md:align-items-end gap-2",children:[e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"CSV",icon:"pi pi-file",text:!0,className:"app-action-compact",onClick:()=>void st("csv"),disabled:te||!!se||!p||p.totalCount<=0}),e.jsx(m,{label:"Excel",icon:"pi pi-file-excel",text:!0,className:"app-action-compact",onClick:()=>void st("excel"),disabled:te||!!se||!p||p.totalCount<=0}),e.jsx(m,{label:"PDF",icon:"pi pi-file-pdf",text:!0,className:"app-action-compact",onClick:()=>void st("pdf"),disabled:te||!!se||!p||p.totalCount<=0})]}),se?e.jsxs("div",{className:"text-600 text-sm",children:["Preparing ",se.toUpperCase()," tenant delivery export..."]}):e.jsx("div",{className:"text-600 text-sm",children:"Export downloads the daily tenant delivery breakdown for the current app scope and window."})]})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-end",children:[e.jsxs("div",{className:"surface-50 border-1 border-200 border-round px-3 py-2 text-sm text-700",children:["App scope: ",e.jsx("strong",{children:ge})]}),e.jsxs("div",{style:{minWidth:"12rem"},children:[e.jsx("label",{htmlFor:"tenant-summary-days",className:"block text-700 mb-2",children:"Window"}),e.jsx(Q,{inputId:"tenant-summary-days",value:G,options:is,optionLabel:"label",optionValue:"value",onChange:t=>gs(Number(t.value??30)),className:"w-full",disabled:te})]}),e.jsx(m,{label:"Refresh Trend",text:!0,onClick:()=>void Ee(G,I),loading:te,disabled:!!se})]}),vt?e.jsx(b,{severity:"error",text:vt}):null,p?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Total"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(p.totalCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Delivered"}),e.jsx("div",{className:"text-green-600 text-2xl font-semibold",children:l(p.deliveredCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Failed"}),e.jsx("div",{className:"text-red-500 text-2xl font-semibold",children:l(p.failedCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Pending"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(p.queuedCount+p.sentCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Sandbox"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(p.sandboxCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Callbacks"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(p.receivedCount)})]})})]}),e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Latest message:"})," ",g(p.latestMessageAt)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Delivered rate:"})," ",$e(p.deliveredCount,p.totalCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Failed rate:"})," ",$e(p.failedCount,p.totalCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Window:"})," Last ",l(p.windowDays)," days"]})]}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Status Breakdown"}),p.statusCounts.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No status totals available for this scope."}):e.jsx("div",{className:"flex flex-column gap-2",children:p.statusCounts.map(t=>e.jsxs("div",{className:"flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2",children:[e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)}),e.jsx("div",{className:"text-900 font-medium",children:l(t.count)})]},t.status))})]})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Top Failure Codes"}),p.topFailureCodes.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No failure codes recorded in this window."}):e.jsx("div",{className:"flex flex-column gap-2",children:p.topFailureCodes.map(t=>e.jsxs("div",{className:"flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2",children:[e.jsx("div",{className:"text-700",children:t.errorCode}),e.jsx("div",{className:"text-900 font-medium",children:l(t.count)})]},t.errorCode))})]})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Daily Totals"}),p.dailyBuckets.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No daily SMS activity found for this window."}):e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{borderCollapse:"collapse",minWidth:"320px"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-2",children:"Date"}),e.jsx("th",{className:"text-right p-2",children:"Total"}),e.jsx("th",{className:"text-right p-2",children:"Delivered"}),e.jsx("th",{className:"text-right p-2",children:"Failed"})]})}),e.jsx("tbody",{children:p.dailyBuckets.map(t=>e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsx("td",{className:"p-2 text-700",children:t.date}),e.jsx("td",{className:"p-2 text-right text-900",children:l(t.totalCount)}),e.jsx("td",{className:"p-2 text-right text-green-600",children:l(t.deliveredCount)}),e.jsx("td",{className:"p-2 text-right text-red-500",children:l(t.failedCount)})]},t.date))})]})})]})})]})]}):te?e.jsx("div",{className:"text-600",children:"Loading tenant delivery trend..."}):e.jsx("div",{className:"text-600",children:"No tenant SMS delivery activity found for the current scope and window."})]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Tenant Alert Thresholds"}),e.jsx("p",{className:"text-600 mb-0",children:"Persist tenant-wide SMS alert rules and compare them against the current tenant delivery scope."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"Reload Alerts",text:!0,onClick:()=>void Qt(),loading:O,disabled:L}),e.jsx(m,{label:"Save Alerts",icon:"pi pi-bell",onClick:()=>void ws(),loading:L,disabled:O})]})]}),e.jsx(b,{severity:"info",text:"Alert evaluation follows the current App filter from Tenant SMS Overview. Search, config, and attention filters do not change alert scope."}),yt?e.jsx(b,{severity:"error",text:yt}):null,Nt?e.jsx(b,{severity:"success",text:Nt}):null,qt.enabled?Gt>0?e.jsx(b,{severity:"warn",text:`${l(Gt)} tenant SMS alert thresholds are currently firing for ${ge}.`}):e.jsx(b,{severity:"success",text:`No tenant SMS alert thresholds are currently firing for ${ge}.`}):e.jsx(b,{severity:"warn",text:"Tenant SMS alerts are currently disabled. Threshold preview below remains available."}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 md:col-6 lg:col-3",children:e.jsxs("div",{className:"flex align-items-center gap-2 h-full surface-50 border-1 border-200 border-round p-3",children:[e.jsx(ss,{inputId:"tenant-alert-enabled",checked:F.enabled,onChange:t=>K(r=>({...r,enabled:!!t.value})),disabled:O||L}),e.jsx("label",{htmlFor:"tenant-alert-enabled",children:"Enable tenant SMS alerts"})]})}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-failed-rate",className:"block text-700 mb-2",children:"Failed rate %"}),e.jsx(k,{inputId:"tenant-alert-failed-rate",value:F.failedRatePercent,onChange:t=>K(r=>({...r,failedRatePercent:t.target.value})),disabled:O||L})]}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-min-volume",className:"block text-700 mb-2",children:"Min messages for rate alert"}),e.jsx(k,{inputId:"tenant-alert-min-volume",value:F.minimumMessagesForRateAlert,onChange:t=>K(r=>({...r,minimumMessagesForRateAlert:t.target.value})),disabled:O||L})]}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-pending",className:"block text-700 mb-2",children:"Pending backlog"}),e.jsx(k,{inputId:"tenant-alert-pending",value:F.pendingCount,onChange:t=>K(r=>({...r,pendingCount:t.target.value})),disabled:O||L})]}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-issues",className:"block text-700 mb-2",children:"Issue backlog"}),e.jsx(k,{inputId:"tenant-alert-issues",value:F.issueCount,onChange:t=>K(r=>({...r,issueCount:t.target.value})),disabled:O||L})]}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-unconfigured",className:"block text-700 mb-2",children:"Unconfigured sources"}),e.jsx(k,{inputId:"tenant-alert-unconfigured",value:F.unconfiguredSourceCount,onChange:t=>K(r=>({...r,unconfiguredSourceCount:t.target.value})),disabled:O||L})]}),e.jsxs("div",{className:"col-12 md:col-6 lg:col-3",children:[e.jsx("label",{htmlFor:"tenant-alert-oldest-pending",className:"block text-700 mb-2",children:"Oldest pending age (hours)"}),e.jsx(k,{inputId:"tenant-alert-oldest-pending",value:F.oldestPendingHours,onChange:t=>K(r=>({...r,oldestPendingHours:t.target.value})),disabled:O||L})]}),e.jsx("div",{className:"col-12 md:col-6 lg:col-3 flex align-items-end",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round px-3 py-2 text-sm text-700 w-full",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Current app scope:"})," ",ge]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Saved:"})," ",g((Ve==null?void 0:Ve.updatedAt)??null)]})]})})]}),e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{minWidth:"860px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-3",children:"Rule"}),e.jsx("th",{className:"text-left p-3",children:"Current"}),e.jsx("th",{className:"text-left p-3",children:"Threshold"}),e.jsx("th",{className:"text-left p-3",children:"Status"}),e.jsx("th",{className:"text-left p-3",children:"Details"})]})}),e.jsx("tbody",{children:Xt.map(t=>e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsx("td",{className:"p-3 align-top text-900 font-medium",children:t.label}),e.jsx("td",{className:"p-3 align-top text-900",children:t.currentValue}),e.jsx("td",{className:"p-3 align-top text-900",children:t.thresholdValue}),e.jsx("td",{className:"p-3 align-top",children:e.jsx(P,{value:t.statusLabel,severity:t.severity})}),e.jsx("td",{className:"p-3 align-top text-600 line-height-3",children:t.detail})]},t.key))})]})})]})}),e.jsx("div",{className:"col-12 xl:col-8",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{children:[e.jsx("h2",{className:"mb-2",children:"SMS Bindings"}),e.jsx("p",{className:"text-600 mb-0",children:"Configure tenant-level SMS event bindings across Billing, Accounts, CRM, and Inventory without hardcoding provider payloads in each module."})]}),v?e.jsx(b,{severity:"error",text:v}):null,w?e.jsx(b,{severity:"success",text:w}):null,e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{htmlFor:"sms-binding-event",className:"block text-700 mb-2",children:"SMS event"}),e.jsx(Q,{inputId:"sms-binding-event",value:s,options:B,optionLabel:"label",optionValue:"bindingKey",onChange:t=>a(String(t.value??B[0].bindingKey)),disabled:i||d||x,className:"w-full"})]}),e.jsx("div",{className:"col-12 md:col-6 flex align-items-end",children:e.jsx("div",{className:"text-600 text-sm line-height-3",children:c.description})})]}),e.jsxs("div",{className:"flex align-items-center gap-2",children:[e.jsx(ss,{inputId:"sms-binding-enabled",checked:N.isActive,onChange:t=>W(r=>({...r,isActive:!!t.value})),disabled:i||d}),e.jsx("label",{htmlFor:"sms-binding-enabled",children:c.enabledLabel})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"sms-binding-key",className:"block text-700 mb-2",children:"Binding key"}),e.jsx(k,{inputId:"sms-binding-key",value:N.bindingKey,disabled:!0})]}),e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{htmlFor:"sms-template-key",className:"block text-700 mb-2",children:"Template key"}),e.jsx(k,{inputId:"sms-template-key",value:N.templateKey,onChange:t=>W(r=>({...r,templateKey:t.target.value})),disabled:i||d})]}),e.jsxs("div",{className:"col-12 md:col-6",children:[e.jsx("label",{htmlFor:"sms-sender-id",className:"block text-700 mb-2",children:"Sender ID override"}),e.jsx(k,{inputId:"sms-sender-id",value:N.senderId,onChange:t=>W(r=>({...r,senderId:t.target.value})),disabled:i||d})]})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"sms-message-template",className:"block text-700 mb-2",children:"Custom text template"}),e.jsx(nt,{id:"sms-message-template",value:N.messageTextTemplate,onChange:t=>W(r=>({...r,messageTextTemplate:t.target.value})),rows:5,autoResize:!0,className:"w-full",disabled:i||d}),e.jsx("small",{className:"text-600",children:c.messageTemplateHelp})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"sms-metadata-json",className:"block text-700 mb-2",children:"Provider metadata JSON"}),e.jsx(nt,{id:"sms-metadata-json",value:N.metadataJson,onChange:t=>W(r=>({...r,metadataJson:t.target.value})),rows:12,className:"w-full font-mono text-sm",disabled:i||d}),e.jsxs("small",{className:"text-600",children:["Supports placeholders like ",e.jsx("code",{children:"{{recipientName}}"}),", ",e.jsx("code",{children:"{{voucherNumber}}"}),","," ",e.jsx("code",{children:"{{dueAmountText}}"}),", ",e.jsx("code",{children:"{{totalNetAmountText}}"}),", ",e.jsx("code",{children:"{{periodText}}"}),","," ",e.jsx("code",{children:"{{closingBalanceText}}"}),", ",e.jsx("code",{children:"{{memberCode}}"}),", ",e.jsx("code",{children:"{{followupDateText}}"}),", ",e.jsx("code",{children:"{{productName}}"}),", and ",e.jsx("code",{children:"{{sellingRateText}}"})," ","inside nested JSON."]})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"sms-preview-context-json",className:"block text-700 mb-2",children:"Preview context JSON"}),e.jsx(nt,{id:"sms-preview-context-json",value:zt,onChange:t=>Yt(t.target.value),rows:12,className:"w-full font-mono text-sm",disabled:i||d||x}),e.jsx("small",{className:"text-600",children:"Preview uses the current unsaved form values plus this context payload. Save is not required first."})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap",children:[e.jsx(m,{label:"Reload",text:!0,onClick:()=>void Zt(c),disabled:i||d||x}),e.jsx(m,{label:"Preview",text:!0,onClick:()=>void Ts(),loading:x,disabled:i||d}),e.jsx(m,{label:"Save Settings",onClick:()=>void Cs(),loading:d,disabled:i||x})]}),C?e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 flex flex-column gap-3",children:[e.jsx("div",{className:"text-700 font-medium",children:"Preview Result"}),e.jsxs("div",{className:"text-600 text-sm",children:["Binding found: ",C.bindingFound?"Yes":"No"]}),e.jsxs("div",{className:"text-600 text-sm",children:["Template key: ",C.templateKey||"-"]}),e.jsxs("div",{className:"text-600 text-sm",children:["Sender ID: ",C.senderId||"-"]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Rendered message"}),e.jsx("pre",{className:"text-sm text-600 white-space-pre-wrap mt-0 mb-0",children:C.renderedMessageText||"-"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Rendered metadata"}),e.jsx("pre",{className:"text-sm text-600 white-space-pre-wrap mt-0 mb-0",children:C.renderedMetadataJson||"-"})]})]}):null]})}),e.jsx("div",{className:"col-12 xl:col-4",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsx("h3",{className:"mb-0",children:"Binding Notes"}),e.jsx(b,{severity:"info",text:c.sourceNote}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Current source mapping"}),e.jsxs("div",{className:"text-600 text-sm",children:["app: ",c.sourceApp]}),e.jsxs("div",{className:"text-600 text-sm",children:["module: ",c.sourceModule]}),e.jsxs("div",{className:"text-600 text-sm",children:["event: ",c.sourceEvent]}),e.jsxs("div",{className:"text-600 text-sm",children:["entity type: ",c.sourceEntityType]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Recommended placeholders"}),c.placeholderLines.map(t=>e.jsx("div",{className:"text-600 text-sm",children:t},t))]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Metadata example"}),e.jsx("pre",{className:"text-sm text-600 white-space-pre-wrap mt-0 mb-0",children:c.metadataExample})]})]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Retry Policy"}),e.jsxs("p",{className:"text-600 mb-0",children:["Configure and test automatic retry rules for failed messages on ",e.jsx("strong",{children:c.label})," using ",e.jsx("code",{children:"retryPolicy"})," inside the binding metadata JSON."]})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"Preview Sweep",text:!0,onClick:()=>void es(!0),loading:It&&Rt==="dry_run",disabled:!E.enabled||!!E.parseError||i||d||x}),e.jsx(m,{label:"Run Retry Sweep",icon:"pi pi-refresh",onClick:()=>void es(!1),loading:It&&Rt==="live",disabled:!E.enabled||!!E.parseError||i||d||x})]})]}),e.jsx(b,{severity:"info",text:"Retry sweeps use the saved binding record. Save settings first after changing retryPolicy metadata."}),E.parseError?e.jsx(b,{severity:"error",text:E.parseError}):E.enabled?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Max attempts:"})," ",l(E.maxAttempts)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Retry after:"})," ",l(E.retryAfterMinutes)," minutes"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Lookback window:"})," ",l(E.withinHours)," hours"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Max messages per sweep:"})," ",l(E.maxMessagesPerRun)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Statuses:"})," ",E.statuses.join(", ")||"-"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Skipped error codes:"})," ",E.skipErrorCodes.join(", ")||"-"]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Suggested metadata snippet"}),e.jsx("pre",{className:"text-sm text-600 white-space-pre-wrap mt-0 mb-0",children:`{
  "retryPolicy": {
    "enabled": true,
    "maxAttempts": 2,
    "retryAfterMinutes": 30,
    "withinHours": 72,
    "maxMessagesPerRun": 25,
    "statuses": ["failed"],
    "skipErrorCodes": []
  }
}`})]})]}):e.jsx(b,{severity:"warn",text:"No enabled retryPolicy is present in the current metadata JSON."}),$t?e.jsx(b,{severity:"error",text:$t}):null,_?e.jsxs("div",{className:"flex flex-column gap-3",children:[e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Last sweep:"})," ",_.dryRun?"Dry run":"Executed"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Scanned:"})," ",l(_.scannedCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Eligible:"})," ",l(_.eligibleCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Retried:"})," ",l(_.retriedCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Skipped:"})," ",l(_.skippedCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Failures:"})," ",l(_.failureCount)]})]}),e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{minWidth:"840px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-2",children:"Message"}),e.jsx("th",{className:"text-left p-2",children:"Current"}),e.jsx("th",{className:"text-left p-2",children:"Sweep Result"}),e.jsx("th",{className:"text-left p-2",children:"Retry Message"}),e.jsx("th",{className:"text-left p-2",children:"Details"})]})}),e.jsx("tbody",{children:_.decisions.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:5,children:"No retry decisions were generated for this sweep."})}):_.decisions.map(t=>e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.messageId}),e.jsx("div",{className:"text-600 mt-1",children:t.recipientPhone})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.currentStatus}),e.jsxs("div",{className:"text-600 mt-1",children:["Attempt: ",l(t.retryAttempt)]})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx(P,{value:t.status.toUpperCase(),severity:ga(t.status)}),t.reason?e.jsx("div",{className:"text-600 mt-2",children:t.reason}):null]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.retryMessageId||"-"}),t.retryMessageStatus?e.jsxs("div",{className:"text-600 mt-1",children:["Status: ",t.retryMessageStatus]}):null]}),e.jsx("td",{className:"p-2 align-top",children:e.jsx("div",{className:"text-600",children:t.error||"-"})})]},`${t.messageId}-${t.status}-${t.retryMessageId||"none"}`))})]})})]}):null]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Operational Snapshot"}),e.jsxs("p",{className:"text-600 mb-0",children:["Current pending and failure attention for ",e.jsx("strong",{children:c.label})," using the active source mapping."]})]}),e.jsx("div",{className:"flex gap-2 flex-wrap justify-content-end",children:e.jsx(m,{label:"Refresh Snapshot",text:!0,onClick:()=>void Me(c),loading:Ct,disabled:i||d||x})})]}),At?e.jsx(b,{severity:"error",text:At}):null,A?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Needs Attention"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(A.attentionCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Pending"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(A.pendingCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Issues"}),e.jsx("div",{className:"text-red-500 text-2xl font-semibold",children:l(A.issueCount)})]})}),e.jsx("div",{className:"col-6 md:col-6 xl:col-3",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Oldest Pending"}),e.jsx("div",{className:"text-900 text-lg font-semibold",children:je(A.oldestPendingAt)}),e.jsx("div",{className:"text-600 mt-2",children:g(A.oldestPendingAt)})]})}),e.jsx("div",{className:"col-6 md:col-6 xl:col-3",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Latest Issue"}),e.jsx("div",{className:"text-900 text-lg font-semibold",children:g(A.latestIssueAt)}),e.jsxs("div",{className:"text-600 mt-2",children:["Age: ",je(A.latestIssueAt)]})]})})]}),e.jsx("div",{className:"grid",children:A.statusBuckets.map(t=>e.jsx("div",{className:"col-12 md:col-6 xl:col-3",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-2",children:[e.jsxs("div",{className:"flex align-items-center justify-content-between gap-2",children:[e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)}),e.jsx("div",{className:"text-900 font-semibold",children:l(t.count)})]}),e.jsxs("div",{className:"text-600 text-sm",children:["Oldest: ",g(t.oldestMessageAt)]}),e.jsxs("div",{className:"text-600 text-sm",children:["Latest: ",g(t.latestMessageAt)]})]})},t.status))}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 xl:col-6",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-3",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-900 font-medium mb-2",children:"Oldest Pending Messages"}),e.jsx("div",{className:"text-600 text-sm",children:"Oldest queued and sent messages that are still waiting to complete."})]}),e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{minWidth:"720px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-2",children:"Created"}),e.jsx("th",{className:"text-left p-2",children:"Status"}),e.jsx("th",{className:"text-left p-2",children:"Recipient"}),e.jsx("th",{className:"text-left p-2",children:"Message"}),e.jsx("th",{className:"text-left p-2",children:"Provider"})]})}),e.jsx("tbody",{children:A.pendingItems.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:5,children:"No queued or sent messages currently need attention."})}):A.pendingItems.map(t=>e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:g(t.createdAt)}),e.jsxs("div",{className:"text-600 mt-1",children:["Age: ",je(t.createdAt)]})]}),e.jsx("td",{className:"p-2 align-top",children:e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)})}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.recipient.name||"-"}),e.jsx("div",{className:"text-600 mt-1",children:t.recipient.phone})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.message.templateKey||t.message.type}),e.jsx("div",{className:"text-600 mt-1 line-height-3",children:t.message.textPreview||"-"})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.providerMessageId||"-"}),t.senderId?e.jsxs("div",{className:"text-600 mt-1",children:["Sender: ",t.senderId]}):null,t.providerMessageId?e.jsx(m,{label:"Events",icon:"pi pi-list",text:!0,className:"p-button-sm mt-2",onClick:()=>void Pe(t),disabled:ue&&(y==null?void 0:y.id)===t.id}):null]})]},`pending-${t.id}`))})]})})]})}),e.jsx("div",{className:"col-12 xl:col-6",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full flex flex-column gap-3",children:[e.jsxs("div",{children:[e.jsx("div",{className:"text-900 font-medium mb-2",children:"Latest Issues"}),e.jsx("div",{className:"text-600 text-sm",children:"Failed and sandbox messages that may need retry or provider callback review."})]}),e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{minWidth:"760px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-2",children:"Issue Time"}),e.jsx("th",{className:"text-left p-2",children:"Status"}),e.jsx("th",{className:"text-left p-2",children:"Recipient"}),e.jsx("th",{className:"text-left p-2",children:"Message"}),e.jsx("th",{className:"text-left p-2",children:"Actions"})]})}),e.jsx("tbody",{children:A.issueItems.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:5,children:"No failed or sandbox messages currently need action."})}):A.issueItems.map(t=>{const r=t.failedAt||t.createdAt;return e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:g(r)}),e.jsxs("div",{className:"text-600 mt-1",children:["Age: ",je(r)]})]}),e.jsx("td",{className:"p-2 align-top",children:e.jsxs("div",{className:"flex flex-column gap-2 align-items-start",children:[e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)}),t.errorDetail?e.jsx("div",{className:"text-red-500 line-height-3",children:t.errorDetail}):null,t.errorCode?e.jsxs("div",{className:"text-600",children:["Code: ",t.errorCode]}):null]})}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.recipient.name||"-"}),e.jsx("div",{className:"text-600 mt-1",children:t.recipient.phone})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.message.templateKey||t.message.type}),e.jsx("div",{className:"text-600 mt-1 line-height-3",children:t.message.textPreview||"-"})]}),e.jsxs("td",{className:"p-2 align-top",children:[e.jsx("div",{className:"text-900",children:t.providerMessageId||"-"}),e.jsxs("div",{className:"flex gap-2 flex-wrap mt-2",children:[t.providerMessageId?e.jsx(m,{label:"Events",icon:"pi pi-list",text:!0,className:"p-button-sm",onClick:()=>void Pe(t),disabled:ue&&(y==null?void 0:y.id)===t.id}):null,cs(t.status)?e.jsx(m,{label:"Retry",icon:"pi pi-refresh",text:!0,className:"p-button-sm",onClick:()=>void ts(t.id),loading:ne===t.id,disabled:!!(ne&&ne!==t.id)}):null]})]})]},`issue-${t.id}`)})})]})})]})})]})]}):Ct?e.jsx("div",{className:"text-600",children:"Loading SMS operational snapshot..."}):e.jsx("div",{className:"text-600",children:"No SMS operational data found for the selected binding."})]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Delivery Summary"}),e.jsxs("p",{className:"text-600 mb-0",children:["Recent delivery totals for ",e.jsx("strong",{children:c.label})," using the current source mapping."]})]}),e.jsxs("div",{className:"flex flex-column align-items-stretch md:align-items-end gap-2",children:[e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"CSV",icon:"pi pi-file",text:!0,className:"app-action-compact",onClick:()=>void at("csv"),disabled:ae||!!de||!h||h.totalCount<=0}),e.jsx(m,{label:"Excel",icon:"pi pi-file-excel",text:!0,className:"app-action-compact",onClick:()=>void at("excel"),disabled:ae||!!de||!h||h.totalCount<=0}),e.jsx(m,{label:"PDF",icon:"pi pi-file-pdf",text:!0,className:"app-action-compact",onClick:()=>void at("pdf"),disabled:ae||!!de||!h||h.totalCount<=0})]}),de?e.jsxs("div",{className:"text-600 text-sm",children:["Preparing ",de.toUpperCase()," delivery summary export..."]}):e.jsx("div",{className:"text-600 text-sm",children:"Export downloads the daily delivery breakdown for the selected window."})]})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end align-items-end",children:[e.jsxs("div",{style:{minWidth:"12rem"},children:[e.jsx("label",{htmlFor:"sms-summary-days",className:"block text-700 mb-2",children:"Window"}),e.jsx(Q,{inputId:"sms-summary-days",value:re,options:is,optionLabel:"label",optionValue:"value",onChange:t=>fs(Number(t.value??30)),className:"w-full",disabled:ae})]}),e.jsx(m,{label:"Refresh Summary",text:!0,onClick:()=>void Ie(c,re),loading:ae})]}),Mt?e.jsx(b,{severity:"error",text:Mt}):null,h?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Total"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(h.totalCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Delivered"}),e.jsx("div",{className:"text-green-600 text-2xl font-semibold",children:l(h.deliveredCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Failed"}),e.jsx("div",{className:"text-red-500 text-2xl font-semibold",children:l(h.failedCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Queued"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(h.queuedCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Sent"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(h.sentCount)})]})}),e.jsx("div",{className:"col-6 md:col-4 xl:col-2",children:e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-600 text-sm mb-2",children:"Sandbox"}),e.jsx("div",{className:"text-900 text-2xl font-semibold",children:l(h.sandboxCount)})]})})]}),e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Latest message:"})," ",g(h.latestMessageAt)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Delivered rate:"})," ",$e(h.deliveredCount,h.totalCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Failed rate:"})," ",$e(h.failedCount,h.totalCount)]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Received callbacks:"})," ",l(h.receivedCount)]})]}),e.jsxs("div",{className:"grid",children:[e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Status Breakdown"}),h.statusCounts.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No statuses recorded for this window."}):e.jsx("div",{className:"flex flex-column gap-2",children:h.statusCounts.map(t=>e.jsxs("div",{className:"flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2",children:[e.jsx("div",{className:"flex align-items-center gap-2",children:e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)})}),e.jsx("div",{className:"text-900 font-medium",children:l(t.count)})]},t.status))})]})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Top Failure Codes"}),h.topFailureCodes.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No failed messages recorded for this window."}):e.jsx("div",{className:"flex flex-column gap-2",children:h.topFailureCodes.map(t=>e.jsxs("div",{className:"flex align-items-center justify-content-between gap-3 surface-50 border-1 border-200 border-round p-2",children:[e.jsx("div",{className:"text-700",children:t.errorCode}),e.jsx("div",{className:"text-900 font-medium",children:l(t.count)})]},t.errorCode))})]})}),e.jsx("div",{className:"col-12 lg:col-4",children:e.jsxs("div",{className:"surface-0 border-1 border-200 border-round p-3 h-full",children:[e.jsx("div",{className:"text-900 font-medium mb-3",children:"Recent Daily Totals"}),h.dailyBuckets.length===0?e.jsx("div",{className:"text-600 text-sm",children:"No daily SMS activity found for this window."}):e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full text-sm",style:{borderCollapse:"collapse",minWidth:"320px"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700",children:[e.jsx("th",{className:"text-left p-2",children:"Date"}),e.jsx("th",{className:"text-right p-2",children:"Total"}),e.jsx("th",{className:"text-right p-2",children:"Delivered"}),e.jsx("th",{className:"text-right p-2",children:"Failed"})]})}),e.jsx("tbody",{children:h.dailyBuckets.map(t=>e.jsxs("tr",{className:"border-top-1 border-200",children:[e.jsx("td",{className:"p-2 text-700",children:t.date}),e.jsx("td",{className:"p-2 text-right text-900",children:l(t.totalCount)}),e.jsx("td",{className:"p-2 text-right text-green-600",children:l(t.deliveredCount)}),e.jsx("td",{className:"p-2 text-right text-red-500",children:l(t.failedCount)})]},t.date))})]})})]})})]})]}):ae?e.jsx("div",{className:"text-600",children:"Loading delivery summary..."}):e.jsx("div",{className:"text-600",children:"No SMS summary data found for the selected window."})]})}),e.jsx("div",{className:"col-12",children:e.jsxs("div",{className:"card flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"mb-2",children:"Recent SMS History"}),e.jsxs("p",{className:"text-600 mb-0",children:["Showing recent messages for ",e.jsx("strong",{children:c.label})," using the current binding source mapping."]})]}),e.jsxs("div",{className:"flex flex-column align-items-stretch md:align-items-end gap-2",children:[e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"CSV",icon:"pi pi-file",text:!0,className:"app-action-compact",onClick:()=>void rt("csv"),disabled:H||z||!!Y}),e.jsx(m,{label:"Excel",icon:"pi pi-file-excel",text:!0,className:"app-action-compact",onClick:()=>void rt("excel"),disabled:H||z||!!Y}),e.jsx(m,{label:"PDF",icon:"pi pi-file-pdf",text:!0,className:"app-action-compact",onClick:()=>void rt("pdf"),disabled:H||z||!!Y})]}),Y?e.jsxs("div",{className:"text-600 text-sm",children:["Preparing ",Y.toUpperCase()," SMS history export..."]}):e.jsxs("div",{className:"text-600 text-sm",children:["Export downloads up to ",l(it)," matching messages for the current filters."]})]})]}),e.jsxs("div",{className:"flex gap-2 flex-wrap justify-content-end",children:[e.jsx(m,{label:"Refresh",text:!0,onClick:()=>void be(!1),loading:H,disabled:z||!!Y}),e.jsx(m,{label:"Load More",onClick:()=>void be(!0),loading:z,disabled:!Ye||H||!!Y})]}),e.jsxs("div",{className:"grid",children:[e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{htmlFor:"sms-history-status",className:"block text-700 mb-2",children:"Status"}),e.jsx(Q,{inputId:"sms-history-status",value:we,options:ia,optionLabel:"label",optionValue:"value",onChange:t=>bs(String(t.value??"")),className:"w-full",disabled:H||z})]}),e.jsxs("div",{className:"col-12 md:col-4",children:[e.jsx("label",{htmlFor:"sms-history-phone",className:"block text-700 mb-2",children:"Recipient phone"}),e.jsx(k,{inputId:"sms-history-phone",value:Ce,onChange:t=>js(t.target.value),disabled:H||z})]}),e.jsx("div",{className:"col-12 md:col-4 flex align-items-end",children:e.jsxs("div",{className:"text-600 text-sm line-height-3",children:["Source: ",c.sourceApp," / ",c.sourceModule," / ",c.sourceEvent]})})]}),Lt?e.jsx(b,{severity:"error",text:Lt}):null,Ft?e.jsx(b,{severity:"success",text:Ft}):null,e.jsx("div",{className:"surface-0 border-1 border-200 border-round overflow-auto",children:e.jsxs("table",{className:"w-full",style:{minWidth:"900px",borderCollapse:"collapse"},children:[e.jsx("thead",{children:e.jsxs("tr",{className:"surface-100 text-700 text-sm",children:[e.jsx("th",{className:"text-left p-3",children:"Created"}),e.jsx("th",{className:"text-left p-3",children:"Status"}),e.jsx("th",{className:"text-left p-3",children:"Recipient"}),e.jsx("th",{className:"text-left p-3",children:"Message"}),e.jsx("th",{className:"text-left p-3",children:"Provider"})]})}),e.jsx("tbody",{children:H?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:5,children:"Loading SMS history..."})}):Kt.length===0?e.jsx("tr",{children:e.jsx("td",{className:"p-3 text-600",colSpan:5,children:"No SMS messages found for the current binding filters."})}):Kt.map(t=>{var r;return e.jsxs("tr",{className:"text-sm border-top-1 border-200",children:[e.jsxs("td",{className:"p-3 align-top",children:[e.jsx("div",{className:"text-900",children:g(t.createdAt)}),e.jsxs("div",{className:"text-600 mt-1",children:["Sent: ",g(t.sentAt)]}),e.jsxs("div",{className:"text-600",children:["Delivered: ",g(t.deliveredAt)]})]}),e.jsx("td",{className:"p-3 align-top",children:e.jsxs("div",{className:"flex flex-column gap-2 align-items-start",children:[e.jsx(P,{value:t.status.toUpperCase(),severity:Z(t.status)}),t.errorDetail?e.jsx("div",{className:"text-red-500 line-height-3",children:t.errorDetail}):null,t.errorCode?e.jsxs("div",{className:"text-600",children:["Code: ",t.errorCode]}):null]})}),e.jsxs("td",{className:"p-3 align-top",children:[e.jsx("div",{className:"text-900",children:t.recipient.name||"-"}),e.jsx("div",{className:"text-600 mt-1",children:t.recipient.phone}),t.recipient.reference?e.jsxs("div",{className:"text-600 mt-1",children:[t.recipient.reference.type,": ",t.recipient.reference.id]}):null]}),e.jsxs("td",{className:"p-3 align-top",children:[e.jsx("div",{className:"text-900",children:t.message.templateKey||t.message.type}),e.jsx("div",{className:"text-600 mt-1 line-height-3",children:t.message.textPreview||"-"}),(r=t.source)!=null&&r.event?e.jsxs("div",{className:"text-600 mt-1",children:["Event: ",t.source.event]}):null]}),e.jsxs("td",{className:"p-3 align-top",children:[e.jsx("div",{className:"text-900",children:t.providerMessageId||"-"}),t.senderId?e.jsxs("div",{className:"text-600 mt-1",children:["Sender: ",t.senderId]}):null,t.correlationId?e.jsxs("div",{className:"text-600 mt-1",children:["Correlation: ",t.correlationId]}):null,t.providerMessageId?e.jsx(m,{label:"Events",icon:"pi pi-list",text:!0,className:"p-button-sm mt-2 mr-2",onClick:()=>void Pe(t),disabled:ue&&(y==null?void 0:y.id)===t.id}):null,cs(t.status)?e.jsx(m,{label:"Retry",icon:"pi pi-refresh",text:!0,className:"p-button-sm mt-2",onClick:()=>void ts(t.id),loading:ne===t.id,disabled:!!(ne&&ne!==t.id)}):null]})]},t.id)})})]})})]})}),e.jsx(Rs,{header:y?`Webhook Events - ${y.recipient.phone}`:"Webhook Events",visible:ys,style:{width:"min(960px, 96vw)"},onHide:Es,children:e.jsxs("div",{className:"flex flex-column gap-3",children:[y?e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 text-sm text-700 line-height-3",children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Recipient:"})," ",y.recipient.name||"-"," (",y.recipient.phone,")"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Provider message ID:"})," ",y.providerMessageId||"-"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Current status:"})," ",y.status]})]}):null,e.jsx("div",{className:"flex justify-content-end",children:e.jsx(m,{label:"Refresh Events",text:!0,onClick:()=>y&&void Pe(y),loading:ue,disabled:!y})}),Jt?e.jsx(b,{severity:"error",text:Jt}):null,ue?e.jsx("div",{className:"text-600",children:"Loading webhook events..."}):Wt.length===0?e.jsx("div",{className:"text-600",children:"No webhook events recorded for this provider message yet."}):Wt.map(t=>e.jsxs("div",{className:"surface-50 border-1 border-200 border-round p-3 flex flex-column gap-3",children:[e.jsxs("div",{className:"flex flex-column md:flex-row md:align-items-start md:justify-content-between gap-3",children:[e.jsxs("div",{className:"flex flex-column gap-2 align-items-start",children:[e.jsxs("div",{className:"text-900 font-medium",children:["Received ",g(t.receivedAt)]}),t.deliveryStatus?e.jsx(P,{value:t.deliveryStatus.toUpperCase(),severity:Z(t.deliveryStatus)}):null,t.rawStatus&&t.rawStatus!==t.deliveryStatus?e.jsxs("div",{className:"text-600",children:["Raw status: ",t.rawStatus]}):null]}),e.jsxs("div",{className:"text-600 text-sm line-height-3",children:[e.jsxs("div",{children:["Provider: ",t.providerMessageId||"-"]}),e.jsxs("div",{children:["Signature: ",t.signature||"-"]}),e.jsxs("div",{children:["Error code: ",t.errorCode||"-"]})]})]}),t.errorDetail?e.jsx(b,{severity:"warn",text:t.errorDetail}):null,e.jsxs("div",{children:[e.jsx("div",{className:"text-700 font-medium mb-2",children:"Raw event JSON"}),e.jsx("pre",{className:"text-sm text-600 white-space-pre-wrap mt-0 mb-0",children:t.eventJson})]})]},t.id))]})})]})}export{Da as default};
