import { gql } from '@apollo/client';

export const TRIAL_BALANCE = gql`
    query TrialBalanceLegacy(
        $fromDate: String
        $toDate: String
        $ledgerGroupId: Int
        $ledgerId: Int
        $cityId: Int
        $areaId: Int
        $options: Int
        $balanceStatus: Int
        $taxType: Int
        $isPostingView: Int
        $voucherTypeId: Int
        $voucherType: Int
        $isReverseChargeApplicable: Int
        $isTaxation: Int
    ) {
        trialBalanceLegacy(
            fromDate: $fromDate
            toDate: $toDate
            ledgerGroupId: $ledgerGroupId
            ledgerId: $ledgerId
            cityId: $cityId
            areaId: $areaId
            options: $options
            balanceStatus: $balanceStatus
            taxType: $taxType
            isPostingView: $isPostingView
            voucherTypeId: $voucherTypeId
            voucherType: $voucherType
            isReverseChargeApplicable: $isReverseChargeApplicable
            isTaxation: $isTaxation
        ) {
            id
            ledgerGroup
            groupId
            annexure
            ledger
            ledgerId
            openingBalance
            openingDrCr
            debitAmount
            creditAmount
            closingBalance
            closingDrCr
            defaultDrCr
            transferTo
            postingAmount
            postingDiff
            postingVoucherId
            voucherNo
            voucherDate
            taxRate
        }
    }
`;

export const VOUCHER_TYPES = gql`
    query VoucherTypeMasters {
        voucherTypeMasters {
            voucherTypeId
            voucherTypeName
            displayName
            voucherTypeCode
        }
    }
`;
