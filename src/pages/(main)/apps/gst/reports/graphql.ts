import { gql } from '@apollo/client';

export const GST_GSTR1_BOOK_QUERY = gql`
    query GstGstr1Book(
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $section: String
        $limit: Int
        $offset: Int
    ) {
        gstGstr1Book(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            section: $section
            limit: $limit
            offset: $offset
        ) {
            items {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDateText
                ledgerId
                ledgerName
                gstin
                placeOfSupply
                section
                totalAmount
                totalTaxAmount
                totalNetAmount
                isCancelled
            }
            totalCount
            totalAmount
            totalTaxAmount
            totalNetAmount
        }
    }
`;

export const GST_GSTR2_BOOK_QUERY = gql`
    query GstGstr2Book(
        $fromDate: String
        $toDate: String
        $cancelled: Int
        $limit: Int
        $offset: Int
    ) {
        gstGstr2Book(
            fromDate: $fromDate
            toDate: $toDate
            cancelled: $cancelled
            limit: $limit
            offset: $offset
        ) {
            items {
                voucherId
                voucherTypeId
                voucherNumber
                voucherDateText
                ledgerId
                ledgerName
                totalAmount
                totalTaxAmount
                totalNetAmount
                isCancelled
            }
            totalCount
            totalAmount
            totalTaxAmount
            totalNetAmount
        }
    }
`;

export const GST_GSTR3B_SUMMARY_QUERY = gql`
    query GstGstr3bSummary($fromDate: String, $toDate: String, $cancelled: Int) {
        gstGstr3bSummary(fromDate: $fromDate, toDate: $toDate, cancelled: $cancelled) {
            sales {
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
            salesReturn {
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
            purchase {
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
            purchaseReturn {
                totalCount
                totalAmount
                totalTaxAmount
                totalNetAmount
            }
        }
    }
`;
