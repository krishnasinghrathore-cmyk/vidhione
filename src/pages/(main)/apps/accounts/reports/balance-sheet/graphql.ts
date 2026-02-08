import { gql } from '@apollo/client';

export const BALANCE_SHEET_DETAILED = gql`
    query BalanceSheetDetailed(
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $ledgerGroupId: Int
        $ledgerId: Int
        $openingOnly: Boolean
    ) {
        balanceSheetDetailed(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            ledgerGroupId: $ledgerGroupId
            ledgerId: $ledgerId
            openingOnly: $openingOnly
        ) {
            id
            ledgerId
            ledgerGroupId
            ledgerName
            groupName
            annexureName
            side
            amount
        }
    }
`;
