export type ProductUnitFieldId =
    | 'unit'
    | 'equal-unit'
    | 'quantity'
    | 'effective-date';

export const getProductUnitFieldId = (key: number, field: ProductUnitFieldId) =>
    `product-unit-${key}-${field}`;

export type ProductTaxFieldId =
    | 'ledger-tax'
    | 'ledger-tax-2'
    | 'ledger-tax-3'
    | 'mrp'
    | 'margin'
    | 'selling-rate'
    | 'before-vat-rate'
    | 'before-vat-rate-2'
    | 'effective-date'
    | 'active';

export const getProductTaxFieldId = (key: number, field: ProductTaxFieldId) =>
    `product-sales-tax-${key}-${field}`;
