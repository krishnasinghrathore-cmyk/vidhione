import { gql } from '@apollo/client';

export const AREAS = gql`
    query Areas($search: String, $limit: Int) {
        areas(search: $search, limit: $limit) {
            areaId
            name
        }
    }
`;

export const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $areaIds: [Int!]) {
        ledgerSummaries(
            search: $search
            areaIds: $areaIds
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                groupName
                address
            }
        }
    }
`;

export const LEDGER_CURRENT_BALANCE = gql`
    query LedgerCurrentBalance($ledgerId: Int!, $toDate: String) {
        ledgerCurrentBalance(ledgerId: $ledgerId, toDate: $toDate, cancelled: 0) {
            amount
            drCr
        }
    }
`;

export const INVOICE_ROLLOVER = gql`
    query InvoiceRollover(
        $ledgerIds: [Int!]
        $areaIds: [Int!]
        $fromDate: String
        $toDate: String
        $removeZeroLines: Int
    ) {
        invoiceRollover(
            ledgerIds: $ledgerIds
            areaIds: $areaIds
            fromDate: $fromDate
            toDate: $toDate
            removeZeroLines: $removeZeroLines
        ) {
            items {
                rowKey
                ledgerId
                ledgerName
                ledgerGroupId
                ledgerGroupName
                invoiceId
                invoiceNumber
                invoiceDate
                voucherTypeId
                voucherType
                agLedger
                narration
                debit
                credit
                difference
                receiptDate
                receiptType
                receiptVoucherNo
                receiptAmount
                totalPaid
                isReceiptRow
            }
            totalCount
            invoiceTotal
            appliedTotal
            differenceTotal
        }
    }
`;
