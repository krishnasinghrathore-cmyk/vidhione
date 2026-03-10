import { gql } from '@apollo/client';

export const INVOICE_PRODUCTS_QUERY = gql`
    query InvoiceProducts($search: String, $limit: Int) {
        products(search: $search, limit: $limit, isActiveFlag: 1) {
            productId
            name
            code
            productGroupId
            productBrandId
            hsnCodeId
            productAttributeTypeId
            productAttributes {
                productAttributeId
                productAttributeTypeId
                detail
                isSelectedFlag
                orderNo
            }
            units {
                unitId
            }
            salesTaxes {
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                mrp
                sellingRate
                beforeVatRate
                isActiveFlag
                effectiveDateText
            }
        }
    }
`;

export const INVOICE_PRODUCT_GROUPS_QUERY = gql`
    query InvoiceProductGroups($search: String, $limit: Int) {
        productGroups(search: $search, limit: $limit) {
            productGroupId
            name
        }
    }
`;

export const INVOICE_PRODUCT_BRANDS_QUERY = gql`
    query InvoiceProductBrands($search: String, $limit: Int) {
        productBrands(search: $search, limit: $limit) {
            productBrandId
            name
        }
    }
`;

export const INVOICE_PRODUCT_BY_ID_QUERY = gql`
    query InvoiceProductById($productId: Int!) {
        productById(productId: $productId) {
            productId
            name
            code
            productGroupId
            productBrandId
            hsnCodeId
            productAttributeTypeId
            productAttributes {
                productAttributeId
                productAttributeTypeId
                detail
                isSelectedFlag
                orderNo
            }
            units {
                unitId
            }
            salesTaxes {
                ledgerTaxId
                ledgerTax2Id
                ledgerTax3Id
                mrp
                sellingRate
                beforeVatRate
                isActiveFlag
                effectiveDateText
            }
        }
    }
`;

export const INVOICE_PRODUCT_ATTRIBUTE_TYPE_BY_ID_QUERY = gql`
    query InvoiceProductAttributeTypeById($productAttributeTypeId: Int!) {
        productAttributeTypeById(productAttributeTypeId: $productAttributeTypeId) {
            productAttributeTypeId
            name
            productAttributes {
                productAttributeId
                detail
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

export const INVOICE_HSN_CODE_BY_ID_QUERY = gql`
    query InvoiceHsnCodeById($hsnCodeId: Int!) {
        hsnCodeById(hsnCodeId: $hsnCodeId) {
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

export const INVOICE_TRANSPORTERS_QUERY = gql`
    query InvoiceTransporters($search: String, $limit: Int) {
        transporters(search: $search, limit: $limit) {
            transporterId
            name
            alias
        }
    }
`;
