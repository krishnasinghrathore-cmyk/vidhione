import { gql } from '@apollo/client';

export const INVOICE_PRODUCTS_QUERY = gql`
    query InvoiceProducts($search: String, $limit: Int) {
        products(search: $search, limit: $limit, isActiveFlag: 1) {
            productId
            name
            code
            hsnCodeId
            units {
                unitId
            }
            salesTaxes {
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                sellingRate
                beforeVatRate
                isActiveFlag
                effectiveDateText
            }
        }
    }
`;

export const INVOICE_PRODUCT_BY_ID_QUERY = gql`
    query InvoiceProductById($productId: Int!) {
        productById(productId: $productId) {
            productId
            name
            code
            hsnCodeId
            units {
                unitId
            }
            salesTaxes {
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                sellingRate
                beforeVatRate
                isActiveFlag
                effectiveDateText
            }
        }
    }
`;

export const INVOICE_HSN_CODES_QUERY = gql`
    query InvoiceHsnCodes($limit: Int) {
        hsnCodes(limit: $limit) {
            hsnCodeId
            code
            name
        }
    }
`;

export const INVOICE_GODOWNS_QUERY = gql`
    query InvoiceGodowns($limit: Int) {
        godowns(limit: $limit) {
            godownId
            name
        }
    }
`;

export const INVOICE_UNITS_QUERY = gql`
    query InvoiceUnits($limit: Int) {
        units(limit: $limit) {
            unitId
            name
        }
    }
`;
