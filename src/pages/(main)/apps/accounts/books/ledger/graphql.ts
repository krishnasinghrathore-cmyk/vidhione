import { gql } from '@apollo/client';

export const CITIES = gql`
    query Cities($search: String, $limit: Int) {
        cities(search: $search, limit: $limit) {
            cityId
            name
            stateName
        }
    }
`;

export const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(search: $search, limit: $limit, offset: 0, sortField: "name", sortOrder: 1, ledgerGroupId: $ledgerGroupId) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
                cityId
                cityName
                address
                openingBalanceAmount
                balanceType
            }
        }
    }
`;

export const LEDGER_REPORT = gql`
    query LedgerReport(
        $ledgerId: Int!
        $search: String
        $voucherTypeId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        ledgerReport(
            ledgerId: $ledgerId
            search: $search
            voucherTypeId: $voucherTypeId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                id
                date
                voucherNo
                voucherType
                counterLedger
                counterLedgerDetail
                narration
                debit
                credit
                runningDelta
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

export const LEDGER_OPENING_BALANCE = gql`
    query LedgerOpeningBalance($ledgerId: Int!, $fromDate: String, $cancelled: Int) {
        ledgerOpeningBalance(ledgerId: $ledgerId, fromDate: $fromDate, cancelled: $cancelled) {
            amount
            drCr
        }
    }
`;

export const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String, $cancelled: Int) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: $cancelled) {
            amount
            drCr
        }
    }
`;

export const SEND_LEDGER_STATEMENT_SMS = gql`
    mutation SendLedgerStatementSms(
        $ledgerId: Int!
        $fromDate: String!
        $toDate: String!
        $voucherTypeId: Int
        $cancelled: Int
        $messageText: String
        $templateKey: String
    ) {
        sendLedgerStatementSms(
            ledgerId: $ledgerId
            fromDate: $fromDate
            toDate: $toDate
            voucherTypeId: $voucherTypeId
            cancelled: $cancelled
            messageText: $messageText
            templateKey: $templateKey
        ) {
            ledgerId
            id
            status
            duplicate
            providerMessageId
            note
            recipientPhone
            recipientName
            fromDate
            toDate
            totalCount
            closingAmount
            closingDrCr
            templateKey
        }
    }
`;

export const SEND_LEDGER_STATEMENT_WHATSAPP = gql`
    mutation SendLedgerStatementWhatsApp(
        $ledgerId: Int!
        $fromDate: String!
        $toDate: String!
        $voucherTypeId: Int
        $cancelled: Int
        $bindingKey: String
        $accountId: String
        $recipientPhone: String
        $recipientName: String
        $campaignKey: String
        $idempotencyKey: String
        $scheduledAt: String
        $sendNow: Boolean
    ) {
        sendLedgerStatementWhatsApp(
            ledgerId: $ledgerId
            fromDate: $fromDate
            toDate: $toDate
            voucherTypeId: $voucherTypeId
            cancelled: $cancelled
            bindingKey: $bindingKey
            accountId: $accountId
            recipientPhone: $recipientPhone
            recipientName: $recipientName
            campaignKey: $campaignKey
            idempotencyKey: $idempotencyKey
            scheduledAt: $scheduledAt
            sendNow: $sendNow
        ) {
            ledgerId
            bindingKey
            id
            status
            waMessageId
            recipientPhone
            recipientName
            fromDate
            toDate
            totalCount
            closingAmount
            closingDrCr
            templateKey
            templateName
        }
    }
`;