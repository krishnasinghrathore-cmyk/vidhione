import { gql } from '@apollo/client';

export const PROFIT_LOSS_REPORT = gql`
    query ProfitLossReport(
        $fromDate: String
        $toDate: String
        $cancelled: Int
    ) {
        profitLossReport(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
        ) {
            grossProfit
            grossLoss
            netProfit
            netLoss
            lines {
                id
                section
                side
                ledgerGroupId
                ledgerGroupName
                ledgerId
                ledgerName
                annexureName
                amount
            }
        }
    }
`;
