import { gql } from '@apollo/client';

export const BANK_RECONCILIATION = gql`
    query BankReconciliation(
        $bankLedgerId: Int!
        $search: String
        $fromDate: String
        $toDate: String
        $partyLedgerId: Int
        $amount: Float
        $onlyPending: Int
        $filterByReconcileDate: Int
        $limit: Int
        $offset: Int
    ) {
        bankReconciliation(
            bankLedgerId: $bankLedgerId
            search: $search
            fromDate: $fromDate
            toDate: $toDate
            partyLedgerId: $partyLedgerId
            amount: $amount
            onlyPending: $onlyPending
            filterByReconcileDate: $filterByReconcileDate
            limit: $limit
            offset: $offset
        ) {
            items {
                postingId
                voucherId
                ledgerId
                ledgerName
                ledgerGroupName
                voucherDate
                voucherNumber
                voucherType
                counterLedgerName
                narration
                debit
                credit
                balance
                drCr
                reconciliationDate
                reconciliationRemark
                isOpening
                chequeNo
                discountAmount
                chequeCancelCharges
            }
            totalCount
            debitTotal
            creditTotal
        }
    }
`;

export const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(search: $search, ledgerGroupId: $ledgerGroupId, limit: $limit, offset: 0, sortField: "name", sortOrder: 1) {
            items {
                ledgerId
                name
                ledgerGroupId
                address
            }
        }
    }
`;

export const UPDATE_RECON = gql`
    mutation UpdateBankReconciliationEntries($entries: [BankReconciliationUpdateInput!]!) {
        updateBankReconciliationEntries(entries: $entries)
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

export const LEDGER_RECON_STATEMENT_IMPORT = gql`
    query LedgerReconciliationStatementImport($ledgerId: Int!, $fromDate: String!, $toDate: String!, $includeFile: Boolean) {
        ledgerReconciliationStatementImport(ledgerId: $ledgerId, fromDate: $fromDate, toDate: $toDate, includeFile: $includeFile) {
            statementImportId
            fileName
            contentType
            fileBase64
            createdAt
        }
    }
`;

export const UPLOAD_LEDGER_RECON_STATEMENT_IMPORT = gql`
    mutation UploadLedgerReconciliationStatementImport(
        $ledgerId: Int!
        $fromDate: String!
        $toDate: String!
        $fileName: String!
        $contentType: String
        $fileBase64: String!
    ) {
        uploadLedgerReconciliationStatementImport(
            ledgerId: $ledgerId
            fromDate: $fromDate
            toDate: $toDate
            fileName: $fileName
            contentType: $contentType
            fileBase64: $fileBase64
        ) {
            statementImportId
            fileName
            contentType
            createdAt
        }
    }
`;
