import { gql } from '@apollo/client';

export const LEDGER_LOOKUP = gql`
    query LedgerLookup($search: String, $limit: Int, $ledgerGroupId: Int) {
        ledgerSummaries(
            search: $search
            ledgerGroupId: $ledgerGroupId
            limit: $limit
            offset: 0
            sortField: "name"
            sortOrder: 1
        ) {
            items {
                ledgerId
                name
                groupName
                ledgerGroupId
                address
                openingBalanceAmount
                balanceType
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

export const LEDGER_MONTH_SUMMARY = gql`
    query LedgerMonthWiseSummary(
        $ledgerId: Int!
        $ledgerGroupId: Int
        $fromDate: String
        $toDate: String
    ) {
        ledgerMonthWiseSummary(
            ledgerId: $ledgerId
            ledgerGroupId: $ledgerGroupId
            fromDate: $fromDate
            toDate: $toDate
            cancelled: 0
        ) {
            monthKey
            label
            debit
            credit
            balance
            drCr
            isOpening
        }
    }
`;
