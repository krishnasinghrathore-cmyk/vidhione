import { gql } from '@apollo/client';

export const DAY_BOOK = gql`
    query DayBook(
        $voucherTypeIds: [Int!]
        $ledgerIds: [Int!]
        $fromDate: String
        $toDate: String
        $sortField: String
        $sortOrder: Int
        $limit: Int
        $offset: Int
        $cancelled: Int
        $columnFilters: String
        $includeFilterOptions: Boolean
    ) {
        dayBook(
            voucherTypeIds: $voucherTypeIds
            ledgerIds: $ledgerIds
            fromDate: $fromDate
            toDate: $toDate
            sortField: $sortField
            sortOrder: $sortOrder
            limit: $limit
            offset: $offset
            cancelled: $cancelled
            columnFilters: $columnFilters
            includeFilterOptions: $includeFilterOptions
        ) {
            items {
                id
                date
                voucherNo
                voucherType
                voucherTypeId
                ledger
                narration
                refNo
                refDate
                debit
                credit
                balance
                drCr
            }
            totalCount
            debitTotal
            creditTotal
            filterOptions {
                voucherNo
                date
                ledger
                narration
                voucherType
                refNo
                refDate
                debit
                credit
                balance
                drCr
            }
        }
    }
`;

export const LEDGER_OPTIONS = gql`
    query LedgerOptions($search: String, $limit: Int) {
        ledgerOptions(search: $search, limit: $limit) {
            ledgerId
            name
            address
        }
    }
`;
