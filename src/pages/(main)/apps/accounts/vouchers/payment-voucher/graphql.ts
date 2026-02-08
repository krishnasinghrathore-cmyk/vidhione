import { gql } from '@apollo/client';

export const VOUCHER_TYPES = gql`
    query VoucherTypes {
        voucherTypes {
            voucherTypeId
            voucherTypeCode
            displayName
            voucherTypeName
        }
    }
`;

export const MANAGERS = gql`
    query Managers($search: String, $limit: Int) {
        managers(search: $search, limit: $limit) {
            managerId
            name
        }
    }
`;

export const PAYMENT_VIA_MASTERS = gql`
    query PaymentViaMasters($search: String, $limit: Int, $includeInactive: Boolean) {
        paymentViaMasters(search: $search, limit: $limit, includeInactive: $includeInactive) {
            paymentViaId
            code
            name
            orderNo
            isActive
        }
    }
`;

export const CHEQUE_ISSUE_BOOKS = gql`
    query ChequeIssueBooks($bankLedgerId: Int, $limit: Int) {
        chequeIssueBooks(bankLedgerId: $bankLedgerId, limit: $limit) {
            chequeIssueBookId
            voucherNumber
            voucherDate
            chequeStartNumber
            chequeEndNumber
            remarks
            isCancelledFlag
        }
    }
`;

export const NEXT_VOUCHER_NUMBER = gql`
    query NextVoucherNumber(
        $voucherTypeId: Int!
        $companyFiscalYearId: Int
        $fiscalYearStart: String
        $fiscalYearEnd: String
    ) {
        nextVoucherNumber(
            voucherTypeId: $voucherTypeId
            companyFiscalYearId: $companyFiscalYearId
            fiscalYearStart: $fiscalYearStart
            fiscalYearEnd: $fiscalYearEnd
        )
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

export const VOUCHER_REGISTER_BY_LEDGER = gql`
    query VoucherRegisterByLedgerDetailed(
        $ledgerId: Int
        $ledgerGroupTypeCodes: [Int!]
        $ledgerDrCrFlag: Int
        $againstLedgerId: Int
        $againstDrCrFlag: Int
        $voucherTypeIds: [Int!]
        $managerId: Int
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
        $excludeOpening: Boolean
    ) {
        voucherRegisterByLedgerDetailed(
            ledgerId: $ledgerId
            ledgerGroupTypeCodes: $ledgerGroupTypeCodes
            ledgerDrCrFlag: $ledgerDrCrFlag
            againstLedgerId: $againstLedgerId
            againstDrCrFlag: $againstDrCrFlag
            voucherTypeIds: $voucherTypeIds
            managerId: $managerId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
            excludeOpening: $excludeOpening
        ) {
            items {
                voucherId
                voucherTypeId
                voucherTypeName
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                totalNetAmount
                narration
                isCancelledFlag
                managerId
                managerName
            }
            totalCount
            totalNetAmount
        }
    }
`;

export const VOUCHER_ENTRY_BY_ID = gql`
    query VoucherEntryById($voucherId: Int!) {
        voucherEntryById(voucherId: $voucherId) {
            header {
                voucherId
                voucherTypeId
                voucherTypeCode
                voucherTypeName
                voucherNumber
                voucherDate
                postingDate
                refNo
                refDate
                debitLedgerName
                debitLedgerGroupName
                debitLedgerNames
                debitLedgerAmounts
                creditLedgerName
                creditLedgerNames
                creditLedgerAmounts
                totalNetAmount
                narration
                isCancelledFlag
                managerId
                managerName
                managerDetails
                managerDetailsAmount
                monthName
                yearMonth
                chequeIssueBookId
                paymentViaId
                primaryLedgerId
                chequeInFavourText
            }
            lines {
                ledgerId
                ledgerName
                amount
                drCrFlag
            }
        }
    }
`;

export const CREATE_VOUCHER = gql`
    mutation CreateVoucherEntry(
        $voucherTypeId: Int!
        $voucherNumber: String!
        $voucherDate: String!
        $postingDate: String
        $refNo: String
        $refDate: String
        $narration: String
        $managerId: Int
        $chequeIssueBookId: Int
        $paymentViaId: Int
        $primaryLedgerId: Int
        $isCancelledFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        createVoucherEntry(
            voucherTypeId: $voucherTypeId
            voucherNumber: $voucherNumber
            voucherDate: $voucherDate
            postingDate: $postingDate
            refNo: $refNo
            refDate: $refDate
            narration: $narration
            managerId: $managerId
            chequeIssueBookId: $chequeIssueBookId
            paymentViaId: $paymentViaId
            primaryLedgerId: $primaryLedgerId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        )
    }
`;

export const UPDATE_VOUCHER = gql`
    mutation UpdateVoucherEntry(
        $voucherId: Int!
        $voucherTypeId: Int!
        $voucherNumber: String!
        $voucherDate: String!
        $postingDate: String
        $refNo: String
        $refDate: String
        $narration: String
        $managerId: Int
        $chequeIssueBookId: Int
        $paymentViaId: Int
        $primaryLedgerId: Int
        $isCancelledFlag: Int
        $lines: [VoucherLineInput!]!
    ) {
        updateVoucherEntry(
            voucherId: $voucherId
            voucherTypeId: $voucherTypeId
            voucherNumber: $voucherNumber
            voucherDate: $voucherDate
            postingDate: $postingDate
            refNo: $refNo
            refDate: $refDate
            narration: $narration
            managerId: $managerId
            chequeIssueBookId: $chequeIssueBookId
            paymentViaId: $paymentViaId
            primaryLedgerId: $primaryLedgerId
            isCancelledFlag: $isCancelledFlag
            lines: $lines
        )
    }
`;

export const DELETE_VOUCHER = gql`
    mutation DeleteVoucherEntry($voucherId: Int!) {
        deleteVoucherEntry(voucherId: $voucherId)
    }
`;
